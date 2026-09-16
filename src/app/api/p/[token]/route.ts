import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: { token: string } }) {
  try {
    const token = params.token?.trim();

    if (!token || token.length < 8) {
      return NextResponse.json(
        { success: false, error: "الرابط غير صالح أو منتهي" },
        { status: 400 }
      );
    }

    if (!adminDb) {
      return NextResponse.json(
        { success: false, error: "الرابط غير صالح أو منتهي" },
        { status: 500 }
      );
    }

    // 1. Locate student by parentQrToken using Admin SDK
    let studentDoc: FirebaseFirestore.DocumentSnapshot | null = null;
    let teacherRef: FirebaseFirestore.DocumentReference | null = null;

    try {
      const querySnap = await adminDb
        .collectionGroup("students")
        .where("parentQrToken", "==", token)
        .limit(1)
        .get();

      if (!querySnap.empty && querySnap.docs[0]) {
        const doc = querySnap.docs[0];
        studentDoc = doc;
        teacherRef = doc.ref.parent.parent;
      }
    } catch (cgError) {
      console.warn("CollectionGroup query error or missing index, using fallback:", cgError);
    }

    // Fallback search across teachers if collectionGroup index is not yet built
    if (!studentDoc) {
      const teachersSnap = await adminDb.collection("teachers").get();
      for (const tDoc of teachersSnap.docs) {
        const sSnap = await tDoc.ref
          .collection("students")
          .where("parentQrToken", "==", token)
          .limit(1)
          .get();

        if (!sSnap.empty && sSnap.docs[0]) {
          studentDoc = sSnap.docs[0];
          teacherRef = tDoc.ref;
          break;
        }
      }
    }

    // 2. Validate Student: exists, not deleted, not blocked
    if (!studentDoc || !studentDoc.exists || !teacherRef) {
      return NextResponse.json(
        { success: false, error: "الرابط غير صالح أو منتهي" },
        { status: 404 }
      );
    }

    const studentData = studentDoc.data();
    if (!studentData) {
      return NextResponse.json(
        { success: false, error: "الرابط غير صالح أو منتهي" },
        { status: 404 }
      );
    }

    // Check soft deletion
    if (
      (studentData.deletedAt !== null && studentData.deletedAt !== undefined) ||
      studentData.isDeleted === true
    ) {
      return NextResponse.json(
        { success: false, error: "الرابط غير صالح أو منتهي" },
        { status: 404 }
      );
    }

    // Check if blocked
    if (studentData.status === "blocked") {
      return NextResponse.json(
        { success: false, error: "الرابط غير صالح أو منتهي" },
        { status: 403 }
      );
    }

    const studentId = studentDoc.id;

    // 3. Concurrently fetch student's context, attendance, payments, and exams
    const [
      teacherDocSnap,
      classDocSnap,
      groupDocSnap,
      attendanceSnap,
      paymentsSnap,
      examResultsSnap,
      examsSnap,
    ] = await Promise.all([
      teacherRef.get(),
      studentData.classId
        ? teacherRef.collection("classes").doc(studentData.classId).get()
        : Promise.resolve(null),
      studentData.groupId
        ? teacherRef.collection("groups").doc(studentData.groupId).get()
        : Promise.resolve(null),
      teacherRef
        .collection("attendanceRecords")
        .where("studentId", "==", studentId)
        .limit(100)
        .get(),
      teacherRef.collection("payments").where("studentId", "==", studentId).limit(24).get(),
      teacherRef.collection("examResults").where("studentId", "==", studentId).limit(50).get(),
      teacherRef.collection("exams").get(),
    ]);

    // Teacher / Class / Group metadata
    const teacherData = teacherDocSnap.exists ? teacherDocSnap.data() : null;
    const className =
      classDocSnap && classDocSnap.exists ? (classDocSnap.data()?.name as string) || "—" : "—";
    const groupName =
      groupDocSnap && groupDocSnap.exists ? (groupDocSnap.data()?.name as string) || "—" : "—";

    // 4. Calculate Attendance metrics & format records
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;

    const attendanceRecords = attendanceSnap.docs.map((doc) => {
      const d = doc.data();
      const status = (d.status as "present" | "absent" | "late") || "absent";

      if (status === "present") presentCount++;
      else if (status === "absent") absentCount++;
      else if (status === "late") lateCount++;

      const date = (d.date as string) || (d.scannedAt ? (d.scannedAt as string).slice(0, 10) : "—");
      const startTime =
        (d.startTime as string) ||
        (d.scannedAt ? (d.scannedAt as string).slice(11, 16) : undefined);

      return {
        id: doc.id,
        date,
        startTime,
        status,
      };
    });

    // Sort attendance descending by date
    attendanceRecords.sort((a, b) => b.date.localeCompare(a.date));

    const totalSessions = presentCount + absentCount + lateCount;
    const attendanceRate =
      totalSessions > 0 ? Math.round(((presentCount + lateCount) / totalSessions) * 100) : 0;
    const lastAttendance = attendanceRecords.length > 0 ? attendanceRecords[0] : null;

    // 5. Calculate Payments (without sensitive internals)
    const paymentsMap = new Map<string, unknown>();
    paymentsSnap.docs.forEach((doc) => {
      const d = doc.data();
      const month = (d.month as string) || "";
      if (!month) return;

      const status = (d.status as "paid" | "partial" | "unpaid") || "unpaid";
      const required = Number(d.required ?? d.groupPrice) || 0;
      const paid = Number(d.paid) || 0;
      const remaining = Math.max(0, required - paid);

      const paymentRecord = {
        id: doc.id,
        month,
        status,
        remaining: status === "partial" ? remaining : 0,
      };

      const expectedId = `${month}_${studentId}`;
      if (doc.id === expectedId) {
        paymentsMap.set(month, paymentRecord);
      } else if (!paymentsMap.has(month)) {
        paymentsMap.set(month, paymentRecord);
      }
    });

    const payments = Array.from(paymentsMap.values());

    // Sort payments descending by month
    payments.sort((a, b) => b.month.localeCompare(a.month));

    // 6. Calculate Exams
    const examInfoMap = new Map<string, { name: string; date: string; maxGrade: number }>();
    examsSnap.docs.forEach((d) => {
      const ex = d.data();
      if (ex.deletedAt !== null || ex.isDeleted) return;

      examInfoMap.set(d.id, {
        name: (ex.name as string) || "امتحان",
        date: (ex.examDate as string) || "",
        maxGrade: Number(ex.finalGrade) || 100,
      });
    });

    const exams = examResultsSnap.docs
      .map((doc) => {
        const r = doc.data();
        const examInfo = r.examId ? examInfoMap.get(r.examId as string) : undefined;
        if (!examInfo) return null;

        const finalGrade = examInfo.maxGrade || Number(r.finalGrade) || 100;
        const grade = Number(r.grade) || 0;
        const percentage =
          Number(r.percentage) || (finalGrade > 0 ? Math.round((grade / finalGrade) * 100) : 0);

        return {
          id: doc.id,
          examName: examInfo.name || (r.examName as string) || "امتحان دوري",
          examDate: examInfo.date || (r.date as string) || "",
          grade,
          finalGrade,
          percentage,
        };
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);

    // Sort exams descending by date
    exams.sort((a, b) => b.examDate.localeCompare(a.examDate));

    return NextResponse.json({
      success: true,
      student: {
        name: studentData.name || "طالب",
        className,
        groupName,
        teacherName: teacherData?.name || "الأكاديمية",
        subject: teacherData?.subject || "",
        photoUrl: studentData.photoUrl || "",
      },
      attendance: {
        attendanceRate,
        presentCount,
        absentCount,
        lateCount,
        totalSessions,
        lastAttendance,
        records: attendanceRecords,
      },
      payments,
      exams,
    });
  } catch (error) {
    console.error("Parent Portal API Error:", error);
    return NextResponse.json(
      { success: false, error: "الرابط غير صالح أو منتهي" },
      { status: 500 }
    );
  }
}

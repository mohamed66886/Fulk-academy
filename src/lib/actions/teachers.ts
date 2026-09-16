"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { createTeacherSchema, type CreateTeacherFormData } from "@/lib/validators/auth";

// Helper: Ensure the caller is authenticated as a Super Admin
async function verifySuperAdminCaller() {
  if (!adminAuth || !adminDb) {
    throw new Error("خدمة الخادم غير مهيأة");
  }

  const cookieStore = cookies();
  const sessionCookie = cookieStore.get("__session")?.value;

  if (!sessionCookie) {
    throw new Error("يجب تسجيل الدخول كمسؤول عام لتنفيذ هذا الإجراء");
  }

  const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, false);
  if (decodedClaims.role !== "super_admin") {
    throw new Error("غير مصرح لك بتنفيذ هذه العملية. صلاحية المسؤول العام مطلوبة.");
  }

  return decodedClaims;
}

// 1. Create Teacher Account
export async function createTeacherAccount(data: CreateTeacherFormData) {
  try {
    const validatedData = createTeacherSchema.parse(data);
    const decodedClaims = await verifySuperAdminCaller();

    // Create user in Firebase Auth
    const userRecord = await adminAuth!.createUser({
      email: validatedData.email,
      password: validatedData.password,
      displayName: validatedData.name,
    });

    // Set Custom Claims
    await adminAuth!.setCustomUserClaims(userRecord.uid, {
      role: "teacher",
      teacherId: userRecord.uid,
    });

    // Create Teacher document in Firestore: teachers/{teacherId}
    const now = new Date().toISOString();
    await adminDb!
      .collection("teachers")
      .doc(userRecord.uid)
      .set({
        id: userRecord.uid,
        name: validatedData.name,
        email: validatedData.email,
        phone: validatedData.phone,
        subject: validatedData.subject,
        photoUrl: validatedData.photoUrl || "",
        status: "active",
        createdAt: now,
        updatedAt: now,
      });

    // Audit log
    await adminDb!
      .collection("teachers")
      .doc(userRecord.uid)
      .collection("auditLogs")
      .add({
        actorId: decodedClaims.uid,
        actorName: decodedClaims.name || decodedClaims.email || "Super Admin",
        actorRole: "super_admin",
        action: "CREATE_TEACHER",
        entityType: "teacher",
        entityId: userRecord.uid,
        description: `تم إنشاء حساب المدرس: ${validatedData.name} (${validatedData.email})`,
        createdAt: now,
      });

    revalidatePath("/super-admin/teachers");
    revalidatePath("/super-admin/dashboard");

    return {
      success: true,
      teacherId: userRecord.uid,
    };
  } catch (error: unknown) {
    const err = error as Error;
    return {
      success: false,
      error: err.message || "حدث خطأ أثناء إنشاء حساب المدرس",
    };
  }
}

// 2. Toggle Teacher Status (Active <-> Disabled)
export async function toggleTeacherStatus(teacherId: string, newStatus: "active" | "disabled") {
  try {
    const decodedClaims = await verifySuperAdminCaller();

    // Update Firestore
    await adminDb!.collection("teachers").doc(teacherId).update({
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });

    // Update Firebase Authentication state
    await adminAuth!.updateUser(teacherId, {
      disabled: newStatus === "disabled",
    });

    // If disabled, revoke active refresh tokens immediately
    if (newStatus === "disabled") {
      await adminAuth!.revokeRefreshTokens(teacherId);
    }

    // Record in Audit Logs
    await adminDb!
      .collection("teachers")
      .doc(teacherId)
      .collection("auditLogs")
      .add({
        actorId: decodedClaims.uid,
        actorName: decodedClaims.name || decodedClaims.email || "Super Admin",
        actorRole: "super_admin",
        action: newStatus === "disabled" ? "DISABLE_TEACHER" : "ACTIVATE_TEACHER",
        entityType: "teacher",
        entityId: teacherId,
        description: `تم ${newStatus === "disabled" ? "إيقاف" : "تفعيل"} حساب المدرس`,
        createdAt: new Date().toISOString(),
      });

    revalidatePath("/super-admin/teachers");
    revalidatePath(`/super-admin/teachers/${teacherId}`);
    revalidatePath("/super-admin/dashboard");

    return { success: true };
  } catch (error: unknown) {
    const err = error as Error;
    return {
      success: false,
      error: err.message || "فشل تغيير حالة حساب المدرس",
    };
  }
}

// 3. Get Super Admin Dashboard Stats
export async function getSuperAdminDashboardStats() {
  try {
    await verifySuperAdminCaller();

    // Check if platform/config has cached aggregation numbers
    const configDoc = await adminDb!.collection("platform").doc("config").get();
    let stats = {
      totalTeachers: 0,
      activeTeachers: 0,
      disabledTeachers: 0,
      totalStudents: 0,
      totalGroups: 0,
    };

    if (configDoc.exists && configDoc.data()?.stats) {
      stats = { ...stats, ...configDoc.data()?.stats };
    } else {
      // Fallback to fast count queries
      const [totalTeachersSnap, activeTeachersSnap, disabledTeachersSnap] = await Promise.all([
        adminDb!.collection("teachers").count().get(),
        adminDb!.collection("teachers").where("status", "==", "active").count().get(),
        adminDb!.collection("teachers").where("status", "==", "disabled").count().get(),
      ]);

      let totalStudentsCount = 0;
      let totalGroupsCount = 0;
      try {
        const [studentsSnap, groupsSnap] = await Promise.all([
          adminDb!.collectionGroup("students").count().get(),
          adminDb!.collectionGroup("groups").count().get(),
        ]);
        totalStudentsCount = studentsSnap.data().count;
        totalGroupsCount = groupsSnap.data().count;
      } catch {
        // collectionGroup may require index in dev; default to 0 gracefully
      }

      stats = {
        totalTeachers: totalTeachersSnap.data().count,
        activeTeachers: activeTeachersSnap.data().count,
        disabledTeachers: disabledTeachersSnap.data().count,
        totalStudents: totalStudentsCount,
        totalGroups: totalGroupsCount,
      };
    }

    return { success: true, stats };
  } catch (error: unknown) {
    const err = error as Error;
    return {
      success: false,
      error: err.message,
      stats: {
        totalTeachers: 0,
        activeTeachers: 0,
        disabledTeachers: 0,
        totalStudents: 0,
        totalGroups: 0,
      },
    };
  }
}

// 4. Get Teachers List with search, status filter, and pagination
export interface GetTeachersParams {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export async function getTeachersList(params: GetTeachersParams = {}) {
  try {
    await verifySuperAdminCaller();

    const { status, search } = params;
    let query: FirebaseFirestore.Query = adminDb!.collection("teachers");

    if (status && status !== "all") {
      query = query.where("status", "==", status);
    }

    const snapshot = await query.orderBy("createdAt", "desc").get();

    // Map teacher docs and get student count for each
    const teachers = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        let studentCount = 0;
        try {
          const studentsSnap = await doc.ref.collection("students").count().get();
          studentCount = studentsSnap.data().count;
        } catch {
          // ignore
        }

        return {
          id: doc.id,
          name: (data.name as string) || "بدون اسم",
          email: (data.email as string) || "",
          phone: (data.phone as string) || "",
          subject: (data.subject as string) || "",
          photoUrl: (data.photoUrl as string) || "",
          status: (data.status as "active" | "disabled") || "active",
          createdAt: (data.createdAt as string) || "",
          studentCount,
        };
      })
    );

    // Filter in-memory if search string is provided
    let filteredTeachers = teachers;
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filteredTeachers = teachers.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.phone.includes(q) ||
          t.email.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q)
      );
    }

    return {
      success: true,
      teachers: filteredTeachers,
      totalCount: filteredTeachers.length,
    };
  } catch (error: unknown) {
    const err = error as Error;
    return {
      success: false,
      error: err.message,
      teachers: [],
      totalCount: 0,
    };
  }
}

// 5. Get Teacher Details (High-level summary counters only, strict tenant isolation)
export async function getTeacherDetails(teacherId: string) {
  try {
    await verifySuperAdminCaller();

    const teacherDoc = await adminDb!.collection("teachers").doc(teacherId).get();
    if (!teacherDoc.exists) {
      return { success: false, error: "المدرس غير موجود" };
    }

    const data = teacherDoc.data()!;

    // Aggregate counts only - Super Admin NEVER sees individual student data/grades/payments
    const [classesSnap, groupsSnap, studentsSnap] = await Promise.all([
      teacherDoc.ref.collection("classes").count().get(),
      teacherDoc.ref.collection("groups").count().get(),
      teacherDoc.ref.collection("students").count().get(),
    ]);

    return {
      success: true,
      teacher: {
        id: teacherDoc.id,
        name: (data.name as string) || "",
        email: (data.email as string) || "",
        phone: (data.phone as string) || "",
        subject: (data.subject as string) || "",
        photoUrl: (data.photoUrl as string) || "",
        status: (data.status as "active" | "disabled") || "active",
        createdAt: (data.createdAt as string) || "",
        updatedAt: (data.updatedAt as string) || "",
      },
      counts: {
        classes: classesSnap.data().count,
        groups: groupsSnap.data().count,
        students: studentsSnap.data().count,
      },
    };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message };
  }
}

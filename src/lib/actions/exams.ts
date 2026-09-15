"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/lib/firebase/admin";
import { examSchema, type ExamFormData } from "@/lib/validators/exam";
import type { Exam } from "@/types";

import { checkPermission } from "@/lib/auth/permissions";
import { withCache, invalidateCacheTags } from "@/lib/cache/server-cache";

// 1. GET CLASSES AND GROUPS FOR EXAM FORMS
export async function getClassesAndGroupsForExams(): Promise<{
  success: boolean;
  classes: Array<{ id: string; name: string }>;
  groups: Array<{ id: string; name: string; classId: string; className: string }>;
  error?: string;
}> {
  try {
    const { teacherRef, teacherId } = await checkPermission("exams", "view");

    return await withCache(
      `exams-classes-groups:${teacherId}`,
      [`classes:${teacherId}`, `groups:${teacherId}`, `exams:${teacherId}`],
      60,
      async () => {
        const [classesSnap, groupsSnap] = await Promise.all([
          teacherRef.collection("classes").where("isDeleted", "!=", true).get(),
          teacherRef.collection("groups").where("isDeleted", "!=", true).get(),
        ]);

        const classes = classesSnap.docs.map((doc) => ({
          id: doc.id,
          name: (doc.data().name as string) || "صف دراسي",
        }));

        const groups = groupsSnap.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            name: (d.name as string) || "مجموعة",
            classId: (d.classId as string) || "",
            className: (d.className as string) || "",
          };
        });

        return { success: true, classes, groups };
      }
    );
  } catch (error) {
    return {
      success: false,
      classes: [],
      groups: [],
      error: error instanceof Error ? error.message : "فشل جلب الصفوف والمجموعات",
    };
  }
}

// 2. GET EXAMS LIST
export interface ExamListItem extends Exam {
  className?: string;
  groupName?: string;
  resultsCount?: number;
  averageGrade?: number;
}

export interface GetExamsFilters {
  page?: number;
  pageSize?: number;
  classId?: string;
  groupId?: string;
  query?: string;
}

export async function getExams(filters: GetExamsFilters = {}): Promise<{
  success: boolean;
  exams: ExamListItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  error?: string;
}> {
  try {
    const { teacherRef, teacherId } = await checkPermission("exams", "view");

    return await withCache(
      `exams:${teacherId}:${JSON.stringify(filters)}`,
      [`exams:${teacherId}`],
      30,
      async () => {
        // 1. Base query on exams
        let examsQuery = teacherRef.collection("exams").where("isDeleted", "!=", true);

        if (filters.classId) {
          examsQuery = examsQuery.where("classId", "==", filters.classId);
        }
        if (filters.groupId) {
          examsQuery = examsQuery.where("groupId", "==", filters.groupId);
        }

        const [classesSnap, groupsSnap, examsSnap] = await Promise.all([
          teacherRef.collection("classes").get(),
          teacherRef.collection("groups").get(),
          examsQuery.get(),
        ]);

        const classMap = new Map<string, string>();
        classesSnap.docs.forEach((d) => classMap.set(d.id, (d.data().name as string) || ""));

        const groupMap = new Map<string, string>();
        groupsSnap.docs.forEach((d) => groupMap.set(d.id, (d.data().name as string) || ""));

        let allExams = examsSnap.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            teacherId: d.teacherId,
            name: (d.name as string) || "امتحان بدون اسم",
            classId: (d.classId as string) || "",
            className: classMap.get(d.classId) || (d.className as string) || "",
            groupId: (d.groupId as string) || "",
            groupName: groupMap.get(d.groupId) || (d.groupName as string) || "",
            finalGrade: Number(d.finalGrade) || 100,
            examDate: (d.examDate as string) || "",
            createdAt: (d.createdAt as string) || "",
            updatedAt: d.updatedAt as string | undefined,
            resultsCount: 0,
            averageGrade: 0,
          };
        });

        // In-memory text search filter if query provided
        if (filters.query?.trim()) {
          const q = filters.query.toLowerCase().trim();
          allExams = allExams.filter(
            (e) =>
              e.name.toLowerCase().includes(q) ||
              e.groupName?.toLowerCase().includes(q) ||
              e.className?.toLowerCase().includes(q)
          );
        }

        // Sort by examDate desc, then createdAt desc
        allExams.sort((a, b) => {
          const dateCmp = (b.examDate || "").localeCompare(a.examDate || "");
          if (dateCmp !== 0) return dateCmp;
          return (b.createdAt || "").localeCompare(a.createdAt || "");
        });

        // Pagination
        const page = Math.max(1, Number(filters.page) || 1);
        const pageSize = Math.max(1, Number(filters.pageSize) || 10);
        const totalCount = allExams.length;
        const totalPages = Math.ceil(totalCount / pageSize) || 1;
        const startIndex = (page - 1) * pageSize;
        const paginated = allExams.slice(startIndex, startIndex + pageSize);

        // Only load exam results for the paginated exams on the current page
        const pageExamIds = paginated.map((e) => e.id);
        if (pageExamIds.length > 0) {
          // Fetch results in chunks of 10 for Firestore 'in' query
          const chunk = pageExamIds.slice(0, 10);
          const resultsSnap = await teacherRef
            .collection("examResults")
            .where("examId", "in", chunk)
            .get();

          const examStatsMap = new Map<string, { count: number; totalScore: number }>();
          resultsSnap.docs.forEach((d) => {
            const r = d.data();
            const exId = (r.examId as string) || "";
            if (exId) {
              const current = examStatsMap.get(exId) || { count: 0, totalScore: 0 };
              current.count += 1;
              current.totalScore += Number(r.grade) || 0;
              examStatsMap.set(exId, current);
            }
          });

          paginated.forEach((ex) => {
            const stat = examStatsMap.get(ex.id);
            if (stat && stat.count > 0) {
              ex.resultsCount = stat.count;
              ex.averageGrade = Math.round((stat.totalScore / stat.count) * 10) / 10;
            }
          });
        }

        return {
          success: true,
          exams: paginated,
          totalCount,
          totalPages,
          currentPage: page,
          pageSize,
        };
      }
    );
  } catch (error) {
    console.error("Error fetching exams:", error);
    return {
      success: false,
      exams: [],
      totalCount: 0,
      totalPages: 1,
      currentPage: 1,
      pageSize: 10,
      error: error instanceof Error ? error.message : "فشل جلب قائمة الامتحانات",
    };
  }
}

// 3. GET SINGLE EXAM
export async function getExam(examId: string): Promise<{
  success: boolean;
  exam?: ExamListItem;
  error?: string;
}> {
  try {
    const { teacherRef } = await checkPermission("exams", "view");

    const doc = await teacherRef.collection("exams").doc(examId).get();
    if (!doc.exists || doc.data()?.isDeleted) {
      return { success: false, error: "الامتحان غير موجود أو تم حذفه" };
    }

    const d = doc.data()!;
    let className = (d.className as string) || "";
    let groupName = (d.groupName as string) || "";

    if (!className && d.classId) {
      const cDoc = await teacherRef.collection("classes").doc(d.classId).get();
      if (cDoc.exists) className = (cDoc.data()?.name as string) || "";
    }
    if (!groupName && d.groupId) {
      const gDoc = await teacherRef.collection("groups").doc(d.groupId).get();
      if (gDoc.exists) groupName = (gDoc.data()?.name as string) || "";
    }

    return {
      success: true,
      exam: {
        id: doc.id,
        name: (d.name as string) || "",
        classId: (d.classId as string) || "",
        className,
        groupId: (d.groupId as string) || "",
        groupName,
        finalGrade: Number(d.finalGrade) || 100,
        examDate: (d.examDate as string) || "",
        createdAt: (d.createdAt as string) || "",
        updatedAt: d.updatedAt as string | undefined,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل جلب بيانات الامتحان",
    };
  }
}

// 4. CREATE EXAM
export async function createExam(rawData: ExamFormData): Promise<{
  success: boolean;
  examId?: string;
  error?: string;
}> {
  try {
    const parsed = examSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((i) => i.message).join("، "),
      };
    }

    const data = parsed.data;
    const { teacherId, actorId, actorName, actorRole, teacherRef } = await checkPermission(
      "exams",
      "create"
    );

    // Fetch class and group names to denormalize for fast display
    const [classDoc, groupDoc] = await Promise.all([
      teacherRef.collection("classes").doc(data.classId).get(),
      teacherRef.collection("groups").doc(data.groupId).get(),
    ]);

    const className = classDoc.exists ? (classDoc.data()?.name as string) || "" : "";
    const groupName = groupDoc.exists ? (groupDoc.data()?.name as string) || "" : "";

    const now = new Date().toISOString();
    const payload = {
      teacherId,
      name: data.name,
      classId: data.classId,
      className,
      groupId: data.groupId,
      groupName,
      finalGrade: data.finalGrade,
      examDate: data.examDate,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
      createdBy: actorId,
    };

    const docRef = await teacherRef.collection("exams").add(payload);

    // Audit log
    try {
      await teacherRef.collection("auditLogs").add({
        action: "exam_created",
        entity: "exam",
        entityId: docRef.id,
        actorId,
        actorName,
        actorRole,
        details: {
          name: data.name,
          classId: data.classId,
          groupId: data.groupId,
          finalGrade: data.finalGrade,
          examDate: data.examDate,
        },
        timestamp: now,
      });
    } catch {
      // Ignored
    }

    invalidateCacheTags(`exams:${teacherId}`, `dashboard:${teacherId}`);
    revalidatePath("/exams");
    revalidatePath("/dashboard");

    return { success: true, examId: docRef.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل إنشاء الامتحان",
    };
  }
}

// 5. UPDATE EXAM
export async function updateExam(
  examId: string,
  rawData: ExamFormData
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const parsed = examSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((i) => i.message).join("، "),
      };
    }

    const data = parsed.data;
    const { teacherId, actorId, actorName, actorRole, teacherRef } = await checkPermission("exams", "edit");

    const examRef = teacherRef.collection("exams").doc(examId);
    const existing = await examRef.get();
    if (!existing.exists || existing.data()?.isDeleted) {
      return { success: false, error: "الامتحان غير موجود" };
    }

    const oldData = existing.data()!;
    const oldFinalGrade = Number(oldData.finalGrade) || 100;

    const [classDoc, groupDoc] = await Promise.all([
      teacherRef.collection("classes").doc(data.classId).get(),
      teacherRef.collection("groups").doc(data.groupId).get(),
    ]);

    const className = classDoc.exists ? (classDoc.data()?.name as string) || "" : "";
    const groupName = groupDoc.exists ? (groupDoc.data()?.name as string) || "" : "";

    const now = new Date().toISOString();
    await examRef.update({
      name: data.name,
      classId: data.classId,
      className,
      groupId: data.groupId,
      groupName,
      finalGrade: data.finalGrade,
      examDate: data.examDate,
      updatedAt: now,
    });

    // If finalGrade changed, update percentages in existing results
    if (data.finalGrade !== oldFinalGrade) {
      const resultsSnap = await teacherRef
        .collection("examResults")
        .where("examId", "==", examId)
        .get();

      if (!resultsSnap.empty) {
        const batch = adminDb!.batch();
        resultsSnap.docs.forEach((d) => {
          const grade = Number(d.data().grade) || 0;
          const percentage = Math.round((grade / data.finalGrade) * 100);
          batch.update(d.ref, {
            percentage,
            updatedAt: now,
          });
        });
        await batch.commit();
      }
    }

    // Audit log
    try {
      await teacherRef.collection("auditLogs").add({
        action: "exam_updated",
        entity: "exam",
        entityId: examId,
        actorId,
        actorName,
        actorRole,
        details: {
          name: data.name,
          finalGrade: data.finalGrade,
          examDate: data.examDate,
        },
        timestamp: now,
      });
    } catch {
      // Ignored
    }

    invalidateCacheTags(`exams:${teacherId}`, `dashboard:${teacherId}`);
    revalidatePath("/exams");
    revalidatePath(`/exams/${examId}`);
    revalidatePath(`/exams/${examId}/edit`);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل تحديث الامتحان",
    };
  }
}

// 6. DELETE EXAM (Soft delete)
export async function deleteExam(examId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { teacherId, actorId, actorName, actorRole, teacherRef } = await checkPermission("exams", "delete");

    const examRef = teacherRef.collection("exams").doc(examId);
    const existing = await examRef.get();
    if (!existing.exists) {
      return { success: false, error: "الامتحان غير موجود" };
    }

    const now = new Date().toISOString();
    await examRef.update({
      isDeleted: true,
      deletedAt: now,
      deletedBy: actorId,
    });

    // Audit log
    try {
      await teacherRef.collection("auditLogs").add({
        action: "exam_deleted",
        entity: "exam",
        entityId: examId,
        actorId,
        actorName,
        actorRole,
        timestamp: now,
      });
    } catch {
      // Ignored
    }

    invalidateCacheTags(`exams:${teacherId}`, `dashboard:${teacherId}`);
    revalidatePath("/exams");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل حذف الامتحان",
    };
  }
}

// 7. GET EXAM STUDENTS AND GRADES FOR BULK ENTRY
export interface StudentExamGradeRow {
  studentId: string;
  studentName: string;
  studentPhone: string;
  grade: number | null;
  notes: string;
  isRecorded: boolean;
}

export interface ExamGradesData {
  exam: ExamListItem;
  students: StudentExamGradeRow[];
}

export async function getExamGrades(examId: string): Promise<{
  success: boolean;
  data?: ExamGradesData;
  error?: string;
}> {
  try {
    const { teacherRef } = await checkPermission("exams", "view");

    // 1. Fetch Exam
    const examDoc = await teacherRef.collection("exams").doc(examId).get();
    if (!examDoc.exists || examDoc.data()?.isDeleted) {
      return { success: false, error: "الامتحان غير موجود" };
    }

    const examData = examDoc.data()!;
    const groupId = (examData.groupId as string) || "";

    // 2. Fetch Group & Class Names if not present
    let groupName = (examData.groupName as string) || "";
    let className = (examData.className as string) || "";
    if (!groupName && groupId) {
      const gDoc = await teacherRef.collection("groups").doc(groupId).get();
      if (gDoc.exists) {
        groupName = (gDoc.data()?.name as string) || "";
        className = (gDoc.data()?.className as string) || "";
      }
    }

    // 3. Fetch Registered Students in this group
    const studentsSnap = await teacherRef
      .collection("students")
      .where("groupId", "==", groupId)
      .where("isDeleted", "!=", true)
      .get();

    // 4. Fetch existing Exam Results
    const resultsSnap = await teacherRef
      .collection("examResults")
      .where("examId", "==", examId)
      .get();

    const resultsMap = new Map<string, { grade: number; notes: string }>();
    resultsSnap.docs.forEach((d) => {
      const r = d.data();
      const sId = (r.studentId as string) || "";
      if (sId) {
        resultsMap.set(sId, {
          grade: Number(r.grade),
          notes: (r.notes as string) || "",
        });
      }
    });

    // 5. Build merged Student Grade rows
    const studentRows: StudentExamGradeRow[] = studentsSnap.docs.map((doc) => {
      const s = doc.data();
      const existingRes = resultsMap.get(doc.id);

      return {
        studentId: doc.id,
        studentName: (s.name as string) || "طالب",
        studentPhone: (s.phone as string) || "",
        grade: existingRes !== undefined ? existingRes.grade : null,
        notes: existingRes !== undefined ? existingRes.notes : "",
        isRecorded: existingRes !== undefined,
      };
    });

    // Sort alphabetically by student name
    studentRows.sort((a, b) => a.studentName.localeCompare(b.studentName, "ar"));

    const examItem: ExamListItem = {
      id: examDoc.id,
      name: (examData.name as string) || "امتحان",
      classId: (examData.classId as string) || "",
      className,
      groupId,
      groupName,
      finalGrade: Number(examData.finalGrade) || 100,
      examDate: (examData.examDate as string) || "",
      createdAt: (examData.createdAt as string) || "",
      resultsCount: resultsMap.size,
    };

    return {
      success: true,
      data: {
        exam: examItem,
        students: studentRows,
      },
    };
  } catch (error) {
    console.error("Error fetching exam grades:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل جلب بيانات رصد الدرجات",
    };
  }
}

// 8. BULK SAVE EXAM GRADES (Atomic Batch Write)
export async function bulkSaveExamGrades({
  examId,
  grades,
}: {
  examId: string;
  grades: Array<{
    studentId: string;
    grade: number | null;
    notes?: string;
  }>;
}): Promise<{
  success: boolean;
  message: string;
  savedCount?: number;
  error?: string;
}> {
  try {
    const { teacherId, actorId, actorName, actorRole, teacherRef } = await checkPermission("exams", "edit");

    // 1. Fetch Exam to obtain finalGrade
    const examDoc = await teacherRef.collection("exams").doc(examId).get();
    if (!examDoc.exists || examDoc.data()?.isDeleted) {
      return { success: false, message: "الامتحان غير موجود", error: "الامتحان غير موجود" };
    }

    const finalGrade = Number(examDoc.data()?.finalGrade) || 100;
    const now = new Date().toISOString();

    // 2. Validate all grades do not exceed finalGrade or be negative
    for (const item of grades) {
      if (item.grade !== null) {
        if (item.grade < 0) {
          return { success: false, message: "لا يمكن إدخال درجات سالبة" };
        }
        if (item.grade > finalGrade) {
          return {
            success: false,
            message: `الدرجة (${item.grade}) تتجاوز الدرجة النهائية (${finalGrade})`,
          };
        }
      }
    }

    // 3. Batch Write: using composite key `${examId}_${studentId}` for uniqueness
    const batch = adminDb!.batch();
    let savedCount = 0;

    for (const item of grades) {
      const docId = `${examId}_${item.studentId}`;
      const resRef = teacherRef.collection("examResults").doc(docId);

      if (item.grade !== null) {
        savedCount++;
        const percentage = Math.round((item.grade / finalGrade) * 100);

        batch.set(
          resRef,
          {
            examId,
            studentId: item.studentId,
            grade: item.grade,
            percentage,
            notes: (item.notes || "").trim(),
            updatedAt: now,
            savedBy: actorId,
          },
          { merge: true }
        );
      }
    }

    await batch.commit();

    // Audit log
    try {
      await teacherRef.collection("auditLogs").add({
        action: "exam_grades_bulk_saved",
        entity: "exam",
        entityId: examId,
        actorId,
        actorName,
        actorRole,
        details: {
          examName: examDoc.data()?.name,
          finalGrade,
          savedCount,
        },
        timestamp: now,
      });
    } catch {
      // Ignored
    }

    invalidateCacheTags(`exams:${teacherId}`, `students:${teacherId}`);
    revalidatePath("/exams");
    revalidatePath(`/exams/${examId}`);
    revalidatePath(`/students`);

    return {
      success: true,
      message: `تم حفظ درجات (${savedCount}) طالب بنجاح!`,
      savedCount,
    };
  } catch (error) {
    console.error("Error bulk saving exam grades:", error);
    return {
      success: false,
      message: "فشل حفظ الدرجات",
      error: error instanceof Error ? error.message : "خطأ غير متوقع",
    };
  }
}

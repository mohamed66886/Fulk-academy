"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { studentSchema, type StudentFormData } from "@/lib/validators/student";
import { normalizeArabic, buildStudentSearchIndex } from "@/lib/utils/search";
import type { Student, StudentStatus } from "@/types";

import { checkPermission } from "@/lib/auth/permissions";
import { logAction } from "@/lib/audit/logger";
import { withCache, invalidateCacheTags } from "@/lib/cache/server-cache";

export interface StudentListItem {
  id: string;
  name: string;
  phone: string;
  classId: string;
  className: string;
  groupId: string;
  groupName: string;
  parentName: string;
  parentPhone: string;
  photoUrl?: string;
  status: StudentStatus;
  paymentStatus: "paid" | "partial" | "unpaid";
  finalPrice: number;
  discount: number;
  createdAt: string;
}

export interface StudentsQueryParams {
  search?: string;
  classId?: string;
  groupId?: string;
  status?: "all" | "active" | "blocked";
  sortBy?: "name" | "createdAt";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface StudentsQueryResponse {
  success: boolean;
  students: StudentListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error?: string;
}

// 1. Get filtered & paginated students list
export async function getStudents(
  params: StudentsQueryParams = {}
): Promise<StudentsQueryResponse> {
  try {
    const { teacherRef, teacherId } = await checkPermission("students", "view");

    const cacheKey = `students:${teacherId}:${JSON.stringify(params)}`;
    return await withCache(
      cacheKey,
      [`students:${teacherId}`],
      30,
      async () => {
        const page = Math.max(1, params.page || 1);
        const pageSize =
          params.pageSize && [20, 50, 100].includes(params.pageSize) ? params.pageSize : 20;
        const sortBy = params.sortBy || "createdAt";
        const sortOrder = params.sortOrder || "desc";

    // 1. Fetch classes & groups for label mapping
    const [classesSnap, groupsSnap] = await Promise.all([
      teacherRef.collection("classes").where("deletedAt", "==", null).get(),
      teacherRef.collection("groups").where("deletedAt", "==", null).get(),
    ]);

    const classMap = new Map<string, string>();
    classesSnap.docs.forEach((d) => classMap.set(d.id, (d.data().name as string) || "—"));

    const groupMap = new Map<string, string>();
    groupsSnap.docs.forEach((d) => groupMap.set(d.id, (d.data().name as string) || "—"));

    const currentMonth = new Date().toISOString().slice(0, 7); // e.g. "2026-09"

    // 2. Build active students query
    let query = teacherRef.collection("students").where("deletedAt", "==", null);

    if (params.classId && params.classId !== "all") {
      query = query.where("classId", "==", params.classId);
    }
    if (params.groupId && params.groupId !== "all") {
      query = query.where("groupId", "==", params.groupId);
    }
    if (params.status && params.status !== "all") {
      query = query.where("status", "==", params.status);
    }

    let paginatedDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
    let totalCount = 0;
    let totalPages = 1;

    // Fast path: When no text search is provided, use direct Firestore cursor-based limit
    if (!params.search || !params.search.trim()) {
      try {
        const countSnap = await query.count().get();
        totalCount = countSnap.data().count;
      } catch {
        // Fallback for count if aggregation query fails
      }
      totalPages = Math.ceil(totalCount / pageSize) || 1;

      try {
        let pagedQuery = query.orderBy(sortBy, sortOrder);

        if (page > 1) {
          const skipCount = (page - 1) * pageSize;
          const skipSnap = await pagedQuery.limit(skipCount).get();
          if (!skipSnap.empty) {
            const lastVisible = skipSnap.docs[skipSnap.docs.length - 1];
            if (lastVisible) {
              pagedQuery = pagedQuery.startAfter(lastVisible);
            }
          }
        }

        const studentsSnap = await pagedQuery.limit(pageSize).get();
        paginatedDocs = studentsSnap.docs;
      } catch (indexError) {
        console.warn("Firestore index error in getStudents, using memory-sort fallback:", indexError);
        const allSnap = await query.get();
        const allDocs = [...allSnap.docs];
        totalCount = allDocs.length;
        totalPages = Math.ceil(totalCount / pageSize) || 1;

        allDocs.sort((a, b) => {
          const dataA = a.data();
          const dataB = b.data();
          if (sortBy === "name") {
            const nameA = (dataA.name as string) || "";
            const nameB = (dataB.name as string) || "";
            return sortOrder === "asc"
              ? nameA.localeCompare(nameB, "ar")
              : nameB.localeCompare(nameA, "ar");
          }
          const dateA = (dataA.createdAt as string) || "";
          const dateB = (dataB.createdAt as string) || "";
          return sortOrder === "asc" ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
        });

        const startIndex = (page - 1) * pageSize;
        paginatedDocs = allDocs.slice(startIndex, startIndex + pageSize);
      }
    } else {
      // Text search path: fetch filtered subset
      const studentsSnap = await query.get();
      const q = normalizeArabic(params.search.trim());
      const rawQ = params.search.trim().replace(/\s+/g, "");

      const matchedDocs = studentsSnap.docs.filter((doc) => {
        const d = doc.data();
        const searchIdx = (d.searchIndex as string) || "";
        const name = normalizeArabic((d.name as string) || "");
        const phone = (d.phone as string) || "";
        const parentPhone = (d.parentPhone as string) || "";
        const parentName = normalizeArabic((d.parentName as string) || "");

        return (
          searchIdx.includes(q) ||
          name.includes(q) ||
          phone.includes(rawQ) ||
          parentPhone.includes(rawQ) ||
          parentName.includes(q)
        );
      });

      totalCount = matchedDocs.length;
      totalPages = Math.ceil(totalCount / pageSize) || 1;

      // Sort matched docs
      matchedDocs.sort((a, b) => {
        const dataA = a.data();
        const dataB = b.data();
        if (sortBy === "name") {
          const nameA = (dataA.name as string) || "";
          const nameB = (dataB.name as string) || "";
          return sortOrder === "asc"
            ? nameA.localeCompare(nameB, "ar")
            : nameB.localeCompare(nameA, "ar");
        }
        const dateA = (dataA.createdAt as string) || "";
        const dateB = (dataB.createdAt as string) || "";
        return sortOrder === "asc" ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
      });

      const startIndex = (page - 1) * pageSize;
      paginatedDocs = matchedDocs.slice(startIndex, startIndex + pageSize);
    }

    // 3. Fetch current month payments ONLY for the paginated students on this page
    const pageStudentIds = paginatedDocs.map((d) => d.id);
    const paymentMap = new Map<string, "paid" | "partial" | "unpaid">();

    if (pageStudentIds.length > 0) {
      for (let i = 0; i < pageStudentIds.length; i += 10) {
        const chunk = pageStudentIds.slice(i, i + 10);
        const paymentsSnap = await teacherRef
          .collection("payments")
          .where("month", "==", currentMonth)
          .where("studentId", "in", chunk)
          .get();

        paymentsSnap.docs.forEach((doc) => {
          const p = doc.data();
          if (p.studentId) {
            paymentMap.set(p.studentId, p.status || "unpaid");
          }
        });
      }
    }

    const students: StudentListItem[] = paginatedDocs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: (data.name as string) || "",
        phone: (data.phone as string) || "",
        classId: (data.classId as string) || "",
        className: classMap.get(data.classId) || "—",
        groupId: (data.groupId as string) || "",
        groupName: groupMap.get(data.groupId) || "—",
        parentName: (data.parentName as string) || "",
        parentPhone: (data.parentPhone as string) || "",
        photoUrl: data.photoUrl as string | undefined,
        status: (data.status as StudentStatus) || "active",
        paymentStatus: paymentMap.get(doc.id) || "unpaid",
        finalPrice: Number(data.finalPrice) || 0,
        discount: Number(data.discount) || 0,
        createdAt: (data.createdAt as string) || new Date().toISOString(),
      };
    });

        return {
          success: true,
          students,
          totalCount,
          page,
          pageSize,
          totalPages,
        };
      }
    );
  } catch (error) {
    return {
      success: false,
      students: [],
      totalCount: 0,
      page: 1,
      pageSize: 20,
      totalPages: 1,
      error: error instanceof Error ? error.message : "فشل جلب قائمة الطلاب",
    };
  }
}

// 2. Get single student details
export async function getStudentById(studentId: string): Promise<{
  success: boolean;
  student?: Student & { className: string; groupName: string; teacherName: string };
  error?: string;
}> {
  try {
    const { teacherRef } = await checkPermission("students", "view");

    const studentDoc = await teacherRef.collection("students").doc(studentId).get();
    if (!studentDoc.exists) {
      return { success: false, error: "الطالب غير موجود" };
    }

    const data = studentDoc.data()!;
    if (data.deletedAt !== null && data.deletedAt !== undefined) {
      return { success: false, error: "تم نقل هذا الطالب لسلة المحذوفات" };
    }

    let className = "—";
    if (data.classId) {
      const classDoc = await teacherRef.collection("classes").doc(data.classId).get();
      if (classDoc.exists) {
        className = (classDoc.data()?.name as string) || "—";
      }
    }

    let groupName = "—";
    if (data.groupId) {
      const groupDoc = await teacherRef.collection("groups").doc(data.groupId).get();
      if (groupDoc.exists) {
        groupName = (groupDoc.data()?.name as string) || "—";
      }
    }

    let teacherName = "الأستاذ";
    try {
      const teacherDoc = await teacherRef.get();
      if (teacherDoc.exists) {
        teacherName = (teacherDoc.data()?.name as string) || "الأستاذ";
      }
    } catch {
      // Fallback
    }

    const student: Student & { className: string; groupName: string; teacherName: string } = {
      id: studentDoc.id,
      name: (data.name as string) || "",
      phone: (data.phone as string) || "",
      classId: (data.classId as string) || "",
      className,
      groupId: (data.groupId as string) || "",
      groupName,
      teacherName,
      parentName: (data.parentName as string) || "",
      parentPhone: (data.parentPhone as string) || "",
      photoUrl: data.photoUrl as string | undefined,
      qrToken: (data.qrToken as string) || "",
      parentQrToken: (data.parentQrToken as string) || "",
      groupPrice: Number(data.groupPrice) || 0,
      discount: Number(data.discount) || 0,
      finalPrice: Number(data.finalPrice) || 0,
      status: (data.status as StudentStatus) || "active",
      blockReason: data.blockReason as string | undefined,
      blockedAt: data.blockedAt as string | undefined,
      blockedBy: data.blockedBy as string | undefined,
      createdAt: (data.createdAt as string) || "",
      updatedAt: (data.updatedAt as string) || "",
    };

    return { success: true, student };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل جلب بيانات الطالب",
    };
  }
}

// 3. Create Student (Single Action parallel tokens generation & storage index)
export async function createStudent(data: StudentFormData): Promise<{
  success: boolean;
  studentId?: string;
  error?: string;
}> {
  try {
    const validated = studentSchema.safeParse(data);
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.issues[0]?.message || "بيانات الطالب غير صالحة",
      };
    }

    const { teacherRef, teacherId, actorId, actorName, actorRole } = await checkPermission(
      "students",
      "create"
    );

    // 1. Fetch group to obtain group price if not explicitly provided
    let baseGroupPrice = 0;
    const groupDoc = await teacherRef.collection("groups").doc(validated.data.groupId).get();
    if (groupDoc.exists) {
      baseGroupPrice = Number(groupDoc.data()?.price) || 0;
    }

    const discount = Number(validated.data.discount) || 0;
    const groupPrice =
      validated.data.groupPrice !== undefined ? validated.data.groupPrice : baseGroupPrice;
    const finalPrice = Math.max(0, groupPrice - discount);

    // 2. Parallel Token Generation:
    // qrToken: random unguessable UUID for student attendance
    // parentQrToken: cryptographically random 48-char hex token without any student identifier
    const qrToken = randomBytes(3).toString("hex");
    const parentQrToken = `prt_${randomBytes(24).toString("hex")}`;

    // 3. Build normalized Arabic search index
    const searchIndex = buildStudentSearchIndex({
      name: validated.data.name,
      phone: validated.data.phone,
      parentPhone: validated.data.parentPhone,
      parentName: validated.data.parentName,
    });

    const now = new Date().toISOString();

    const studentPayload = {
      name: validated.data.name,
      phone: validated.data.phone,
      classId: validated.data.classId,
      groupId: validated.data.groupId,
      parentName: validated.data.parentName,
      parentPhone: validated.data.parentPhone,
      photoUrl: validated.data.photoUrl || "",
      qrToken,
      parentQrToken,
      groupPrice,
      discount,
      finalPrice,
      status: validated.data.status,
      searchIndex,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      deletedBy: null,
    };

    const docRef = await teacherRef.collection("students").add(studentPayload);

    // Audit Log
    try {
      await teacherRef.collection("auditLogs").add({
        action: "create",
        entity: "student",
        entityId: docRef.id,
        actorId,
        actorName,
        actorRole,
        details: {
          studentName: validated.data.name,
          classId: validated.data.classId,
          groupId: validated.data.groupId,
          finalPrice,
        },
        timestamp: now,
      });
    } catch {
      // Non-blocking
    }

    invalidateCacheTags(
      `students:${teacherId}`,
      `dashboard:${teacherId}`,
      `classes:${teacherId}`,
      `groups:${teacherId}`
    );
    revalidatePath("/students");
    revalidatePath("/dashboard");
    revalidatePath(`/groups/${validated.data.groupId}`);
    revalidatePath(`/classes/${validated.data.classId}`);

    return { success: true, studentId: docRef.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل إضافة الطالب",
    };
  }
}

// 4. Update Student
export async function updateStudent(
  studentId: string,
  data: StudentFormData
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const validated = studentSchema.safeParse(data);
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.issues[0]?.message || "بيانات الطالب غير صالحة",
      };
    }

    const { teacherRef, teacherId, actorId, actorName, actorRole } = await checkPermission("students", "edit");
    const studentRef = teacherRef.collection("students").doc(studentId);
    const existingSnap = await studentRef.get();

    if (!existingSnap.exists) {
      return { success: false, error: "الطالب غير موجود" };
    }

    const existingData = existingSnap.data()!;

    // Recalculate price
    const discount = Number(validated.data.discount) || 0;
    const groupPrice =
      validated.data.groupPrice !== undefined
        ? validated.data.groupPrice
        : Number(existingData.groupPrice) || 0;
    const finalPrice = Math.max(0, groupPrice - discount);

    // Rebuild search index
    const searchIndex = buildStudentSearchIndex({
      name: validated.data.name,
      phone: validated.data.phone,
      parentPhone: validated.data.parentPhone,
      parentName: validated.data.parentName,
    });

    const now = new Date().toISOString();

    const updatePayload = {
      name: validated.data.name,
      phone: validated.data.phone,
      classId: validated.data.classId,
      groupId: validated.data.groupId,
      parentName: validated.data.parentName,
      parentPhone: validated.data.parentPhone,
      photoUrl:
        validated.data.photoUrl !== undefined
          ? validated.data.photoUrl
          : existingData.photoUrl || "",
      groupPrice,
      discount,
      finalPrice,
      status: validated.data.status,
      blockReason: validated.data.blockReason || null,
      searchIndex,
      updatedAt: now,
    };

    await studentRef.update(updatePayload);

    // Audit Log
    try {
      await teacherRef.collection("auditLogs").add({
        action: "update",
        entity: "student",
        entityId: studentId,
        actorId,
        actorName,
        actorRole,
        details: {
          updatedFields: Object.keys(updatePayload),
        },
        timestamp: now,
      });
    } catch {
      // Non-blocking
    }

    invalidateCacheTags(
      `students:${teacherId}`,
      `dashboard:${teacherId}`,
      `classes:${teacherId}`,
      `groups:${teacherId}`
    );
    revalidatePath("/students");
    revalidatePath(`/students/${studentId}`);
    revalidatePath(`/students/${studentId}/edit`);
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل تعديل بيانات الطالب",
    };
  }
}

// 5. Soft Delete Student
export async function deleteStudent(studentId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { teacherRef, teacherId, actorId, actorName, actorRole } = await checkPermission(
      "students",
      "delete"
    );
    const studentRef = teacherRef.collection("students").doc(studentId);
    const existingSnap = await studentRef.get();

    if (!existingSnap.exists) {
      return { success: false, error: "الطالب غير موجود" };
    }

    const now = new Date().toISOString();
    await studentRef.update({
      deletedAt: now,
      deletedBy: actorId,
      updatedAt: now,
    });

    // Audit Log
    try {
      await teacherRef.collection("auditLogs").add({
        action: "soft_delete",
        entity: "student",
        entityId: studentId,
        actorId,
        actorName,
        actorRole,
        details: {
          studentName: existingSnap.data()?.name,
        },
        timestamp: now,
      });
    } catch {
      // Non-blocking
    }

    invalidateCacheTags(
      `students:${teacherId}`,
      `dashboard:${teacherId}`,
      `classes:${teacherId}`,
      `groups:${teacherId}`
    );
    revalidatePath("/students");
    revalidatePath("/dashboard");
    revalidatePath("/trash");

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل حذف الطالب",
    };
  }
}

// 6. Block/Unblock Student Toggle
export async function toggleStudentBlock(
  studentId: string,
  blockReason?: string
): Promise<{
  success: boolean;
  newStatus?: StudentStatus;
  error?: string;
}> {
  try {
    const { teacherRef, teacherId, actorId, actorName, actorRole } = await checkPermission(
      "students",
      "delete"
    );
    const studentRef = teacherRef.collection("students").doc(studentId);
    const snap = await studentRef.get();

    if (!snap.exists) {
      return { success: false, error: "الطالب غير موجود" };
    }

    const currentStatus = snap.data()?.status as StudentStatus;
    const newStatus: StudentStatus = currentStatus === "blocked" ? "active" : "blocked";
    const now = new Date().toISOString();

    await studentRef.update({
      status: newStatus,
      blockReason: newStatus === "blocked" ? blockReason || "حظر يدوي من قبل الإدارة" : null,
      blockedAt: newStatus === "blocked" ? now : null,
      blockedBy: newStatus === "blocked" ? actorId : null,
      updatedAt: now,
    });

    await logAction({
      teacherRef,
      actorId,
      actorName,
      actorRole,
      action: newStatus === "blocked" ? "BLOCK_STUDENT" : "UNBLOCK_STUDENT",
      entityType: "student",
      entityId: studentId,
      description:
        newStatus === "blocked"
          ? `تم حظر الطالب ${snap.data()?.name || ""}: ${blockReason || "حظر يدوي"}`
          : `تم إلغاء حظر الطالب ${snap.data()?.name || ""}`,
      metadata: { blockReason },
    });

    invalidateCacheTags(`students:${teacherId}`, `dashboard:${teacherId}`);
    revalidatePath(`/students/${studentId}`);
    revalidatePath("/students");
    revalidatePath("/blocked");

    return { success: true, newStatus };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل تغيير حالة الطالب",
    };
  }
}

export interface BlockedStudentItem {
  id: string;
  name: string;
  phone: string;
  parentName: string;
  parentPhone: string;
  className: string;
  groupName: string;
  blockReason: string;
  blockedAt: string;
  blockedBy: string;
}

// 7. Get Blocked Students
export async function getBlockedStudents(): Promise<{
  success: boolean;
  students: BlockedStudentItem[];
  error?: string;
}> {
  try {
    const { teacherRef } = await checkPermission("students", "view");

    const [blockedSnap, classesSnap, groupsSnap] = await Promise.all([
      teacherRef
        .collection("students")
        .where("status", "==", "blocked")
        .where("deletedAt", "==", null)
        .get(),
      teacherRef.collection("classes").where("deletedAt", "==", null).get(),
      teacherRef.collection("groups").where("deletedAt", "==", null).get(),
    ]);

    const classMap = new Map<string, string>();
    classesSnap.docs.forEach((d) => classMap.set(d.id, (d.data().name as string) || "—"));

    const groupMap = new Map<string, string>();
    groupsSnap.docs.forEach((d) => groupMap.set(d.id, (d.data().name as string) || "—"));

    const students: BlockedStudentItem[] = blockedSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: (data.name as string) || "",
        phone: (data.phone as string) || "",
        parentName: (data.parentName as string) || "",
        parentPhone: (data.parentPhone as string) || "",
        className: data.classId ? classMap.get(data.classId) || "—" : "—",
        groupName: data.groupId ? groupMap.get(data.groupId) || "—" : "—",
        blockReason: (data.blockReason as string) || "حظر يدوي من قبل الإدارة",
        blockedAt: (data.blockedAt as string) || (data.updatedAt as string) || "",
        blockedBy: (data.blockedBy as string) || "الإدارة",
      };
    });

    students.sort((a, b) => (b.blockedAt || "").localeCompare(a.blockedAt || ""));

    return { success: true, students };
  } catch (error) {
    console.error("Error fetching blocked students:", error);
    return {
      success: false,
      students: [],
      error: error instanceof Error ? error.message : "فشل جلب قائمة الطلاب المحظورين",
    };
  }
}

// 8. Unblock Student Specifically
export async function unblockStudent(studentId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { teacherRef, teacherId, actorId, actorName, actorRole } = await checkPermission("students", "edit");

    const studentRef = teacherRef.collection("students").doc(studentId);
    const snap = await studentRef.get();

    if (!snap.exists) {
      return { success: false, error: "الطالب غير موجود" };
    }

    const studentName = (snap.data()?.name as string) || "طالب";
    const now = new Date().toISOString();

    await studentRef.update({
      status: "active",
      blockReason: null,
      blockedAt: null,
      blockedBy: null,
      updatedAt: now,
    });

    await logAction({
      teacherRef,
      actorId,
      actorName,
      actorRole,
      action: "UNBLOCK_STUDENT",
      entityType: "student",
      entityId: studentId,
      description: `تم إلغاء حظر الطالب ${studentName} وإعادة حسابه للنشاط`,
      metadata: { studentName },
    });

    invalidateCacheTags(`students:${teacherId}`, `dashboard:${teacherId}`);
    revalidatePath(`/students/${studentId}`);
    revalidatePath("/students");
    revalidatePath("/blocked");

    return { success: true };
  } catch (error) {
    console.error("Error unblocking student:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل إلغاء حظر الطالب",
    };
  }
}

// 7. Student Attendance Tab Data
export interface StudentAttendanceSummary {
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  attendanceRate: number;
  records: Array<{
    id: string;
    sessionId?: string;
    date: string;
    startTime: string;
    status: "present" | "absent" | "late";
    source: string;
    scannedAt?: string;
    notes?: string;
  }>;
}

export async function getStudentAttendance(studentId: string): Promise<{
  success: boolean;
  data?: StudentAttendanceSummary;
  error?: string;
}> {
  try {
    const { teacherRef } = await checkPermission("attendance", "view");

    // Query attendance records for this student
    const recordsSnap = await teacherRef
      .collection("attendanceRecords")
      .where("studentId", "==", studentId)
      .limit(100)
      .get();

    let present = 0;
    let absent = 0;
    let late = 0;

    const records = recordsSnap.docs.map((doc) => {
      const d = doc.data();
      const status = (d.status as "present" | "absent" | "late") || "absent";
      if (status === "present") present++;
      else if (status === "absent") absent++;
      else if (status === "late") late++;

      return {
        id: doc.id,
        sessionId: d.sessionId as string | undefined,
        date: (d.date as string) || (d.scannedAt ? d.scannedAt.slice(0, 10) : "—"),
        startTime: (d.startTime as string) || (d.scannedAt ? d.scannedAt.slice(11, 16) : "—"),
        status,
        source: (d.source as string) || "manual",
        scannedAt: d.scannedAt as string | undefined,
        notes: d.notes as string | undefined,
      };
    });

    // Sort by date descending
    records.sort((a, b) => b.date.localeCompare(a.date));

    const total = present + absent + late;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

    return {
      success: true,
      data: {
        totalSessions: total,
        presentCount: present,
        absentCount: absent,
        lateCount: late,
        attendanceRate: rate,
        records,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل جلب سجل حضور الطالب",
    };
  }
}

// 8. Student Payments Tab Data
export interface StudentPaymentRecord {
  id: string;
  month: string;
  groupPrice: number;
  discount: number;
  required: number;
  paid: number;
  status: "paid" | "partial" | "unpaid";
  notes?: string;
  updatedAt: string;
}

export async function getStudentPayments(studentId: string): Promise<{
  success: boolean;
  payments: StudentPaymentRecord[];
  error?: string;
}> {
  try {
    const { teacherRef } = await checkPermission("students", "view");

    const snap = await teacherRef
      .collection("payments")
      .where("studentId", "==", studentId)
      .limit(24)
      .get();

    const payments: StudentPaymentRecord[] = snap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        month: (d.month as string) || "",
        groupPrice: Number(d.groupPrice) || 0,
        discount: Number(d.discount) || 0,
        required: Number(d.required) || 0,
        paid: Number(d.paid) || 0,
        status: (d.status as "paid" | "partial" | "unpaid") || "unpaid",
        notes: d.notes as string | undefined,
        updatedAt: (d.updatedAt as string) || (d.createdAt as string) || "",
      };
    });

    // Sort by month descending
    payments.sort((a, b) => b.month.localeCompare(a.month));

    return { success: true, payments };
  } catch (error) {
    return {
      success: false,
      payments: [],
      error: error instanceof Error ? error.message : "فشل جلب مدفوعات الطالب",
    };
  }
}

// 9. Student Exams Tab Data
export interface StudentExamRecord {
  id: string;
  examId?: string;
  examName: string;
  examDate: string;
  finalGrade: number;
  grade: number;
  percentage: number;
  notes?: string;
}

export async function getStudentExams(studentId: string): Promise<{
  success: boolean;
  exams: StudentExamRecord[];
  error?: string;
}> {
  try {
    const { teacherRef } = await checkPermission("students", "view");

    const resultsSnap = await teacherRef
      .collection("examResults")
      .where("studentId", "==", studentId)
      .limit(50)
      .get();

    // Map exam names
    const examsSnap = await teacherRef.collection("exams").get();
    const examDetailsMap = new Map<string, { name: string; date: string; maxGrade: number }>();
    examsSnap.docs.forEach((d) => {
      const ex = d.data();
      examDetailsMap.set(d.id, {
        name: (ex.name as string) || "امتحان",
        date: (ex.examDate as string) || "",
        maxGrade: Number(ex.finalGrade) || 100,
      });
    });

    const exams: StudentExamRecord[] = resultsSnap.docs.map((doc) => {
      const r = doc.data();
      const examInfo = r.examId ? examDetailsMap.get(r.examId) : undefined;
      const maxGrade = examInfo?.maxGrade || 100;
      const grade = Number(r.grade) || 0;
      const percentage =
        Number(r.percentage) || (maxGrade > 0 ? Math.round((grade / maxGrade) * 100) : 0);

      return {
        id: doc.id,
        examId: r.examId as string | undefined,
        examName: examInfo?.name || (r.examName as string) || "امتحان دوري",
        examDate: examInfo?.date || (r.date as string) || "",
        finalGrade: maxGrade,
        grade,
        percentage,
        notes: r.notes as string | undefined,
      };
    });

    // Sort by exam date descending
    exams.sort((a, b) => b.examDate.localeCompare(a.examDate));

    return { success: true, exams };
  } catch (error) {
    return {
      success: false,
      exams: [],
      error: error instanceof Error ? error.message : "فشل جلب نتائج امتحانات الطالب",
    };
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { getCairoCurrentDate, formatArabicTime } from "@/lib/utils/date";
import type { AttendanceSession, DayOfWeek, GroupSchedule } from "@/types";

import { checkPermission } from "@/lib/auth/permissions";
import { withCache, invalidateCacheTags } from "@/lib/cache/server-cache";

export interface AttendanceGroupOption {
  id: string;
  name: string;
  classId: string;
  className: string;
  schedule: GroupSchedule[];
  todaySchedule?: GroupSchedule;
  isCurrent: boolean;
  studentsCount: number;
}

export interface TodayAttendanceInfo {
  cairo: {
    dayOfWeek: DayOfWeek;
    formattedDate: string;
    arabicDayName: string;
    arabicFormattedDate: string;
    currentTime: string;
  };
  currentSuggestedGroups: AttendanceGroupOption[];
  todayScheduledGroups: AttendanceGroupOption[];
  allActiveGroups: AttendanceGroupOption[];
}

// 1. Get today's groups matching Cairo real-time and active sessions
export async function getTodayAttendanceInfo(): Promise<{
  success: boolean;
  data?: TodayAttendanceInfo;
  error?: string;
}> {
  try {
    const { teacherRef, teacherId } = await checkPermission("attendance", "view");
    const cairo = getCairoCurrentDate();

    // Helper to calculate minutes from "HH:mm"
    const parseMinutes = (timeStr: string) => {
      const [h, m] = (timeStr || "0:0").split(":").map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    const currentCairoMinutes = parseMinutes(cairo.currentTime);
    const timeBucket = Math.floor(currentCairoMinutes / 2);

    return await withCache(
      `today-attendance:${teacherId}:${cairo.formattedDate}:${timeBucket}`,
      [`attendance:${teacherId}`, `groups:${teacherId}`],
      30,
      async () => {
        // Fetch classes for names
        const classesSnap = await teacherRef.collection("classes").where("deletedAt", "==", null).get();
        const classMap = new Map<string, string>();
        classesSnap.docs.forEach((d) => classMap.set(d.id, (d.data().name as string) || "—"));

        // Fetch active groups
        const groupsSnap = await teacherRef
          .collection("groups")
          .where("deletedAt", "==", null)
          .where("status", "==", "active")
          .get();

        const groupOptions: AttendanceGroupOption[] = await Promise.all(
          groupsSnap.docs.map(async (doc) => {
            const d = doc.data();
            const schedule: GroupSchedule[] = (d.schedule as GroupSchedule[]) || [];

            // Check if group has a schedule today in Cairo
            const todaySch = schedule.find((s) => s.day === cairo.dayOfWeek);

            let isCurrent = false;
            if (todaySch) {
              const startMinutes = parseMinutes(todaySch.startTime);
              const endMinutes = parseMinutes(todaySch.endTime);
              // Group is considered "Current" if now is between [start - 30m, end + 30m]
              if (currentCairoMinutes >= startMinutes - 30 && currentCairoMinutes <= endMinutes + 30) {
                isCurrent = true;
              }
            }

            // Student count
            const countSnap = await teacherRef
              .collection("students")
              .where("groupId", "==", doc.id)
              .where("deletedAt", "==", null)
              .count()
              .get();

            return {
              id: doc.id,
              name: (d.name as string) || "",
              classId: (d.classId as string) || "",
              className: classMap.get(d.classId) || "—",
              schedule,
              todaySchedule: todaySch,
              isCurrent,
              studentsCount: countSnap.data().count,
            };
          })
        );

        const currentSuggestedGroups = groupOptions.filter((g) => g.isCurrent);
        const todayScheduledGroups = groupOptions.filter((g) => !!g.todaySchedule);

        return {
          success: true,
          data: {
            cairo,
            currentSuggestedGroups,
            todayScheduledGroups,
            allActiveGroups: groupOptions,
          },
        };
      }
    );
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل جلب بيانات مجموعات اليوم",
    };
  }
}

export interface SessionRecordItem {
  id: string;
  studentId: string;
  studentName: string;
  studentPhone: string;
  status: "present" | "absent" | "late";
  scannedAt: string;
  source: "camera" | "scanner" | "manual";
  notes?: string;
}

export interface SessionActiveDetails {
  session: AttendanceSession & { groupName: string; className: string };
  records: SessionRecordItem[];
  registeredStudents: Array<{
    id: string;
    name: string;
    phone: string;
    status: "active" | "blocked";
  }>;
}

// 2. Get or create today's attendance session for a group
export async function getOrCreateAttendanceSession(groupId: string): Promise<{
  success: boolean;
  data?: SessionActiveDetails;
  error?: string;
}> {
  try {
    const { teacherRef, actorId } = await checkPermission("attendance", "create");
    const cairo = getCairoCurrentDate();

    // Fetch group & class details
    const groupDoc = await teacherRef.collection("groups").doc(groupId).get();
    if (!groupDoc.exists) {
      return { success: false, error: "المجموعة الدراسية غير موجودة" };
    }

    const groupData = groupDoc.data()!;
    const groupName = (groupData.name as string) || "مجموعة";
    const classId = (groupData.classId as string) || "";

    let className = "—";
    if (classId) {
      const classDoc = await teacherRef.collection("classes").doc(classId).get();
      if (classDoc.exists) {
        className = (classDoc.data()?.name as string) || "—";
      }
    }

    // Fetch registered students under this group
    const studentsSnap = await teacherRef
      .collection("students")
      .where("groupId", "==", groupId)
      .where("deletedAt", "==", null)
      .get();

    const registeredStudents = studentsSnap.docs.map((d) => ({
      id: d.id,
      name: (d.data().name as string) || "",
      phone: (d.data().phone as string) || "",
      status: (d.data().status as "active" | "blocked") || "active",
    }));

    registeredStudents.sort((a, b) => a.name.localeCompare(b.name, "ar"));

    // Check if an existing session exists for today
    const existingSessionSnap = await teacherRef
      .collection("attendanceSessions")
      .where("groupId", "==", groupId)
      .where("date", "==", cairo.formattedDate)
      .limit(1)
      .get();

    let sessionDocRef: FirebaseFirestore.DocumentReference;
    let sessionData: AttendanceSession;

    if (!existingSessionSnap.empty) {
      const doc = existingSessionSnap.docs[0]!;
      sessionDocRef = doc.ref;
      const raw = doc.data();
      sessionData = {
        id: doc.id,
        groupId,
        date: raw.date || cairo.formattedDate,
        startTime: raw.startTime || cairo.currentTime,
        endTime: raw.endTime,
        status: (raw.status as "active" | "completed") || "active",
        totalStudents: registeredStudents.length,
        presentCount: Number(raw.presentCount) || 0,
        absentCount: Number(raw.absentCount) || 0,
        lateCount: Number(raw.lateCount) || 0,
        createdBy: raw.createdBy || actorId,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      };
    } else {
      // Create new session document
      const now = new Date().toISOString();
      const newPayload: Omit<AttendanceSession, "id"> = {
        groupId,
        date: cairo.formattedDate,
        startTime: cairo.currentTime,
        status: "active",
        totalStudents: registeredStudents.length,
        presentCount: 0,
        absentCount: 0,
        lateCount: 0,
        createdBy: actorId,
        createdAt: now,
        updatedAt: now,
      };

      sessionDocRef = await teacherRef.collection("attendanceSessions").add(newPayload);
      sessionData = {
        id: sessionDocRef.id,
        ...newPayload,
      };
    }

    // Fetch records in subcollection
    const recordsSnap = await sessionDocRef.collection("records").get();
    const records: SessionRecordItem[] = recordsSnap.docs.map((d) => {
      const r = d.data();
      return {
        id: d.id,
        studentId: (r.studentId as string) || d.id,
        studentName: (r.studentName as string) || "طالب",
        studentPhone: (r.studentPhone as string) || "",
        status: (r.status as "present" | "absent" | "late") || "present",
        scannedAt: (r.scannedAt as string) || "",
        source: (r.source as "camera" | "scanner" | "manual") || "camera",
        notes: r.notes as string | undefined,
      };
    });

    // Sort records by scannedAt descending
    records.sort((a, b) => b.scannedAt.localeCompare(a.scannedAt));

    return {
      success: true,
      data: {
        session: {
          ...sessionData,
          groupName,
          className,
        },
        records,
        registeredStudents,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل تهيئة جلسة الحضور",
    };
  }
}

export type ScanResultStatus =
  "success" | "already_recorded" | "wrong_group" | "blocked" | "not_found";

export interface ScanResultResponse {
  success: boolean;
  status: ScanResultStatus;
  message: string;
  studentId?: string;
  studentName?: string;
  studentPhone?: string;
  studentGroupName?: string;
  blockReason?: string;
  scannedAt?: string;
  source?: "camera" | "scanner" | "manual";
}

// 3. ATOMIC Scan Server Action
// Step 1: Decode & lookup student via qrToken
// Step 2: Validate student exists and is not deleted
// Step 3: Validate student is not blocked
// Step 4: Validate student belongs to this specific groupId
// Step 5: Validate student is not already recorded in this session
// Step 6: Atomic record creation with present status
export async function recordAttendanceScan({
  sessionId,
  groupId,
  qrToken,
  source = "camera",
  scannedAt,
}: {
  sessionId: string;
  groupId: string;
  qrToken: string;
  source?: "camera" | "scanner" | "manual";
  scannedAt?: string;
}): Promise<ScanResultResponse> {
  try {
    const cleanToken = (qrToken || "").trim();
    if (!cleanToken) {
      return {
        success: false,
        status: "not_found",
        message: "رمز المسح فارغ",
      };
    }

    const { teacherRef, actorId, actorName, actorRole } = await checkPermission(
      "attendance",
      "edit"
    );
    const sessionRef = teacherRef.collection("attendanceSessions").doc(sessionId);

    const sessionDoc = await sessionRef.get();
    if (!sessionDoc.exists) {
      return {
        success: false,
        status: "not_found",
        message: "جلسة الحضور غير موجودة",
      };
    }

    // Step 1 & 2: Lookup student by qrToken
    const studentsSnap = await teacherRef
      .collection("students")
      .where("qrToken", "==", cleanToken)
      .where("deletedAt", "==", null)
      .limit(1)
      .get();

    if (studentsSnap.empty) {
      return {
        success: false,
        status: "not_found",
        message: "رمز الـ QR غير صالح أو غير مرتبط بطالب مسجل",
      };
    }

    const studentDoc = studentsSnap.docs[0]!;
    const student = studentDoc.data();
    const studentId = studentDoc.id;
    const studentName = (student.name as string) || "طالب";
    const studentPhone = (student.phone as string) || "";

    // Step 3: Check if student is blocked
    if (student.status === "blocked") {
      const reason = (student.blockReason as string) || "حساب الطالب محظور من قبل الإدارة";
      return {
        success: false,
        status: "blocked",
        studentId,
        studentName,
        blockReason: reason,
        message: `تنبيه: الطالب "${studentName}" محظور وممنوع من الحضور! (${reason})`,
      };
    }

    // Step 4: Check if student belongs to this specific group
    if (student.groupId !== groupId) {
      let registeredGroupName = "مجموعة أخرى";
      if (student.groupId) {
        const grpDoc = await teacherRef.collection("groups").doc(student.groupId).get();
        if (grpDoc.exists) {
          registeredGroupName = (grpDoc.data()?.name as string) || "مجموعة أخرى";
        }
      }

      return {
        success: false,
        status: "wrong_group",
        studentId,
        studentName,
        studentGroupName: registeredGroupName,
        message: `تنبيه: الطالب "${studentName}" مسجل في "${registeredGroupName}" وليس في هذه المجموعة!`,
      };
    }

    // Step 5: Check if already recorded in this session (Duplicate prevention)
    const recordRef = sessionRef.collection("records").doc(studentId);
    const existingRecord = await recordRef.get();

    if (existingRecord.exists) {
      const rec = existingRecord.data()!;
      const scanTime = rec.scannedAt ? formatArabicTime(rec.scannedAt.slice(11, 16)) : "وقت سابق";
      return {
        success: false,
        status: "already_recorded",
        studentId,
        studentName,
        scannedAt: rec.scannedAt,
        message: `تم رصد حضور "${studentName}" مسبقاً في الساعة (${scanTime})`,
      };
    }

    // Step 6: Atomic Record Creation
    const now = new Date().toISOString();
    const cairo = getCairoCurrentDate();

    const recordPayload = {
      studentId,
      studentName,
      studentPhone,
      sessionId,
      groupId,
      status: "present",
      scannedAt: scannedAt || now,
      source,
    };

    // Use atomic transaction to write record and increment session present count
    await adminDb!.runTransaction(async (transaction) => {
      transaction.set(recordRef, recordPayload);

      // Mirror document for fast individual student queries
      const mirrorRef = teacherRef.collection("attendanceRecords").doc(`${sessionId}_${studentId}`);
      transaction.set(mirrorRef, {
        ...recordPayload,
        date: cairo.formattedDate,
        startTime: cairo.currentTime,
      });

      transaction.update(sessionRef, {
        presentCount: FieldValue.increment(1),
        updatedAt: now,
      });
    });

    // Audit log
    try {
      await teacherRef.collection("auditLogs").add({
        action: "attendance_scan",
        entity: "student",
        entityId: studentId,
        actorId,
        actorName,
        actorRole,
        details: {
          sessionId,
          groupId,
          studentName,
          source,
        },
        timestamp: now,
      });
    } catch {
      // Non-blocking
    }

    return {
      success: true,
      status: "success",
      studentId,
      studentName,
      studentPhone,
      scannedAt: now,
      source,
      message: `تم تسجيل حضور الطالب: ${studentName}`,
    };
  } catch (error) {
    return {
      success: false,
      status: "not_found",
      message: error instanceof Error ? error.message : "فشل تسجيل مسح الحضور",
    };
  }
}

// 4. Manual Attendance Recording (e.g. forgotten card or late manual entry)
export async function recordManualAttendance({
  sessionId,
  groupId,
  studentId,
  status = "present",
  notes,
}: {
  sessionId: string;
  groupId: string;
  studentId: string;
  status?: "present" | "late" | "absent";
  notes?: string;
}): Promise<{
  success: boolean;
  message: string;
  record?: SessionRecordItem;
  error?: string;
}> {
  try {
    const { teacherRef } = await checkPermission("attendance", "view");
    const sessionRef = teacherRef.collection("attendanceSessions").doc(sessionId);

    // Fetch student
    const studentDoc = await teacherRef.collection("students").doc(studentId).get();
    if (!studentDoc.exists) {
      return { success: false, message: "الطالب غير موجود" };
    }

    const student = studentDoc.data()!;
    if (student.status === "blocked") {
      return {
        success: false,
        message: `لا يمكن تسجيل حضور الطالب لأنه محظور (${student.blockReason || "محظور"})`,
      };
    }

    const studentName = (student.name as string) || "طالب";
    const studentPhone = (student.phone as string) || "";
    const now = new Date().toISOString();
    const cairo = getCairoCurrentDate();

    const recordRef = sessionRef.collection("records").doc(studentId);
    const existingSnap = await recordRef.get();

    const isAlreadyPresent = existingSnap.exists && existingSnap.data()?.status === "present";

    const recordPayload = {
      studentId,
      studentName,
      studentPhone,
      sessionId,
      groupId,
      status,
      scannedAt: now,
      source: "manual",
      notes: notes || "رصد يدوي",
    };

    await adminDb!.runTransaction(async (transaction) => {
      transaction.set(recordRef, recordPayload);

      const mirrorRef = teacherRef.collection("attendanceRecords").doc(`${sessionId}_${studentId}`);
      transaction.set(mirrorRef, {
        ...recordPayload,
        date: cairo.formattedDate,
        startTime: cairo.currentTime,
      });

      if (!isAlreadyPresent && status === "present") {
        transaction.update(sessionRef, {
          presentCount: FieldValue.increment(1),
          updatedAt: now,
        });
      } else if (!isAlreadyPresent && status === "late") {
        transaction.update(sessionRef, {
          lateCount: FieldValue.increment(1),
          updatedAt: now,
        });
      }
    });

    return {
      success: true,
      message: `تم رصد حضور "${studentName}" بنجاح`,
      record: {
        id: studentId,
        studentId,
        studentName,
        studentPhone,
        status,
        scannedAt: now,
        source: "manual",
        notes,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "فشل رصد الحضور اليدوي",
    };
  }
}

// 5. Complete Attendance Session & Automatically calculate absentees
export async function completeAttendanceSession(sessionId: string): Promise<{
  success: boolean;
  summary?: {
    totalStudents: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    attendanceRate: number;
  };
  error?: string;
}> {
  try {
    const { teacherRef, teacherId, actorId, actorName, actorRole } = await checkPermission(
      "attendance",
      "edit"
    );
    const sessionRef = teacherRef.collection("attendanceSessions").doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      return { success: false, error: "الجلسة غير موجودة" };
    }

    const sessionData = sessionDoc.data()!;
    const groupId = sessionData.groupId;
    const now = new Date().toISOString();
    const cairo = getCairoCurrentDate();

    // 1. Fetch all active students in this group
    const groupStudentsSnap = await teacherRef
      .collection("students")
      .where("groupId", "==", groupId)
      .where("deletedAt", "==", null)
      .get();

    // 2. Fetch all existing records in subcollection
    const existingRecordsSnap = await sessionRef.collection("records").get();
    const existingStudentIds = new Set<string>();
    let presentCount = 0;
    let lateCount = 0;

    existingRecordsSnap.docs.forEach((doc) => {
      existingStudentIds.add(doc.id);
      const st = doc.data().status;
      if (st === "present") presentCount++;
      else if (st === "late") lateCount++;
    });

    // 3. Any active registered student with no record is marked as "absent"
    const batch = adminDb!.batch();
    let absentCount = 0;

    groupStudentsSnap.docs.forEach((doc) => {
      const studentId = doc.id;
      if (!existingStudentIds.has(studentId)) {
        absentCount++;
        const sData = doc.data();
        const absentRecord = {
          studentId,
          studentName: sData.name || "طالب",
          studentPhone: sData.phone || "",
          sessionId,
          groupId,
          status: "absent",
          scannedAt: now,
          source: "system",
          notes: "غياب تلقائي عند إغلاق الجلسة",
        };

        const recRef = sessionRef.collection("records").doc(studentId);
        batch.set(recRef, absentRecord);

        const mirrorRef = teacherRef
          .collection("attendanceRecords")
          .doc(`${sessionId}_${studentId}`);
        batch.set(mirrorRef, {
          ...absentRecord,
          date: cairo.formattedDate,
          startTime: cairo.currentTime,
        });
      }
    });

    const totalStudents = groupStudentsSnap.docs.length;
    const attendanceRate =
      totalStudents > 0 ? Math.round(((presentCount + lateCount) / totalStudents) * 100) : 0;

    // 4. Update session document
    batch.update(sessionRef, {
      status: "completed",
      endTime: cairo.currentTime,
      totalStudents,
      presentCount,
      lateCount,
      absentCount,
      updatedAt: now,
    });

    await batch.commit();

    // Audit log
    try {
      await teacherRef.collection("auditLogs").add({
        action: "complete_attendance_session",
        entity: "attendanceSession",
        entityId: sessionId,
        actorId,
        actorName,
        actorRole,
        details: {
          groupId,
          totalStudents,
          presentCount,
          absentCount,
        },
        timestamp: now,
      });
    } catch {
      // Non-blocking
    }

    invalidateCacheTags(`attendance:${teacherId}`, `dashboard:${teacherId}`);
    revalidatePath("/attendance");
    revalidatePath("/dashboard");
    revalidatePath(`/groups/${groupId}`);

    return {
      success: true,
      summary: {
        totalStudents,
        presentCount,
        absentCount,
        lateCount,
        attendanceRate,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل إنهاء جلسة الحضور",
    };
  }
}

// =========================================================================
// 6. ATTENDANCE HISTORY & SESSION DETAILS
// =========================================================================

export interface AttendanceHistoryFilters {
  page?: number;
  pageSize?: number;
  groupId?: string;
  date?: string;
}

export interface AttendanceHistorySessionItem {
  id: string;
  groupId: string;
  groupName: string;
  classId: string;
  className: string;
  date: string;
  startTime: string;
  endTime?: string;
  status: "active" | "completed";
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  attendanceRate: number;
  createdAt?: string;
}

export interface AttendanceHistoryResult {
  sessions: AttendanceHistorySessionItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  groups: Array<{ id: string; name: string; className: string }>;
}

export async function getAttendanceHistory(filters: AttendanceHistoryFilters = {}): Promise<{
  success: boolean;
  data?: AttendanceHistoryResult;
  error?: string;
}> {
  try {
    const { teacherRef, teacherId } = await checkPermission("attendance", "view");

    return await withCache(
      `attendance-history:${teacherId}:${JSON.stringify(filters)}`,
      [`attendance:${teacherId}`],
      30,
      async () => {
        // 1. Fetch Teacher Groups for filtering dropdown
        const groupsSnap = await teacherRef.collection("groups").get();
        const groupsList: Array<{ id: string; name: string; className: string }> = [];
        const groupNameMap: Record<string, { name: string; className: string }> = {};

        groupsSnap.forEach((doc) => {
          const data = doc.data();
          if (!data.isDeleted) {
            const item = {
              id: doc.id,
              name: (data.name as string) || "مجموعة",
              className: (data.className as string) || "",
            };
            groupsList.push(item);
            groupNameMap[doc.id] = item;
          }
        });

        // 2. Fetch Sessions with query optimization
        let sessionsQuery: FirebaseFirestore.Query = teacherRef.collection("attendanceSessions");

        if (filters.groupId) {
          sessionsQuery = sessionsQuery.where("groupId", "==", filters.groupId);
        }

        if (filters.date) {
          sessionsQuery = sessionsQuery.where("date", "==", filters.date);
        }

        // Accurate count without reading full documents
        const countSnapshot = await sessionsQuery.count().get();
        const totalCount = countSnapshot.data().count;

        const page = Math.max(1, Number(filters.page) || 1);
        const pageSize = Math.max(1, Number(filters.pageSize) || 10);
        const totalPages = Math.ceil(totalCount / pageSize) || 1;

        // Order descending by date, then startTime with index fallback
        let sessionsDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
        try {
          let orderedQuery = sessionsQuery.orderBy("date", "desc").orderBy("startTime", "desc");
          const offset = (page - 1) * pageSize;
          const querySnapshot = await orderedQuery.offset(offset).limit(pageSize).get();
          sessionsDocs = querySnapshot.docs;
        } catch (queryErr) {
          console.warn("Index warning in getAttendanceHistory, falling back to memory sort:", queryErr);
          const allSessionsSnapshot = await sessionsQuery.get();
          const allDocs = allSessionsSnapshot.docs;
          allDocs.sort((a, b) => {
            const dateA = (a.data().date as string) || "";
            const dateB = (b.data().date as string) || "";
            const cmp = dateB.localeCompare(dateA);
            if (cmp !== 0) return cmp;
            const timeA = (a.data().startTime as string) || "";
            const timeB = (b.data().startTime as string) || "";
            return timeB.localeCompare(timeA);
          });
          const offset = (page - 1) * pageSize;
          sessionsDocs = allDocs.slice(offset, offset + pageSize);
        }

        // 3. Format results
        const paginatedSessions: AttendanceHistorySessionItem[] = [];

        sessionsDocs.forEach((doc) => {
          const d = doc.data();
          const gId = (d.groupId as string) || "";
          const grp = groupNameMap[gId];

          const presentCount = (d.presentCount as number) || 0;
          const absentCount = (d.absentCount as number) || 0;
          const lateCount = (d.lateCount as number) || 0;
          const totalStudents = (d.totalStudents as number) || presentCount + absentCount + lateCount;
          const attendanceRate =
            totalStudents > 0 ? Math.round(((presentCount + lateCount) / totalStudents) * 100) : 0;

          paginatedSessions.push({
            id: doc.id,
            groupId: gId,
            groupName: grp?.name || (d.groupName as string) || "مجموعة",
            classId: (d.classId as string) || "",
            className: grp?.className || (d.className as string) || "",
            date: (d.date as string) || "",
            startTime: (d.startTime as string) || "",
            endTime: d.endTime as string | undefined,
            status: (d.status as "active" | "completed") || "active",
            totalStudents,
            presentCount,
            absentCount,
            lateCount,
            attendanceRate,
            createdAt: (d.createdAt as string) || "",
          });
        });

        return {
          success: true,
          data: {
            sessions: paginatedSessions,
            totalCount,
            totalPages,
            currentPage: page,
            pageSize,
            groups: groupsList,
          },
        };
      }
    );
  } catch (error) {
    console.error("Error fetching attendance history:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل جلب سجلات الحضور السابقة",
    };
  }
}

// 7. GET SINGLE SESSION FULL DETAILS
export interface SessionStudentDetailItem {
  studentId: string;
  studentName: string;
  studentPhone: string;
  status: "present" | "absent" | "late";
  scannedAt?: string;
  source?: "camera" | "scanner" | "manual" | "manual_teacher";
  notes?: string;
  updatedAt?: string;
  modifiedByName?: string;
}

export interface AttendanceSessionFullDetails {
  session: AttendanceHistorySessionItem;
  records: SessionStudentDetailItem[];
  registeredTotal: number;
}

export async function getAttendanceSessionDetails(sessionId: string): Promise<{
  success: boolean;
  data?: AttendanceSessionFullDetails;
  error?: string;
}> {
  try {
    const { teacherRef } = await checkPermission("attendance", "view");

    // 1. Fetch session document
    const sessionDoc = await teacherRef.collection("attendanceSessions").doc(sessionId).get();
    if (!sessionDoc.exists) {
      return { success: false, error: "جلسة الحضور غير موجودة" };
    }

    const sessionData = sessionDoc.data()!;
    const groupId = (sessionData.groupId as string) || "";

    // Group info
    let groupName = (sessionData.groupName as string) || "";
    let className = (sessionData.className as string) || "";
    if (!groupName && groupId) {
      const groupDoc = await teacherRef.collection("groups").doc(groupId).get();
      if (groupDoc.exists) {
        groupName = (groupDoc.data()?.name as string) || "";
        className = (groupDoc.data()?.className as string) || "";
      }
    }

    // 2. Fetch all student records inside subcollection
    const recordsSnap = await sessionDoc.ref.collection("records").get();
    const recordsMap = new Map<string, SessionStudentDetailItem>();

    recordsSnap.forEach((d) => {
      const r = d.data();
      const sId = (r.studentId as string) || d.id;
      recordsMap.set(sId, {
        studentId: sId,
        studentName: (r.studentName as string) || "طالب",
        studentPhone: (r.studentPhone as string) || "",
        status: (r.status as "present" | "absent" | "late") || "present",
        scannedAt: r.scannedAt as string | undefined,
        source: (r.source as "camera" | "scanner" | "manual" | "manual_teacher") || "camera",
        notes: r.notes as string | undefined,
        updatedAt: r.updatedAt as string | undefined,
        modifiedByName: r.modifiedByName as string | undefined,
      });
    });

    // 3. Fetch registered students from this group to ensure full coverage
    let registeredTotal = 0;
    if (groupId) {
      const studentsSnap = await teacherRef
        .collection("students")
        .where("groupId", "==", groupId)
        .where("isDeleted", "!=", true)
        .get();

      registeredTotal = studentsSnap.size;

      studentsSnap.forEach((sDoc) => {
        if (!recordsMap.has(sDoc.id)) {
          const s = sDoc.data();
          recordsMap.set(sDoc.id, {
            studentId: sDoc.id,
            studentName: (s.name as string) || "طالب",
            studentPhone: (s.phone as string) || "",
            status: "absent",
            source: "manual",
            notes: "لم يحضر الجلسة",
          });
        }
      });
    }

    const recordsList = Array.from(recordsMap.values());

    // Sort records: present first, then late, then absent, then alphabetical by name
    const statusWeight: Record<string, number> = { present: 1, late: 2, absent: 3 };
    recordsList.sort((a, b) => {
      const diff = (statusWeight[a.status] || 99) - (statusWeight[b.status] || 99);
      if (diff !== 0) return diff;
      return a.studentName.localeCompare(b.studentName, "ar");
    });

    const totalStudents = Number(sessionData.totalStudents) || recordsList.length;
    const presentCount = Number(sessionData.presentCount) || 0;
    const absentCount = Number(sessionData.absentCount) || 0;
    const lateCount = Number(sessionData.lateCount) || 0;
    const attendanceRate =
      totalStudents > 0 ? Math.round(((presentCount + lateCount) / totalStudents) * 100) : 0;

    const fullSessionItem: AttendanceHistorySessionItem = {
      id: sessionDoc.id,
      groupId,
      groupName: groupName || "مجموعة",
      classId: (sessionData.classId as string) || "",
      className: className || "",
      date: (sessionData.date as string) || "",
      startTime: (sessionData.startTime as string) || "",
      endTime: sessionData.endTime as string | undefined,
      status: (sessionData.status as "active" | "completed") || "active",
      totalStudents,
      presentCount,
      absentCount,
      lateCount,
      attendanceRate,
      createdAt: (sessionData.createdAt as string) || "",
    };

    return {
      success: true,
      data: {
        session: fullSessionItem,
        records: recordsList,
        registeredTotal: registeredTotal || totalStudents,
      },
    };
  } catch (error) {
    console.error("Error fetching session details:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل جلب تفاصيل جلسة الحضور",
    };
  }
}

// 8. UPDATE STUDENT ATTENDANCE STATUS (Teacher only + Audit Log)
export async function updateStudentAttendanceStatus({
  sessionId,
  studentId,
  newStatus,
  reason,
}: {
  sessionId: string;
  studentId: string;
  newStatus: "present" | "absent" | "late";
  reason?: string;
}): Promise<{
  success: boolean;
  message: string;
  updatedCounts?: {
    presentCount: number;
    absentCount: number;
    lateCount: number;
  };
  error?: string;
}> {
  try {
    const { teacherRef, teacherId, actorId, actorName, actorRole } = await checkPermission(
      "attendance",
      "edit"
    );

    // 1. Strict Authorization Check (Teacher or Super Admin Only)
    if (actorRole !== "teacher" && actorRole !== "super_admin") {
      return {
        success: false,
        message: "عفواً، تعديل حالة حضور الطالب متاح للمدرس فقط",
        error: "غير مصرح لك بتعديل السجلات",
      };
    }

    const sessionRef = teacherRef.collection("attendanceSessions").doc(sessionId);
    const recordRef = sessionRef.collection("records").doc(studentId);
    const mirrorRef = teacherRef.collection("attendanceRecords").doc(`${sessionId}_${studentId}`);

    const now = new Date().toISOString();
    const cairo = getCairoCurrentDate();

    let studentName = "";
    let studentPhone = "";
    let oldStatus: "present" | "absent" | "late" = "absent";
    let finalPresentCount = 0;
    let finalAbsentCount = 0;
    let finalLateCount = 0;

    await adminDb!.runTransaction(async (transaction) => {
      // Read session
      const sessionDoc = await transaction.get(sessionRef);
      if (!sessionDoc.exists) {
        throw new Error("جلسة الحضور غير موجودة");
      }
      const sessionData = sessionDoc.data()!;

      // Read record
      const recordDoc = await transaction.get(recordRef);
      if (recordDoc.exists) {
        const rData = recordDoc.data()!;
        oldStatus = (rData.status as "present" | "absent" | "late") || "present";
        studentName = (rData.studentName as string) || "";
        studentPhone = (rData.studentPhone as string) || "";
      } else {
        // Fetch student doc for metadata
        const studentDoc = await transaction.get(teacherRef.collection("students").doc(studentId));
        if (studentDoc.exists) {
          studentName = (studentDoc.data()?.name as string) || "طالب";
          studentPhone = (studentDoc.data()?.phone as string) || "";
        }
      }

      if (oldStatus === newStatus) {
        return;
      }

      // Calculate counts delta
      let curPresent = Number(sessionData.presentCount) || 0;
      let curAbsent = Number(sessionData.absentCount) || 0;
      let curLate = Number(sessionData.lateCount) || 0;

      // Decrement old
      if (oldStatus === "present") curPresent = Math.max(0, curPresent - 1);
      else if (oldStatus === "absent") curAbsent = Math.max(0, curAbsent - 1);
      else if (oldStatus === "late") curLate = Math.max(0, curLate - 1);

      // Increment new
      if (newStatus === "present") curPresent++;
      else if (newStatus === "absent") curAbsent++;
      else if (newStatus === "late") curLate++;

      finalPresentCount = curPresent;
      finalAbsentCount = curAbsent;
      finalLateCount = curLate;

      // Write updated record
      const recordPayload = {
        studentId,
        studentName: studentName || "طالب",
        studentPhone: studentPhone || "",
        sessionId,
        groupId: sessionData.groupId || "",
        status: newStatus,
        scannedAt: recordDoc.exists ? recordDoc.data()?.scannedAt || now : now,
        source: "manual_teacher" as const,
        notes: reason || "تعديل يدوي من المدرس",
        updatedAt: now,
        modifiedBy: actorId,
        modifiedByName: actorName,
      };

      transaction.set(recordRef, recordPayload, { merge: true });

      // Mirror document update
      transaction.set(
        mirrorRef,
        {
          ...recordPayload,
          date: (sessionData.date as string) || cairo.formattedDate,
          startTime: (sessionData.startTime as string) || cairo.currentTime,
        },
        { merge: true }
      );

      // Update session counts
      transaction.update(sessionRef, {
        presentCount: finalPresentCount,
        absentCount: finalAbsentCount,
        lateCount: finalLateCount,
        updatedAt: now,
      });
    });

    // 2. Audit Log (Critical Requirement)
    try {
      await teacherRef.collection("auditLogs").add({
        action: "attendance_status_modified",
        entity: "attendanceRecord",
        entityId: `${sessionId}_${studentId}`,
        actorId,
        actorName,
        actorRole,
        details: {
          sessionId,
          studentId,
          studentName,
          oldStatus,
          newStatus,
          reason: reason || "تعديل يدوي من المدرس",
        },
        timestamp: now,
      });
    } catch (auditErr) {
      console.error("Audit log error:", auditErr);
    }

    invalidateCacheTags(`attendance:${teacherId}`, `dashboard:${teacherId}`);
    revalidatePath("/attendance/history");
    revalidatePath(`/attendance/history/${sessionId}`);
    revalidatePath("/attendance");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: `تم تحديث حالة الطالب ${studentName} إلى "${
        newStatus === "present" ? "حاضر" : newStatus === "late" ? "متأخر" : "غائب"
      }" بنجاح وتوثيق العملية في سجل الرقابة`,
      updatedCounts: {
        presentCount: finalPresentCount,
        absentCount: finalAbsentCount,
        lateCount: finalLateCount,
      },
    };
  } catch (error) {
    console.error("Error updating student attendance status:", error);
    return {
      success: false,
      message: "فشل تحديث حالة الطالب",
      error: error instanceof Error ? error.message : "خطأ غير متوقع",
    };
  }
}

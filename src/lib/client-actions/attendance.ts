import {
  collection,
  query,
  where,
  getDocs,
  getCountFromServer,
  orderBy,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthStore } from "@/stores";
import type {
  AttendanceHistoryFilters,
  AttendanceHistoryResult,
  AttendanceHistorySessionItem,
} from "@/lib/actions/attendance";

export async function getAttendanceHistoryClient(filters: AttendanceHistoryFilters = {}): Promise<{
  success: boolean;
  data?: AttendanceHistoryResult;
  error?: string;
}> {
  try {
    const { teacherId } = useAuthStore.getState();
    if (!teacherId) throw new Error("يجب تسجيل الدخول");

    const teacherRef = doc(db, "teachers", teacherId);

    // Fetch groups for filter dropdown
    const groupsSnap = await getDocs(collection(teacherRef, "groups"));
    const groupsList: Array<{ id: string; name: string; className: string }> = [];
    const groupNameMap: Record<string, { name: string; className: string }> = {};

    groupsSnap.forEach((d) => {
      const data = d.data();
      if (!data.isDeleted) {
        const item = {
          id: d.id,
          name: (data.name as string) || "مجموعة",
          className: (data.className as string) || "",
        };
        groupsList.push(item);
        groupNameMap[d.id] = item;
      }
    });

    // Build sessions query
    let sessionsQuery = query(collection(teacherRef, "attendanceSessions"));

    if (filters.groupId) {
      sessionsQuery = query(sessionsQuery, where("groupId", "==", filters.groupId));
    }
    if (filters.date) {
      sessionsQuery = query(sessionsQuery, where("date", "==", filters.date));
    }

    // Get total count
    let totalCount = 0;
    try {
      const countSnap = await getCountFromServer(sessionsQuery);
      totalCount = countSnap.data().count;
    } catch {
      // fallback below
    }

    const page = Math.max(1, Number(filters.page) || 1);
    const pageSize = Math.max(1, Number(filters.pageSize) || 10);

    // Fetch all sessions and sort in memory (client SDK doesn't support offset)
    let sessionsDocs: import("firebase/firestore").QueryDocumentSnapshot[] = [];

    try {
      const orderedQuery = query(sessionsQuery, orderBy("date", "desc"));
      const allSnap = await getDocs(orderedQuery);
      const allDocs = allSnap.docs;

      // Update totalCount from actual docs if count query failed
      if (totalCount === 0) totalCount = allDocs.length;

      const offset = (page - 1) * pageSize;
      sessionsDocs = allDocs.slice(offset, offset + pageSize);
    } catch {
      // Fallback: memory sort
      const allSnap = await getDocs(sessionsQuery);
      const allDocs = [...allSnap.docs];
      totalCount = allDocs.length;

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

    // Format results
    const sessions: AttendanceHistorySessionItem[] = sessionsDocs.map((d) => {
      const data = d.data();
      const gId = (data.groupId as string) || "";
      const grp = groupNameMap[gId];

      const presentCount = (data.presentCount as number) || 0;
      const absentCount = (data.absentCount as number) || 0;
      const lateCount = (data.lateCount as number) || 0;
      const totalStudents =
        (data.totalStudents as number) || presentCount + absentCount + lateCount;
      const attendanceRate =
        totalStudents > 0 ? Math.round(((presentCount + lateCount) / totalStudents) * 100) : 0;

      return {
        id: d.id,
        groupId: gId,
        groupName: grp?.name || (data.groupName as string) || "مجموعة",
        classId: (data.classId as string) || "",
        className: grp?.className || (data.className as string) || "",
        date: (data.date as string) || "",
        startTime: (data.startTime as string) || "",
        endTime: data.endTime as string | undefined,
        status: (data.status as "active" | "completed") || "active",
        totalStudents,
        presentCount,
        absentCount,
        lateCount,
        attendanceRate,
        createdAt: (data.createdAt as string) || "",
      };
    });

    return {
      success: true,
      data: {
        sessions,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize) || 1,
        currentPage: page,
        pageSize,
        groups: groupsList,
      },
    };
  } catch (error) {
    console.error("GET_ATTENDANCE_HISTORY_CLIENT_ERROR:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل جلب سجلات الحضور",
    };
  }
}

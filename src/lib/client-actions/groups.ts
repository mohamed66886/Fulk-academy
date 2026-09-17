import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthStore } from "@/stores";
import type { GroupListItem } from "@/lib/actions/groups";

export async function getGroupsClient(
  classIdFilter?: string
): Promise<{ success: boolean; groups: GroupListItem[]; error?: string }> {
  try {
    const { teacherId } = useAuthStore.getState();
    if (!teacherId) throw new Error("يجب تسجيل الدخول");

    const teacherRef = doc(db, "teachers", teacherId);
    let groupsQuery = query(collection(teacherRef, "groups"), where("deletedAt", "==", null));

    if (classIdFilter && classIdFilter !== "all") {
      groupsQuery = query(groupsQuery, where("classId", "==", classIdFilter));
    }

    const snap = await getDocs(groupsQuery);

    // Fetch class names
    const classesSnap = await getDocs(
      query(collection(teacherRef, "classes"), where("deletedAt", "==", null))
    );
    const classMap = new Map<string, string>();
    classesSnap.forEach((d) => classMap.set(d.id, d.data().name as string));

    // Fetch students count per group (approximate for client side for performance)
    // To do it accurately, we need to run multiple count queries. For now, returning 0 or mock.
    // The real fix is to store studentCount on the group document (denormalization).

    const groups: GroupListItem[] = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: (data.name as string) || "",
        classId: (data.classId as string) || "",
        className: classMap.get(data.classId as string) || "غير محدد",
        schedule: (data.schedule as GroupListItem["schedule"]) || [],
        price: (data.price as number) || 0,
        hasCenter: Boolean(data.hasCenter),
        status: (data.status as "active" | "archived") || "active",
        createdAt: (data.createdAt as string) || "",
        studentsCount: 0, // Simplified for client side
      };
    });

    groups.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return { success: true, groups };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      groups: [],
      error: error instanceof Error ? error.message : "فشل جلب قائمة المجموعات",
    };
  }
}

import type { Group, GroupStatus, GroupSchedule } from "@/types";

import type { GroupStudentItem, GroupLatestSession } from "@/lib/actions/groups";

export async function getGroupByIdClient(groupId: string): Promise<{
  success: boolean;
  groupData?: {
    group: Group;
    className: string;
    students: GroupStudentItem[];
    latestSession: GroupLatestSession | null;
  };
  error?: string;
}> {
  try {
    const { teacherId } = useAuthStore.getState();
    if (!teacherId) throw new Error("يجب تسجيل الدخول");

    const teacherRef = doc(db, "teachers", teacherId);
    const groupRef = doc(teacherRef, "groups", groupId);

    const groupDoc = await getDoc(groupRef);
    if (!groupDoc.exists() || groupDoc.data().deletedAt) {
      return { success: false, error: "المجموعة غير موجودة" };
    }

    const data = groupDoc.data();
    const classId = (data.classId as string) || "";

    // Parallel fetch class name, students, and latest sessions
    const [classDocSnap, studentsSnap, sessionsSnap] = await Promise.all([
      classId ? getDoc(doc(teacherRef, "classes", classId)) : Promise.resolve(null),
      getDocs(
        query(
          collection(teacherRef, "students"),
          where("groupId", "==", groupId),
          where("deletedAt", "==", null)
        )
      ),
      getDocs(
        query(collection(teacherRef, "attendanceSessions"), where("groupId", "==", groupId)) // Firestore client doesn't support limit without proper indexing if we also sort, we'll sort in memory for now
      ),
    ]);

    const className = classDocSnap?.exists() ? (classDocSnap.data()?.name as string) || "—" : "—";

    const students = studentsSnap.docs.map((d) => {
      const s = d.data();
      return {
        id: d.id,
        name: (s.name as string) || "",
        phone: (s.phone as string) || "",
        parentPhone: (s.parentPhone as string) || "",
        groupPrice: Number(s.groupPrice) || 0,
        discount: Number(s.discount) || 0,
        finalPrice: Number(s.finalPrice) || 0,
        status: (s.status as "active" | "blocked") || "active",
        qrToken: s.qrToken as string | undefined,
      };
    });
    students.sort((a, b) => a.name.localeCompare(b.name, "ar"));

    let latestSession = null;
    if (!sessionsSnap.empty) {
      interface RawSessionData {
        id: string;
        date?: string;
        startTime?: string;
        endTime?: string;
        totalStudents?: number;
        presentCount?: number;
        absentCount?: number;
        lateCount?: number;
      }

      const sortedSessions = sessionsSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as RawSessionData)
        .sort((a, b) => {
          const dateA = `${a.date || ""} ${a.startTime || ""}`;
          const dateB = `${b.date || ""} ${b.startTime || ""}`;
          return dateB.localeCompare(dateA);
        });

      const latest = sortedSessions[0];
      if (latest) {
        const total =
          Number(latest.totalStudents) ||
          Number(latest.presentCount || 0) +
            Number(latest.absentCount || 0) +
            Number(latest.lateCount || 0) ||
          0;
        const present = Number(latest.presentCount) || 0;
        const late = Number(latest.lateCount) || 0;
        const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

        latestSession = {
          id: latest.id,
          date: latest.date || "",
          startTime: latest.startTime || "",
          endTime: latest.endTime,
          totalStudents: total,
          presentCount: present,
          absentCount: Number(latest.absentCount) || 0,
          lateCount: late,
          attendanceRate: rate,
        };
      }
    }

    const group: Group = {
      id: groupDoc.id,
      name: (data.name as string) || "",
      classId,
      schedule: (data.schedule as GroupSchedule[]) || [],
      price: Number(data.price) || 0, // Fallback
      centerSessionPrice:
        data.centerSessionPrice !== undefined ? Number(data.centerSessionPrice) : undefined,
      hasCenter: Boolean(data.hasCenter),
      status: (data.status as GroupStatus) || "active",
      createdAt: (data.createdAt as string) || "",
      updatedAt: (data.updatedAt as string) || "",
    };

    return { success: true, groupData: { group, className, students, latestSession } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
    };
  }
}

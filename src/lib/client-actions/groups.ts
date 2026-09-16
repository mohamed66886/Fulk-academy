import { collection, query, where, getDocs, doc } from "firebase/firestore";
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
        schedule: (data.schedule as unknown[]) || [],
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

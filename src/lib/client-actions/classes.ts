import {
  collection,
  query,
  where,
  getDocs,
  getCountFromServer,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthStore } from "@/stores";
import type { ClassListItem } from "@/lib/actions/classes";

export async function getClassesForSelectClient(): Promise<Array<{ id: string; name: string }>> {
  try {
    const { teacherId } = useAuthStore.getState();
    if (!teacherId) throw new Error("يجب تسجيل الدخول");

    const teacherRef = doc(db, "teachers", teacherId);
    const classesQuery = query(collection(teacherRef, "classes"), where("deletedAt", "==", null));

    const snap = await getDocs(classesQuery);
    const classes = snap.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name as string,
      createdAt: (doc.data().createdAt as string) || "",
    }));

    classes.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return classes.map(({ id, name }) => ({ id, name }));
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function getClassesClient(): Promise<{
  success: boolean;
  classes: ClassListItem[];
  error?: string;
}> {
  try {
    const { teacherId } = useAuthStore.getState();
    if (!teacherId) throw new Error("يجب تسجيل الدخول");

    const teacherRef = doc(db, "teachers", teacherId);

    const classesSnap = await getDocs(
      query(collection(teacherRef, "classes"), where("deletedAt", "==", null))
    );

    const classes = await Promise.all(
      classesSnap.docs.map(async (d) => {
        const data = d.data();

        // Parallel count queries for groups and students
        const [groupsCount, studentsCount] = await Promise.all([
          getCountFromServer(
            query(
              collection(teacherRef, "groups"),
              where("classId", "==", d.id),
              where("status", "==", "active")
            )
          ),
          getCountFromServer(
            query(
              collection(teacherRef, "students"),
              where("classId", "==", d.id),
              where("status", "==", "active"),
              where("deletedAt", "==", null)
            )
          ),
        ]);

        return {
          id: d.id,
          name: (data.name as string) || "",
          description: (data.description as string) || "",
          status: (data.status as "active" | "archived") || "active",
          createdAt: (data.createdAt as string) || new Date().toISOString(),
          groupsCount: groupsCount.data().count,
          studentsCount: studentsCount.data().count,
        };
      })
    );

    classes.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return { success: true, classes };
  } catch (error) {
    console.error("GET_CLASSES_CLIENT_ERROR:", error);
    return {
      success: false,
      classes: [],
      error: error instanceof Error ? error.message : "فشل جلب الصفوف الدراسية",
    };
  }
}

export async function getClassByIdClient(classId: string): Promise<{
  success: boolean;
  classData?: {
    id: string;
    name: string;
    description: string;
    status: "active" | "archived";
    createdAt: string;
    groupsCount: number;
    studentsCount: number;
    activeGroups: Array<{ id: string; name: string }>;
  };
  error?: string;
}> {
  try {
    const { teacherId } = useAuthStore.getState();
    if (!teacherId) throw new Error("يجب تسجيل الدخول");

    const teacherRef = doc(db, "teachers", teacherId);
    const classRef = doc(teacherRef, "classes", classId);

    const classDoc = await getDoc(classRef);
    if (!classDoc.exists() || classDoc.data().deletedAt) {
      return { success: false, error: "الصف الدراسي غير موجود" };
    }

    const data = classDoc.data();

    // Parallel fetch groups & students count
    const [groupsSnap, studentsCountSnap] = await Promise.all([
      getDocs(
        query(
          collection(teacherRef, "groups"),
          where("classId", "==", classId),
          where("deletedAt", "==", null)
        )
      ),
      getCountFromServer(
        query(
          collection(teacherRef, "students"),
          where("classId", "==", classId),
          where("status", "==", "active"),
          where("deletedAt", "==", null)
        )
      ),
    ]);

    let activeGroupsCount = 0;
    const activeGroups: Array<{ id: string; name: string }> = [];

    groupsSnap.forEach((doc) => {
      const gData = doc.data();
      if (gData.status === "active") {
        activeGroupsCount++;
        activeGroups.push({
          id: doc.id,
          name: (gData.name as string) || "مجموعة",
        });
      }
    });

    return {
      success: true,
      classData: {
        id: classDoc.id,
        name: (data.name as string) || "",
        description: (data.description as string) || "",
        status: (data.status as "active" | "archived") || "active",
        createdAt: (data.createdAt as string) || new Date().toISOString(),
        groupsCount: activeGroupsCount,
        studentsCount: studentsCountSnap.data().count,
        activeGroups,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
    };
  }
}

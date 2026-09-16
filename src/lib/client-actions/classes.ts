import { collection, query, where, getDocs, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthStore } from "@/stores";

export async function getClassesForSelectClient(): Promise<Array<{ id: string; name: string }>> {
  try {
    const { teacherId } = useAuthStore.getState();
    if (!teacherId) throw new Error("يجب تسجيل الدخول");

    const teacherRef = doc(db, "teachers", teacherId);
    const classesQuery = query(
      collection(teacherRef, "classes"),
      where("deletedAt", "==", null)
    );

    const snap = await getDocs(classesQuery);
    const classes = snap.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name as string,
      createdAt: doc.data().createdAt as string || "",
    }));

    classes.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return classes.map(({ id, name }) => ({ id, name }));
  } catch (error) {
    console.error(error);
    return [];
  }
}

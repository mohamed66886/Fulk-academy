import { collection, query, where, getDocs, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthStore } from "@/stores";
import type { ExamListItem, GetExamsFilters } from "@/lib/actions/exams";

export async function getExamsClient(filters: GetExamsFilters = {}): Promise<{
  success: boolean;
  exams: ExamListItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  error?: string;
}> {
  try {
    const { teacherId } = useAuthStore.getState();
    if (!teacherId) throw new Error("يجب تسجيل الدخول");

    const teacherRef = doc(db, "teachers", teacherId);

    // Build exams query
    let examsQuery = query(collection(teacherRef, "exams"), where("deletedAt", "==", null));

    if (filters.classId) {
      examsQuery = query(examsQuery, where("classId", "==", filters.classId));
    }
    if (filters.groupId) {
      examsQuery = query(examsQuery, where("groupId", "==", filters.groupId));
    }

    // Parallel fetch: exams + classes + groups
    const [examsSnap, classesSnap, groupsSnap] = await Promise.all([
      getDocs(examsQuery),
      getDocs(collection(teacherRef, "classes")),
      getDocs(collection(teacherRef, "groups")),
    ]);

    const classMap = new Map<string, string>();
    classesSnap.forEach((d) => classMap.set(d.id, (d.data().name as string) || ""));

    const groupMap = new Map<string, string>();
    groupsSnap.forEach((d) => groupMap.set(d.id, (d.data().name as string) || ""));

    let allExams: ExamListItem[] = examsSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        teacherId: data.teacherId,
        name: (data.name as string) || "امتحان بدون اسم",
        classId: (data.classId as string) || "",
        className: classMap.get(data.classId) || (data.className as string) || "",
        groupId: (data.groupId as string) || "",
        groupName: groupMap.get(data.groupId) || (data.groupName as string) || "",
        finalGrade: Number(data.finalGrade) || 100,
        examDate: (data.examDate as string) || "",
        createdAt: (data.createdAt as string) || "",
        updatedAt: data.updatedAt as string | undefined,
        resultsCount: 0,
        averageGrade: 0,
      };
    });

    // In-memory text search
    if (filters.query?.trim()) {
      const q = filters.query.toLowerCase().trim();
      allExams = allExams.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.groupName?.toLowerCase().includes(q) ||
          e.className?.toLowerCase().includes(q)
      );
    }

    // Sort
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

    // Fetch exam results for paginated exams
    const pageExamIds = paginated.map((e) => e.id);
    if (pageExamIds.length > 0) {
      const chunk = pageExamIds.slice(0, 10);
      const resultsSnap = await getDocs(
        query(collection(teacherRef, "examResults"), where("examId", "in", chunk))
      );

      const examStatsMap = new Map<string, { count: number; totalScore: number }>();
      resultsSnap.forEach((d) => {
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
  } catch (error) {
    console.error("GET_EXAMS_CLIENT_ERROR:", error);
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

export async function getClassesAndGroupsForExamsClient(): Promise<{
  success: boolean;
  classes: Array<{ id: string; name: string }>;
  groups: Array<{ id: string; name: string; classId: string; className: string }>;
  error?: string;
}> {
  try {
    const { teacherId } = useAuthStore.getState();
    if (!teacherId) throw new Error("يجب تسجيل الدخول");

    const teacherRef = doc(db, "teachers", teacherId);

    const [classesSnap, groupsSnap] = await Promise.all([
      getDocs(query(collection(teacherRef, "classes"), where("deletedAt", "==", null))),
      getDocs(query(collection(teacherRef, "groups"), where("deletedAt", "==", null))),
    ]);

    const classes = classesSnap.docs.map((d) => ({
      id: d.id,
      name: (d.data().name as string) || "صف دراسي",
    }));

    const groups = groupsSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: (data.name as string) || "مجموعة",
        classId: (data.classId as string) || "",
        className: (data.className as string) || "",
      };
    });

    return { success: true, classes, groups };
  } catch (error) {
    return {
      success: false,
      classes: [],
      groups: [],
      error: error instanceof Error ? error.message : "فشل جلب الصفوف والمجموعات",
    };
  }
}

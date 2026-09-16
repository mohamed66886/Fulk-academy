import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  updateDoc,
  setDoc,
  getCountFromServer,
  limit,
  startAfter,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthStore } from "@/stores";
import { generateShortStudentId } from "@/lib/utils/barcode";
import type {
  StudentsQueryParams,
  StudentsQueryResponse,
  StudentListItem,
} from "@/lib/actions/students";

export async function getStudentsClient(
  params: StudentsQueryParams = {}
): Promise<StudentsQueryResponse> {
  try {
    const { teacherId } = useAuthStore.getState();
    if (!teacherId) throw new Error("يجب تسجيل الدخول");

    const teacherRef = doc(db, "teachers", teacherId);
    let studentsQuery = query(collection(teacherRef, "students"), where("deletedAt", "==", null));

    if (params.classId && params.classId !== "all") {
      studentsQuery = query(studentsQuery, where("classId", "==", params.classId));
    }
    if (params.groupId && params.groupId !== "all") {
      studentsQuery = query(studentsQuery, where("groupId", "==", params.groupId));
    }
    if (params.status && params.status !== "all") {
      studentsQuery = query(studentsQuery, where("status", "==", params.status));
    }

    const sortBy = params.sortBy || "createdAt";
    const sortOrder = params.sortOrder || "desc";
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;

    let totalCount = 0;
    let totalPages = 1;
    let paginatedDocs: import("firebase/firestore").QueryDocumentSnapshot<
      import("firebase/firestore").DocumentData
    >[] = [];

    // Fast path: No text search
    if (!params.search || !params.search.trim()) {
      try {
        const countSnap = await getCountFromServer(studentsQuery);
        totalCount = countSnap.data().count;
      } catch (e) {
        console.warn("Count query failed", e);
      }

      totalPages = Math.ceil(totalCount / pageSize) || 1;

      let pagedQuery = query(studentsQuery, orderBy(sortBy, sortOrder));

      try {
        if (page > 1) {
          const skipCount = (page - 1) * pageSize;
          const skipSnap = await getDocs(query(pagedQuery, limit(skipCount)));
          if (!skipSnap.empty) {
            const lastVisible = skipSnap.docs[skipSnap.docs.length - 1];
            pagedQuery = query(pagedQuery, startAfter(lastVisible));
          }
        }

        const snap = await getDocs(query(pagedQuery, limit(pageSize)));
        paginatedDocs = snap.docs;
      } catch (indexError) {
        console.warn("Index missing, falling back to memory sort", indexError);
        const allSnap = await getDocs(studentsQuery);
        const allDocs = [...allSnap.docs];
        totalCount = allDocs.length;
        totalPages = Math.ceil(totalCount / pageSize) || 1;

        allDocs.sort((a, b) => {
          const aVal = a.data()[sortBy] || "";
          const bVal = b.data()[sortBy] || "";
          if (sortOrder === "asc") return aVal > bVal ? 1 : -1;
          return aVal < bVal ? 1 : -1;
        });

        const startIndex = (page - 1) * pageSize;
        paginatedDocs = allDocs.slice(startIndex, startIndex + pageSize);
      }
    } else {
      // Text search path
      const allSnap = await getDocs(studentsQuery);
      let allFilteredDocs = allSnap.docs;

      const searchTerms = params.search.trim().toLowerCase().split(/\s+/);
      allFilteredDocs = allFilteredDocs.filter((doc) => {
        const d = doc.data();
        const searchableText =
          `${d.name || ""} ${d.phone || ""} ${d.parentPhone || ""}`.toLowerCase();
        return searchTerms.every((term) => searchableText.includes(term));
      });

      totalCount = allFilteredDocs.length;
      totalPages = Math.ceil(totalCount / pageSize) || 1;

      allFilteredDocs.sort((a, b) => {
        const aVal = a.data()[sortBy] || "";
        const bVal = b.data()[sortBy] || "";
        if (sortOrder === "asc") return aVal > bVal ? 1 : -1;
        return aVal < bVal ? 1 : -1;
      });

      const startIndex = (page - 1) * pageSize;
      paginatedDocs = allFilteredDocs.slice(startIndex, startIndex + pageSize);
    }

    // Fetch class and group names for mapping
    const [classesSnap, groupsSnap] = await Promise.all([
      getDocs(query(collection(teacherRef, "classes"), where("deletedAt", "==", null))),
      getDocs(query(collection(teacherRef, "groups"), where("deletedAt", "==", null))),
    ]);

    const classMap = new Map<string, string>();
    classesSnap.forEach((d) => classMap.set(d.id, (d.data().name as string) || ""));

    const groupMap = new Map<string, string>();
    groupsSnap.forEach((d) => groupMap.set(d.id, (d.data().name as string) || ""));

    // Fetch payments for this month for the paginated students
    const pageStudentIds = paginatedDocs.map((d) => d.id);
    const currentMonth = new Date().toISOString().slice(0, 7);
    const paymentsMap = new Map<string, { id: string; status?: string; [key: string]: unknown }>();

    if (pageStudentIds.length > 0) {
      for (let i = 0; i < pageStudentIds.length; i += 10) {
        const chunk = pageStudentIds.slice(i, i + 10);
        const paymentsSnap = await getDocs(
          query(
            collection(teacherRef, "payments"),
            where("month", "==", currentMonth),
            where("studentId", "in", chunk)
          )
        );
        paymentsSnap.forEach((d) =>
          paymentsMap.set(d.data().studentId as string, { id: d.id, ...d.data() })
        );
      }
    }

    const students: StudentListItem[] = paginatedDocs.map((doc) => {
      const data = doc.data();
      const studentPayment = paymentsMap.get(doc.id);

      return {
        id: doc.id,
        name: (data.name as string) || "",
        phone: (data.phone as string) || "",
        parentPhone: (data.parentPhone as string) || "",
        parentName: (data.parentName as string) || "",
        classId: (data.classId as string) || "",
        className: classMap.get(data.classId as string) || "غير محدد",
        groupId: (data.groupId as string) || "",
        groupName: groupMap.get(data.groupId as string) || "غير محدد",
        discount: Number(data.discount) || 0,
        finalPrice: Number(data.finalPrice) || 0,
        status: (data.status as "active" | "blocked") || "active",
        createdAt: (data.createdAt as string) || "",
        paymentStatus: studentPayment
          ? (studentPayment.status as "paid" | "unpaid" | "partial")
          : "unpaid",
        currentMonthPaymentId: studentPayment?.id,
        hasCenter: Boolean(data.hasCenter),
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
  } catch (error) {
    console.error("GET_STUDENTS_CLIENT_ERROR:", error);
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

import type { StudentFormData } from "@/lib/validators/student";

export async function createStudentClient(
  data: StudentFormData
): Promise<{ success: boolean; studentId?: string; error?: string }> {
  try {
    const { teacherId } = useAuthStore.getState();
    if (!teacherId) throw new Error("يجب تسجيل الدخول");

    const teacherRef = doc(db, "teachers", teacherId);

    // Validate data manually or use zod if imported
    // For now we assume data is valid as it comes from the form

    // Generate QR tokens logic (short 6-char ID: 3 letters + 3 digits for clear barcodes)
    const qrToken = generateShortStudentId();
    const parentQrToken = `PA-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // Get group price
    let groupPrice = 0;
    if (data.groupId) {
      const groupDoc = await getDoc(doc(teacherRef, "groups", data.groupId));
      if (groupDoc.exists()) {
        groupPrice = Number(groupDoc.data().price) || 0;
      }
    }

    const discount = Number(data.discount) || 0;
    const finalPrice = Math.max(0, groupPrice - discount);

    const now = new Date().toISOString();

    // Search index array
    const searchIndex: string[] = [];
    const pushWords = (str: string) => {
      if (!str) return;
      const words = str.trim().toLowerCase().split(/\s+/);
      words.forEach((w) => {
        if (w.length > 2) searchIndex.push(w);
      });
    };
    pushWords(data.name);
    pushWords(data.phone);
    pushWords(data.parentPhone);

    const studentPayload = {
      name: data.name,
      phone: data.phone,
      classId: data.classId,
      groupId: data.groupId,
      parentName: data.parentName,
      parentPhone: data.parentPhone,
      photoUrl: data.photoUrl || "",
      qrToken,
      parentQrToken,
      groupPrice,
      discount,
      finalPrice,
      status: data.status,
      searchIndex,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      deletedBy: null,
    };
    const generateUniqueStudentId = async (): Promise<string> => {
      const id = generateShortStudentId();
      const docSnap = await getDoc(doc(teacherRef, "students", id));
      if (docSnap.exists()) return generateUniqueStudentId();
      return id;
    };

    const studentId = await generateUniqueStudentId();
    studentPayload.qrToken = studentId;
    const docRef = doc(teacherRef, "students", studentId);
    await setDoc(docRef, studentPayload);

    // Write qr token indices
    try {
      await setDoc(doc(db, "qrIndex", studentId), {
        type: "student",
        studentId: docRef.id,
        teacherId: teacherId,
        createdAt: now,
      });
      await setDoc(doc(db, "qrIndex", parentQrToken), {
        type: "parent",
        studentId: docRef.id,
        teacherId: teacherId,
        createdAt: now,
      });
    } catch (e) {
      console.warn("Failed to create QR index", e);
    }

    return { success: true, studentId: docRef.id };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل إضافة الطالب",
    };
  }
}

export async function updateStudentClient(
  studentId: string,
  data: StudentFormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { teacherId } = useAuthStore.getState();
    if (!teacherId) throw new Error("يجب تسجيل الدخول");

    const teacherRef = doc(db, "teachers", teacherId);
    const studentRef = doc(teacherRef, "students", studentId);

    const existingSnap = await getDoc(studentRef);
    if (!existingSnap.exists()) return { success: false, error: "الطالب غير موجود" };

    let groupPrice = 0;
    if (data.groupId) {
      const groupDoc = await getDoc(doc(teacherRef, "groups", data.groupId));
      if (groupDoc.exists()) {
        groupPrice = Number(groupDoc.data().price) || 0;
      }
    }
    const discount = Number(data.discount) || 0;
    const finalPrice = Math.max(0, groupPrice - discount);

    const searchIndex: string[] = [];
    const pushWords = (str: string) => {
      if (!str) return;
      const words = str.trim().toLowerCase().split(/\s+/);
      words.forEach((w) => {
        if (w.length > 2) searchIndex.push(w);
      });
    };
    pushWords(data.name);
    pushWords(data.phone);
    pushWords(data.parentPhone);

    const updatePayload = {
      name: data.name,
      phone: data.phone,
      classId: data.classId,
      groupId: data.groupId,
      parentName: data.parentName,
      parentPhone: data.parentPhone,
      photoUrl: data.photoUrl || "",
      groupPrice,
      discount,
      finalPrice,
      status: data.status,
      searchIndex,
      updatedAt: new Date().toISOString(),
    };

    await updateDoc(studentRef, updatePayload);
    return { success: true };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل تعديل الطالب",
    };
  }
}

export async function deleteStudentClient(
  studentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { teacherId } = useAuthStore.getState();
    if (!teacherId) throw new Error("يجب تسجيل الدخول");

    const studentRef = doc(db, "teachers", teacherId, "students", studentId);

    const now = new Date().toISOString();
    await updateDoc(studentRef, {
      deletedAt: now,
      deletedBy: "client", // Simplified
      updatedAt: now,
    });

    return { success: true };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل حذف الطالب",
    };
  }
}

export async function toggleStudentBlockClient(
  studentId: string
): Promise<{ success: boolean; newStatus?: "active" | "blocked"; error?: string }> {
  try {
    const { teacherId } = useAuthStore.getState();
    if (!teacherId) throw new Error("يجب تسجيل الدخول");

    const studentRef = doc(db, "teachers", teacherId, "students", studentId);
    const snap = await getDoc(studentRef);

    if (!snap.exists()) return { success: false, error: "الطالب غير موجود" };

    const currentStatus = snap.data().status;
    const newStatus = currentStatus === "blocked" ? "active" : "blocked";

    await updateDoc(studentRef, {
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });

    return { success: true, newStatus };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل تغيير الحالة",
    };
  }
}

/**
 * Regenerates a student's attendance QR token with a short code (3 letters + 3 digits)
 */
export async function regenerateStudentQrToken(
  studentId: string,
  customToken?: string
): Promise<{ success: boolean; qrToken?: string; error?: string }> {
  try {
    const { teacherId } = useAuthStore.getState();
    if (!teacherId) throw new Error("يجب تسجيل الدخول");

    const teacherRef = doc(db, "teachers", teacherId);
    const studentRef = doc(teacherRef, "students", studentId);
    const snap = await getDoc(studentRef);

    if (!snap.exists()) {
      return { success: false, error: "الطالب غير موجود" };
    }

    const newToken = customToken || generateShortStudentId();

    await updateDoc(studentRef, {
      qrToken: newToken,
      updatedAt: new Date().toISOString(),
    });

    await setDoc(doc(db, "qrIndex", newToken), {
      teacherId: teacherRef.id,
      studentId,
      type: "attendance",
    });

    return { success: true, qrToken: newToken };
  } catch (err) {
    console.error("Failed to regenerate student token:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "فشل توليد كود جديد",
    };
  }
}

/**
 * Bulk shortens all existing students with long tokens to 6-char tokens (3 letters + 3 digits)
 */
export async function shortenAllExistingStudentTokens(): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> {
  try {
    const { teacherId } = useAuthStore.getState();
    if (!teacherId) throw new Error("يجب تسجيل الدخول");

    const teacherRef = doc(db, "teachers", teacherId);
    const studentsSnap = await getDocs(
      query(collection(teacherRef, "students"), where("deletedAt", "==", null))
    );

    let updatedCount = 0;
    for (const studentDoc of studentsSnap.docs) {
      const data = studentDoc.data();
      const currentToken = (data.qrToken as string) || "";

      // If token is longer than 7 characters, or starts with ST-, or is missing
      if (currentToken.length > 7 || currentToken.startsWith("ST-") || !currentToken) {
        const newToken = generateShortStudentId();

        await updateDoc(studentDoc.ref, {
          qrToken: newToken,
          updatedAt: new Date().toISOString(),
        });

        await setDoc(doc(db, "qrIndex", newToken), {
          teacherId: teacherRef.id,
          studentId: studentDoc.id,
          type: "attendance",
        });

        updatedCount++;
      }
    }

    return { success: true, count: updatedCount };
  } catch (err) {
    console.error("Bulk shorten failed:", err);
    return {
      success: false,
      count: 0,
      error: err instanceof Error ? err.message : "فشل تحديث الأكواد",
    };
  }
}

"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { classSchema, type ClassFormData } from "@/lib/validators/class";
import type { GroupSchedule } from "@/types";

// Helper: Multi-Tenant authentication and teacher scope resolver
async function getTeacherAuthContext() {
  if (!adminAuth || !adminDb) {
    throw new Error("خدمة الخادم غير مهيأة");
  }

  const cookieStore = cookies();
  const sessionCookie = cookieStore.get("__session")?.value;

  let teacherId = "";
  let actorId = "";
  let actorName = "";
  let actorRole = "teacher";

  if (sessionCookie) {
    try {
      const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
      actorId = decoded.uid;
      actorRole = (decoded.role as string) || "teacher";
      teacherId = (decoded.teacherId as string) || decoded.uid;
      actorName = (decoded.name as string) || decoded.email || "المستخدم";
    } catch {
      // session expired
    }
  }

  // Fallback for development if no session cookie exists
  if (!teacherId) {
    const teachersSnap = await adminDb.collection("teachers").limit(1).get();
    if (!teachersSnap.empty) {
      teacherId = teachersSnap.docs[0]!.id;
      actorId = teacherId;
      actorName = (teachersSnap.docs[0]!.data()?.name as string) || "مدرس تجريبي";
    }
  }

  if (!teacherId) {
    throw new Error("يجب تسجيل الدخول لمباشرة هذا الإجراء");
  }

  return {
    teacherId,
    actorId,
    actorName,
    actorRole,
    teacherRef: adminDb.collection("teachers").doc(teacherId),
  };
}

export interface ClassListItem {
  id: string;
  name: string;
  description?: string;
  status: "active" | "archived";
  createdAt: string;
  groupsCount: number;
  studentsCount: number;
}

import { withCache, invalidateCacheTags } from "@/lib/cache/server-cache";

// 1. Get all classes with aggregated counts for groups and students
export async function getClasses(): Promise<{
  success: boolean;
  classes: ClassListItem[];
  error?: string;
}> {
  try {
    const { teacherRef, teacherId } = await getTeacherAuthContext();

    return await withCache(
      `classes:${teacherId}`,
      [`classes:${teacherId}`],
      60,
      async () => {
        const classesSnap = await teacherRef.collection("classes").where("deletedAt", "==", null).get();

        const classes = await Promise.all(
          classesSnap.docs.map(async (doc) => {
            const data = doc.data();

            // Fast aggregations for groups count and students count
            const [groupsSnap, studentsSnap] = await Promise.all([
              teacherRef
                .collection("groups")
                .where("classId", "==", doc.id)
                .where("status", "==", "active")
                .count()
                .get(),
              teacherRef
                .collection("students")
                .where("classId", "==", doc.id)
                .where("status", "==", "active")
                .where("deletedAt", "==", null)
                .count()
                .get(),
            ]);

            return {
              id: doc.id,
              name: (data.name as string) || "",
              description: (data.description as string) || "",
              status: (data.status as "active" | "archived") || "active",
              createdAt: (data.createdAt as string) || new Date().toISOString(),
              groupsCount: groupsSnap.data().count,
              studentsCount: studentsSnap.data().count,
            };
          })
        );

        // Sort by createdAt descending
        classes.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

        return { success: true, classes };
      }
    );
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, classes: [], error: err.message };
  }
}

export interface GroupSummary {
  id: string;
  name: string;
  price: number;
  hasCenter: boolean;
  centerSessionPrice?: number;
  status: "active" | "archived";
  schedule: GroupSchedule[];
  studentsCount: number;
}

export interface ClassDetailsData extends ClassListItem {
  groups: GroupSummary[];
}

// 2. Get single class details with attached groups list
export async function getClassById(classId: string): Promise<{
  success: boolean;
  classData?: ClassDetailsData;
  error?: string;
}> {
  try {
    const { teacherRef } = await getTeacherAuthContext();

    const classDoc = await teacherRef.collection("classes").doc(classId).get();
    if (!classDoc.exists) {
      return { success: false, error: "الصف الدراسي غير موجود" };
    }

    const data = classDoc.data()!;
    if (data.deletedAt !== null && data.deletedAt !== undefined) {
      return { success: false, error: "تم حذف هذا الصف الدراسي" };
    }

    // Fetch groups belonging to this class
    const groupsSnap = await teacherRef.collection("groups").where("classId", "==", classId).get();

    const groups: GroupSummary[] = await Promise.all(
      groupsSnap.docs.map(async (gDoc) => {
        const gData = gDoc.data();
        let studentsCount = 0;
        try {
          const sCount = await teacherRef
            .collection("students")
            .where("groupId", "==", gDoc.id)
            .where("status", "==", "active")
            .where("deletedAt", "==", null)
            .count()
            .get();
          studentsCount = sCount.data().count;
        } catch {
          // ignore
        }

        return {
          id: gDoc.id,
          name: (gData.name as string) || "",
          price: (gData.price as number) || 0,
          hasCenter: (gData.hasCenter as boolean) || false,
          centerSessionPrice: gData.centerSessionPrice as number | undefined,
          status: (gData.status as "active" | "archived") || "active",
          schedule: (gData.schedule as GroupSchedule[]) || [],
          studentsCount,
        };
      })
    );

    // Count active students in this class
    const studentsSnap = await teacherRef
      .collection("students")
      .where("classId", "==", classId)
      .where("status", "==", "active")
      .where("deletedAt", "==", null)
      .count()
      .get();

    return {
      success: true,
      classData: {
        id: classDoc.id,
        name: (data.name as string) || "",
        description: (data.description as string) || "",
        status: (data.status as "active" | "archived") || "active",
        createdAt: (data.createdAt as string) || "",
        groupsCount: groups.length,
        studentsCount: studentsSnap.data().count,
        groups,
      },
    };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message };
  }
}

// 3. Create a new class
export async function createClass(data: ClassFormData): Promise<{
  success: boolean;
  classId?: string;
  error?: string;
}> {
  try {
    const validated = classSchema.parse(data);
    const { teacherRef, teacherId, actorId, actorName, actorRole } = await getTeacherAuthContext();

    const now = new Date().toISOString();
    const newDocRef = teacherRef.collection("classes").doc();

    await newDocRef.set({
      id: newDocRef.id,
      name: validated.name,
      description: validated.description || "",
      status: validated.status,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    // Record in Audit Log
    await teacherRef.collection("auditLogs").add({
      actorId,
      actorName,
      actorRole,
      action: "CREATE_CLASS",
      entityType: "class",
      entityId: newDocRef.id,
      description: `تم إنشاء الصف الدراسي: ${validated.name}`,
      createdAt: now,
    });

    invalidateCacheTags(`classes:${teacherId}`, `dashboard:${teacherId}`);
    revalidatePath("/classes");
    revalidatePath("/dashboard");

    return { success: true, classId: newDocRef.id };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message || "فشل إنشاء الصف الدراسي" };
  }
}

// 4. Update an existing class
export async function updateClass(
  classId: string,
  data: ClassFormData
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const validated = classSchema.parse(data);
    const { teacherRef, teacherId, actorId, actorName, actorRole } = await getTeacherAuthContext();

    const classRef = teacherRef.collection("classes").doc(classId);
    const doc = await classRef.get();
    if (!doc.exists) {
      return { success: false, error: "الصف الدراسي غير موجود" };
    }

    const now = new Date().toISOString();
    await classRef.update({
      name: validated.name,
      description: validated.description || "",
      status: validated.status,
      updatedAt: now,
    });

    // Record in Audit Log
    await teacherRef.collection("auditLogs").add({
      actorId,
      actorName,
      actorRole,
      action: "UPDATE_CLASS",
      entityType: "class",
      entityId: classId,
      description: `تم تعديل بيانات الصف الدراسي: ${validated.name}`,
      createdAt: now,
    });

    invalidateCacheTags(`classes:${teacherId}`, `dashboard:${teacherId}`);
    revalidatePath("/classes");
    revalidatePath(`/classes/${classId}`);
    revalidatePath(`/classes/${classId}/edit`);
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message || "فشل تعديل الصف الدراسي" };
  }
}

// 5. Delete class (Soft Delete)
export async function deleteClass(classId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { teacherRef, teacherId, actorId, actorName, actorRole } = await getTeacherAuthContext();

    const classRef = teacherRef.collection("classes").doc(classId);
    const doc = await classRef.get();
    if (!doc.exists) {
      return { success: false, error: "الصف الدراسي غير موجود" };
    }

    const className = doc.data()?.name || "";
    const now = new Date().toISOString();

    // Soft delete rule: set deletedAt and deletedBy, mark status as archived
    await classRef.update({
      status: "archived",
      deletedAt: now,
      deletedBy: actorId,
      updatedAt: now,
    });

    // Record in Audit Log
    await teacherRef.collection("auditLogs").add({
      actorId,
      actorName,
      actorRole,
      action: "DELETE_CLASS",
      entityType: "class",
      entityId: classId,
      description: `تم حذف الصف الدراسي مؤقتًا: ${className}`,
      createdAt: now,
    });

    invalidateCacheTags(`classes:${teacherId}`, `dashboard:${teacherId}`);
    revalidatePath("/classes");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message || "فشل حذف الصف الدراسي" };
  }
}

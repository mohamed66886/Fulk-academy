"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { groupSchema, type GroupFormData } from "@/lib/validators/group";
import type { Group, GroupSchedule } from "@/types";

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
      // session expired or invalid
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

export interface GroupListItem {
  id: string;
  name: string;
  classId: string;
  className: string;
  price: number;
  hasCenter: boolean;
  centerSessionPrice?: number;
  status: "active" | "archived";
  schedule: GroupSchedule[];
  studentsCount: number;
  createdAt: string;
}

export interface GroupStudentItem {
  id: string;
  name: string;
  phone: string;
  parentPhone: string;
  groupPrice: number;
  discount: number;
  finalPrice: number;
  status: "active" | "blocked";
  qrToken?: string;
}

export interface GroupLatestSession {
  id: string;
  date: string;
  startTime: string;
  endTime?: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  attendanceRate: number;
}

export interface GroupDetailsData {
  group: Group;
  className: string;
  students: GroupStudentItem[];
  latestSession: GroupLatestSession | null;
}

import { withCache, invalidateCacheTags } from "@/lib/cache/server-cache";

// 1. Get all active classes for dropdown selects
export async function getClassesForSelect(): Promise<Array<{ id: string; name: string }>> {
  try {
    const { teacherRef, teacherId } = await getTeacherAuthContext();
    return await withCache(
      `classes-select:${teacherId}`,
      [`classes:${teacherId}`],
      60,
      async () => {
        const snap = await teacherRef.collection("classes").where("deletedAt", "==", null).get();
        return snap.docs.map((d) => ({
          id: d.id,
          name: (d.data().name as string) || "",
        }));
      }
    );
  } catch {
    return [];
  }
}

// 2. Get list of groups with student counts and class names
export async function getGroups(classIdFilter?: string): Promise<{
  success: boolean;
  groups: GroupListItem[];
  error?: string;
}> {
  try {
    const { teacherRef, teacherId } = await getTeacherAuthContext();

    return await withCache(
      `groups:${teacherId}:${classIdFilter || "all"}`,
      [`groups:${teacherId}`],
      60,
      async () => {
        // Cache class names to avoid repeated reads
        const classesSnap = await teacherRef.collection("classes").get();
        const classMap = new Map<string, string>();
        classesSnap.docs.forEach((doc) => {
          classMap.set(doc.id, (doc.data().name as string) || "صف غير محدد");
        });

        let query = teacherRef.collection("groups").where("deletedAt", "==", null);
        if (classIdFilter && classIdFilter !== "all") {
          query = query.where("classId", "==", classIdFilter);
        }

        const groupsSnap = await query.get();

        const groups: GroupListItem[] = await Promise.all(
          groupsSnap.docs.map(async (doc) => {
            const data = doc.data();

            // Aggregation for students count in this group
            const countSnap = await teacherRef
              .collection("students")
              .where("groupId", "==", doc.id)
              .where("deletedAt", "==", null)
              .count()
              .get();

            return {
              id: doc.id,
              name: (data.name as string) || "",
              classId: (data.classId as string) || "",
              className: classMap.get(data.classId) || "صف غير محدد",
              price: Number(data.price) || 0,
              hasCenter: Boolean(data.hasCenter),
              centerSessionPrice:
                data.centerSessionPrice !== undefined ? Number(data.centerSessionPrice) : undefined,
              status: (data.status as "active" | "archived") || "active",
              schedule: (data.schedule as GroupSchedule[]) || [],
              studentsCount: countSnap.data().count,
              createdAt: (data.createdAt as string) || new Date().toISOString(),
            };
          })
        );

        // Sort groups alphabetically by name
        groups.sort((a, b) => a.name.localeCompare(b.name, "ar"));

        return { success: true, groups };
      }
    );
  } catch (error) {
    return {
      success: false,
      groups: [],
      error: error instanceof Error ? error.message : "فشل جلب المجموعات الدراسية",
    };
  }
}

// 3. Get detailed group by id (including registered students and latest attendance session)
export async function getGroupById(groupId: string): Promise<{
  success: boolean;
  groupData?: GroupDetailsData;
  error?: string;
}> {
  try {
    const { teacherRef } = await getTeacherAuthContext();

    const groupDoc = await teacherRef.collection("groups").doc(groupId).get();
    if (!groupDoc.exists) {
      return { success: false, error: "المجموعة الدراسية غير موجودة" };
    }

    const data = groupDoc.data()!;
    if (data.deletedAt !== null && data.deletedAt !== undefined) {
      return { success: false, error: "تم حذف هذه المجموعة الدراسية" };
    }

    // Get Class Name
    let className = "صف غير محدد";
    if (data.classId) {
      const classDoc = await teacherRef.collection("classes").doc(data.classId).get();
      if (classDoc.exists) {
        className = (classDoc.data()?.name as string) || "صف غير محدد";
      }
    }

    // Fetch registered students under this group
    const studentsSnap = await teacherRef
      .collection("students")
      .where("groupId", "==", groupId)
      .where("deletedAt", "==", null)
      .get();

    const students: GroupStudentItem[] = studentsSnap.docs.map((doc) => {
      const s = doc.data();
      return {
        id: doc.id,
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

    // Sort students by name
    students.sort((a, b) => a.name.localeCompare(b.name, "ar"));

    // Fetch latest attendance session for this group
    let latestSession: GroupLatestSession | null = null;
    try {
      const sessionsSnap = await teacherRef
        .collection("attendanceSessions")
        .where("groupId", "==", groupId)
        .limit(10)
        .get();

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

        const sortedSessions: RawSessionData[] = sessionsSnap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<RawSessionData, "id">) }))
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
    } catch {
      // If attendanceSessions does not exist yet or fails, leave as null
    }

    const group: Group = {
      id: groupDoc.id,
      name: (data.name as string) || "",
      classId: (data.classId as string) || "",
      price: Number(data.price) || 0,
      hasCenter: Boolean(data.hasCenter),
      centerSessionPrice:
        data.centerSessionPrice !== undefined ? Number(data.centerSessionPrice) : undefined,
      status: (data.status as "active" | "archived") || "active",
      schedule: (data.schedule as GroupSchedule[]) || [],
      createdAt: (data.createdAt as string) || "",
      updatedAt: (data.updatedAt as string) || "",
    };

    return {
      success: true,
      groupData: {
        group,
        className,
        students,
        latestSession,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل جلب تفاصيل المجموعة",
    };
  }
}

// 4. Create new group
export async function createGroup(data: GroupFormData): Promise<{
  success: boolean;
  groupId?: string;
  error?: string;
}> {
  try {
    const validated = groupSchema.safeParse(data);
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.issues[0]?.message || "بيانات المجموعة غير صالحة",
      };
    }

    const { teacherRef, teacherId, actorId, actorName, actorRole } = await getTeacherAuthContext();
    const now = new Date().toISOString();

    const groupPayload: Omit<Group, "id"> & { deletedAt: null; deletedBy: null } = {
      name: validated.data.name,
      classId: validated.data.classId,
      price: validated.data.price,
      hasCenter: validated.data.hasCenter,
      centerSessionPrice: validated.data.hasCenter ? validated.data.centerSessionPrice : undefined,
      status: validated.data.status,
      schedule: validated.data.schedule,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      deletedBy: null,
    };

    const docRef = await teacherRef.collection("groups").add(groupPayload);

    // Audit Log
    try {
      await teacherRef.collection("auditLogs").add({
        action: "create",
        entity: "group",
        entityId: docRef.id,
        actorId,
        actorName,
        actorRole,
        details: {
          groupName: validated.data.name,
          classId: validated.data.classId,
          price: validated.data.price,
        },
        timestamp: now,
      });
    } catch {
      // Audit log non-blocking
    }

    invalidateCacheTags(`groups:${teacherId}`, `dashboard:${teacherId}`);
    revalidatePath("/groups");
    revalidatePath("/dashboard");
    revalidatePath(`/classes/${validated.data.classId}`);

    return { success: true, groupId: docRef.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل إنشاء المجموعة الدراسية",
    };
  }
}

// 5. Update existing group
// CRITICAL RULE: Changing group price DOES NOT change finalPrice or discount of existing students.
// It only serves as the default price for future registered students.
export async function updateGroup(
  groupId: string,
  data: GroupFormData
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const validated = groupSchema.safeParse(data);
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.issues[0]?.message || "بيانات المجموعة غير صالحة",
      };
    }

    const { teacherRef, teacherId, actorId, actorName, actorRole } = await getTeacherAuthContext();
    const groupRef = teacherRef.collection("groups").doc(groupId);
    const existingSnap = await groupRef.get();

    if (!existingSnap.exists) {
      return { success: false, error: "المجموعة الدراسية غير موجودة" };
    }

    const now = new Date().toISOString();
    const updatePayload = {
      name: validated.data.name,
      classId: validated.data.classId,
      price: validated.data.price,
      hasCenter: validated.data.hasCenter,
      centerSessionPrice: validated.data.hasCenter ? validated.data.centerSessionPrice : null,
      status: validated.data.status,
      schedule: validated.data.schedule,
      updatedAt: now,
    };

    // Update ONLY group document. Notice: students collection is explicitly untouched!
    await groupRef.update(updatePayload);

    // Audit Log
    try {
      await teacherRef.collection("auditLogs").add({
        action: "update",
        entity: "group",
        entityId: groupId,
        actorId,
        actorName,
        actorRole,
        details: {
          updatedFields: Object.keys(updatePayload),
          newPrice: validated.data.price,
        },
        timestamp: now,
      });
    } catch {
      // Non-blocking
    }

    invalidateCacheTags(`groups:${teacherId}`, `dashboard:${teacherId}`);
    revalidatePath("/groups");
    revalidatePath(`/groups/${groupId}`);
    revalidatePath(`/groups/${groupId}/edit`);
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل تعديل المجموعة الدراسية",
    };
  }
}

// 6. Soft Delete Group
export async function deleteGroup(groupId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { teacherRef, teacherId, actorId, actorName, actorRole } = await getTeacherAuthContext();
    const groupRef = teacherRef.collection("groups").doc(groupId);
    const existingSnap = await groupRef.get();

    if (!existingSnap.exists) {
      return { success: false, error: "المجموعة الدراسية غير موجودة" };
    }

    const now = new Date().toISOString();
    await groupRef.update({
      deletedAt: now,
      deletedBy: actorId,
      updatedAt: now,
    });

    // Audit Log
    try {
      await teacherRef.collection("auditLogs").add({
        action: "soft_delete",
        entity: "group",
        entityId: groupId,
        actorId,
        actorName,
        actorRole,
        details: {
          groupName: existingSnap.data()?.name,
        },
        timestamp: now,
      });
    } catch {
      // Non-blocking
    }

    invalidateCacheTags(`groups:${teacherId}`, `dashboard:${teacherId}`);
    revalidatePath("/groups");
    revalidatePath("/dashboard");
    revalidatePath("/trash");

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل حذف المجموعة",
    };
  }
}

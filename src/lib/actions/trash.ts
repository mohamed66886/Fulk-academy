"use server";

import { revalidatePath } from "next/cache";
import { checkPermission } from "@/lib/auth/permissions";
import { logAction } from "@/lib/audit/logger";

export interface TrashItem {
  id: string;
  entityType: "student" | "group" | "class";
  name: string;
  details?: string;
  deletedAt: string;
  deletedBy?: string;
}

/**
 * 1. GET ALL SOFT-DELETED ITEMS
 */
export async function getTrashItems(entityTypeFilter: string = "all"): Promise<{
  success: boolean;
  items: TrashItem[];
  error?: string;
}> {
  try {
    const { teacherRef } = await checkPermission("students", "view");

    const items: TrashItem[] = [];

    // 1. Fetch soft-deleted students
    if (entityTypeFilter === "all" || entityTypeFilter === "student") {
      const [studentsSnap, classesSnap, groupsSnap] = await Promise.all([
        teacherRef.collection("students").where("deletedAt", "!=", null).get(),
        teacherRef.collection("classes").get(),
        teacherRef.collection("groups").get(),
      ]);

      const classMap = new Map<string, string>();
      classesSnap.docs.forEach((d) => classMap.set(d.id, (d.data().name as string) || "—"));

      const groupMap = new Map<string, string>();
      groupsSnap.docs.forEach((d) => groupMap.set(d.id, (d.data().name as string) || "—"));

      studentsSnap.docs.forEach((doc) => {
        const d = doc.data();
        const cls = d.classId ? classMap.get(d.classId) || "" : "";
        const grp = d.groupId ? groupMap.get(d.groupId) || "" : "";
        const details = [cls, grp].filter(Boolean).join(" • ") || "طالب";

        items.push({
          id: doc.id,
          entityType: "student",
          name: (d.name as string) || "طالب بدون اسم",
          details,
          deletedAt: (d.deletedAt as string) || (d.updatedAt as string) || "",
          deletedBy: (d.deletedBy as string) || "الإدارة",
        });
      });
    }

    // Sort descending by deletedAt
    items.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));

    return { success: true, items };
  } catch (error) {
    console.error("Error fetching trash items:", error);
    return {
      success: false,
      items: [],
      error: error instanceof Error ? error.message : "فشل جلب سلة المحذوفات",
    };
  }
}

/**
 * 2. RESTORE SOFT-DELETED ITEM
 */
export async function restoreTrashItem({
  entityType,
  entityId,
}: {
  entityType: "student" | "group" | "class";
  entityId: string;
}): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { teacherRef, actorId, actorName, actorRole } = await checkPermission(
      "students",
      "delete"
    );

    const collectionName = entityType === "student" ? "students" : `${entityType}es`;
    const docRef = teacherRef.collection(collectionName).doc(entityId);
    const snap = await docRef.get();

    if (!snap.exists) {
      return { success: false, error: "العنصر المطلوب غير موجود" };
    }

    const itemName = (snap.data()?.name as string) || "عنصر";
    const now = new Date().toISOString();

    await docRef.update({
      deletedAt: null,
      deletedBy: null,
      updatedAt: now,
    });

    await logAction({
      teacherRef,
      actorId,
      actorName,
      actorRole,
      action: `RESTORE_${entityType.toUpperCase()}`,
      entityType,
      entityId,
      description: `تم استرجاع ${entityType === "student" ? "الطالب" : "العنصر"} ${itemName} من سلة المحذوفات`,
      metadata: { itemName },
    });

    revalidatePath("/trash");
    revalidatePath("/students");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Error restoring item:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل استرجاع العنصر",
    };
  }
}

/**
 * 3. PERMANENT DELETE (Requires exact name confirmation match)
 */
export async function permanentDeleteTrashItem({
  entityType,
  entityId,
  confirmedName,
}: {
  entityType: "student" | "group" | "class";
  entityId: string;
  confirmedName: string;
}): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { teacherRef, actorId, actorName, actorRole } = await checkPermission(
      "students",
      "delete"
    );

    const collectionName = entityType === "student" ? "students" : `${entityType}es`;
    const docRef = teacherRef.collection(collectionName).doc(entityId);
    const snap = await docRef.get();

    if (!snap.exists) {
      return { success: false, error: "العنصر غير موجود بالفعل" };
    }

    const realName = (snap.data()?.name as string) || "";

    // Strict name confirmation check
    if (realName.trim() !== confirmedName.trim()) {
      return {
        success: false,
        error: "الاسم المكتوب غير متطابق تماماً مع اسم العنصر المراد حذفه",
      };
    }

    // Physical delete
    await docRef.delete();

    // If student, delete associated qrTokens or payments reference if needed
    await logAction({
      teacherRef,
      actorId,
      actorName,
      actorRole,
      action: `PERMANENT_DELETE_${entityType.toUpperCase()}`,
      entityType,
      entityId,
      description: `تم الحذف النهائي والفيزيائي لـ ${entityType === "student" ? "الطالب" : "العنصر"} ${realName}`,
      metadata: { realName },
    });

    revalidatePath("/trash");
    revalidatePath("/students");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Error permanently deleting item:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل الحذف النهائي للعنصر",
    };
  }
}

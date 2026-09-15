"use server";

import { revalidatePath } from "next/cache";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { getTeacherAuthContext } from "@/lib/auth/permissions";
import {
  createAssistantSchema,
  updateAssistantPermissionsSchema,
  type CreateAssistantFormData,
} from "@/lib/validators/assistant";
import type { Assistant, AssistantPermissions } from "@/types/assistant";

/**
 * 1. GET ALL ASSISTANTS FOR CURRENT TEACHER
 */
export async function getAssistants(): Promise<{
  success: boolean;
  assistants: Assistant[];
  error?: string;
}> {
  try {
    const { teacherRef } = await getTeacherAuthContext();

    const snap = await teacherRef.collection("assistants").orderBy("createdAt", "desc").get();
    const assistants: Assistant[] = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        teacherId: data.teacherId,
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || "",
        status: data.status || "active",
        permissions: data.permissions || {
          students: { view: false, create: false, edit: false, delete: false },
          attendance: { view: false, create: false, edit: false, delete: false },
          payments: { view: false, create: false, edit: false, delete: false },
          exams: { view: false, create: false, edit: false, delete: false },
        },
        createdAt: data.createdAt || "",
        updatedAt: data.updatedAt || "",
      };
    });

    return { success: true, assistants };
  } catch (error) {
    console.error("Error fetching assistants:", error);
    return {
      success: false,
      assistants: [],
      error: error instanceof Error ? error.message : "فشل جلب قائمة المساعدين",
    };
  }
}

/**
 * 2. GET SINGLE ASSISTANT
 */
export async function getAssistant(assistantId: string): Promise<{
  success: boolean;
  assistant?: Assistant;
  error?: string;
}> {
  try {
    const { teacherRef } = await getTeacherAuthContext();

    if (!assistantId) {
      return { success: false, error: "معرّف المساعد غير صالح" };
    }

    const doc = await teacherRef.collection("assistants").doc(assistantId).get();
    if (!doc.exists) {
      return { success: false, error: "لم يتم العثور على حساب المساعد" };
    }

    const data = doc.data()!;
    const assistant: Assistant = {
      id: doc.id,
      teacherId: data.teacherId,
      name: data.name || "",
      email: data.email || "",
      phone: data.phone || "",
      status: data.status || "active",
      permissions: data.permissions || {
        students: { view: false, create: false, edit: false, delete: false },
        attendance: { view: false, create: false, edit: false, delete: false },
        payments: { view: false, create: false, edit: false, delete: false },
        exams: { view: false, create: false, edit: false, delete: false },
      },
      createdAt: data.createdAt || "",
      updatedAt: data.updatedAt || "",
    };

    return { success: true, assistant };
  } catch (error) {
    console.error("Error fetching assistant:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل جلب بيانات المساعد",
    };
  }
}

/**
 * 3. CREATE NEW ASSISTANT (Firebase Auth + Custom Claims + Firestore document)
 */
export async function createAssistant(data: CreateAssistantFormData): Promise<{
  success: boolean;
  assistantId?: string;
  error?: string;
}> {
  try {
    const { teacherId, teacherRef, actorId, actorName, actorRole } = await getTeacherAuthContext();

    // Only teachers or super admins can create assistants
    if (actorRole !== "teacher" && actorRole !== "super_admin") {
      return { success: false, error: "غير مصرح: المدرس فقط يملك صلاحية إضافة المساعدين" };
    }

    if (!adminAuth || !adminDb) {
      return { success: false, error: "خدمة الخادم غير مهيأة" };
    }

    // Validate form data
    const validated = createAssistantSchema.parse(data);
    const now = new Date().toISOString();

    // 1. Create Firebase Auth user
    let userRecord;
    try {
      userRecord = await adminAuth.createUser({
        email: validated.email,
        password: validated.password,
        displayName: validated.name,
      });
    } catch (authErr: unknown) {
      if ((authErr as { code?: string })?.code === "auth/email-already-exists") {
        return { success: false, error: "البريد الإلكتروني مستخدم بالفعل لحساب آخر" };
      }
      throw authErr;
    }

    // 2. Set Custom Claims for multi-tenant isolation
    await adminAuth.setCustomUserClaims(userRecord.uid, {
      role: "assistant",
      teacherId,
    });

    // 3. Store Assistant Document in teachers/{teacherId}/assistants/{assistantId}
    const assistantData = {
      id: userRecord.uid,
      teacherId,
      name: validated.name,
      email: validated.email,
      phone: validated.phone,
      status: "active",
      permissions: validated.permissions,
      createdAt: now,
      updatedAt: now,
    };

    await teacherRef.collection("assistants").doc(userRecord.uid).set(assistantData);

    // 4. Audit Log
    await teacherRef.collection("auditLogs").add({
      actorId,
      actorName,
      actorRole,
      action: "CREATE_ASSISTANT",
      entityType: "assistant",
      entityId: userRecord.uid,
      description: `تمت إضافة المساعد ${validated.name} وتعيين الصلاحيات الأولية`,
      createdAt: now,
    });

    revalidatePath("/users");
    return { success: true, assistantId: userRecord.uid };
  } catch (error) {
    console.error("Error creating assistant:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل إنشاء حساب المساعد",
    };
  }
}

/**
 * 4. UPDATE ASSISTANT PERMISSIONS
 */
export async function updateAssistantPermissions(data: {
  assistantId: string;
  permissions: AssistantPermissions;
}): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const { teacherRef, actorId, actorName, actorRole } = await getTeacherAuthContext();

    if (actorRole !== "teacher" && actorRole !== "super_admin") {
      return { success: false, error: "غير مصرح: المدرس فقط يملك صلاحية تعديل صلاحيات المساعدين" };
    }

    const validated = updateAssistantPermissionsSchema.parse(data);
    const now = new Date().toISOString();

    const assistantDocRef = teacherRef.collection("assistants").doc(validated.assistantId);
    const doc = await assistantDocRef.get();
    if (!doc.exists) {
      return { success: false, error: "حساب المساعد غير موجود" };
    }

    const assistantName = (doc.data()?.name as string) || "المساعد";

    await assistantDocRef.update({
      permissions: validated.permissions,
      updatedAt: now,
    });

    // Audit Log
    await teacherRef.collection("auditLogs").add({
      actorId,
      actorName,
      actorRole,
      action: "UPDATE_ASSISTANT_PERMISSIONS",
      entityType: "assistant",
      entityId: validated.assistantId,
      description: `تم تحديث مصفوفة صلاحيات المساعد ${assistantName}`,
      createdAt: now,
    });

    revalidatePath("/users");
    revalidatePath(`/users/${validated.assistantId}/permissions`);

    return { success: true, message: "تم تحديث الصلاحيات بنجاح" };
  } catch (error) {
    console.error("Error updating assistant permissions:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل تحديث الصلاحيات",
    };
  }
}

/**
 * 5. TOGGLE ASSISTANT STATUS (active <-> disabled)
 */
export async function toggleAssistantStatus(assistantId: string): Promise<{
  success: boolean;
  newStatus?: "active" | "disabled";
  error?: string;
}> {
  try {
    const { teacherRef, actorId, actorName, actorRole } = await getTeacherAuthContext();

    if (actorRole !== "teacher" && actorRole !== "super_admin") {
      return { success: false, error: "غير مصرح: المدرس فقط يملك صلاحية تغيير حالة الحساب" };
    }

    const assistantDocRef = teacherRef.collection("assistants").doc(assistantId);
    const doc = await assistantDocRef.get();
    if (!doc.exists) {
      return { success: false, error: "حساب المساعد غير موجود" };
    }

    const currentStatus = doc.data()?.status || "active";
    const newStatus: "active" | "disabled" = currentStatus === "active" ? "disabled" : "active";
    const now = new Date().toISOString();

    // 1. Update Firestore
    await assistantDocRef.update({
      status: newStatus,
      updatedAt: now,
    });

    // 2. Update Firebase Auth user disabled state
    if (adminAuth) {
      try {
        await adminAuth.updateUser(assistantId, {
          disabled: newStatus === "disabled",
        });
      } catch (authErr) {
        console.warn("Could not update auth user disabled state:", authErr);
      }
    }

    // 3. Audit Log
    await teacherRef.collection("auditLogs").add({
      actorId,
      actorName,
      actorRole,
      action: newStatus === "disabled" ? "DISABLE_ASSISTANT" : "ENABLE_ASSISTANT",
      entityType: "assistant",
      entityId: assistantId,
      description: `تم ${newStatus === "disabled" ? "تعطيل" : "تفعيل"} حساب المساعد ${doc.data()?.name || ""}`,
      createdAt: now,
    });

    revalidatePath("/users");
    return { success: true, newStatus };
  } catch (error) {
    console.error("Error toggling assistant status:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل تغيير حالة المساعد",
    };
  }
}

/**
 * 6. DELETE ASSISTANT
 */
export async function deleteAssistant(assistantId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { teacherRef, actorId, actorName, actorRole } = await getTeacherAuthContext();

    if (actorRole !== "teacher" && actorRole !== "super_admin") {
      return { success: false, error: "غير مصرح: المدرس فقط يملك صلاحية حذف المساعدين" };
    }

    const assistantDocRef = teacherRef.collection("assistants").doc(assistantId);
    const doc = await assistantDocRef.get();
    if (!doc.exists) {
      return { success: false, error: "حساب المساعد غير موجود" };
    }

    const assistantName = (doc.data()?.name as string) || "";
    const now = new Date().toISOString();

    // 1. Delete from Firestore
    await assistantDocRef.delete();

    // 2. Delete/Disable from Firebase Auth
    if (adminAuth) {
      try {
        await adminAuth.deleteUser(assistantId);
      } catch (authErr) {
        console.warn("Could not delete Firebase Auth user:", authErr);
      }
    }

    // 3. Audit Log
    await teacherRef.collection("auditLogs").add({
      actorId,
      actorName,
      actorRole,
      action: "DELETE_ASSISTANT",
      entityType: "assistant",
      entityId: assistantId,
      description: `تم حذف حساب المساعد ${assistantName} نهائياً`,
      createdAt: now,
    });

    revalidatePath("/users");
    return { success: true };
  } catch (error) {
    console.error("Error deleting assistant:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل حذف المساعد",
    };
  }
}

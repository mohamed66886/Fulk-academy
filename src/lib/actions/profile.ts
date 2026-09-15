"use server";

import { revalidatePath } from "next/cache";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { getTeacherAuthContext } from "@/lib/auth/permissions";

export interface TeacherProfileData {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  photoUrl?: string;
  signatureUrl?: string;
  createdAt?: string;
}

export interface UpdateProfilePayload {
  name: string;
  phone: string;
  subject: string;
  photoUrl?: string;
  signatureUrl?: string;
}

export interface ChangePasswordPayload {
  newPassword: string;
  confirmPassword: string;
}

/**
 * 1. Fetch current teacher profile
 */
export async function getTeacherProfile(): Promise<{
  success: boolean;
  profile?: TeacherProfileData;
  error?: string;
}> {
  try {
    const { teacherId, teacherRef } = await getTeacherAuthContext();

    const teacherDoc = await teacherRef.get();
    if (!teacherDoc.exists) {
      return { success: false, error: "حساب المدرس غير موجود" };
    }

    const data = teacherDoc.data() || {};

    let email = (data.email as string) || "";
    if (!email && adminAuth) {
      try {
        const authUser = await adminAuth.getUser(teacherId);
        email = authUser.email || "";
      } catch {
        // Ignore fallback error
      }
    }

    return {
      success: true,
      profile: {
        id: teacherId,
        name: (data.name as string) || "",
        email,
        phone: (data.phone as string) || "",
        subject: (data.subject as string) || "",
        photoUrl: (data.photoUrl as string) || undefined,
        signatureUrl: (data.signatureUrl as string) || undefined,
        createdAt: (data.createdAt as string) || undefined,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل جلب بيانات المدرس",
    };
  }
}

/**
 * 2. Update teacher profile data
 */
export async function updateTeacherProfile(
  payload: UpdateProfilePayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const { teacherId, teacherRef, actorId, actorName, actorRole } = await getTeacherAuthContext();

    if (!payload.name?.trim()) {
      return { success: false, error: "يرجى كتابة اسم المدرس بالكامل" };
    }

    const now = new Date().toISOString();

    const updateFields: Record<string, unknown> = {
      name: payload.name.trim(),
      phone: (payload.phone || "").trim(),
      subject: (payload.subject || "").trim(),
      updatedAt: now,
    };

    if (payload.photoUrl !== undefined) {
      updateFields.photoUrl = payload.photoUrl;
    }
    
    if (payload.signatureUrl !== undefined) {
      updateFields.signatureUrl = payload.signatureUrl;
    }

    // 1. Update Firestore Document
    await teacherRef.update(updateFields);

    // 2. Update Firebase Auth User Display Name & Photo
    if (adminAuth) {
      try {
        await adminAuth.updateUser(teacherId, {
          displayName: payload.name.trim(),
          photoURL: payload.photoUrl || undefined,
        });
      } catch (authErr) {
        console.warn("Could not sync Firebase Auth displayName:", authErr);
      }
    }

    // 3. Write Audit Log
    if (adminDb) {
      try {
        await teacherRef.collection("auditLogs").add({
          actorId,
          actorName,
          actorRole,
          action: "UPDATE_PROFILE",
          entityType: "settings",
          entityId: teacherId,
          description: `تم تحديث البيانات الشخصية للمدرس: ${payload.name}`,
          createdAt: now,
        });
      } catch {
        // Non-blocking audit log
      }
    }

    revalidatePath("/settings");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل تحديث بيانات المدرس",
    };
  }
}

/**
 * 3. Change teacher password
 */
export async function changeTeacherPassword(
  payload: ChangePasswordPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const { teacherId, teacherRef, actorId, actorName, actorRole } = await getTeacherAuthContext();

    const newPass = payload.newPassword?.trim();
    if (!newPass || newPass.length < 8) {
      return { success: false, error: "كلمة المرور يجب ألا تقل عن 8 أحرف" };
    }

    if (newPass !== payload.confirmPassword?.trim()) {
      return { success: false, error: "كلمتا المرور غير متطابقتين" };
    }

    if (!adminAuth) {
      return { success: false, error: "خدمة المصادقة غير مهيأة" };
    }

    // 1. Update Password in Firebase Authentication
    await adminAuth.updateUser(teacherId, {
      password: newPass,
    });

    const now = new Date().toISOString();

    // 2. Audit Log
    try {
      await teacherRef.collection("auditLogs").add({
        actorId,
        actorName,
        actorRole,
        action: "CHANGE_PASSWORD",
        entityType: "settings",
        entityId: teacherId,
        description: "تم تغيير كلمة المرور للمدرس بنجاح",
        createdAt: now,
      });
    } catch {
      // Non-blocking
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل تغيير كلمة المرور",
    };
  }
}

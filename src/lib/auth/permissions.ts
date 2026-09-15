import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import type { AssistantPermissions } from "@/types/assistant";
import {
  type PermissionModule,
  type PermissionAction,
  MODULE_NAMES_AR,
  ACTION_NAMES_AR,
} from "./permission-constants";

export * from "./permission-constants";

export interface TeacherAuthContext {
  teacherId: string;
  actorId: string;
  actorName: string;
  actorRole: "teacher" | "assistant" | "super_admin";
  teacherRef: FirebaseFirestore.DocumentReference;
  permissions?: AssistantPermissions | null;
}

/**
 * Base teacher/actor auth context resolver
 */
export async function getTeacherAuthContext(): Promise<TeacherAuthContext> {
  if (!adminAuth || !adminDb) {
    throw new Error("خدمة الخادم غير مهيأة");
  }

  let sessionCookie: string | undefined;
  let activeTeacherCookie: string | undefined;
  try {
    const cookieStore = cookies();
    sessionCookie = cookieStore.get("__session")?.value;
    activeTeacherCookie = cookieStore.get("activeTeacherId")?.value;
  } catch {
    // Outside request context (e.g. build time or test script)
  }

  let teacherId = "";
  let actorId = "";
  let actorName = "";
  let actorRole: "teacher" | "assistant" | "super_admin" = "teacher";
  let permissions: AssistantPermissions | null = null;

  if (sessionCookie) {
    try {
      const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
      actorId = decoded.uid;
      actorRole = (decoded.role as "teacher" | "assistant" | "super_admin") || "teacher";
      teacherId = (decoded.teacherId as string) || decoded.uid;
      actorName = (decoded.name as string) || decoded.email || "المستخدم";
    } catch {
      // Session expired or invalid
    }
  }

  // Fallback for development if no session cookie exists
  if (!teacherId) {
    const teachersSnap = await adminDb.collection("teachers").limit(1).get();
    if (!teachersSnap.empty) {
      teacherId = teachersSnap.docs[0]!.id;
      actorId = teacherId;
      actorName = (teachersSnap.docs[0]!.data()?.name as string) || "مدرس تجريبي";
      actorRole = "teacher";
    }
  }

  // If super admin, verify if target teacher exists or fallback to first available teacher
  if (actorRole === "super_admin") {
    if (activeTeacherCookie) {
      const activeDoc = await adminDb.collection("teachers").doc(activeTeacherCookie).get();
      if (activeDoc.exists) {
        teacherId = activeTeacherCookie;
      }
    }

    const currentDoc = await adminDb.collection("teachers").doc(teacherId).get();
    if (!currentDoc.exists) {
      const teachersSnap = await adminDb.collection("teachers").limit(1).get();
      if (!teachersSnap.empty) {
        teacherId = teachersSnap.docs[0]!.id;
      }
    }
  }

  if (!teacherId) {
    throw new Error("غير مصرح: يرجى تسجيل الدخول أولاً");
  }

  const teacherRef = adminDb.collection("teachers").doc(teacherId);

  // If assistant, load assistant document to get fresh status & permissions
  if (actorRole === "assistant") {
    const assistantDoc = await teacherRef.collection("assistants").doc(actorId).get();
    if (!assistantDoc.exists) {
      throw new Error("حساب المساعد غير موجود أو تم حذفه");
    }

    const assistantData = assistantDoc.data();
    if (assistantData?.status === "disabled") {
      throw new Error("تم إيقاف حسابك من قِبل المدرس، يرجى التواصل مع الإدارة");
    }

    permissions = (assistantData?.permissions as AssistantPermissions) || null;
    if (assistantData?.name) {
      actorName = assistantData.name as string;
    }
  }

  return {
    teacherId,
    actorId,
    actorName,
    actorRole,
    teacherRef,
    permissions,
  };
}

/**
 * Strict Server-Side Permission Check:
 * Verifies that the current caller has permission for [module:action].
 * Teachers and super admins have full bypass. Assistants must have explicit permission.
 */
export async function checkPermission(
  module: PermissionModule,
  action: PermissionAction
): Promise<TeacherAuthContext> {
  const context = await getTeacherAuthContext();

  // Teachers and Super Admins have unrestricted access to all operations
  if (context.actorRole === "teacher" || context.actorRole === "super_admin") {
    return context;
  }

  // Assistant RBAC Check
  if (context.actorRole === "assistant") {
    if (!context.permissions) {
      throw new Error("ليس لديك أي صلاحيات معينة على هذا الحساب");
    }

    const isAllowed = context.permissions[module]?.[action] === true;
    if (!isAllowed) {
      const moduleAr = MODULE_NAMES_AR[module] || module;
      const actionAr = ACTION_NAMES_AR[action] || action;
      throw new Error(`ليس لديك صلاحية لتنفيذ هذا الإجراء (${actionAr} في قسم ${moduleAr})`);
    }

    return context;
  }

  throw new Error("الدور الحالي غير مصرح له بتنفيذ هذه العملية");
}

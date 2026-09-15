import type { AssistantPermissions, PermissionActions } from "@/types/assistant";

export type PermissionModule = keyof AssistantPermissions;
export type PermissionAction = keyof PermissionActions;

export const MODULE_NAMES_AR: Record<PermissionModule, string> = {
  students: "الطلاب",
  attendance: "الحضور والغياب",
  payments: "المدفوعات والاشتراكات",
  exams: "الامتحانات ورصد الدرجات",
};

export const ACTION_NAMES_AR: Record<PermissionAction, string> = {
  view: "عرض",
  create: "إضافة",
  edit: "تعديل",
  delete: "حذف",
};

export const DEFAULT_ASSISTANT_PERMISSIONS: AssistantPermissions = {
  students: { view: true, create: false, edit: false, delete: false },
  attendance: { view: true, create: true, edit: false, delete: false },
  payments: { view: false, create: false, edit: false, delete: false },
  exams: { view: true, create: false, edit: false, delete: false },
};

export const FULL_ASSISTANT_PERMISSIONS: AssistantPermissions = {
  students: { view: true, create: true, edit: true, delete: true },
  attendance: { view: true, create: true, edit: true, delete: true },
  payments: { view: true, create: true, edit: true, delete: true },
  exams: { view: true, create: true, edit: true, delete: true },
};

export const EMPTY_ASSISTANT_PERMISSIONS: AssistantPermissions = {
  students: { view: false, create: false, edit: false, delete: false },
  attendance: { view: false, create: false, edit: false, delete: false },
  payments: { view: false, create: false, edit: false, delete: false },
  exams: { view: false, create: false, edit: false, delete: false },
};

export const VIEW_ONLY_ASSISTANT_PERMISSIONS: AssistantPermissions = {
  students: { view: true, create: false, edit: false, delete: false },
  attendance: { view: true, create: false, edit: false, delete: false },
  payments: { view: true, create: false, edit: false, delete: false },
  exams: { view: true, create: false, edit: false, delete: false },
};

/**
 * Client-safe helper to check whether permissions grant a specific action on a module
 */
export function hasPermission(
  permissions: AssistantPermissions | null | undefined,
  module: PermissionModule,
  action: PermissionAction
): boolean {
  if (!permissions) return false;
  return !!permissions[module]?.[action];
}

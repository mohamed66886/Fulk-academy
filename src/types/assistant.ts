export type AssistantStatus = "active" | "disabled";

export interface PermissionActions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export interface AssistantPermissions {
  students: PermissionActions;
  attendance: PermissionActions;
  payments: PermissionActions;
  exams: PermissionActions;
}

export interface Assistant {
  id: string;
  teacherId?: string;
  name: string;
  email: string;
  phone: string;
  status: AssistantStatus;
  permissions: AssistantPermissions;
  createdAt?: string;
  updatedAt?: string;
}

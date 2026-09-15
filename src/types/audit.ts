export type ActorRole = "super_admin" | "teacher" | "assistant";

export type AuditEntityType =
  | "student"
  | "group"
  | "class"
  | "attendance"
  | "exam"
  | "payment"
  | "assistant"
  | "teacher"
  | "settings";

export interface AuditLog {
  id: string;
  teacherId?: string;
  actorId: string;
  actorName: string;
  actorRole: ActorRole;
  action: string;
  entityType: AuditEntityType;
  entityId: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

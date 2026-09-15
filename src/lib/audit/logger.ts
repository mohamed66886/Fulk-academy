import { adminDb } from "@/lib/firebase/admin";
import type { ActorRole, AuditEntityType, AuditLog } from "@/types/audit";

export interface LogActionParams {
  teacherId?: string;
  teacherRef?: FirebaseFirestore.DocumentReference;
  actorId: string;
  actorName: string;
  actorRole: ActorRole;
  action: string;
  entityType: AuditEntityType;
  entityId: string;
  description: string;
  metadata?: Record<string, unknown>;
}

/**
 * Centralized audit logger for recording critical platform events.
 * Safely persists audit entries to teachers/{teacherId}/auditLogs.
 * Non-blocking: failures in logging will not crash the main transaction.
 */
export async function logAction(params: LogActionParams): Promise<void> {
  try {
    let targetRef = params.teacherRef;

    if (!targetRef && params.teacherId && adminDb) {
      targetRef = adminDb.collection("teachers").doc(params.teacherId);
    }

    if (!targetRef) {
      console.warn("logAction: No teacherRef or teacherId available for audit logging.");
      return;
    }

    const now = new Date().toISOString();
    const logData: Omit<AuditLog, "id"> = {
      teacherId: targetRef.id,
      actorId: params.actorId,
      actorName: params.actorName,
      actorRole: params.actorRole,
      action: params.action.toUpperCase(),
      entityType: params.entityType,
      entityId: params.entityId,
      description: params.description,
      metadata: params.metadata || {},
      createdAt: now,
    };

    await targetRef.collection("auditLogs").add(logData);
  } catch (error) {
    console.error("Failed to record audit log:", error);
  }
}

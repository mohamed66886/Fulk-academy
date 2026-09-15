"use server";

import { getTeacherAuthContext } from "@/lib/auth/permissions";
import type { AuditLog, AuditEntityType, ActorRole } from "@/types/audit";

export interface GetAuditLogsParams {
  page?: number;
  pageSize?: number;
  entityType?: AuditEntityType | "all";
  actorRole?: ActorRole | "all";
}

export interface GetAuditLogsResponse {
  success: boolean;
  logs: AuditLog[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error?: string;
}

/**
 * Fetch chronological audit logs with filtering and pagination
 */
export async function getAuditLogs(params: GetAuditLogsParams = {}): Promise<GetAuditLogsResponse> {
  try {
    const { teacherRef } = await getTeacherAuthContext();

    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, Math.max(10, params.pageSize || 20));

    let query: FirebaseFirestore.Query = teacherRef.collection("auditLogs");

    if (params.entityType && params.entityType !== "all") {
      query = query.where("entityType", "==", params.entityType);
    }

    if (params.actorRole && params.actorRole !== "all") {
      query = query.where("actorRole", "==", params.actorRole);
    }

    // Sort descending by timestamp
    query = query.orderBy("createdAt", "desc");

    // Fetch matching logs
    const snapshot = await query.get();
    const totalCount = snapshot.size;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;

    const offset = (page - 1) * pageSize;
    const pagedDocs = snapshot.docs.slice(offset, offset + pageSize);

    const logs: AuditLog[] = pagedDocs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        teacherId: d.teacherId,
        actorId: (d.actorId as string) || "",
        actorName: (d.actorName as string) || "مستخدم",
        actorRole: (d.actorRole as ActorRole) || "teacher",
        action: (d.action as string) || "",
        entityType: (d.entityType as AuditEntityType) || "settings",
        entityId: (d.entityId as string) || "",
        description: (d.description as string) || "",
        metadata: d.metadata || {},
        createdAt: (d.createdAt as string) || (d.timestamp as string) || "",
      };
    });

    return {
      success: true,
      logs,
      totalCount,
      page,
      pageSize,
      totalPages,
    };
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return {
      success: false,
      logs: [],
      totalCount: 0,
      page: 1,
      pageSize: 20,
      totalPages: 1,
      error: error instanceof Error ? error.message : "فشل جلب سجل العمليات",
    };
  }
}

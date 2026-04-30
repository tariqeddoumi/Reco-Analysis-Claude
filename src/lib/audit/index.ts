import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

interface AuditLogParams {
  userId?: string;
  entityType: string;
  entityId: string;
  action: string;
  module: string;
  missionId?: string;
  recommendationId?: string;
  actionId?: string;
  evidenceId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  comment?: string;
}

export async function createAuditLog(params: AuditLogParams) {
  try {
    const headersList = await headers();
    const ipAddress =
      headersList.get("x-forwarded-for") ||
      headersList.get("x-real-ip") ||
      "unknown";
    const userAgent = headersList.get("user-agent") || "unknown";

    await prisma.auditLog.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        module: params.module,
        ipAddress,
        userAgent,
        comment: params.comment,
        oldValues: params.oldValues as object | undefined,
        newValues: params.newValues as object | undefined,
        ...(params.userId && { userId: params.userId }),
        ...(params.missionId && { missionId: params.missionId }),
        ...(params.recommendationId && { recommendationId: params.recommendationId }),
        ...(params.actionId && { actionId: params.actionId }),
        ...(params.evidenceId && { evidenceId: params.evidenceId }),
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
}

export const AUDIT_ACTIONS = {
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
  STATUS_CHANGE: "STATUS_CHANGE",
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  EXPORT: "EXPORT",
  VIEW_SENSITIVE: "VIEW_SENSITIVE",
  VALIDATE: "VALIDATE",
  REJECT: "REJECT",
  CLOSE: "CLOSE",
  REOPEN: "REOPEN",
} as const;

export const AUDIT_MODULES = {
  AUTH: "auth",
  MISSIONS: "missions",
  RECOMMENDATIONS: "recommendations",
  ACTIONS: "actions",
  EVIDENCES: "evidences",
  WORKFLOW: "workflow",
  REPORTS: "reports",
  ADMIN: "admin",
  NOTIFICATIONS: "notifications",
} as const;

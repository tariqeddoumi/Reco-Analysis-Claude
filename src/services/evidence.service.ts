import { prisma } from "@/lib/prisma";
import { createAuditLog, AUDIT_ACTIONS, AUDIT_MODULES } from "@/lib/audit";
import type { EvidenceStatusCode } from "@/types";

interface EvidenceFilters {
  recommendationId?: string;
  actionId?: string;
  statusCode?: EvidenceStatusCode;
  depositorId?: string;
  page?: number;
  pageSize?: number;
}

// ============================================================
// Read operations
// ============================================================

export async function getEvidences(filters: EvidenceFilters = {}) {
  const {
    recommendationId,
    actionId,
    statusCode,
    depositorId,
    page = 1,
    pageSize = 20,
  } = filters;

  const where: Record<string, unknown> = { isDeleted: false };

  if (recommendationId) where.recommendationId = recommendationId;
  if (actionId) where.actionId = actionId;
  if (statusCode) where.statusCode = statusCode;
  if (depositorId) where.depositorId = depositorId;

  const [total, data] = await Promise.all([
    prisma.evidence.count({ where }),
    prisma.evidence.findMany({
      where,
      include: {
        depositor: { select: { firstName: true, lastName: true, email: true } },
        evidenceType: { select: { code: true, label: true } },
        recommendation: {
          select: { code: true, recommendation: true },
        },
        action: {
          select: { id: true, title: true },
        },
      },
      orderBy: { depositedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ============================================================
// Create
// ============================================================

export async function createEvidence(
  data: {
    recommendationId?: string;
    actionId?: string;
    evidenceTypeId?: string;
    title: string;
    description?: string;
    fileName?: string;
    fileUrl?: string;
    fileSize?: number;
    mimeType?: string;
    fileHash?: string;
  },
  userId: string
) {
  if (!data.recommendationId && !data.actionId) {
    throw new Error(
      "Une preuve doit être rattachée à une recommandation ou à une action."
    );
  }

  const evidence = await prisma.evidence.create({
    data: {
      ...data,
      depositorId: userId,
      statusCode: "DEPOSITED",
      depositedAt: new Date(),
    },
    include: {
      depositor: { select: { firstName: true, lastName: true } },
      evidenceType: { select: { code: true, label: true } },
    },
  });

  await createAuditLog({
    userId,
    entityType: "Evidence",
    entityId: evidence.id,
    action: AUDIT_ACTIONS.CREATE,
    module: AUDIT_MODULES.EVIDENCES,
    evidenceId: evidence.id,
    recommendationId: data.recommendationId,
    newValues: data as unknown as Record<string, unknown>,
  });

  return evidence;
}

// ============================================================
// Validate (accept) evidence
// ============================================================

export async function validateEvidence(
  id: string,
  userId: string,
  comment?: string
) {
  const evidence = await prisma.evidence.findFirstOrThrow({
    where: { id, isDeleted: false },
  });

  if (evidence.statusCode === "ACCEPTED") {
    throw new Error("Cette preuve est déjà acceptée.");
  }

  if (evidence.statusCode === "REJECTED") {
    throw new Error(
      "Impossible d'accepter une preuve rejetée. Demandez un nouveau dépôt."
    );
  }

  const updated = await prisma.evidence.update({
    where: { id },
    data: {
      statusCode: "ACCEPTED",
      validatedAt: new Date(),
      validatedBy: userId,
      validatorComment: comment ?? null,
    },
  });

  await createAuditLog({
    userId,
    entityType: "Evidence",
    entityId: id,
    action: AUDIT_ACTIONS.VALIDATE,
    module: AUDIT_MODULES.EVIDENCES,
    evidenceId: id,
    recommendationId: evidence.recommendationId ?? undefined,
    oldValues: { statusCode: evidence.statusCode },
    newValues: { statusCode: "ACCEPTED" },
    comment,
  });

  return updated;
}

// ============================================================
// Reject evidence
// ============================================================

export async function rejectEvidence(
  id: string,
  userId: string,
  reason: string
) {
  if (!reason || reason.trim().length === 0) {
    throw new Error("Un motif de rejet est obligatoire.");
  }

  const evidence = await prisma.evidence.findFirstOrThrow({
    where: { id, isDeleted: false },
  });

  if (evidence.statusCode === "REJECTED") {
    throw new Error("Cette preuve est déjà rejetée.");
  }

  if (evidence.statusCode === "ACCEPTED") {
    throw new Error("Impossible de rejeter une preuve déjà acceptée.");
  }

  const updated = await prisma.evidence.update({
    where: { id },
    data: {
      statusCode: "REJECTED",
      validatedAt: new Date(),
      validatedBy: userId,
      validatorComment: reason,
    },
  });

  await createAuditLog({
    userId,
    entityType: "Evidence",
    entityId: id,
    action: AUDIT_ACTIONS.REJECT,
    module: AUDIT_MODULES.EVIDENCES,
    evidenceId: id,
    recommendationId: evidence.recommendationId ?? undefined,
    oldValues: { statusCode: evidence.statusCode },
    newValues: { statusCode: "REJECTED" },
    comment: reason,
  });

  return updated;
}

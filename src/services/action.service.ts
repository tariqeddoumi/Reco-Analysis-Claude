import { prisma } from "@/lib/prisma";
import { createAuditLog, AUDIT_ACTIONS, AUDIT_MODULES } from "@/lib/audit";
import type { FilterOptions, PaginatedResult, ActionWithRelations } from "@/types";

// ============================================================
// Read operations
// ============================================================

export async function getActions(
  filters: FilterOptions = {}
): Promise<PaginatedResult<ActionWithRelations>> {
  const {
    page = 1,
    pageSize = 20,
    search,
    statusId,
    responsibleId,
    missionId,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = filters;

  const where: Record<string, unknown> = { isDeleted: false };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { deliverable: { contains: search, mode: "insensitive" } },
    ];
  }
  if (statusId) where.statusId = statusId;
  if (responsibleId) where.responsibleId = responsibleId;
  if (missionId) {
    where.actionPlan = {
      recommendation: { missionId },
    };
  }

  const [total, data] = await Promise.all([
    prisma.action.count({ where }),
    prisma.action.findMany({
      where,
      include: {
        status: { select: { code: true, label: true, color: true } },
        responsible: { select: { firstName: true, lastName: true } },
        actionPlan: {
          include: {
            recommendation: {
              select: {
                code: true,
                entity: { select: { label: true } },
              },
            },
          },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    data: data as unknown as ActionWithRelations[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getActionById(id: string) {
  return prisma.action.findFirst({
    where: { id, isDeleted: false },
    include: {
      status: true,
      responsible: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      actionPlan: {
        include: {
          recommendation: {
            include: {
              mission: { select: { id: true, reference: true, title: true } },
              entity: { select: { code: true, label: true } },
              status: { select: { code: true, label: true, color: true } },
            },
          },
        },
      },
      evidences: {
        where: { isDeleted: false },
        orderBy: { depositedAt: "desc" },
      },
      statusHistory: {
        include: {
          changedBy: { select: { firstName: true, lastName: true } },
          fromStatusAction: { select: { code: true, label: true } },
          toStatusAction: { select: { code: true, label: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      comments: {
        include: {
          author: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      attachments: { orderBy: { createdAt: "desc" } },
    },
  });
}

// ============================================================
// Create operation
// ============================================================

export async function createAction(
  data: {
    actionPlanId: string;
    title: string;
    description?: string;
    responsibleId?: string;
    statusId: string;
    priority?: number;
    weight?: number;
    estimatedEffort?: string;
    complexity?: string;
    plannedStartAt?: Date;
    plannedEndAt?: Date;
    deliverable?: string;
    expectedProof?: string;
  },
  userId: string
) {
  const action = await prisma.action.create({
    data: {
      ...data,
      createdBy: userId,
    },
    include: {
      status: true,
      responsible: { select: { firstName: true, lastName: true } },
    },
  });

  await createAuditLog({
    userId,
    entityType: "Action",
    entityId: action.id,
    action: AUDIT_ACTIONS.CREATE,
    module: AUDIT_MODULES.ACTIONS,
    actionId: action.id,
    newValues: data as unknown as Record<string, unknown>,
  });

  return action;
}

// ============================================================
// Update operation
// ============================================================

export async function updateAction(
  id: string,
  data: {
    title?: string;
    description?: string;
    responsibleId?: string;
    priority?: number;
    weight?: number;
    estimatedEffort?: string;
    complexity?: string;
    plannedStartAt?: Date | null;
    plannedEndAt?: Date | null;
    deliverable?: string;
    expectedProof?: string;
    blockReason?: string;
    comment?: string;
  },
  userId: string
) {
  const oldAction = await prisma.action.findUniqueOrThrow({ where: { id } });

  const updated = await prisma.action.update({
    where: { id },
    data,
    include: {
      status: true,
      responsible: { select: { firstName: true, lastName: true } },
    },
  });

  await createAuditLog({
    userId,
    entityType: "Action",
    entityId: id,
    action: AUDIT_ACTIONS.UPDATE,
    module: AUDIT_MODULES.ACTIONS,
    actionId: id,
    oldValues: oldAction as unknown as Record<string, unknown>,
    newValues: data as unknown as Record<string, unknown>,
  });

  return updated;
}

// ============================================================
// Progress update — also recalculates the parent action plan
// ============================================================

export async function updateActionProgress(
  id: string,
  progressRate: number,
  userId: string
) {
  if (progressRate < 0 || progressRate > 100) {
    throw new Error("Le taux d'avancement doit être compris entre 0 et 100.");
  }

  const oldAction = await prisma.action.findUniqueOrThrow({ where: { id } });

  const updated = await prisma.action.update({
    where: { id },
    data: { progressRate },
    select: { id: true, actionPlanId: true, progressRate: true, weight: true },
  });

  // Recalculate the parent action plan's weighted progress
  const siblingsAndSelf = await prisma.action.findMany({
    where: { actionPlanId: updated.actionPlanId, isDeleted: false },
    select: { progressRate: true, weight: true },
  });

  const totalWeight = siblingsAndSelf.reduce(
    (sum: number, a: { weight: number }) => sum + a.weight,
    0
  );
  const weightedProgress =
    totalWeight > 0
      ? Math.round(
          siblingsAndSelf.reduce(
            (sum: number, a: { progressRate: number; weight: number }) =>
              sum + a.progressRate * a.weight,
            0
          ) / totalWeight
        )
      : 0;

  await prisma.actionPlan.update({
    where: { id: updated.actionPlanId },
    data: { progressRate: weightedProgress },
  });

  await createAuditLog({
    userId,
    entityType: "Action",
    entityId: id,
    action: AUDIT_ACTIONS.UPDATE,
    module: AUDIT_MODULES.ACTIONS,
    actionId: id,
    oldValues: { progressRate: oldAction.progressRate },
    newValues: { progressRate },
    comment: `Taux d'avancement mis à jour: ${oldAction.progressRate}% → ${progressRate}%`,
  });

  return updated;
}

// ============================================================
// Status change
// ============================================================

export async function changeActionStatus(
  id: string,
  statusId: string,
  userId: string,
  comment?: string
) {
  const [oldAction, newStatus] = await Promise.all([
    prisma.action.findUniqueOrThrow({
      where: { id },
      include: { status: true },
    }),
    prisma.actionStatus.findUniqueOrThrow({ where: { id: statusId } }),
  ]);

  const updated = await prisma.$transaction(async (tx) => {
    const action = await tx.action.update({
      where: { id },
      data: {
        statusId,
        // If the new status is a "final" (closed/completed), mark actual end date
        ...(newStatus.isFinal && !oldAction.actualEndAt
          ? { actualEndAt: new Date() }
          : {}),
      },
      include: { status: true },
    });

    await tx.statusHistory.create({
      data: {
        entityType: "Action",
        entityId: id,
        actionId: id,
        fromStatusActionId: oldAction.statusId,
        toStatusActionId: statusId,
        changedById: userId,
        // removed,
        comment: comment ?? null,
      },
    });

    return action;
  });

  await createAuditLog({
    userId,
    entityType: "Action",
    entityId: id,
    action: AUDIT_ACTIONS.STATUS_CHANGE,
    module: AUDIT_MODULES.ACTIONS,
    actionId: id,
    oldValues: { statusCode: oldAction.status.code },
    newValues: { statusCode: newStatus.code },
    comment,
  });

  return updated;
}

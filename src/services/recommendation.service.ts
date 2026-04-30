import { prisma } from "@/lib/prisma";
import type { FilterOptions, PaginatedResult, RecommendationWithRelations } from "@/types";
import { createAuditLog, AUDIT_ACTIONS, AUDIT_MODULES } from "@/lib/audit";
import { calculateCriticality } from "@/lib/utils";

export async function getRecommendations(filters: FilterOptions = {}): Promise<PaginatedResult<RecommendationWithRelations>> {
  const {
    page = 1,
    pageSize = 20,
    search,
    statusId,
    sourceId,
    entityId,
    priorityId,
    isRegulator,
    isOverdue,
    missionId,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = filters;

  const where: Record<string, unknown> = { isDeleted: false };

  if (search) {
    where.OR = [
      { code: { contains: search, mode: "insensitive" } },
      { recommendation: { contains: search, mode: "insensitive" } },
      { findingDescription: { contains: search, mode: "insensitive" } },
    ];
  }
  if (statusId) where.statusId = statusId;
  if (sourceId) where.sourceId = sourceId;
  if (entityId) where.entityId = entityId;
  if (priorityId) where.priorityId = priorityId;
  if (isRegulator !== undefined) where.isRegulator = isRegulator;
  if (missionId) where.missionId = missionId;
  if (isOverdue) {
    where.closedAt = null;
    where.initialDueDate = { lt: new Date() };
  }

  const [total, data] = await Promise.all([
    prisma.recommendation.count({ where }),
    prisma.recommendation.findMany({
      where,
      include: {
        mission: { select: { reference: true, title: true } },
        source: { select: { code: true, label: true } },
        entity: { select: { code: true, label: true } },
        status: { select: { code: true, label: true, color: true } },
        priority: { select: { code: true, label: true, color: true } },
        severity: { select: { numericValue: true, label: true } },
        probability: { select: { numericValue: true, label: true } },
        owner: { select: { firstName: true, lastName: true } },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    data: data as unknown as RecommendationWithRelations[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getRecommendationById(id: string) {
  return prisma.recommendation.findFirst({
    where: { id, isDeleted: false },
    include: {
      mission: true,
      source: true,
      entity: true,
      direction: true,
      process: true,
      riskType: true,
      recommendationType: true,
      rootCauseType: true,
      severity: true,
      probability: true,
      priority: true,
      owner: true,
      operationalResponsible: true,
      status: true,
      confidentialityLevel: true,
      actionPlans: {
        where: { isDeleted: false },
        include: {
          actions: {
            where: { isDeleted: false },
            include: { status: true, responsible: true },
          },
        },
      },
      evidences: {
        where: { isDeleted: false },
        include: { evidenceType: true, depositor: true },
        orderBy: { createdAt: "desc" },
      },
      comments: {
        include: { author: true },
        orderBy: { createdAt: "desc" },
      },
      statusHistory: {
        include: {
          changedBy: true,
          fromStatusReco: true,
          toStatusReco: true,
        },
        orderBy: { createdAt: "desc" },
      },
      deadlineExtensions: {
        where: { isDeleted: false },
        include: { requester: true, validator: true },
        orderBy: { createdAt: "desc" },
      },
      attachments: true,
    },
  });
}

export async function createRecommendation(data: Record<string, unknown>, userId: string) {
  const count = await prisma.recommendation.count();
  const code = `REC-${String(count + 1).padStart(5, "0")}`;

  const severityValue = data.severityId
    ? (await prisma.severityLevel.findUnique({ where: { id: data.severityId as string } }))?.numericValue || 0
    : 0;

  const probabilityValue = data.probabilityId
    ? (await prisma.probabilityLevel.findUnique({ where: { id: data.probabilityId as string } }))?.numericValue || 0
    : 0;

  const source = data.sourceId
    ? await prisma.sourceType.findUnique({ where: { id: data.sourceId as string } })
    : null;

  const finalCriticality = severityValue && probabilityValue
    ? calculateCriticality(
        severityValue,
        probabilityValue,
        source?.sourceCoefficient || 1.0,
        (data.regulatoryImpact as number) || 1,
        (data.isRecurrent as boolean) || false
      )
    : null;

  const rawCriticality = severityValue * probabilityValue || null;

  let priorityId = data.priorityId as string | undefined;
  if (finalCriticality && !priorityId) {
    const priority = await prisma.priorityLevel.findFirst({
      where: {
        scoreMin: { lte: Math.round(finalCriticality) },
        scoreMax: { gte: Math.round(finalCriticality) },
        isActive: true,
      },
    });
    priorityId = priority?.id;
  }

  const recommendation = await prisma.recommendation.create({
    data: {
      ...data,
      code,
      rawCriticality,
      finalCriticality,
      priorityId,
      isRegulator: source?.isRegulator || (data.isRegulator as boolean) || false,
      createdBy: userId,
    } as Parameters<typeof prisma.recommendation.create>[0]["data"],
  });

  await createAuditLog({
    userId,
    entityType: "Recommendation",
    entityId: recommendation.id,
    action: AUDIT_ACTIONS.CREATE,
    module: AUDIT_MODULES.RECOMMENDATIONS,
    recommendationId: recommendation.id,
    newValues: data,
  });

  return recommendation;
}

export async function updateRecommendation(id: string, data: Record<string, unknown>, userId: string) {
  const old = await prisma.recommendation.findUnique({ where: { id } });

  const recommendation = await prisma.recommendation.update({
    where: { id },
    data: data as Parameters<typeof prisma.recommendation.update>[0]["data"],
  });

  await createAuditLog({
    userId,
    entityType: "Recommendation",
    entityId: id,
    action: AUDIT_ACTIONS.UPDATE,
    module: AUDIT_MODULES.RECOMMENDATIONS,
    recommendationId: id,
    oldValues: old as unknown as Record<string, unknown>,
    newValues: data,
  });

  return recommendation;
}

export async function changeRecommendationStatus(
  id: string,
  newStatusId: string,
  userId: string,
  comment?: string
) {
  const old = await prisma.recommendation.findUnique({ where: { id } });

  const updated = await prisma.recommendation.update({
    where: { id },
    data: { statusId: newStatusId },
  });

  await prisma.statusHistory.create({
    data: {
      entityType: "Recommendation",
      entityId: id,
      recommendationId: id,
      fromStatusRecoId: old?.statusId,
      toStatusRecoId: newStatusId,
      changedById: userId,
      comment,
    },
  });

  await createAuditLog({
    userId,
    entityType: "Recommendation",
    entityId: id,
    action: AUDIT_ACTIONS.STATUS_CHANGE,
    module: AUDIT_MODULES.RECOMMENDATIONS,
    recommendationId: id,
    oldValues: { statusId: old?.statusId },
    newValues: { statusId: newStatusId },
    comment,
  });

  return updated;
}

export async function getDashboardKpis() {
  const now = new Date();

  const [
    totalMissions,
    totalRecommendations,
    openRecommendations,
    closedRecommendations,
    overdueRecommendations,
    criticalRecommendations,
    regulatorRecommendations,
    avgProgress,
    totalExtensions,
    rejectedEvidences,
  ] = await Promise.all([
    prisma.mission.count({ where: { isDeleted: false } }),
    prisma.recommendation.count({ where: { isDeleted: false } }),
    prisma.recommendation.count({
      where: { isDeleted: false, closedAt: null },
    }),
    prisma.recommendation.count({
      where: { isDeleted: false, closedAt: { not: null } },
    }),
    prisma.recommendation.count({
      where: {
        isDeleted: false,
        closedAt: null,
        OR: [
          { initialDueDate: { lt: now } },
          { revisedDueDate: { lt: now } },
        ],
      },
    }),
    prisma.recommendation.count({
      where: {
        isDeleted: false,
        closedAt: null,
        priority: { code: "CRITICAL" },
      },
    }),
    prisma.recommendation.count({
      where: { isDeleted: false, isRegulator: true, closedAt: null },
    }),
    prisma.recommendation.aggregate({
      where: { isDeleted: false },
      _avg: { progressRate: true },
    }),
    prisma.deadlineExtension.count({ where: { isDeleted: false } }),
    prisma.evidence.count({ where: { isDeleted: false, statusCode: "REJECTED" } }),
  ]);

  const total = totalRecommendations || 1;

  return {
    totalMissions,
    totalRecommendations,
    openRecommendations,
    closedRecommendations,
    overdueRecommendations,
    criticalRecommendations,
    regulatorRecommendations,
    globalClosureRate: Math.round((closedRecommendations / total) * 100),
    averageProgressRate: Math.round(avgProgress._avg.progressRate || 0),
    averageProcessingDays: 0,
    totalExtensions,
    rejectedEvidences,
  };
}

export async function getRecommendationsBySource() {
  const sources = await prisma.sourceType.findMany({ where: { isActive: true } });

  return Promise.all(
    sources.map(async (source) => {
      const total = await prisma.recommendation.count({
        where: { sourceId: source.id, isDeleted: false },
      });
      const closed = await prisma.recommendation.count({
        where: { sourceId: source.id, isDeleted: false, closedAt: { not: null } },
      });
      const overdue = await prisma.recommendation.count({
        where: {
          sourceId: source.id,
          isDeleted: false,
          closedAt: null,
          initialDueDate: { lt: new Date() },
        },
      });
      return {
        source: source.label,
        total,
        closed,
        open: total - closed,
        overdue,
        closureRate: total > 0 ? Math.round((closed / total) * 100) : 0,
      };
    })
  );
}

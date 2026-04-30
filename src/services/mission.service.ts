import { prisma } from "@/lib/prisma";
import type { FilterOptions, PaginatedResult, MissionWithRelations } from "@/types";
import { createAuditLog, AUDIT_ACTIONS, AUDIT_MODULES } from "@/lib/audit";

export async function getMissions(filters: FilterOptions = {}): Promise<PaginatedResult<MissionWithRelations>> {
  const {
    page = 1,
    pageSize = 20,
    search,
    statusId,
    sourceId,
    entityId,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = filters;

  const where: Record<string, unknown> = { isDeleted: false };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { reference: { contains: search, mode: "insensitive" } },
    ];
  }
  if (statusId) where.statusId = statusId;
  if (sourceId) where.sourceId = sourceId;
  if (entityId) where.entityId = entityId;

  const [total, data] = await Promise.all([
    prisma.mission.count({ where }),
    prisma.mission.findMany({
      where,
      include: {
        missionType: true,
        source: true,
        entity: true,
        status: true,
        confidentialityLevel: true,
        responsible: true,
        _count: { select: { recommendations: { where: { isDeleted: false } } } },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    data: data as unknown as MissionWithRelations[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getMissionById(id: string) {
  return prisma.mission.findFirst({
    where: { id, isDeleted: false },
    include: {
      missionType: true,
      source: true,
      entity: true,
      status: true,
      confidentialityLevel: true,
      responsible: true,
      recommendations: {
        where: { isDeleted: false },
        include: {
          status: true,
          priority: true,
          source: true,
          entity: true,
          owner: true,
        },
        orderBy: { createdAt: "desc" },
      },
      attachments: true,
    },
  });
}

export async function createMission(data: Record<string, unknown>, userId: string) {
  const mission = await prisma.mission.create({
    data: {
      ...data,
      createdBy: userId,
    } as Parameters<typeof prisma.mission.create>[0]["data"],
  });

  await createAuditLog({
    userId,
    entityType: "Mission",
    entityId: mission.id,
    action: AUDIT_ACTIONS.CREATE,
    module: AUDIT_MODULES.MISSIONS,
    missionId: mission.id,
    newValues: data,
  });

  return mission;
}

export async function updateMission(id: string, data: Record<string, unknown>, userId: string) {
  const old = await prisma.mission.findUnique({ where: { id } });

  const mission = await prisma.mission.update({
    where: { id },
    data: data as Parameters<typeof prisma.mission.update>[0]["data"],
  });

  await createAuditLog({
    userId,
    entityType: "Mission",
    entityId: id,
    action: AUDIT_ACTIONS.UPDATE,
    module: AUDIT_MODULES.MISSIONS,
    missionId: id,
    oldValues: old as unknown as Record<string, unknown>,
    newValues: data,
  });

  return mission;
}

export async function deleteMission(id: string, userId: string) {
  await prisma.mission.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date(), deletedBy: userId },
  });

  await createAuditLog({
    userId,
    entityType: "Mission",
    entityId: id,
    action: AUDIT_ACTIONS.DELETE,
    module: AUDIT_MODULES.MISSIONS,
    missionId: id,
  });
}

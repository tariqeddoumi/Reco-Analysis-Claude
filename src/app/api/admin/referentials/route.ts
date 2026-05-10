import { NextRequest, NextResponse } from "next/server";
import { requireDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    await requireDbUser();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    const referentials: Record<string, unknown> = {};

    if (!type || type === "all") {
      const [
        confidentialityLevels,
        missionTypes,
        missionStatuses,
        sourceTypes,
        riskTypes,
        severityLevels,
        probabilityLevels,
        priorityLevels,
        recommendationStatuses,
        actionStatuses,
        evidenceTypes,
        evidenceStatuses,
        recommendationTypes,
        rootCauseTypes,
        complexityLevels,
        effortLevels,
        entities,
        roles,
        permissions,
        users,
        directions,
        processes,
      ] = await Promise.all([
        prisma.confidentialityLevel.findMany({ where: { isActive: true }, orderBy: { rank: "asc" } }),
        prisma.missionType.findMany({ where: { isActive: true }, orderBy: { label: "asc" } }),
        prisma.missionStatus.findMany({ where: { isActive: true }, orderBy: { rank: "asc" } }),
        prisma.sourceType.findMany({ where: { isActive: true }, orderBy: { label: "asc" } }),
        prisma.riskType.findMany({ where: { isActive: true }, orderBy: { label: "asc" } }),
        prisma.severityLevel.findMany({ where: { isActive: true }, orderBy: { numericValue: "asc" } }),
        prisma.probabilityLevel.findMany({ where: { isActive: true }, orderBy: { numericValue: "asc" } }),
        prisma.priorityLevel.findMany({ where: { isActive: true }, orderBy: { scoreMin: "asc" } }),
        prisma.recommendationStatus.findMany({ where: { isActive: true }, orderBy: { rank: "asc" } }),
        prisma.actionStatus.findMany({ where: { isActive: true }, orderBy: { rank: "asc" } }),
        prisma.evidenceType.findMany({ where: { isActive: true } }),
        prisma.evidenceStatus.findMany({ where: { isActive: true }, orderBy: { rank: "asc" } }),
        prisma.recommendationType.findMany({ where: { isActive: true }, orderBy: { label: "asc" } }),
        prisma.rootCauseType.findMany({ where: { isActive: true }, orderBy: { label: "asc" } }),
        prisma.complexityLevel.findMany({ where: { isActive: true }, orderBy: { rank: "asc" } }),
        prisma.effortLevel.findMany({ where: { isActive: true }, orderBy: { rank: "asc" } }),
        prisma.entity.findMany({ where: { isActive: true }, orderBy: { label: "asc" } }),
        prisma.role.findMany({ where: { isActive: true }, orderBy: { label: "asc" } }),
        prisma.permission.findMany({ where: { isActive: true }, orderBy: [{ module: "asc" }, { label: "asc" }] }),
        prisma.user.findMany({
          where: { isActive: true },
          select: { id: true, firstName: true, lastName: true, email: true },
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        }),
        prisma.direction.findMany({ where: { isActive: true }, orderBy: { label: "asc" } }),
        prisma.process.findMany({ where: { isActive: true }, orderBy: { label: "asc" } }),
      ]);

      Object.assign(referentials, {
        confidentialityLevels,
        missionTypes,
        missionStatuses,
        sourceTypes,
        riskTypes,
        severityLevels,
        probabilityLevels,
        priorityLevels,
        recommendationStatuses,
        actionStatuses,
        evidenceTypes,
        evidenceStatuses,
        recommendationTypes,
        rootCauseTypes,
        complexityLevels,
        effortLevels,
        entities,
        roles,
        permissions,
        users,
        directions,
        processes,
        // Aliases utilisés par les formulaires mission/recommandation
        sources: sourceTypes,
        statuses: missionStatuses,
        severities: severityLevels,
        probabilities: probabilityLevels,
        priorities: priorityLevels,
      });
    }

    return NextResponse.json(referentials);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

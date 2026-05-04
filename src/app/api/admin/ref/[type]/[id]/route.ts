import { NextRequest, NextResponse } from "next/server";
import { requireDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

const TYPE_ALLOWED_FIELDS: Record<string, string[]> = {
  sourceTypes: ["label", "description", "sourceCoefficient", "isRegulator", "requiresProof", "isActive"],
  severityLevels: ["label", "description", "numericValue", "color", "isActive"],
  probabilityLevels: ["label", "description", "numericValue", "color", "isActive"],
  priorityLevels: ["label", "description", "scoreMin", "scoreMax", "color", "badgeVariant", "isActive"],
  recommendationStatuses: ["label", "description", "rank", "color", "isFinal", "isOpen", "isActive"],
  actionStatuses: ["label", "description", "rank", "color", "isFinal", "isActive"],
  missionStatuses: ["label", "description", "rank", "color", "isFinal", "isActive"],
  missionTypes: ["label", "description", "isActive"],
  riskTypes: ["label", "description", "category", "isActive"],
  recommendationTypes: ["label", "description", "category", "isActive"],
  rootCauseTypes: ["label", "description", "category", "isActive"],
  evidenceTypes: ["label", "description", "isActive"],
  confidentialityLevels: ["label", "description", "rank", "color", "isActive"],
  directions: ["label", "isActive"],
  processes: ["label", "category", "isActive"],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getDelegate(type: string): any {
  const map: Record<string, unknown> = {
    sourceTypes: prisma.sourceType,
    severityLevels: prisma.severityLevel,
    probabilityLevels: prisma.probabilityLevel,
    priorityLevels: prisma.priorityLevel,
    recommendationStatuses: prisma.recommendationStatus,
    actionStatuses: prisma.actionStatus,
    missionStatuses: prisma.missionStatus,
    missionTypes: prisma.missionType,
    riskTypes: prisma.riskType,
    recommendationTypes: prisma.recommendationType,
    rootCauseTypes: prisma.rootCauseType,
    evidenceTypes: prisma.evidenceType,
    confidentialityLevels: prisma.confidentialityLevel,
    directions: prisma.direction,
    processes: prisma.process,
  };
  return map[type] ?? null;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const user = await requireDbUser();
    if (!hasPermission(user, PERMISSIONS.ADMIN_PARAMETERS)) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const { type, id } = await params;
    const delegate = getDelegate(type);
    if (!delegate) return NextResponse.json({ error: "Type inconnu" }, { status: 404 });

    const allowedFields = TYPE_ALLOWED_FIELDS[type];
    if (!allowedFields) return NextResponse.json({ error: "Type non configurable" }, { status: 400 });

    const body = await request.json();
    const data: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) data[field] = body[field];
    }

    // Coerce numeric types
    if ("numericValue" in data) data.numericValue = Number(data.numericValue);
    if ("scoreMin" in data) data.scoreMin = Number(data.scoreMin);
    if ("scoreMax" in data) data.scoreMax = Number(data.scoreMax);
    if ("rank" in data) data.rank = Number(data.rank);
    if ("sourceCoefficient" in data) data.sourceCoefficient = Number(data.sourceCoefficient);

    const item = await delegate.update({ where: { id }, data });
    return NextResponse.json(item);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const user = await requireDbUser();
    if (!hasPermission(user, PERMISSIONS.ADMIN_PARAMETERS)) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const { type, id } = await params;
    const delegate = getDelegate(type);
    if (!delegate) return NextResponse.json({ error: "Type inconnu" }, { status: 404 });

    const { isActive } = await request.json();
    const item = await delegate.update({ where: { id }, data: { isActive: Boolean(isActive) } });
    return NextResponse.json(item);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

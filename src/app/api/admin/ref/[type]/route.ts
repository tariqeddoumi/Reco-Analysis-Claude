import { NextRequest, NextResponse } from "next/server";
import { requireDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

// Fields allowed for create/update per type
const TYPE_CONFIG: Record<string, {
  orderBy?: Record<string, string>;
  allowedFields: string[];
  requiredFields: string[];
}> = {
  sourceTypes: {
    orderBy: { label: "asc" },
    allowedFields: ["code", "label", "description", "sourceCoefficient", "isRegulator", "requiresProof", "isActive"],
    requiredFields: ["code", "label"],
  },
  severityLevels: {
    orderBy: { numericValue: "asc" },
    allowedFields: ["code", "label", "description", "numericValue", "color", "isActive"],
    requiredFields: ["code", "label", "numericValue"],
  },
  probabilityLevels: {
    orderBy: { numericValue: "asc" },
    allowedFields: ["code", "label", "description", "numericValue", "color", "isActive"],
    requiredFields: ["code", "label", "numericValue"],
  },
  priorityLevels: {
    orderBy: { scoreMin: "asc" },
    allowedFields: ["code", "label", "description", "scoreMin", "scoreMax", "color", "badgeVariant", "isActive"],
    requiredFields: ["code", "label", "scoreMin", "scoreMax"],
  },
  recommendationStatuses: {
    orderBy: { rank: "asc" },
    allowedFields: ["code", "label", "description", "rank", "color", "isFinal", "isOpen", "isActive"],
    requiredFields: ["code", "label"],
  },
  actionStatuses: {
    orderBy: { rank: "asc" },
    allowedFields: ["code", "label", "description", "rank", "color", "isFinal", "isActive"],
    requiredFields: ["code", "label"],
  },
  missionStatuses: {
    orderBy: { rank: "asc" },
    allowedFields: ["code", "label", "description", "rank", "color", "isFinal", "isActive"],
    requiredFields: ["code", "label"],
  },
  missionTypes: {
    orderBy: { label: "asc" },
    allowedFields: ["code", "label", "description", "isActive"],
    requiredFields: ["code", "label"],
  },
  riskTypes: {
    orderBy: { label: "asc" },
    allowedFields: ["code", "label", "description", "category", "isActive"],
    requiredFields: ["code", "label"],
  },
  recommendationTypes: {
    orderBy: { label: "asc" },
    allowedFields: ["code", "label", "description", "category", "isActive"],
    requiredFields: ["code", "label"],
  },
  rootCauseTypes: {
    orderBy: { label: "asc" },
    allowedFields: ["code", "label", "description", "category", "isActive"],
    requiredFields: ["code", "label"],
  },
  evidenceTypes: {
    orderBy: { label: "asc" },
    allowedFields: ["code", "label", "description", "isActive"],
    requiredFields: ["code", "label"],
  },
  confidentialityLevels: {
    orderBy: { rank: "asc" },
    allowedFields: ["code", "label", "description", "rank", "color", "isActive"],
    requiredFields: ["code", "label"],
  },
  directions: {
    orderBy: { label: "asc" },
    allowedFields: ["code", "label", "isActive"],
    requiredFields: ["code", "label"],
  },
  processes: {
    orderBy: { label: "asc" },
    allowedFields: ["code", "label", "category", "isActive"],
    requiredFields: ["code", "label"],
  },
};

// Maps type key to prisma delegate
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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    await requireDbUser();
    const { type } = await params;
    const delegate = getDelegate(type);
    if (!delegate) return NextResponse.json({ error: "Type inconnu" }, { status: 404 });

    const config = TYPE_CONFIG[type];
    const data = await delegate.findMany({
      orderBy: config?.orderBy ?? { label: "asc" },
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const user = await requireDbUser();
    if (!hasPermission(user, PERMISSIONS.ADMIN_PARAMETERS)) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const { type } = await params;
    const delegate = getDelegate(type);
    if (!delegate) return NextResponse.json({ error: "Type inconnu" }, { status: 404 });

    const config = TYPE_CONFIG[type];
    if (!config) return NextResponse.json({ error: "Type non configurable" }, { status: 400 });

    const body = await request.json();

    // Validate required fields
    for (const field of config.requiredFields) {
      if (!body[field] && body[field] !== 0 && body[field] !== false) {
        return NextResponse.json({ error: `Champ obligatoire: ${field}` }, { status: 400 });
      }
    }

    // Filter to allowed fields only
    const data: Record<string, unknown> = {};
    for (const field of config.allowedFields) {
      if (field in body) {
        data[field] = body[field];
      }
    }

    // Coerce types
    if ("numericValue" in data) data.numericValue = Number(data.numericValue);
    if ("scoreMin" in data) data.scoreMin = Number(data.scoreMin);
    if ("scoreMax" in data) data.scoreMax = Number(data.scoreMax);
    if ("rank" in data) data.rank = Number(data.rank);
    if ("sourceCoefficient" in data) data.sourceCoefficient = Number(data.sourceCoefficient);

    const item = await delegate.create({ data });
    return NextResponse.json(item, { status: 201 });
  } catch (error: unknown) {
    console.error(error);
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "Ce code existe déjà" }, { status: 409 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

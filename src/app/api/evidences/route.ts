import { NextRequest, NextResponse } from "next/server";
import { requireDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, AUDIT_ACTIONS, AUDIT_MODULES } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    await requireDbUser();
    const { searchParams } = new URL(request.url);
    const recommendationId = searchParams.get("recommendationId") || undefined;
    const actionId = searchParams.get("actionId") || undefined;
    const statusCode = searchParams.get("statusCode") || undefined;

    const where: Record<string, unknown> = { isDeleted: false };
    if (recommendationId) where.recommendationId = recommendationId;
    if (actionId) where.actionId = actionId;
    if (statusCode) where.statusCode = statusCode;

    const evidences = await prisma.evidence.findMany({
      where,
      include: {
        evidenceType: true,
        depositor: true,
        recommendation: { select: { code: true } },
        action: { select: { title: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(evidences);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireDbUser();
    const body = await request.json();

    const { title, description, recommendationId, actionId, evidenceTypeId, fileName, fileUrl, fileSize, mimeType } = body;

    if (!title) return NextResponse.json({ error: "Le titre est obligatoire" }, { status: 400 });

    const evidence = await prisma.evidence.create({
      data: {
        title,
        description,
        recommendationId,
        actionId,
        evidenceTypeId,
        fileName,
        fileUrl,
        fileSize,
        mimeType,
        depositorId: user.id,
        statusCode: "DEPOSITED",
      },
    });

    await createAuditLog({
      userId: user.id,
      entityType: "Evidence",
      entityId: evidence.id,
      evidenceId: evidence.id,
      action: AUDIT_ACTIONS.CREATE,
      module: AUDIT_MODULES.EVIDENCES,
      recommendationId,
    });

    return NextResponse.json(evidence, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, AUDIT_ACTIONS, AUDIT_MODULES } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    await requireDbUser();
    const { searchParams } = new URL(request.url);
    const statusCode = searchParams.get("statusCode") || undefined;
    const recommendationId = searchParams.get("recommendationId") || undefined;
    const actionId = searchParams.get("actionId") || undefined;

    const where: Record<string, unknown> = { isDeleted: false };
    if (statusCode) where.statusCode = statusCode;
    if (recommendationId) where.recommendationId = recommendationId;
    if (actionId) where.actionId = actionId;

    const extensions = await prisma.deadlineExtension.findMany({
      where,
      include: {
        recommendation: { select: { code: true, recommendation: true } },
        action: { select: { title: true } },
        requester: { select: { firstName: true, lastName: true } },
        validator: { select: { firstName: true, lastName: true } },
      },
      orderBy: { requestedAt: "desc" },
    });

    return NextResponse.json(extensions);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireDbUser();
    const body = await request.json();

    const { reason, requestedDueDate, currentDueDate, recommendationId, actionId, justification, impact } = body;

    if (!reason || !requestedDueDate) {
      return NextResponse.json(
        { error: "Le motif et la nouvelle date sont obligatoires" },
        { status: 400 }
      );
    }

    const extension = await prisma.deadlineExtension.create({
      data: {
        reason,
        justification,
        impact,
        requestedDueDate: new Date(requestedDueDate),
        currentDueDate: currentDueDate ? new Date(currentDueDate) : new Date(),
        recommendationId: recommendationId || null,
        actionId: actionId || null,
        requesterId: user.id,
        statusCode: "SUBMITTED",
      },
    });

    await createAuditLog({
      userId: user.id,
      entityType: "DeadlineExtension",
      entityId: extension.id,
      action: AUDIT_ACTIONS.CREATE,
      module: AUDIT_MODULES.ACTIONS,
      recommendationId,
      newValues: { reason, requestedDueDate, currentDueDate },
    });

    return NextResponse.json(extension, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

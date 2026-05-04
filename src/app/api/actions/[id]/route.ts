import { NextRequest, NextResponse } from "next/server";
import { requireDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { actionSchema } from "@/lib/validators/action";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { createAuditLog, AUDIT_ACTIONS, AUDIT_MODULES } from "@/lib/audit";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireDbUser();
    const { id } = await params;
    const action = await prisma.action.findFirst({
      where: { id, isDeleted: false },
      include: {
        status: true,
        responsible: true,
        actionPlan: {
          include: {
            recommendation: {
              include: { entity: true, source: true, mission: true },
            },
          },
        },
        evidences: {
          where: { isDeleted: false },
          include: { evidenceType: true, depositor: true },
        },
        comments: { include: { author: true }, orderBy: { createdAt: "desc" } },
        statusHistory: {
          include: { changedBy: true, fromStatusAction: true, toStatusAction: true },
          orderBy: { createdAt: "desc" },
        },
        deadlineExtensions: {
          where: { isDeleted: false },
          include: { requester: true, validator: true },
        },
      },
    });

    if (!action) return NextResponse.json({ error: "Action introuvable" }, { status: 404 });
    return NextResponse.json(action);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireDbUser();
    const { id } = await params;

    if (!hasPermission(user, PERMISSIONS.ACTION_UPDATE)) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const body = await request.json();
    const old = await prisma.action.findUnique({ where: { id } });
    const validated = actionSchema.partial().parse(body);

    const actionData: Record<string, unknown> = { ...validated };
    const DATE_FIELDS = ["plannedStartAt", "plannedEndAt", "actualEndAt"] as const;
    for (const field of DATE_FIELDS) {
      if (field in actionData) {
        const val = actionData[field];
        actionData[field] = val && typeof val === "string" && val.trim() !== "" ? new Date(val) : null;
      }
    }
    const NULLABLE_ID_FIELDS = ["responsibleId"] as const;
    for (const field of NULLABLE_ID_FIELDS) {
      if (field in actionData) {
        const val = actionData[field];
        if (typeof val === "string" && val.trim() === "") actionData[field] = null;
      }
    }

    const action = await prisma.action.update({
      where: { id },
      data: actionData as Parameters<typeof prisma.action.update>[0]["data"],
    });

    if (validated.statusId && old?.statusId !== validated.statusId) {
      await prisma.statusHistory.create({
        data: {
          entityType: "Action",
          entityId: id,
          actionId: id,
          fromStatusActionId: old?.statusId,
          toStatusActionId: validated.statusId,
          changedById: user.id,
        },
      });
    }

    if (validated.progressRate !== undefined) {
      const actionPlan = await prisma.actionPlan.findUnique({
        where: { id: action.actionPlanId },
        include: { actions: { where: { isDeleted: false } } },
      });
      if (actionPlan) {
        const totalWeight = actionPlan.actions.reduce((sum, a) => sum + a.weight, 0);
        const weightedProgress = actionPlan.actions.reduce(
          (sum, a) => sum + (a.progressRate * a.weight) / (totalWeight || 1),
          0
        );
        await prisma.actionPlan.update({
          where: { id: action.actionPlanId },
          data: { progressRate: Math.round(weightedProgress) },
        });

        const allPlans = await prisma.actionPlan.findMany({
          where: { recommendationId: actionPlan.recommendationId, isDeleted: false },
        });
        const avgRecoProgress = allPlans.reduce((sum, p) => sum + p.progressRate, 0) / (allPlans.length || 1);
        await prisma.recommendation.update({
          where: { id: actionPlan.recommendationId },
          data: { progressRate: Math.round(avgRecoProgress) },
        });
      }
    }

    await createAuditLog({
      userId: user.id,
      entityType: "Action",
      entityId: id,
      actionId: id,
      action: AUDIT_ACTIONS.UPDATE,
      module: AUDIT_MODULES.ACTIONS,
      oldValues: old as unknown as Record<string, unknown>,
      newValues: validated as Record<string, unknown>,
    });

    return NextResponse.json(action);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

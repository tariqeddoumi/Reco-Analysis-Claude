import { NextRequest, NextResponse } from "next/server";
import { requireDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { createAuditLog, AUDIT_ACTIONS, AUDIT_MODULES } from "@/lib/audit";
import { z } from "zod";

const actionPlanUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  statusCode: z.string().optional(),
  progressRate: z.number().min(0).max(100).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireDbUser();
    const { id } = await params;

    const actionPlan = await prisma.actionPlan.findFirst({
      where: { id, isDeleted: false },
      include: {
        recommendation: {
          include: { entity: true, source: true },
        },
        actions: {
          where: { isDeleted: false },
          include: {
            status: true,
            responsible: true,
            evidences: {
              where: { isDeleted: false },
              select: { id: true, statusCode: true },
            },
          },
          orderBy: { priority: "asc" },
        },
      },
    });

    if (!actionPlan) {
      return NextResponse.json({ error: "Plan d'action introuvable" }, { status: 404 });
    }

    return NextResponse.json(actionPlan);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireDbUser();
    const { id } = await params;

    if (!hasPermission(user, PERMISSIONS.ACTION_PLAN_UPDATE)) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const body = await request.json();
    const old = await prisma.actionPlan.findUnique({ where: { id } });
    const validated = actionPlanUpdateSchema.parse(body);

    const actionPlan = await prisma.actionPlan.update({
      where: { id },
      data: validated,
      include: {
        actions: {
          where: { isDeleted: false },
          include: { status: true, responsible: true },
        },
      },
    });

    await createAuditLog({
      userId: user.id,
      entityType: "ActionPlan",
      entityId: id,
      action: AUDIT_ACTIONS.UPDATE,
      module: AUDIT_MODULES.ACTIONS,
      oldValues: old as unknown as Record<string, unknown>,
      newValues: validated as Record<string, unknown>,
    });

    return NextResponse.json(actionPlan);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { createAuditLog, AUDIT_ACTIONS, AUDIT_MODULES } from "@/lib/audit";
import { z } from "zod";

const actionPlanSchema = z.object({
  recommendationId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  statusCode: z.string().optional(),
  weight: z.number().int().min(1).max(100).optional(),
});

export async function GET(request: NextRequest) {
  try {
    await requireDbUser();
    const { searchParams } = new URL(request.url);
    const recommendationId = searchParams.get("recommendationId") || undefined;
    const page = Number(searchParams.get("page")) || 1;
    const pageSize = Number(searchParams.get("pageSize")) || 20;

    const where: Record<string, unknown> = { isDeleted: false };
    if (recommendationId) where.recommendationId = recommendationId;

    const [total, data] = await Promise.all([
      prisma.actionPlan.count({ where }),
      prisma.actionPlan.findMany({
        where,
        include: {
          recommendation: {
            select: { code: true, entity: { select: { label: true } } },
          },
          actions: {
            where: { isDeleted: false },
            select: { id: true, title: true, progressRate: true, status: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({ data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireDbUser();

    if (!hasPermission(user, PERMISSIONS.ACTION_PLAN_CREATE)) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const body = await request.json();
    const validated = actionPlanSchema.parse(body);

    const actionPlan = await prisma.actionPlan.create({
      data: {
        ...validated,
        createdBy: user.id,
        statusCode: validated.statusCode ?? "DRAFT",
        weight: validated.weight ?? 100,
      },
    });

    await createAuditLog({
      userId: user.id,
      entityType: "ActionPlan",
      entityId: actionPlan.id,
      action: AUDIT_ACTIONS.CREATE,
      module: AUDIT_MODULES.ACTIONS,
      newValues: validated as Record<string, unknown>,
    });

    return NextResponse.json(actionPlan, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "errors" in error) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

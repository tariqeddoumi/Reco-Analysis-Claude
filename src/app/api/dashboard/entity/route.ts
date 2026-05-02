import { NextResponse } from "next/server";
import { requireDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireDbUser();
    const now = new Date();

    const [entities, recommendations] = await Promise.all([
      prisma.entity.findMany({
        select: { id: true, code: true, label: true },
        orderBy: { label: "asc" },
      }),
      prisma.recommendation.findMany({
        where: { isDeleted: false },
        select: {
          id: true,
          entityId: true,
          closedAt: true,
          initialDueDate: true,
          revisedDueDate: true,
          finalCriticality: true,
          _count: { select: { actionPlans: true } },
        },
      }),
    ]);

    const result = entities
      .map((entity) => {
        const recos = recommendations.filter((r) => r.entityId === entity.id);
        if (recos.length === 0) return null;
        const total = recos.length;
        const closed = recos.filter((r) => r.closedAt !== null).length;
        const open = total - closed;
        const overdue = recos.filter((r) => {
          const due = r.revisedDueDate ?? r.initialDueDate;
          return r.closedAt === null && due !== null && due < now;
        }).length;
        const noActionPlan = recos.filter(
          (r) => r._count.actionPlans === 0 && r.closedAt === null
        ).length;
        const criticalCount = recos.filter(
          (r) => r.closedAt === null && (r.finalCriticality ?? 0) > 20
        ).length;
        const withCriticality = recos.filter((r) => r.finalCriticality !== null);
        const avgCriticality =
          withCriticality.length > 0
            ? withCriticality.reduce((s, r) => s + (r.finalCriticality ?? 0), 0) /
              withCriticality.length
            : 0;
        return {
          id: entity.id,
          code: entity.code,
          label: entity.label,
          total,
          open,
          closed,
          overdue,
          overdueRate: open > 0 ? Math.round((overdue / open) * 100) : 0,
          closureRate: total > 0 ? Math.round((closed / total) * 100) : 0,
          avgCriticality: Math.round(avgCriticality * 10) / 10,
          noActionPlan,
          criticalCount,
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b?.total ?? 0) - (a?.total ?? 0));

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

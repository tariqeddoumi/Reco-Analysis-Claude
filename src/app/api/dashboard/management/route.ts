import { NextResponse } from "next/server";
import { requireDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireDbUser();
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 86400000);

    const [topCritical, regulatorPriority, upcomingRaw, withoutActionPlan, blockedActions, topOverdueRaw] =
      await Promise.all([
        prisma.recommendation.findMany({
          where: { isDeleted: false, closedAt: null, finalCriticality: { gt: 15 } },
          include: {
            entity: { select: { label: true } },
            source: { select: { label: true } },
            status: { select: { code: true, label: true, color: true } },
            priority: { select: { code: true, label: true } },
            owner: { select: { firstName: true, lastName: true } },
          },
          orderBy: { finalCriticality: "desc" },
          take: 10,
        }),
        prisma.recommendation.findMany({
          where: { isDeleted: false, closedAt: null, isRegulator: true },
          include: {
            entity: { select: { label: true } },
            status: { select: { code: true, label: true, color: true } },
            priority: { select: { code: true, label: true } },
          },
          orderBy: [{ finalCriticality: "desc" }, { initialDueDate: "asc" }],
          take: 10,
        }),
        prisma.recommendation.findMany({
          where: {
            isDeleted: false,
            closedAt: null,
            OR: [
              { revisedDueDate: { gte: now, lte: in30Days } },
              { revisedDueDate: null, initialDueDate: { gte: now, lte: in30Days } },
            ],
          },
          include: {
            entity: { select: { label: true } },
            status: { select: { code: true, label: true, color: true } },
          },
          orderBy: [{ revisedDueDate: "asc" }, { initialDueDate: "asc" }],
          take: 15,
        }),
        prisma.recommendation.count({
          where: { isDeleted: false, closedAt: null, actionPlans: { none: {} } },
        }),
        prisma.action.count({ where: { status: { code: "BLOCKED" } } }),
        prisma.recommendation.groupBy({
          by: ["entityId"],
          where: {
            isDeleted: false,
            closedAt: null,
            OR: [
              { revisedDueDate: { lt: now } },
              { revisedDueDate: null, initialDueDate: { lt: now } },
            ],
          },
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
          take: 10,
        }),
      ]);

    const entityIds = topOverdueRaw.map((e) => e.entityId).filter(Boolean) as string[];
    const entityLabels = await prisma.entity.findMany({
      where: { id: { in: entityIds } },
      select: { id: true, label: true },
    });
    const topOverdueEntities = topOverdueRaw.map((row) => ({
      entity: entityLabels.find((e) => e.id === row.entityId)?.label ?? "N/A",
      overdueCount: row._count.id,
    }));

    const monthlyEvolution = await Promise.all(
      Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const nextD = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 1);
        return Promise.all([
          prisma.recommendation.count({
            where: { isDeleted: false, createdAt: { gte: d, lt: nextD } },
          }),
          prisma.recommendation.count({
            where: { isDeleted: false, closedAt: { gte: d, lt: nextD } },
          }),
        ]).then(([opened, closed]) => ({
          month: d.toLocaleString("fr-FR", { month: "short", year: "2-digit" }),
          opened,
          closed,
        }));
      })
    );

    const upcomingDeadlines = upcomingRaw.map((r) => ({
      ...r,
      daysRemaining: Math.ceil(
        ((r.revisedDueDate ?? r.initialDueDate)!.getTime() - now.getTime()) / 86400000
      ),
    }));

    return NextResponse.json({
      topCritical,
      regulatorPriority,
      upcomingDeadlines,
      withoutActionPlan,
      blockedActions,
      topOverdueEntities,
      monthlyEvolution,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

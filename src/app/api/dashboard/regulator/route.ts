import { NextResponse } from "next/server";
import { requireDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireDbUser();
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 86400000);

    const [allRegulator, entities, pendingExtensions, pendingEvidences] = await Promise.all([
      prisma.recommendation.findMany({
        where: { isDeleted: false, isRegulator: true },
        select: {
          id: true,
          code: true,
          recommendation: true,
          entityId: true,
          closedAt: true,
          initialDueDate: true,
          revisedDueDate: true,
          finalCriticality: true,
          entity: { select: { label: true } },
          source: { select: { label: true } },
          status: { select: { code: true, label: true, color: true } },
          priority: { select: { code: true, label: true } },
          owner: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.entity.findMany({ select: { id: true, label: true }, orderBy: { label: "asc" } }),
      prisma.deadlineExtension.count({
        where: { statusCode: "SUBMITTED", recommendation: { isRegulator: true } },
      }),
      prisma.evidence.count({
        where: { statusCode: "IN_REVIEW", recommendation: { isRegulator: true } },
      }),
    ]);

    const total = allRegulator.length;
    const open = allRegulator.filter((r) => r.closedAt === null).length;
    const closed = total - open;
    const overdue = allRegulator.filter((r) => {
      const due = r.revisedDueDate ?? r.initialDueDate;
      return r.closedAt === null && due !== null && due < now;
    }).length;
    const critical = allRegulator.filter(
      (r) => r.closedAt === null && (r.finalCriticality ?? 0) > 20
    ).length;
    const closureRate = total > 0 ? Math.round((closed / total) * 100) : 0;

    const byEntity = entities
      .map((entity) => {
        const recos = allRegulator.filter((r) => r.entityId === entity.id);
        if (recos.length === 0) return null;
        const entityOpen = recos.filter((r) => r.closedAt === null).length;
        const entityOverdue = recos.filter((r) => {
          const due = r.revisedDueDate ?? r.initialDueDate;
          return r.closedAt === null && due !== null && due < now;
        }).length;
        return {
          entity: entity.label,
          total: recos.length,
          open: entityOpen,
          closed: recos.length - entityOpen,
          overdue: entityOverdue,
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b?.total ?? 0) - (a?.total ?? 0));

    const upcoming = allRegulator
      .filter((r) => {
        const due = r.revisedDueDate ?? r.initialDueDate;
        return r.closedAt === null && due !== null && due >= now && due <= in30Days;
      })
      .map((r) => ({
        ...r,
        daysRemaining: Math.ceil(
          ((r.revisedDueDate ?? r.initialDueDate)!.getTime() - now.getTime()) / 86400000
        ),
      }))
      .sort((a, b) => a.daysRemaining - b.daysRemaining);

    const openList = allRegulator
      .filter((r) => r.closedAt === null)
      .sort((a, b) => (b.finalCriticality ?? 0) - (a.finalCriticality ?? 0))
      .slice(0, 20);

    return NextResponse.json({
      kpis: { total, open, closed, overdue, critical, closureRate, pendingExtensions, pendingEvidences },
      byEntity,
      upcoming,
      openList,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

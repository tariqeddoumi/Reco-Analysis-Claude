import { NextResponse } from "next/server";
import { requireDbUser } from "@/lib/auth";
import { getDashboardKpis, getRecommendationsBySource } from "@/services/recommendation.service";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireDbUser();

    const [kpis, bySource, byStatus, byEntity, recentCritical] = await Promise.all([
      getDashboardKpis(),
      getRecommendationsBySource(),
      prisma.recommendation.groupBy({
        by: ["statusId"],
        where: { isDeleted: false },
        _count: { id: true },
      }),
      prisma.recommendation.groupBy({
        by: ["entityId"],
        where: { isDeleted: false, closedAt: null },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
      prisma.recommendation.findMany({
        where: {
          isDeleted: false,
          closedAt: null,
          priority: { code: "CRITICAL" },
        },
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
    ]);

    const now = new Date();
    const monthlyTrend = await Promise.all(
      Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const nextD = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 1);
        return prisma.recommendation.count({
          where: {
            isDeleted: false,
            createdAt: { gte: d, lt: nextD },
          },
        }).then((count) => ({
          month: d.toLocaleString("fr-FR", { month: "short", year: "2-digit" }),
          count,
        }));
      })
    );

    return NextResponse.json({
      kpis,
      bySource,
      byStatus,
      byEntity,
      recentCritical,
      monthlyTrend,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

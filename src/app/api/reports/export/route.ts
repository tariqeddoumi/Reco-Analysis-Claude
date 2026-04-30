import { NextRequest, NextResponse } from "next/server";
import { requireDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toRow(cells: unknown[]): string {
  return cells.map(escapeCSV).join(",");
}

function formatDateCSV(date: Date | string | null | undefined): string {
  if (!date) return "";
  try {
    return new Date(date).toLocaleDateString("fr-FR");
  } catch {
    return "";
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireDbUser();

    if (!hasPermission(user, PERMISSIONS.REPORT_EXPORT)) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") ?? "excel";

    let csvContent = "";
    let filename = "";

    const now = new Date().toISOString().split("T")[0];

    const baseInclude = {
      mission: { select: { reference: true, title: true } },
      source: { select: { code: true, label: true } },
      entity: { select: { code: true, label: true } },
      status: { select: { code: true, label: true } },
      priority: { select: { code: true, label: true } },
      owner: { select: { firstName: true, lastName: true } },
    };

    const headers = [
      "Code",
      "Recommandation",
      "Mission",
      "Source",
      "Entité",
      "Statut",
      "Priorité",
      "Avancement (%)",
      "Date émission",
      "Échéance initiale",
      "Échéance révisée",
      "Clôture",
      "Responsable",
      "Réglementaire",
      "Récurrent",
    ];

    const makeRow = (r: {
      code: string;
      recommendation: string;
      mission: { reference: string; title: string };
      source: { code: string; label: string };
      entity: { code: string; label: string };
      status: { code: string; label: string };
      priority: { code: string; label: string } | null;
      progressRate: number;
      issuedAt: Date | null;
      initialDueDate: Date | null;
      revisedDueDate: Date | null;
      closedAt: Date | null;
      owner: { firstName: string; lastName: string } | null;
      isRegulator: boolean;
      isRecurrent: boolean;
    }): string =>
      toRow([
        r.code,
        r.recommendation,
        `${r.mission.reference} - ${r.mission.title}`,
        r.source.label,
        r.entity.label,
        r.status.label,
        r.priority?.label ?? "",
        r.progressRate,
        formatDateCSV(r.issuedAt),
        formatDateCSV(r.initialDueDate),
        formatDateCSV(r.revisedDueDate),
        formatDateCSV(r.closedAt),
        r.owner ? `${r.owner.firstName} ${r.owner.lastName}` : "",
        r.isRegulator ? "Oui" : "Non",
        r.isRecurrent ? "Oui" : "Non",
      ]);

    if (type === "excel" || type === "pdf") {
      const recommendations = await prisma.recommendation.findMany({
        where: { isDeleted: false },
        include: baseInclude,
        orderBy: { code: "asc" },
      });

      csvContent =
        "﻿" +
        toRow(headers) +
        "\n" +
        recommendations.map(makeRow).join("\n");
      filename = `recommandations-completes-${now}.csv`;
    } else if (type === "regulator") {
      const recommendations = await prisma.recommendation.findMany({
        where: { isDeleted: false, isRegulator: true },
        include: baseInclude,
        orderBy: { code: "asc" },
      });

      csvContent =
        "﻿" +
        toRow(headers) +
        "\n" +
        recommendations.map(makeRow).join("\n");
      filename = `recommandations-regulateur-${now}.csv`;
    } else if (type === "overdue") {
      const today = new Date();
      const recommendations = await prisma.recommendation.findMany({
        where: {
          isDeleted: false,
          closedAt: null,
          OR: [
            { initialDueDate: { lt: today } },
            { revisedDueDate: { lt: today } },
          ],
        },
        include: baseInclude,
        orderBy: { initialDueDate: "asc" },
      });

      const overdueHeaders = [...headers, "Jours de retard"];
      csvContent =
        "﻿" +
        toRow(overdueHeaders) +
        "\n" +
        recommendations
          .map((r) => {
            const dueDate = r.revisedDueDate ?? r.initialDueDate;
            const daysOverdue = dueDate
              ? Math.floor(
                  (today.getTime() - new Date(dueDate).getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              : 0;
            return makeRow(r as Parameters<typeof makeRow>[0]) + "," + escapeCSV(daysOverdue);
          })
          .join("\n");
      filename = `recommandations-retard-${now}.csv`;
    } else if (type === "by-entity") {
      const recommendations = await prisma.recommendation.findMany({
        where: { isDeleted: false },
        include: baseInclude,
        orderBy: [{ entity: { label: "asc" } }, { code: "asc" }],
      });

      csvContent =
        "﻿" +
        toRow(headers) +
        "\n" +
        recommendations.map(makeRow).join("\n");
      filename = `recommandations-par-entite-${now}.csv`;
    } else {
      return NextResponse.json({ error: "Type d'export non supporté" }, { status: 400 });
    }

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

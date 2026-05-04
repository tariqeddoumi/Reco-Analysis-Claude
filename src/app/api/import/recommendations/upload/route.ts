import { NextRequest, NextResponse } from "next/server";
import { requireDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { detectColumns, parseWithMapping } from "@/services/excel-parser.service";

export async function POST(request: NextRequest) {
  try {
    const user = await requireDbUser();

    if (!hasPermission(user, PERMISSIONS.RECOMMENDATION_IMPORT)) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
    }
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      return NextResponse.json({ error: "Format invalide. Seuls les fichiers .xlsx et .xls sont acceptés" }, { status: 400 });
    }
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Fichier trop volumineux (max 10 Mo)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Detect columns and sample rows
    let detected;
    try {
      detected = detectColumns(buffer);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur de lecture";
      return NextResponse.json({ error: `Impossible de lire le fichier Excel: ${message}` }, { status: 422 });
    }

    if (detected.columns.length === 0) {
      return NextResponse.json({ error: "Le fichier ne contient aucune colonne" }, { status: 422 });
    }

    // Parse ALL raw rows (no mapping applied yet)
    const allRaw = parseWithMapping(buffer, Object.fromEntries(detected.columns.map((c) => [c, c])));

    if (allRaw.length === 0) {
      return NextResponse.json({ error: "Le fichier ne contient aucune ligne de données" }, { status: 422 });
    }

    // Create batch in MAPPING status – store raw rows
    const batch = await prisma.importBatch.create({
      data: {
        fileName: file.name,
        uploadedBy: user.id,
        status: "MAPPING",
        totalRows: allRaw.length,
        updatedAt: new Date(),
      },
    });

    await prisma.importBatchRow.createMany({
      data: allRaw.map((row) => ({
        batchId: batch.id,
        rowNumber: row.rowNumber,
        rawData: row.data as Prisma.InputJsonValue,
        status: "PENDING",
        updatedAt: new Date(),
      })),
    });

    return NextResponse.json({
      batchId: batch.id,
      fileName: file.name,
      totalRows: allRaw.length,
      columns: detected.columns,
      sampleRows: detected.sampleRows,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

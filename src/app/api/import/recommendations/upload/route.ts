import { NextRequest, NextResponse } from "next/server";
import { requireDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { parseExcelBuffer } from "@/services/excel-parser.service";
import { validateRows } from "@/services/import-validation.service";

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

    const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Fichier trop volumineux (max 10 Mo)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let rawRows;
    try {
      rawRows = parseExcelBuffer(buffer);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur de lecture du fichier";
      return NextResponse.json({ error: `Impossible de lire le fichier Excel: ${message}` }, { status: 422 });
    }

    if (rawRows.length === 0) {
      return NextResponse.json({ error: "Le fichier ne contient aucune ligne de données" }, { status: 422 });
    }

    const validatedRows = await validateRows(rawRows);
    const validCount = validatedRows.filter((r) => r.status === "VALID" && !r.isDuplicate).length;
    const errorCount = validatedRows.filter((r) => r.status === "ERROR").length;
    const duplicateCount = validatedRows.filter((r) => r.isDuplicate).length;

    // Create the batch record
    const batch = await prisma.importBatch.create({
      data: {
        fileName: file.name,
        uploadedBy: user.id,
        status: errorCount > 0 ? "VALIDATED_WITH_ERRORS" : "VALIDATED",
        totalRows: validatedRows.length,
        validRows: validCount,
        errorRows: errorCount,
        updatedAt: new Date(),
      },
    });

    // Create batch rows
    await prisma.importBatchRow.createMany({
      data: validatedRows.map((row) => ({
        batchId: batch.id,
        rowNumber: row.rowNumber,
        rawData: row.rawData as object,
        status: row.status === "VALID" && !row.isDuplicate
          ? "VALID"
          : row.isDuplicate
            ? "DUPLICATE"
            : "ERROR",
        errors: row.errors.length > 0 ? (row.errors as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        mappedData: row.mappedData !== null ? (row.mappedData as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        updatedAt: new Date(),
      })),
    });

    return NextResponse.json({
      batchId: batch.id,
      fileName: file.name,
      totalRows: validatedRows.length,
      validRows: validCount,
      errorRows: errorCount,
      duplicateCount,
      rows: validatedRows.map((r) => ({
        rowNumber: r.rowNumber,
        status: r.isDuplicate ? "DUPLICATE" : r.status,
        errors: r.errors,
        mappedData: r.mappedData,
        rawData: r.rawData,
        isDuplicate: r.isDuplicate,
        existingId: r.existingId,
      })),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

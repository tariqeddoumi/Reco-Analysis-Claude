import { NextRequest, NextResponse } from "next/server";
import { requireDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { validateRows } from "@/services/import-validation.service";
import type { RawExcelRow } from "@/services/excel-parser.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const user = await requireDbUser();
    if (!hasPermission(user, PERMISSIONS.RECOMMENDATION_IMPORT)) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const { batchId } = await params;
    const body = await request.json();
    const columnMap: Record<string, string> = body.columnMap ?? {};

    if (Object.keys(columnMap).length === 0) {
      return NextResponse.json({ error: "Mapping des colonnes manquant" }, { status: 400 });
    }

    const batch = await prisma.importBatch.findUnique({
      where: { id: batchId },
      include: { rows: { orderBy: { rowNumber: "asc" } } },
    });
    if (!batch) return NextResponse.json({ error: "Batch introuvable" }, { status: 404 });
    if (batch.status === "DONE") return NextResponse.json({ error: "Ce batch a déjà été importé" }, { status: 409 });

    // Apply column mapping to raw rows
    const rawRows: RawExcelRow[] = batch.rows.map((row) => {
      const originalData = row.rawData as Record<string, string | number | null>;
      const mapped: Record<string, string | number | null> = {};
      for (const [excelCol, fieldName] of Object.entries(columnMap)) {
        if (!fieldName || fieldName === "_ignore") continue;
        const val = originalData[excelCol];
        mapped[fieldName] = val !== undefined ? val : null;
      }
      return { rowNumber: row.rowNumber, data: mapped };
    });

    // Validate
    const validatedRows = await validateRows(rawRows);
    const validCount = validatedRows.filter((r) => r.status === "VALID" && !r.isDuplicate).length;
    const errorCount = validatedRows.filter((r) => r.status === "ERROR").length;
    const duplicateCount = validatedRows.filter((r) => r.isDuplicate).length;

    // Update each batch row with validation result
    await Promise.all(
      validatedRows.map((vr) =>
        prisma.importBatchRow.updateMany({
          where: { batchId, rowNumber: vr.rowNumber },
          data: {
            status: vr.status === "VALID" && !vr.isDuplicate ? "VALID" : vr.isDuplicate ? "DUPLICATE" : "ERROR",
            errors: vr.errors.length > 0 ? (vr.errors as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
            mappedData: vr.mappedData !== null ? (vr.mappedData as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
            updatedAt: new Date(),
          },
        })
      )
    );

    // Update batch status
    await prisma.importBatch.update({
      where: { id: batchId },
      data: {
        status: errorCount > 0 ? "VALIDATED_WITH_ERRORS" : "VALIDATED",
        validRows: validCount,
        errorRows: errorCount,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      batchId,
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

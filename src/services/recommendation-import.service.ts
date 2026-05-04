import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { createAuditLog, AUDIT_ACTIONS, AUDIT_MODULES } from "@/lib/audit";
import type { MappedRecommendation } from "./import-validation.service";

export type DuplicateMode = "BLOCK" | "UPDATE" | "IGNORE";

interface ImportRowResult {
  rowId: string;
  rowNumber: number;
  status: "IMPORTED" | "UPDATED" | "SKIPPED" | "ERROR";
  recommendationId?: string;
  error?: string;
}

export async function commitImportBatch(
  batchId: string,
  userId: string,
  duplicateMode: DuplicateMode
): Promise<{ imported: number; updated: number; skipped: number; errors: number }> {
  const batch = await prisma.importBatch.findUnique({
    where: { id: batchId },
    include: { rows: { where: { status: "VALID" } } },
  });

  if (!batch) throw new Error("Batch introuvable");
  if (batch.status === "DONE") throw new Error("Ce batch a déjà été importé");

  await prisma.importBatch.update({
    where: { id: batchId },
    data: { status: "IMPORTING" },
  });

  let imported = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of batch.rows) {
    const mapped = row.mappedData as unknown as MappedRecommendation;
    if (!mapped) continue;

    const existing = await prisma.recommendation.findFirst({
      where: { code: mapped.code, isDeleted: false },
    });

    let result: ImportRowResult;

    try {
      if (existing) {
        if (duplicateMode === "BLOCK") {
          result = { rowId: row.id, rowNumber: row.rowNumber, status: "ERROR", error: `Code en double: ${mapped.code}` };
          errors++;
        } else if (duplicateMode === "IGNORE") {
          result = { rowId: row.id, rowNumber: row.rowNumber, status: "SKIPPED", recommendationId: existing.id };
          skipped++;
        } else {
          // UPDATE
          await prisma.recommendation.update({
            where: { id: existing.id },
            data: {
              statusId: mapped.statusId,
              progressRate: mapped.progressRate,
              closedAt: mapped.closedAt,
              entityComment: mapped.entityComment ?? undefined,
              revisedDueDate: mapped.revisedDueDate,
              priorityId: mapped.priorityId ?? undefined,
            },
          });
          await createAuditLog({
            userId,
            entityType: "Recommendation",
            entityId: existing.id,
            recommendationId: existing.id,
            action: AUDIT_ACTIONS.IMPORT,
            module: AUDIT_MODULES.IMPORT,
            newValues: mapped as unknown as Record<string, unknown>,
          });
          result = { rowId: row.id, rowNumber: row.rowNumber, status: "UPDATED", recommendationId: existing.id };
          updated++;
        }
      } else {
        // Require missionId — use a default mission or skip if none available
        let missionId = mapped.missionId;
        if (!missionId) {
          const defaultMission = await prisma.mission.findFirst({
            where: { isDeleted: false },
            orderBy: { createdAt: "asc" },
            select: { id: true },
          });
          missionId = defaultMission?.id ?? null;
        }

        if (!missionId) {
          result = { rowId: row.id, rowNumber: row.rowNumber, status: "ERROR", error: "Aucune mission disponible pour rattacher la recommandation" };
          errors++;
        } else {
          const reco = await prisma.recommendation.create({
            data: {
              code: mapped.code,
              missionId,
              sourceId: mapped.sourceId,
              entityId: mapped.entityId,
              statusId: mapped.statusId,
              findingDescription: mapped.findingDescription,
              recommendation: mapped.recommendation,
              progressRate: mapped.progressRate,
              issuedAt: mapped.issuedAt,
              initialDueDate: mapped.initialDueDate,
              revisedDueDate: mapped.revisedDueDate,
              closedAt: mapped.closedAt,
              entityComment: mapped.entityComment,
              reportReference: mapped.reportReference,
              priorityId: mapped.priorityId ?? undefined,
              createdBy: userId,
            },
          });
          await createAuditLog({
            userId,
            entityType: "Recommendation",
            entityId: reco.id,
            recommendationId: reco.id,
            action: AUDIT_ACTIONS.IMPORT,
            module: AUDIT_MODULES.IMPORT,
            newValues: mapped as unknown as Record<string, unknown>,
          });
          result = { rowId: row.id, rowNumber: row.rowNumber, status: "IMPORTED", recommendationId: reco.id };
          imported++;
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      result = { rowId: row.id, rowNumber: row.rowNumber, status: "ERROR", error: message };
      errors++;
    }

    await prisma.importBatchRow.update({
      where: { id: result.rowId },
      data: {
        status: result.status,
        recommendationId: result.recommendationId ?? null,
        errors: result.error
          ? ([{ field: "import", message: result.error }] as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        updatedAt: new Date(),
      },
    });
  }

  await prisma.importBatch.update({
    where: { id: batchId },
    data: {
      status: "DONE",
      importedRows: imported + updated,
      updatedAt: new Date(),
    },
  });

  return { imported, updated, skipped, errors };
}

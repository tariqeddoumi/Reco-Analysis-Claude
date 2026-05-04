import { NextRequest, NextResponse } from "next/server";
import { requireDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { commitImportBatch } from "@/services/recommendation-import.service";
import type { DuplicateMode } from "@/services/recommendation-import.service";

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
    const duplicateMode: DuplicateMode = ["BLOCK", "UPDATE", "IGNORE"].includes(body.duplicateMode)
      ? body.duplicateMode
      : "BLOCK";

    const batch = await prisma.importBatch.findUnique({ where: { id: batchId } });
    if (!batch) {
      return NextResponse.json({ error: "Batch introuvable" }, { status: 404 });
    }
    if (batch.status === "DONE") {
      return NextResponse.json({ error: "Ce batch a déjà été importé" }, { status: 409 });
    }

    await prisma.importBatch.update({
      where: { id: batchId },
      data: { duplicateMode, updatedAt: new Date() },
    });

    const result = await commitImportBatch(batchId, user.id, duplicateMode);

    return NextResponse.json({
      batchId,
      ...result,
      message: `Import terminé: ${result.imported} créées, ${result.updated} mises à jour, ${result.skipped} ignorées, ${result.errors} erreurs`,
    });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    await requireDbUser();
    const { batchId } = await params;

    const batch = await prisma.importBatch.findUnique({
      where: { id: batchId },
      include: {
        uploader: { select: { id: true, firstName: true, lastName: true, email: true } },
        rows: {
          orderBy: { rowNumber: "asc" },
          select: {
            id: true,
            rowNumber: true,
            status: true,
            errors: true,
            mappedData: true,
            rawData: true,
            recommendationId: true,
          },
        },
      },
    });

    if (!batch) {
      return NextResponse.json({ error: "Batch introuvable" }, { status: 404 });
    }

    return NextResponse.json(batch);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

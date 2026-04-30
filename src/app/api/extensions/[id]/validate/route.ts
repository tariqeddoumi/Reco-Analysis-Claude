import { NextRequest, NextResponse } from "next/server";
import { requireDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, AUDIT_ACTIONS, AUDIT_MODULES } from "@/lib/audit";
import { z } from "zod";

const validateSchema = z.object({
  action: z.enum(["approve", "reject"]),
  comment: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireDbUser();
    const { id } = await params;

    const body = await request.json();
    const { action, comment } = validateSchema.parse(body);

    if (action === "reject" && !comment?.trim()) {
      return NextResponse.json(
        { error: "Le commentaire est obligatoire pour un rejet" },
        { status: 400 }
      );
    }

    const newStatusCode = action === "approve" ? "VALIDATED" : "REJECTED";

    const extension = await prisma.deadlineExtension.update({
      where: { id },
      data: {
        statusCode: newStatusCode,
        validatorId: user.id,
        validatedAt: new Date(),
        rejectionReason: action === "reject" ? comment : undefined,
      },
    });

    // If approved and linked to recommendation, update its revisedDueDate
    if (action === "approve" && extension.recommendationId) {
      await prisma.recommendation.update({
        where: { id: extension.recommendationId },
        data: { revisedDueDate: extension.requestedDueDate },
      });
    }

    // If approved and linked to action, update its plannedEndAt
    if (action === "approve" && extension.actionId) {
      await prisma.action.update({
        where: { id: extension.actionId },
        data: { plannedEndAt: extension.requestedDueDate },
      });
    }

    await createAuditLog({
      userId: user.id,
      entityType: "DeadlineExtension",
      entityId: id,
      action: action === "approve" ? AUDIT_ACTIONS.VALIDATE : AUDIT_ACTIONS.REJECT,
      module: AUDIT_MODULES.ACTIONS,
      newValues: { statusCode: newStatusCode, comment },
    });

    return NextResponse.json(extension);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

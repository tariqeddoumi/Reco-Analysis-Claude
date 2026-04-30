import { NextRequest, NextResponse } from "next/server";
import { requireDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, AUDIT_ACTIONS, AUDIT_MODULES } from "@/lib/audit";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { z } from "zod";

const validateSchema = z.object({
  action: z.enum(["accept", "reject"]),
  comment: z.string().optional(),
  reason: z.string().optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireDbUser();
    const { id } = await params;

    if (!hasPermission(user, PERMISSIONS.EVIDENCE_VALIDATE)) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const body = await request.json();
    const { action, comment, reason } = validateSchema.parse(body);

    if (action === "reject" && !reason) {
      return NextResponse.json({ error: "Le motif de rejet est obligatoire" }, { status: 400 });
    }

    const newStatus = action === "accept" ? "ACCEPTED" : "REJECTED";

    const evidence = await prisma.evidence.update({
      where: { id },
      data: {
        statusCode: newStatus,
        validatorComment: action === "reject" ? reason : comment,
        validatedAt: new Date(),
        validatedBy: user.id,
      },
    });

    await createAuditLog({
      userId: user.id,
      entityType: "Evidence",
      entityId: id,
      evidenceId: id,
      action: action === "accept" ? AUDIT_ACTIONS.VALIDATE : AUDIT_ACTIONS.REJECT,
      module: AUDIT_MODULES.EVIDENCES,
      newValues: { statusCode: newStatus },
      comment: action === "reject" ? reason : comment,
    });

    return NextResponse.json(evidence);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

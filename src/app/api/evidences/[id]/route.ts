import { NextRequest, NextResponse } from "next/server";
import { requireDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { createAuditLog, AUDIT_ACTIONS, AUDIT_MODULES } from "@/lib/audit";
import { z } from "zod";

const evidenceUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  evidenceTypeId: z.string().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireDbUser();
    const { id } = await params;

    const evidence = await prisma.evidence.findFirst({
      where: { id, isDeleted: false },
      include: {
        evidenceType: true,
        depositor: { select: { id: true, firstName: true, lastName: true, email: true } },
        recommendation: { select: { id: true, code: true } },
        action: { select: { id: true, title: true } },
      },
    });

    if (!evidence) {
      return NextResponse.json({ error: "Élément de preuve introuvable" }, { status: 404 });
    }

    return NextResponse.json(evidence);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireDbUser();
    const { id } = await params;

    if (!hasPermission(user, PERMISSIONS.EVIDENCE_CREATE)) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const body = await request.json();
    const old = await prisma.evidence.findFirst({ where: { id, isDeleted: false } });
    if (!old) return NextResponse.json({ error: "Élément de preuve introuvable" }, { status: 404 });

    const validated = evidenceUpdateSchema.parse(body);

    const evidence = await prisma.evidence.update({
      where: { id },
      data: validated,
      include: { evidenceType: true, depositor: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });

    await createAuditLog({
      userId: user.id,
      entityType: "Evidence",
      entityId: id,
      evidenceId: id,
      action: AUDIT_ACTIONS.UPDATE,
      module: AUDIT_MODULES.EVIDENCES,
      oldValues: old as unknown as Record<string, unknown>,
      newValues: validated as Record<string, unknown>,
    });

    return NextResponse.json(evidence);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireDbUser();
    const { id } = await params;

    if (!hasPermission(user, PERMISSIONS.EVIDENCE_CREATE)) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const evidence = await prisma.evidence.findFirst({ where: { id, isDeleted: false } });
    if (!evidence) return NextResponse.json({ error: "Élément de preuve introuvable" }, { status: 404 });

    await prisma.evidence.update({
      where: { id },
      data: { isDeleted: true },
    });

    await createAuditLog({
      userId: user.id,
      entityType: "Evidence",
      entityId: id,
      evidenceId: id,
      action: AUDIT_ACTIONS.DELETE,
      module: AUDIT_MODULES.EVIDENCES,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";
import { createAuditLog, AUDIT_ACTIONS, AUDIT_MODULES } from "@/lib/audit";
import { z } from "zod";

const updateSchema = z.object({
  label: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireDbUser();
    if (!isAdmin(user)) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const entityData = updateSchema.parse(body);

    const existing = await prisma.entity.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Entité introuvable" }, { status: 404 });
    }

    if (entityData.parentId === id) {
      return NextResponse.json({ error: "Une entité ne peut pas être son propre parent" }, { status: 400 });
    }

    const updated = await prisma.entity.update({
      where: { id },
      data: entityData,
      include: {
        parent: { select: { id: true, code: true, label: true } },
        _count: { select: { children: true, missions: true, recommendations: true } },
      },
    });

    await createAuditLog({
      userId: user.id,
      entityType: "Entity",
      entityId: id,
      action: AUDIT_ACTIONS.UPDATE,
      module: AUDIT_MODULES.ADMIN,
      oldValues: { label: existing.label, isActive: existing.isActive },
      newValues: entityData as Record<string, unknown>,
    });

    return NextResponse.json(updated);
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
    if (!isAdmin(user)) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.entity.findUnique({
      where: { id },
      include: {
        _count: { select: { children: true, missions: true, recommendations: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Entité introuvable" }, { status: 404 });
    }

    const usageCount =
      existing._count.children + existing._count.missions + existing._count.recommendations;
    if (usageCount > 0) {
      return NextResponse.json(
        { error: "Impossible de supprimer : cette entité est référencée dans le système" },
        { status: 409 }
      );
    }

    await prisma.entity.delete({ where: { id } });

    await createAuditLog({
      userId: user.id,
      entityType: "Entity",
      entityId: id,
      action: AUDIT_ACTIONS.DELETE,
      module: AUDIT_MODULES.ADMIN,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

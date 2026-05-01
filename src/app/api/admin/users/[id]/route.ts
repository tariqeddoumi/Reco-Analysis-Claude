import { NextRequest, NextResponse } from "next/server";
import { requireDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";
import { createAuditLog, AUDIT_ACTIONS, AUDIT_MODULES } from "@/lib/audit";
import { z } from "zod";

const updateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  roleIds: z.array(z.string()).optional(),
  entityIds: z.array(z.string()).optional(),
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
    const { roleIds, entityIds, ...userData } = updateSchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...userData,
        ...(roleIds !== undefined && {
          userRoles: {
            deleteMany: {},
            create: roleIds.map((roleId) => ({ roleId })),
          },
        }),
        ...(entityIds !== undefined && {
          entities: {
            deleteMany: {},
            create: entityIds.map((entityId) => ({ entityId })),
          },
        }),
      },
      include: {
        userRoles: { include: { role: true } },
        entities: { include: { entity: true } },
      },
    });

    await createAuditLog({
      userId: user.id,
      entityType: "User",
      entityId: id,
      action: AUDIT_ACTIONS.UPDATE,
      module: AUDIT_MODULES.ADMIN,
      oldValues: { isActive: existing.isActive },
      newValues: userData as Record<string, unknown>,
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

    if (id === user.id) {
      return NextResponse.json({ error: "Impossible de supprimer votre propre compte" }, { status: 400 });
    }

    await prisma.user.delete({ where: { id } });

    await createAuditLog({
      userId: user.id,
      entityType: "User",
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

import { NextRequest, NextResponse } from "next/server";
import { requireDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";
import { createAuditLog, AUDIT_ACTIONS, AUDIT_MODULES } from "@/lib/audit";
import { z } from "zod";

const updateSchema = z.object({
  label: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  permissionIds: z.array(z.string()).optional(),
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
    const { permissionIds, ...roleData } = updateSchema.parse(body);

    const existing = await prisma.role.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Rôle introuvable" }, { status: 404 });
    }

    if (existing.isSystem && roleData.isActive === false) {
      return NextResponse.json({ error: "Impossible de désactiver un rôle système" }, { status: 400 });
    }

    const updated = await prisma.role.update({
      where: { id },
      data: {
        ...roleData,
        ...(permissionIds !== undefined && {
          permissions: {
            deleteMany: {},
            create: permissionIds.map((permissionId) => ({ permissionId })),
          },
        }),
      },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { userRoles: true } },
      },
    });

    await createAuditLog({
      userId: user.id,
      entityType: "Role",
      entityId: id,
      action: AUDIT_ACTIONS.UPDATE,
      module: AUDIT_MODULES.ADMIN,
      oldValues: { label: existing.label, isActive: existing.isActive },
      newValues: roleData as Record<string, unknown>,
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
    const existing = await prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { userRoles: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Rôle introuvable" }, { status: 404 });
    }
    if (existing.isSystem) {
      return NextResponse.json({ error: "Impossible de supprimer un rôle système" }, { status: 400 });
    }
    if (existing._count.userRoles > 0) {
      return NextResponse.json(
        { error: `Ce rôle est attribué à ${existing._count.userRoles} utilisateur(s)` },
        { status: 409 }
      );
    }

    await prisma.role.delete({ where: { id } });

    await createAuditLog({
      userId: user.id,
      entityType: "Role",
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

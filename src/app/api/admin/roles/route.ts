import { NextRequest, NextResponse } from "next/server";
import { requireDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";
import { createAuditLog, AUDIT_ACTIONS, AUDIT_MODULES } from "@/lib/audit";
import { z } from "zod";

const roleSchema = z.object({
  code: z.string().min(1).toUpperCase(),
  label: z.string().min(1),
  description: z.string().optional(),
  permissionIds: z.array(z.string()).default([]),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireDbUser();
    if (!isAdmin(user)) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const page = Number(searchParams.get("page")) || 1;
    const pageSize = Number(searchParams.get("pageSize")) || 20;

    const where = search
      ? {
          OR: [
            { code: { contains: search, mode: "insensitive" as const } },
            { label: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [total, data] = await Promise.all([
      prisma.role.count({ where }),
      prisma.role.findMany({
        where,
        include: {
          permissions: { include: { permission: true } },
          _count: { select: { userRoles: true } },
        },
        orderBy: { label: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({ data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireDbUser();
    if (!isAdmin(user)) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const body = await request.json();
    const { permissionIds, ...roleData } = roleSchema.parse(body);

    const existing = await prisma.role.findUnique({ where: { code: roleData.code } });
    if (existing) {
      return NextResponse.json({ error: "Ce code de rôle existe déjà" }, { status: 409 });
    }

    const newRole = await prisma.role.create({
      data: {
        ...roleData,
        permissions: {
          create: permissionIds.map((permissionId) => ({ permissionId })),
        },
      },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { userRoles: true } },
      },
    });

    await createAuditLog({
      userId: user.id,
      entityType: "Role",
      entityId: newRole.id,
      action: AUDIT_ACTIONS.CREATE,
      module: AUDIT_MODULES.ADMIN,
      newValues: roleData as Record<string, unknown>,
    });

    return NextResponse.json(newRole, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

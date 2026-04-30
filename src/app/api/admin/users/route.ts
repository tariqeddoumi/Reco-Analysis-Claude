import { NextRequest, NextResponse } from "next/server";
import { requireDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";
import { createAuditLog, AUDIT_ACTIONS, AUDIT_MODULES } from "@/lib/audit";
import { z } from "zod";

const userSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  title: z.string().optional(),
  isActive: z.boolean().default(true),
  roleIds: z.array(z.string()).default([]),
  entityIds: z.array(z.string()).default([]),
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

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: {
          userRoles: { include: { role: true } },
          entities: { include: { entity: true } },
        },
        orderBy: { lastName: "asc" },
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
    const { roleIds, entityIds, ...userData } = userSchema.parse(body);

    const newUser = await prisma.user.create({
      data: {
        ...userData,
        userRoles: {
          create: roleIds.map((roleId) => ({ roleId })),
        },
        entities: {
          create: entityIds.map((entityId) => ({ entityId })),
        },
      },
      include: {
        userRoles: { include: { role: true } },
        entities: { include: { entity: true } },
      },
    });

    await createAuditLog({
      userId: user.id,
      entityType: "User",
      entityId: newUser.id,
      action: AUDIT_ACTIONS.CREATE,
      module: AUDIT_MODULES.ADMIN,
      newValues: userData as Record<string, unknown>,
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "errors" in error) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

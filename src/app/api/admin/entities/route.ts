import { NextRequest, NextResponse } from "next/server";
import { requireDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";
import { createAuditLog, AUDIT_ACTIONS, AUDIT_MODULES } from "@/lib/audit";
import { z } from "zod";

const entitySchema = z.object({
  code: z.string().min(1).toUpperCase(),
  label: z.string().min(1),
  description: z.string().optional(),
  type: z.string().optional(),
  parentId: z.string().optional().nullable(),
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
      prisma.entity.count({ where }),
      prisma.entity.findMany({
        where,
        include: {
          parent: { select: { id: true, code: true, label: true } },
          _count: { select: { children: true, missions: true, recommendations: true } },
        },
        orderBy: [{ parent: { label: "asc" } }, { label: "asc" }],
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
    const entityData = entitySchema.parse(body);

    const existing = await prisma.entity.findUnique({ where: { code: entityData.code } });
    if (existing) {
      return NextResponse.json({ error: "Ce code d'entité existe déjà" }, { status: 409 });
    }

    const newEntity = await prisma.entity.create({
      data: entityData,
      include: {
        parent: { select: { id: true, code: true, label: true } },
        _count: { select: { children: true, missions: true, recommendations: true } },
      },
    });

    await createAuditLog({
      userId: user.id,
      entityType: "Entity",
      entityId: newEntity.id,
      action: AUDIT_ACTIONS.CREATE,
      module: AUDIT_MODULES.ADMIN,
      newValues: entityData as Record<string, unknown>,
    });

    return NextResponse.json(newEntity, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, isAdmin, PERMISSIONS } from "@/lib/permissions";
import { createAuditLog, AUDIT_ACTIONS, AUDIT_MODULES } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const user = await requireDbUser();

    if (!isAdmin(user)) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;

    const where: Record<string, unknown> = {};
    if (category) where.category = category;

    const parameters = await prisma.parameterSetting.findMany({
      where,
      orderBy: [{ category: "asc" }, { key: "asc" }],
    });

    return NextResponse.json(parameters);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireDbUser();

    if (!isAdmin(user)) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const body = await request.json();
    const { category, key, value } = body;

    if (!category || !key || value === undefined) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    const parameter = await prisma.parameterSetting.upsert({
      where: { category_key: { category, key } },
      update: { value, updatedBy: user.id },
      create: { category, key, value, updatedBy: user.id },
    });

    await createAuditLog({
      userId: user.id,
      entityType: "ParameterSetting",
      entityId: parameter.id,
      action: AUDIT_ACTIONS.UPDATE,
      module: AUDIT_MODULES.ADMIN,
      newValues: { category, key, value },
    });

    return NextResponse.json(parameter);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

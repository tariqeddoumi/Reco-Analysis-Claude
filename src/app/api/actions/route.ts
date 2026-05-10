import { NextRequest, NextResponse } from "next/server";
import { requireDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { actionSchema } from "@/lib/validators/action";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { createAuditLog, AUDIT_ACTIONS, AUDIT_MODULES } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    await requireDbUser();
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page")) || 1;
    const pageSize = Number(searchParams.get("pageSize")) || 20;
    const responsibleId = searchParams.get("responsibleId") || undefined;
    const statusId = searchParams.get("statusId") || undefined;
    const search = searchParams.get("search") || undefined;

    const sortBy = searchParams.get("sortBy") || "plannedEndAt";
    const sortOrder = searchParams.get("sortOrder") === "desc" ? "desc" : "asc";
    const actionPlanId = searchParams.get("actionPlanId") || undefined;
    const isOverdue = searchParams.get("isOverdue") === "true";

    const ALLOWED_SORT = ["plannedEndAt", "plannedStartAt", "createdAt", "progressRate", "priority", "title"] as const;
    type AllowedSort = (typeof ALLOWED_SORT)[number];
    const safeSortBy: AllowedSort = ALLOWED_SORT.includes(sortBy as AllowedSort) ? (sortBy as AllowedSort) : "plannedEndAt";

    const where: Record<string, unknown> = { isDeleted: false };
    if (responsibleId) where.responsibleId = responsibleId;
    if (statusId) where.statusId = statusId;
    if (actionPlanId) where.actionPlanId = actionPlanId;
    if (search) where.title = { contains: search, mode: "insensitive" };
    if (isOverdue) where.plannedEndAt = { lt: new Date() };

    const [total, data] = await Promise.all([
      prisma.action.count({ where }),
      prisma.action.findMany({
        where,
        include: {
          status: true,
          responsible: true,
          actionPlan: {
            include: {
              recommendation: {
                select: {
                  code: true,
                  entity: { select: { label: true } },
                },
              },
            },
          },
          evidences: { where: { isDeleted: false }, select: { id: true, statusCode: true } },
        },
        orderBy: { [safeSortBy]: sortOrder },
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

    if (!hasPermission(user, PERMISSIONS.ACTION_CREATE)) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const body = await request.json();
    const validated = actionSchema.parse(body);

    const actionData: Record<string, unknown> = { ...validated };
    const DATE_FIELDS = ["plannedStartAt", "plannedEndAt", "actualEndAt"] as const;
    for (const field of DATE_FIELDS) {
      if (field in actionData) {
        const val = actionData[field];
        actionData[field] = val && typeof val === "string" && val.trim() !== "" ? new Date(val) : null;
      }
    }
    const NULLABLE_ID_FIELDS = ["responsibleId", "priorityLevelId", "complexityLevelId", "effortLevelId"] as const;
    for (const field of NULLABLE_ID_FIELDS) {
      if (field in actionData) {
        const val = actionData[field];
        if (typeof val === "string" && val.trim() === "") actionData[field] = null;
      }
    }

    const action = await prisma.action.create({
      data: {
        ...actionData,
        createdBy: user.id,
      } as Parameters<typeof prisma.action.create>[0]["data"],
    });

    await createAuditLog({
      userId: user.id,
      entityType: "Action",
      entityId: action.id,
      actionId: action.id,
      action: AUDIT_ACTIONS.CREATE,
      module: AUDIT_MODULES.ACTIONS,
      newValues: validated as Record<string, unknown>,
    });

    return NextResponse.json(action, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "errors" in error) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

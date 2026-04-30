import { NextRequest, NextResponse } from "next/server";
import { requireDbUser } from "@/lib/auth";
import { getRecommendations, createRecommendation } from "@/services/recommendation.service";
import { recommendationSchema } from "@/lib/validators/recommendation";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  try {
    await requireDbUser();
    const { searchParams } = new URL(request.url);

    const filters = {
      page: Number(searchParams.get("page")) || 1,
      pageSize: Number(searchParams.get("pageSize")) || 20,
      search: searchParams.get("search") || undefined,
      statusId: searchParams.get("statusId") || undefined,
      sourceId: searchParams.get("sourceId") || undefined,
      entityId: searchParams.get("entityId") || undefined,
      priorityId: searchParams.get("priorityId") || undefined,
      missionId: searchParams.get("missionId") || undefined,
      isRegulator: searchParams.get("isRegulator") === "true" ? true : undefined,
      isOverdue: searchParams.get("isOverdue") === "true" ? true : undefined,
      sortBy: searchParams.get("sortBy") || "createdAt",
      sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "desc",
    };

    const result = await getRecommendations(filters);
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireDbUser();

    if (!hasPermission(user, PERMISSIONS.RECOMMENDATION_CREATE)) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const body = await request.json();
    const validated = recommendationSchema.parse(body);
    const recommendation = await createRecommendation(validated as Record<string, unknown>, user.id);
    return NextResponse.json(recommendation, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "errors" in error) {
      return NextResponse.json({ error: "Données invalides", details: (error as { errors: unknown }).errors }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

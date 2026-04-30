import { NextRequest, NextResponse } from "next/server";
import { requireDbUser } from "@/lib/auth";
import { getRecommendationById, updateRecommendation, changeRecommendationStatus } from "@/services/recommendation.service";
import { recommendationSchema } from "@/lib/validators/recommendation";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireDbUser();
    const { id } = await params;
    const recommendation = await getRecommendationById(id);
    if (!recommendation) return NextResponse.json({ error: "Recommandation introuvable" }, { status: 404 });
    return NextResponse.json(recommendation);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireDbUser();
    const { id } = await params;

    if (!hasPermission(user, PERMISSIONS.RECOMMENDATION_UPDATE)) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const body = await request.json();
    const validated = recommendationSchema.partial().parse(body);
    const recommendation = await updateRecommendation(id, validated as Record<string, unknown>, user.id);
    return NextResponse.json(recommendation);
  } catch (error: unknown) {
    if (error && typeof error === "object" && "errors" in error) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

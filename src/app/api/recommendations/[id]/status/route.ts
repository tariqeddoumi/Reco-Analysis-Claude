import { NextRequest, NextResponse } from "next/server";
import { requireDbUser } from "@/lib/auth";
import { changeRecommendationStatus } from "@/services/recommendation.service";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { z } from "zod";

const statusChangeSchema = z.object({
  statusId: z.string().min(1),
  comment: z.string().optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireDbUser();
    const { id } = await params;

    if (!hasPermission(user, PERMISSIONS.RECOMMENDATION_UPDATE)) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const body = await request.json();
    const { statusId, comment } = statusChangeSchema.parse(body);
    const recommendation = await changeRecommendationStatus(id, statusId, user.id, comment);
    return NextResponse.json(recommendation);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

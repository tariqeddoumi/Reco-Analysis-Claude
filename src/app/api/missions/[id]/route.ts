import { NextRequest, NextResponse } from "next/server";
import { requireDbUser } from "@/lib/auth";
import { getMissionById, updateMission, deleteMission } from "@/services/mission.service";
import { missionSchema } from "@/lib/validators/mission";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireDbUser();
    const { id } = await params;
    const mission = await getMissionById(id);
    if (!mission) return NextResponse.json({ error: "Mission introuvable" }, { status: 404 });
    return NextResponse.json(mission);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireDbUser();
    const { id } = await params;

    if (!hasPermission(user, PERMISSIONS.MISSION_UPDATE)) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const body = await request.json();
    const validated = missionSchema.partial().parse(body);
    const mission = await updateMission(id, validated as Record<string, unknown>, user.id);
    return NextResponse.json(mission);
  } catch (error: unknown) {
    if (error && typeof error === "object" && "errors" in error) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireDbUser();
    const { id } = await params;

    if (!hasPermission(user, PERMISSIONS.MISSION_DELETE)) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    await deleteMission(id, user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

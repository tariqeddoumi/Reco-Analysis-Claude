import { NextRequest, NextResponse } from "next/server";
import { requireDbUser } from "@/lib/auth";
import { getMissions, createMission } from "@/services/mission.service";
import { missionSchema } from "@/lib/validators/mission";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  try {
    const user = await requireDbUser();
    const { searchParams } = new URL(request.url);

    const filters = {
      page: Number(searchParams.get("page")) || 1,
      pageSize: Number(searchParams.get("pageSize")) || 20,
      search: searchParams.get("search") || undefined,
      statusId: searchParams.get("statusId") || undefined,
      sourceId: searchParams.get("sourceId") || undefined,
      entityId: searchParams.get("entityId") || undefined,
      sortBy: searchParams.get("sortBy") || "createdAt",
      sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "desc",
    };

    const result = await getMissions(filters);
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireDbUser();

    if (!hasPermission(user, PERMISSIONS.MISSION_CREATE)) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const body = await request.json();
    const validated = missionSchema.parse(body);

    const mission = await createMission(validated as Record<string, unknown>, user.id);
    return NextResponse.json(mission, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "errors" in error) {
      return NextResponse.json({ error: "Données invalides", details: (error as { errors: unknown }).errors }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireDbUser();
    const { id } = await params;

    const notification = await prisma.notification.updateMany({
      where: { id, userId: user.id },
      data: { isRead: true, readAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

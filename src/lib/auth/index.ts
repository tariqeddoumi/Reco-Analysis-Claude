import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function getServerUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireAuth() {
  const user = await getServerUser();
  if (!user) redirect("/login");
  return user;
}

export async function getDbUser() {
  const supabaseUser = await getServerUser();
  if (!supabaseUser) return null;

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: supabaseUser.id },
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true },
              },
            },
          },
        },
      },
      entities: {
        include: { entity: true },
      },
    },
  });

  return dbUser;
}

export async function requireDbUser() {
  const dbUser = await getDbUser();
  if (!dbUser) redirect("/login");
  return dbUser;
}

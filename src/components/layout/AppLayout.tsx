"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { createClient } from "@/lib/supabase/client";

interface AppUser {
  firstName?: string;
  lastName?: string;
  email?: string;
  avatarUrl?: string;
}

interface AppLayoutProps {
  children: React.ReactNode;
  user?: AppUser | null;
  unreadNotifications?: number;
}

export function AppLayout({ children, user, unreadNotifications = 0 }: AppLayoutProps) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar user={user} onLogout={handleLogout} />

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top header */}
        <Header
          user={user}
          unreadNotifications={unreadNotifications}
          onLogout={handleLogout}
        />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-muted/30">
          <div className="p-6 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

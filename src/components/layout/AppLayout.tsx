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
}

const POLL_INTERVAL_MS = 60_000;

export function AppLayout({ children, user }: AppLayoutProps) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = React.useState(0);

  React.useEffect(() => {
    async function fetchUnread() {
      try {
        const res = await fetch("/api/notifications?unreadOnly=true", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unreadCount ?? 0);
        }
      } catch {
        // non-blocking — badge stays at last known value
      }
    }

    fetchUnread();
    const timer = setInterval(fetchUnread, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar user={user} onLogout={handleLogout} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header
          user={user}
          unreadNotifications={unreadCount}
          onLogout={handleLogout}
        />

        <main className="flex-1 overflow-y-auto bg-muted/30">
          <div className="p-6 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

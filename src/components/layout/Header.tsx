"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Search, ChevronRight, Home, Settings, User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Breadcrumb label mapping
const BREADCRUMB_LABELS: Record<string, string> = {
  dashboard: "Tableau de bord",
  missions: "Missions",
  recommendations: "Recommandations",
  actions: "Plans d'action",
  evidences: "Preuves",
  workflow: "Workflow",
  extensions: "Demandes de report",
  reports: "Reporting",
  exports: "Exports",
  admin: "Administration",
  users: "Utilisateurs",
  settings: "Paramétrage",
  "audit-log": "Journal d'audit",
};

interface HeaderProps {
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    avatarUrl?: string;
  } | null;
  unreadNotifications?: number;
  onLogout?: () => void;
  onSearch?: (query: string) => void;
}

function useBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  return segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/");
    const label = BREADCRUMB_LABELS[segment] ?? segment;
    const isLast = index === segments.length - 1;
    return { href, label, isLast };
  });
}

export function Header({
  user,
  unreadNotifications = 0,
  onLogout,
  onSearch,
}: HeaderProps) {
  const breadcrumbs = useBreadcrumbs();
  const [searchQuery, setSearchQuery] = React.useState("");

  const userInitials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || "?"
    : "?";

  const userName = user
    ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email || "Utilisateur"
    : "Utilisateur";

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSearch?.(searchQuery);
  }

  return (
    <header
      className={cn(
        "flex items-center h-16 px-6 bg-[hsl(var(--header-bg))] border-b border-[hsl(var(--header-border))] flex-shrink-0 gap-4"
      )}
    >
      {/* Breadcrumb */}
      <nav className="flex-1 flex items-center gap-1.5 text-sm min-w-0" aria-label="Fil d'Ariane">
        <Link
          href="/dashboard"
          className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          aria-label="Tableau de bord"
        >
          <Home className="w-4 h-4" />
        </Link>
        {breadcrumbs.map((crumb) => (
          <React.Fragment key={crumb.href}>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" aria-hidden="true" />
            {crumb.isLast ? (
              <span className="font-medium text-foreground truncate">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="text-muted-foreground hover:text-foreground transition-colors truncate"
              >
                {crumb.label}
              </Link>
            )}
          </React.Fragment>
        ))}
      </nav>

      {/* Search */}
      <form
        onSubmit={handleSearchSubmit}
        className="hidden md:flex items-center relative w-64"
        role="search"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
        <Input
          type="search"
          placeholder="Rechercher..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-8 bg-muted/50 border-transparent focus-visible:bg-background focus-visible:border-input"
          aria-label="Recherche globale"
        />
      </form>

      {/* Notifications */}
      <Button
        variant="ghost"
        size="icon"
        className="relative h-8 w-8 text-muted-foreground hover:text-foreground"
        aria-label={`${unreadNotifications} notification${unreadNotifications !== 1 ? "s" : ""} non lue${unreadNotifications !== 1 ? "s" : ""}`}
      >
        <Bell className="w-4 h-4" />
        {unreadNotifications > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white leading-none">
            {unreadNotifications > 99 ? "99+" : unreadNotifications}
          </span>
        )}
      </Button>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Menu utilisateur"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.avatarUrl} alt={userName} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <p className="font-medium truncate">{userName}</p>
            {user?.email && (
              <p className="text-xs text-muted-foreground font-normal truncate mt-0.5">
                {user.email}
              </p>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/profile" className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              Mon profil
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/admin/settings" className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              Paramètres
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={onLogout}
            className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Déconnexion
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  ListChecks,
  FileCheck2,
  GitBranch,
  CalendarClock,
  BarChart3,
  Download,
  Users,
  Settings,
  ScrollText,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Building2,
  FileUp,
  List,
  ListTodo,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Pilotage",
    items: [
      { label: "Missions", href: "/missions", icon: ClipboardList },
      { label: "Recommandations", href: "/recommendations", icon: ListChecks },
      { label: "Import Excel", href: "/recommendations/import", icon: FileUp },
      { label: "Plans d'action", href: "/action-plans", icon: FileCheck2 },
      { label: "Actions", href: "/actions", icon: ListTodo },
      { label: "Preuves", href: "/evidences", icon: GitBranch },
    ],
  },
  {
    title: "Suivi",
    items: [
      { label: "Workflow", href: "/workflow", icon: GitBranch },
      { label: "Demandes de report", href: "/extensions", icon: CalendarClock },
    ],
  },
  {
    title: "Reporting",
    items: [
      { label: "Tableaux de bord", href: "/reports", icon: BarChart3 },
      { label: "Exports", href: "/exports", icon: Download },
    ],
  },
  {
    title: "Administration",
    items: [
      { label: "Utilisateurs", href: "/admin/users", icon: Users },
      { label: "Référentiels", href: "/admin/referentials", icon: List },
      { label: "Paramétrage", href: "/admin/settings", icon: Settings },
      { label: "Journal d'audit", href: "/audit-log", icon: ScrollText },
    ],
  },
];

interface SidebarProps {
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    avatarUrl?: string;
  } | null;
  onLogout?: () => void;
}

export function Sidebar({ user, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);

  const userInitials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || "?"
    : "?";

  const userName = user
    ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email || "Utilisateur"
    : "Utilisateur";

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "flex flex-col h-full bg-[hsl(var(--sidebar-bg))] border-r border-[hsl(var(--sidebar-border))] transition-[width] duration-250 ease-in-out shadow-sidebar",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo / Brand */}
        <div
          className={cn(
            "flex items-center h-16 border-b border-[hsl(var(--sidebar-border))] flex-shrink-0",
            collapsed ? "justify-center px-0" : "px-5 gap-3"
          )}
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 flex-shrink-0">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold leading-tight truncate">
                Suivi Recommandations
              </p>
              <p className="text-[hsl(var(--sidebar-muted))] text-xs truncate">
                Bancaire
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {/* Dashboard */}
          <NavLink
            href="/dashboard"
            label="Tableau de bord"
            icon={LayoutDashboard}
            isActive={pathname === "/dashboard"}
            collapsed={collapsed}
          />

          {/* Sections */}
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="mt-5">
              {!collapsed && (
                <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--sidebar-muted))]">
                  {section.title}
                </p>
              )}
              {collapsed && (
                <div className="my-1.5 mx-2 h-px bg-[hsl(var(--sidebar-border))]" />
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    isActive={pathname.startsWith(item.href)}
                    collapsed={collapsed}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Collapse toggle */}
        <div className="px-2 pb-2">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className={cn(
              "flex items-center w-full gap-2 px-3 py-2 rounded-md text-[hsl(var(--sidebar-muted))] hover:text-white hover:bg-[hsl(var(--sidebar-hover))] transition-colors text-sm",
              collapsed && "justify-center"
            )}
            aria-label={collapsed ? "Étendre le menu" : "Réduire le menu"}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4 flex-shrink-0" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 flex-shrink-0" />
                <span>Réduire</span>
              </>
            )}
          </button>
        </div>

        {/* User profile */}
        <div className="border-t border-[hsl(var(--sidebar-border))] p-3">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onLogout}
                  className="flex items-center justify-center w-full p-1.5 rounded-md hover:bg-[hsl(var(--sidebar-hover))] transition-colors"
                  aria-label="Déconnexion"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user?.avatarUrl} alt={userName} />
                    <AvatarFallback className="bg-blue-700 text-white text-xs">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="font-medium">{userName}</p>
                {user?.email && (
                  <p className="text-xs opacity-75">{user.email}</p>
                )}
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarImage src={user?.avatarUrl} alt={userName} />
                <AvatarFallback className="bg-blue-700 text-white text-xs">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {userName}
                </p>
                {user?.email && (
                  <p className="text-[hsl(var(--sidebar-muted))] text-xs truncate">
                    {user.email}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onLogout}
                className="h-8 w-8 flex-shrink-0 text-[hsl(var(--sidebar-muted))] hover:text-white hover:bg-[hsl(var(--sidebar-hover))]"
                aria-label="Déconnexion"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}

// Internal NavLink component
interface NavLinkProps {
  href: string;
  label: string;
  icon: React.ElementType;
  isActive: boolean;
  collapsed: boolean;
}

function NavLink({ href, label, icon: Icon, isActive, collapsed }: NavLinkProps) {
  const linkContent = (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
        collapsed && "justify-center px-0 w-10 mx-auto",
        isActive
          ? "bg-[hsl(var(--sidebar-active))] text-white"
          : "text-[hsl(var(--sidebar-fg))] hover:bg-[hsl(var(--sidebar-hover))] hover:text-white"
      )}
      aria-current={isActive ? "page" : undefined}
    >
      <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right">{label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return linkContent;
}

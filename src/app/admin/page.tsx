"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  ShieldCheck,
  Building2,
  BookOpen,
  Settings,
  ScrollText,
  ArrowRight,
} from "lucide-react";

interface AdminCard {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  countKey?: string;
  color: string;
  buttonLabel: string;
}

const ADMIN_SECTIONS: AdminCard[] = [
  {
    href: "/admin/users",
    icon: Users,
    title: "Utilisateurs",
    description: "Gérer les comptes utilisateurs, leurs rôles et accès",
    countKey: "users",
    color: "bg-blue-50 border-blue-100",
    buttonLabel: "Gérer",
  },
  {
    href: "/admin/roles",
    icon: ShieldCheck,
    title: "Rôles & Permissions",
    description: "Configurer les rôles et les droits d'accès par profil",
    countKey: "roles",
    color: "bg-purple-50 border-purple-100",
    buttonLabel: "Gérer",
  },
  {
    href: "/admin/entities",
    icon: Building2,
    title: "Entités",
    description: "Administrer les entités organisationnelles et leurs paramètres",
    countKey: "entities",
    color: "bg-emerald-50 border-emerald-100",
    buttonLabel: "Gérer",
  },
  {
    href: "/admin/referentials",
    icon: BookOpen,
    title: "Référentiels",
    description: "Sources, types de missions, statuts, niveaux de gravité et plus",
    color: "bg-amber-50 border-amber-100",
    buttonLabel: "Gérer",
  },
  {
    href: "/admin/settings",
    icon: Settings,
    title: "Paramètres Système",
    description: "Relances automatiques, seuils d'alerte, workflow et notifications",
    color: "bg-slate-50 border-slate-200",
    buttonLabel: "Configurer",
  },
  {
    href: "/audit-log",
    icon: ScrollText,
    title: "Journal d'Audit",
    description: "Traçabilité complète de toutes les actions effectuées dans le système",
    countKey: "auditLogs",
    color: "bg-rose-50 border-rose-100",
    buttonLabel: "Consulter",
  },
];

interface AdminCounts {
  users?: number;
  roles?: number;
  entities?: number;
  auditLogs?: number;
}

export default function AdminPage() {
  const router = useRouter();
  const [counts, setCounts] = React.useState<AdminCounts>({});
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    Promise.allSettled([
      fetch("/api/admin/users?pageSize=1").then((r) => r.json()),
      fetch("/api/admin/referentials?type=all").then((r) => r.json()),
      fetch("/api/audit-logs?pageSize=1").then((r) => r.json()),
    ]).then(([usersResult, refsResult, auditResult]) => {
      const newCounts: AdminCounts = {};
      if (usersResult.status === "fulfilled") {
        newCounts.users = usersResult.value.total ?? 0;
      }
      if (refsResult.status === "fulfilled") {
        newCounts.roles = refsResult.value.roles?.length ?? 0;
        newCounts.entities = refsResult.value.entities?.length ?? 0;
      }
      if (auditResult.status === "fulfilled") {
        newCounts.auditLogs = auditResult.value.total ?? 0;
      }
      setCounts(newCounts);
    }).finally(() => setIsLoading(false));
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Administration</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configuration et gestion du système de suivi des recommandations
          </p>
        </div>

        {/* Admin Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {ADMIN_SECTIONS.map((section) => {
            const Icon = section.icon;
            const count = section.countKey
              ? counts[section.countKey as keyof AdminCounts]
              : undefined;

            return (
              <Card
                key={section.href}
                className={`border hover:shadow-md transition-shadow ${section.color}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-white/80 shadow-sm">
                        <Icon className="h-5 w-5 text-foreground/70" />
                      </div>
                      <CardTitle className="text-base">{section.title}</CardTitle>
                    </div>
                    {isLoading && section.countKey ? (
                      <Skeleton className="h-6 w-10" />
                    ) : count !== undefined ? (
                      <span className="text-2xl font-bold text-foreground/80">
                        {count.toLocaleString("fr-FR")}
                      </span>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {section.description}
                  </p>
                  <Button
                    variant="outline"
                    className="w-full bg-white/80 hover:bg-white"
                    onClick={() => router.push(section.href)}
                  >
                    {section.buttonLabel}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}

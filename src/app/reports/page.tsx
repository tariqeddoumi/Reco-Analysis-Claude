"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileSpreadsheet,
  FileText,
  Shield,
  AlertTriangle,
  Building2,
  Download,
  BarChart3,
  Globe,
  TrendingUp,
  Users,
  Loader2,
} from "lucide-react";

interface ExportCard {
  type: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  color: string;
}

const EXPORT_CARDS: ExportCard[] = [
  {
    type: "excel",
    icon: FileSpreadsheet,
    title: "Export Excel",
    description: "Liste complète des recommandations avec tous les détails et indicateurs",
    color: "text-emerald-600",
  },
  {
    type: "pdf",
    icon: FileText,
    title: "Rapport synthétique PDF",
    description: "Rapport de synthèse formaté pour la direction et les comités",
    color: "text-red-600",
  },
  {
    type: "regulator",
    icon: Shield,
    title: "Export Régulateur",
    description: "Recommandations issues des autorités de supervision et régulateurs",
    color: "text-blue-600",
  },
  {
    type: "overdue",
    icon: AlertTriangle,
    title: "Export Retards",
    description: "Recommandations en retard sur leur échéance de mise en œuvre",
    color: "text-amber-600",
  },
  {
    type: "by-entity",
    icon: Building2,
    title: "Export par Entité",
    description: "Recommandations regroupées et filtrées par entité organisationnelle",
    color: "text-purple-600",
  },
];

const DASHBOARDS = [
  {
    href: "/dashboard",
    icon: BarChart3,
    label: "Dashboard général",
    description: "Vue d'ensemble de toutes les recommandations",
    color: "bg-blue-50 text-blue-700 border-blue-100",
  },
  {
    href: "/dashboard?view=regulator",
    icon: Shield,
    label: "Dashboard régulateur",
    description: "Filtré sur les recommandations réglementaires",
    color: "bg-purple-50 text-purple-700 border-purple-100",
  },
  {
    href: "/dashboard?view=entity",
    icon: Building2,
    label: "Dashboard par entité",
    description: "Analyse par entité organisationnelle",
    color: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  {
    href: "/dashboard?view=management",
    icon: Users,
    label: "Dashboard management",
    description: "Vue consolidée pour le comité de direction",
    color: "bg-amber-50 text-amber-700 border-amber-100",
  },
];

export default function ReportsPage() {
  const router = useRouter();
  const [loadingType, setLoadingType] = React.useState<string | null>(null);

  async function handleExport(type: string) {
    setLoadingType(type);
    try {
      const res = await fetch(`/api/reports/export?type=${type}`);
      if (!res.ok) {
        throw new Error("Erreur lors de la génération du rapport");
      }

      const contentDisposition = res.headers.get("content-disposition");
      const filenameMatch = contentDisposition?.match(/filename="([^"]+)"/);
      const filename = filenameMatch?.[1] ?? `export-${type}-${Date.now()}.csv`;

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la génération du rapport");
    } finally {
      setLoadingType(null);
    }
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Rapports &amp; Exports
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Générateur de rapports et exports pour les différents profils utilisateurs
          </p>
        </div>

        {/* Dashboards section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Tableaux de bord</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {DASHBOARDS.map((db) => {
              const Icon = db.icon;
              return (
                <button
                  key={db.href}
                  onClick={() => router.push(db.href)}
                  className={`group p-4 rounded-lg border text-left transition-all hover:shadow-md ${db.color}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Icon className="h-5 w-5" />
                    <span className="font-semibold text-sm">{db.label}</span>
                  </div>
                  <p className="text-xs opacity-80">{db.description}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Exports section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Exports disponibles</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {EXPORT_CARDS.map((card) => {
              const Icon = card.icon;
              const isLoading = loadingType === card.type;
              return (
                <Card key={card.type} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-muted ${card.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-base">{card.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">{card.description}</p>
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => handleExport(card.type)}
                      disabled={isLoading || loadingType !== null}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Génération en cours...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Générer
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Info note */}
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <Globe className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-900">Information</p>
              <p className="text-blue-700 mt-1">
                Les exports sont générés en temps réel à partir des données actuelles.
                Le format CSV est compatible avec Microsoft Excel et Google Sheets.
                Les rapports PDF nécessitent un visualiseur PDF.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

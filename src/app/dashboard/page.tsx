"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/badges/StatusBadge";
import { PriorityBadge } from "@/components/badges/PriorityBadge";
import { KpiCard } from "./components/KpiCard";
import { formatDate, cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  FileText,
  AlertOctagon,
  Shield,
  Calendar,
} from "lucide-react";

// ---- Types ----

interface KpiData {
  totalMissions: number;
  totalRecommendations: number;
  openRecommendations: number;
  closedRecommendations: number;
  overdueRecommendations: number;
  criticalRecommendations: number;
  regulatorRecommendations: number;
  globalClosureRate: number;
  averageProgressRate: number;
  totalExtensions: number;
  rejectedEvidences: number;
}

interface SourceData {
  source: string;
  total: number;
  closed: number;
  open: number;
  overdue: number;
  closureRate: number;
}

interface MonthlyPoint {
  month: string;
  count: number;
}

interface CriticalReco {
  id: string;
  code: string;
  entity: { label: string } | null;
  source: { label: string } | null;
  status: { code: string; label: string; color?: string | null };
  priority: { code: string; label: string } | null;
  owner: { firstName: string; lastName: string } | null;
  finalCriticality: number | null;
  initialDueDate: string | null;
}

interface DashboardData {
  kpis: KpiData;
  bySource: SourceData[];
  monthlyTrend: MonthlyPoint[];
  recentCritical: CriticalReco[];
}

// ---- Skeleton loader ----

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  );
}

// ---- Main page ----

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        setLoading(true);
        const res = await fetch("/api/dashboard");
        if (!res.ok) throw new Error("Impossible de charger les données du tableau de bord");
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Tableau de Bord</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Vue d&apos;ensemble des recommandations et missions d&apos;audit
            </p>
          </div>
          <Badge
            variant="outline"
            className="hidden items-center gap-1.5 border-slate-200 bg-white text-slate-600 sm:flex"
          >
            <Calendar className="h-3.5 w-3.5" />
            {new Date().toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </Badge>
        </div>

        {loading && <DashboardSkeleton />}

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {data && !loading && (
          <>
            {/* ---- Row 1: 6 main KPIs ---- */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
              <KpiCard
                title="Total Missions"
                value={data.kpis.totalMissions}
                icon={<FileText />}
                color="default"
              />
              <KpiCard
                title="Total Recommandations"
                value={data.kpis.totalRecommendations}
                icon={<FileText />}
                color="default"
              />
              <KpiCard
                title="Recommandations Ouvertes"
                value={data.kpis.openRecommendations}
                icon={<Clock />}
                color="default"
              />
              <KpiCard
                title="Recommandations Clôturées"
                value={data.kpis.closedRecommendations}
                icon={<CheckCircle />}
                color="success"
              />
              <KpiCard
                title="En Retard"
                value={data.kpis.overdueRecommendations}
                icon={<AlertTriangle />}
                color={data.kpis.overdueRecommendations > 0 ? "danger" : "default"}
              />
              <KpiCard
                title="Critiques"
                value={data.kpis.criticalRecommendations}
                icon={<AlertOctagon />}
                color={data.kpis.criticalRecommendations > 0 ? "danger" : "default"}
              />
            </div>

            {/* ---- Row 2: 4 rate KPIs ---- */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <KpiCard
                title="Taux de Clôture"
                value={`${data.kpis.globalClosureRate.toFixed(1)}%`}
                icon={<TrendingUp />}
                color={
                  data.kpis.globalClosureRate >= 70
                    ? "success"
                    : data.kpis.globalClosureRate >= 40
                    ? "warning"
                    : "danger"
                }
                description="Recommandations clôturées vs total"
              />
              <KpiCard
                title="Avancement Moyen"
                value={`${data.kpis.averageProgressRate.toFixed(1)}%`}
                icon={<TrendingUp />}
                color={
                  data.kpis.averageProgressRate >= 70
                    ? "success"
                    : data.kpis.averageProgressRate >= 40
                    ? "warning"
                    : "default"
                }
                description="Progression des actions en cours"
              />
              <KpiCard
                title="Recommandations Régulateur"
                value={data.kpis.regulatorRecommendations}
                icon={<Shield />}
                color="warning"
                description="Émises par les autorités de contrôle"
              />
              <KpiCard
                title="Demandes de Report"
                value={data.kpis.totalExtensions}
                icon={<Calendar />}
                color={data.kpis.totalExtensions > 0 ? "warning" : "default"}
                description="Extensions d'échéance demandées"
              />
            </div>

            {/* ---- Row 3: Charts ---- */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Bar chart – by source */}
              <Card className="border-slate-200 bg-white shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-700">
                    Recommandations par Source
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data.bySource.length === 0 ? (
                    <p className="py-10 text-center text-sm text-slate-400">
                      Aucune donnée disponible
                    </p>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart
                        data={data.bySource}
                        margin={{ top: 4, right: 12, left: 0, bottom: 24 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis
                          dataKey="source"
                          tick={{ fontSize: 11, fill: "#64748b" }}
                          axisLine={false}
                          tickLine={false}
                          angle={-25}
                          textAnchor="end"
                          interval={0}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "#64748b" }}
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "8px",
                            border: "1px solid #e2e8f0",
                            fontSize: 12,
                            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                          }}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                          iconType="circle"
                          iconSize={8}
                        />
                        <Bar
                          dataKey="total"
                          name="Total"
                          fill="#6366f1"
                          radius={[3, 3, 0, 0]}
                          maxBarSize={32}
                        />
                        <Bar
                          dataKey="closed"
                          name="Clôturées"
                          fill="#10b981"
                          radius={[3, 3, 0, 0]}
                          maxBarSize={32}
                        />
                        <Bar
                          dataKey="overdue"
                          name="En Retard"
                          fill="#ef4444"
                          radius={[3, 3, 0, 0]}
                          maxBarSize={32}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Line chart – monthly trend */}
              <Card className="border-slate-200 bg-white shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-700">
                    Tendance Mensuelle
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data.monthlyTrend.length === 0 ? (
                    <p className="py-10 text-center text-sm text-slate-400">
                      Aucune donnée disponible
                    </p>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart
                        data={data.monthlyTrend}
                        margin={{ top: 4, right: 12, left: 0, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis
                          dataKey="month"
                          tick={{ fontSize: 11, fill: "#64748b" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "#64748b" }}
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "8px",
                            border: "1px solid #e2e8f0",
                            fontSize: 12,
                            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                          }}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                          iconType="circle"
                          iconSize={8}
                        />
                        <Line
                          type="monotone"
                          dataKey="count"
                          name="Nouvelles recommandations"
                          stroke="#6366f1"
                          strokeWidth={2}
                          dot={{ r: 4, fill: "#6366f1", strokeWidth: 0 }}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ---- Row 4: Critical table + Overdue alerts ---- */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Top 10 critical recommendations */}
              <Card className="border-slate-200 bg-white shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <AlertOctagon className="h-4 w-4 text-red-500" />
                    <CardTitle className="text-sm font-semibold text-slate-700">
                      Top 10 Recommandations Critiques
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {data.recentCritical.length === 0 ? (
                    <div className="flex items-center gap-2 px-6 py-8 text-sm text-emerald-600">
                      <CheckCircle className="h-4 w-4" />
                      Aucune recommandation critique ouverte.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50">
                            <th className="px-4 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wider">
                              Code
                            </th>
                            <th className="px-4 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wider">
                              Entité
                            </th>
                            <th className="px-4 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wider">
                              Source
                            </th>
                            <th className="px-4 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wider">
                              Statut
                            </th>
                            <th className="px-4 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wider">
                              Responsable
                            </th>
                            <th className="px-4 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wider">
                              Échéance
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {data.recentCritical.map((reco) => (
                            <tr
                              key={reco.id}
                              className="hover:bg-slate-50 transition-colors"
                            >
                              <td className="px-4 py-3">
                                <span className="font-mono font-semibold text-slate-700">
                                  {reco.code}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-600 max-w-[120px] truncate">
                                {reco.entity?.label ?? "—"}
                              </td>
                              <td className="px-4 py-3 text-slate-600 max-w-[100px] truncate">
                                {reco.source?.label ?? "—"}
                              </td>
                              <td className="px-4 py-3">
                                <StatusBadge
                                  code={reco.status.code}
                                  label={reco.status.label}
                                  color={reco.status.color}
                                />
                              </td>
                              <td className="px-4 py-3 text-slate-600 max-w-[120px] truncate">
                                {reco.owner
                                  ? `${reco.owner.firstName} ${reco.owner.lastName}`
                                  : "—"}
                              </td>
                              <td className="px-4 py-3">
                                {reco.initialDueDate ? (
                                  <span
                                    className={cn(
                                      "font-medium",
                                      new Date(reco.initialDueDate) < new Date()
                                        ? "text-red-600"
                                        : "text-slate-600"
                                    )}
                                  >
                                    {formatDate(reco.initialDueDate)}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Overdue / upcoming deadline alerts */}
              <div className="flex flex-col gap-4">
                {/* Overdue regulator panel */}
                <Card className="border-red-100 bg-red-50 shadow-sm">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-red-600" />
                      <CardTitle className="text-sm font-semibold text-red-800">
                        Recommandations Régulateur en Retard
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {data.kpis.overdueRecommendations === 0 ? (
                      <div className="flex items-center gap-2 py-2 text-sm text-emerald-700">
                        <CheckCircle className="h-4 w-4" />
                        Aucune recommandation régulateur en retard.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-white px-4 py-3">
                          <span className="text-sm font-medium text-slate-700">
                            Recommandations en retard
                          </span>
                          <span className="text-lg font-bold text-red-700">
                            {data.kpis.overdueRecommendations}
                          </span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-white px-4 py-3">
                          <span className="text-sm font-medium text-slate-700">
                            Recommandations critiques ouvertes
                          </span>
                          <span className="text-lg font-bold text-red-700">
                            {data.kpis.criticalRecommendations}
                          </span>
                        </div>
                        <p className="text-xs text-red-600 mt-1">
                          Action immédiate requise sur ces dossiers.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Near-deadline / summary panel */}
                <Card className="border-amber-100 bg-amber-50 shadow-sm">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-600" />
                      <CardTitle className="text-sm font-semibold text-amber-800">
                        Échéances Proches &amp; Indicateurs de Risque
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-slate-600">
                          <span>Taux de clôture global</span>
                          <span className="font-semibold">
                            {data.kpis.globalClosureRate.toFixed(1)}%
                          </span>
                        </div>
                        <Progress
                          value={data.kpis.globalClosureRate}
                          className="h-1.5 bg-amber-100 [&>div]:bg-amber-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-slate-600">
                          <span>Avancement moyen des plans d&apos;action</span>
                          <span className="font-semibold">
                            {data.kpis.averageProgressRate.toFixed(1)}%
                          </span>
                        </div>
                        <Progress
                          value={data.kpis.averageProgressRate}
                          className="h-1.5 bg-amber-100 [&>div]:bg-amber-500"
                        />
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-center">
                          <p className="text-xs text-slate-500">Reports demandés</p>
                          <p className="text-xl font-bold text-amber-700">
                            {data.kpis.totalExtensions}
                          </p>
                        </div>
                        <div className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-center">
                          <p className="text-xs text-slate-500">Preuves rejetées</p>
                          <p className="text-xl font-bold text-amber-700">
                            {data.kpis.rejectedEvidences}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

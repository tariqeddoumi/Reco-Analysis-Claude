"use client";

import * as React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/badges/StatusBadge";
import { KpiCard } from "./components/KpiCard";
import { formatDate, cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line,
} from "recharts";
import {
  AlertTriangle, CheckCircle, Clock, TrendingUp, FileText,
  AlertOctagon, Shield, Calendar, Building2, Users,
} from "lucide-react";

// ─────────────────────── Types ───────────────────────

interface KpiData {
  totalMissions: number; totalRecommendations: number; openRecommendations: number;
  closedRecommendations: number; overdueRecommendations: number; criticalRecommendations: number;
  regulatorRecommendations: number; globalClosureRate: number; averageProgressRate: number;
  totalExtensions: number; rejectedEvidences: number;
}
interface SourceData { source: string; total: number; closed: number; open: number; overdue: number; closureRate: number; }
interface MonthlyPoint { month: string; count: number; }
interface CriticalReco {
  id: string; code: string;
  entity: { label: string } | null; source: { label: string } | null;
  status: { code: string; label: string; color?: string | null };
  priority: { code: string; label: string } | null;
  owner: { firstName: string; lastName: string } | null;
  finalCriticality: number | null; initialDueDate: string | null;
}
interface GeneralData { kpis: KpiData; bySource: SourceData[]; monthlyTrend: MonthlyPoint[]; recentCritical: CriticalReco[]; }

interface RegulatorKpis { total: number; open: number; closed: number; overdue: number; critical: number; closureRate: number; pendingExtensions: number; pendingEvidences: number; }
interface RegulatorData {
  kpis: RegulatorKpis;
  byEntity: Array<{ entity: string; total: number; open: number; closed: number; overdue: number }>;
  upcoming: Array<{ id: string; code: string; recommendation: string; entity: { label: string } | null; status: { code: string; label: string; color?: string | null }; daysRemaining: number }>;
  openList: CriticalReco[];
}

interface EntityRow {
  id: string; code: string; label: string; total: number; open: number; closed: number;
  overdue: number; overdueRate: number; closureRate: number; avgCriticality: number;
  noActionPlan: number; criticalCount: number;
}

interface ManagementData {
  topCritical: CriticalReco[];
  regulatorPriority: Array<{ id: string; code: string; recommendation: string; entity: { label: string } | null; status: { code: string; label: string; color?: string | null }; priority: { code: string; label: string } | null; finalCriticality: number | null; initialDueDate: string | null }>;
  upcomingDeadlines: Array<{ id: string; code: string; recommendation: string; entity: { label: string } | null; status: { code: string; label: string; color?: string | null }; daysRemaining: number }>;
  withoutActionPlan: number;
  blockedActions: number;
  topOverdueEntities: Array<{ entity: string; overdueCount: number }>;
  monthlyEvolution: Array<{ month: string; opened: number; closed: number }>;
}

// ─────────────────────── Helpers ───────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}

// ─────────────────────── General view ───────────────────────

function GeneralView() {
  const [data, setData] = React.useState<GeneralData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => { if (!r.ok) throw new Error("Erreur chargement"); return r.json(); })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton />;
  if (error) return <ErrorBanner message={error} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <KpiCard title="Total Missions" value={data.kpis.totalMissions} icon={<FileText />} color="default" />
        <KpiCard title="Total Recommandations" value={data.kpis.totalRecommendations} icon={<FileText />} color="default" />
        <KpiCard title="Recommandations Ouvertes" value={data.kpis.openRecommendations} icon={<Clock />} color="default" />
        <KpiCard title="Recommandations Clôturées" value={data.kpis.closedRecommendations} icon={<CheckCircle />} color="success" />
        <KpiCard title="En Retard" value={data.kpis.overdueRecommendations} icon={<AlertTriangle />} color={data.kpis.overdueRecommendations > 0 ? "danger" : "default"} />
        <KpiCard title="Critiques" value={data.kpis.criticalRecommendations} icon={<AlertOctagon />} color={data.kpis.criticalRecommendations > 0 ? "danger" : "default"} />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard title="Taux de Clôture" value={`${data.kpis.globalClosureRate.toFixed(1)}%`} icon={<TrendingUp />} color={data.kpis.globalClosureRate >= 70 ? "success" : data.kpis.globalClosureRate >= 40 ? "warning" : "danger"} description="Recommandations clôturées vs total" />
        <KpiCard title="Avancement Moyen" value={`${data.kpis.averageProgressRate.toFixed(1)}%`} icon={<TrendingUp />} color={data.kpis.averageProgressRate >= 70 ? "success" : data.kpis.averageProgressRate >= 40 ? "warning" : "default"} description="Progression des actions en cours" />
        <KpiCard title="Régulateur" value={data.kpis.regulatorRecommendations} icon={<Shield />} color="warning" description="Émises par les autorités de contrôle" />
        <KpiCard title="Demandes de Report" value={data.kpis.totalExtensions} icon={<Calendar />} color={data.kpis.totalExtensions > 0 ? "warning" : "default"} description="Extensions d'échéance demandées" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-slate-700">Recommandations par Source</CardTitle></CardHeader>
          <CardContent>
            {data.bySource.length === 0 ? <p className="py-10 text-center text-sm text-slate-400">Aucune donnée disponible</p> : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.bySource} margin={{ top: 4, right: 12, left: 0, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="source" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} angle={-25} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" iconSize={8} />
                  <Bar dataKey="total" name="Total" fill="#6366f1" radius={[3, 3, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="closed" name="Clôturées" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="overdue" name="En Retard" fill="#ef4444" radius={[3, 3, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-slate-700">Tendance Mensuelle</CardTitle></CardHeader>
          <CardContent>
            {data.monthlyTrend.length === 0 ? <p className="py-10 text-center text-sm text-slate-400">Aucune donnée disponible</p> : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data.monthlyTrend} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" iconSize={8} />
                  <Line type="monotone" dataKey="count" name="Nouvelles recommandations" stroke="#6366f1" strokeWidth={2} dot={{ r: 4, fill: "#6366f1", strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertOctagon className="h-4 w-4 text-red-500" />
              <CardTitle className="text-sm font-semibold text-slate-700">Top 10 Recommandations Critiques</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentCritical.length === 0 ? (
              <div className="flex items-center gap-2 px-6 py-8 text-sm text-emerald-600"><CheckCircle className="h-4 w-4" /> Aucune recommandation critique ouverte.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      {["Code","Entité","Source","Statut","Responsable","Échéance"].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.recentCritical.map((reco) => (
                      <tr key={reco.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3"><span className="font-mono font-semibold text-slate-700">{reco.code}</span></td>
                        <td className="px-4 py-3 text-slate-600 max-w-[120px] truncate">{reco.entity?.label ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-600 max-w-[100px] truncate">{reco.source?.label ?? "—"}</td>
                        <td className="px-4 py-3"><StatusBadge code={reco.status.code} label={reco.status.label} color={reco.status.color} /></td>
                        <td className="px-4 py-3 text-slate-600 max-w-[120px] truncate">{reco.owner ? `${reco.owner.firstName} ${reco.owner.lastName}` : "—"}</td>
                        <td className="px-4 py-3">
                          {reco.initialDueDate ? (
                            <span className={cn("font-medium", new Date(reco.initialDueDate) < new Date() ? "text-red-600" : "text-slate-600")}>{formatDate(reco.initialDueDate)}</span>
                          ) : <span className="text-slate-400">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
        <div className="flex flex-col gap-4">
          <Card className="border-red-100 bg-red-50 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-red-600" />
                <CardTitle className="text-sm font-semibold text-red-800">Recommandations Régulateur en Retard</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {data.kpis.overdueRecommendations === 0 ? (
                <div className="flex items-center gap-2 py-2 text-sm text-emerald-700"><CheckCircle className="h-4 w-4" /> Aucune recommandation régulateur en retard.</div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-lg border border-red-200 bg-white px-4 py-3">
                    <span className="text-sm font-medium text-slate-700">Recommandations en retard</span>
                    <span className="text-lg font-bold text-red-700">{data.kpis.overdueRecommendations}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-red-200 bg-white px-4 py-3">
                    <span className="text-sm font-medium text-slate-700">Recommandations critiques ouvertes</span>
                    <span className="text-lg font-bold text-red-700">{data.kpis.criticalRecommendations}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="border-amber-100 bg-amber-50 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                <CardTitle className="text-sm font-semibold text-amber-800">Échéances Proches &amp; Indicateurs de Risque</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>Taux de clôture global</span>
                    <span className="font-semibold">{data.kpis.globalClosureRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={data.kpis.globalClosureRate} className="h-1.5 bg-amber-100 [&>div]:bg-amber-500" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>Avancement moyen des plans d&apos;action</span>
                    <span className="font-semibold">{data.kpis.averageProgressRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={data.kpis.averageProgressRate} className="h-1.5 bg-amber-100 [&>div]:bg-amber-500" />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-center">
                    <p className="text-xs text-slate-500">Reports demandés</p>
                    <p className="text-xl font-bold text-amber-700">{data.kpis.totalExtensions}</p>
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-center">
                    <p className="text-xs text-slate-500">Preuves rejetées</p>
                    <p className="text-xl font-bold text-amber-700">{data.kpis.rejectedEvidences}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────── Regulator view ───────────────────────

function RegulatorView() {
  const [data, setData] = React.useState<RegulatorData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/dashboard/regulator")
      .then((r) => { if (!r.ok) throw new Error("Erreur chargement"); return r.json(); })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton />;
  if (error) return <ErrorBanner message={error} />;
  if (!data) return null;

  const { kpis } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard title="Total Régulateur" value={kpis.total} icon={<Shield />} color="default" />
        <KpiCard title="Ouvertes" value={kpis.open} icon={<Clock />} color={kpis.open > 0 ? "warning" : "default"} />
        <KpiCard title="En Retard" value={kpis.overdue} icon={<AlertTriangle />} color={kpis.overdue > 0 ? "danger" : "default"} />
        <KpiCard title="Critiques" value={kpis.critical} icon={<AlertOctagon />} color={kpis.critical > 0 ? "danger" : "default"} />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard title="Taux de Clôture" value={`${kpis.closureRate}%`} icon={<TrendingUp />} color={kpis.closureRate >= 70 ? "success" : kpis.closureRate >= 40 ? "warning" : "danger"} />
        <KpiCard title="Clôturées" value={kpis.closed} icon={<CheckCircle />} color="success" />
        <KpiCard title="Reports en attente" value={kpis.pendingExtensions} icon={<Calendar />} color={kpis.pendingExtensions > 0 ? "warning" : "default"} />
        <KpiCard title="Preuves en revue" value={kpis.pendingEvidences} icon={<FileText />} color={kpis.pendingEvidences > 0 ? "warning" : "default"} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Open list */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-purple-600" />
              <CardTitle className="text-sm font-semibold">Recommandations Régulateur Ouvertes</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {data.openList.length === 0 ? (
              <div className="flex items-center gap-2 px-6 py-8 text-sm text-emerald-600"><CheckCircle className="h-4 w-4" /> Aucune recommandation régulateur ouverte.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      {["Code", "Entité", "Statut", "Criticité", "Échéance"].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.openList.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3"><span className="font-mono font-semibold text-purple-700">{r.code}</span></td>
                        <td className="px-4 py-3 text-slate-600 max-w-[120px] truncate">{r.entity?.label ?? "—"}</td>
                        <td className="px-4 py-3"><StatusBadge code={r.status.code} label={r.status.label} color={r.status.color} /></td>
                        <td className="px-4 py-3">
                          {r.finalCriticality != null ? (
                            <span className={cn("font-bold text-xs", (r.finalCriticality ?? 0) > 20 ? "text-red-600" : "text-slate-700")}>{r.finalCriticality.toFixed(1)}</span>
                          ) : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {r.initialDueDate ? (
                            <span className={cn("font-medium", new Date(r.initialDueDate) < new Date() ? "text-red-600" : "text-slate-600")}>{formatDate(r.initialDueDate)}</span>
                          ) : <span className="text-slate-400">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* By entity + upcoming */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-slate-500" />
                <CardTitle className="text-sm font-semibold">Répartition par Entité</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {data.byEntity.length === 0 ? (
                <p className="px-6 py-4 text-sm text-slate-400">Aucune donnée</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b bg-slate-50">{["Entité","Total","Ouv.","Ret."].map((h) => <th key={h} className="px-4 py-2 text-left font-semibold text-slate-500 uppercase">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.byEntity.map((e, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 text-slate-700 font-medium max-w-[140px] truncate">{e.entity}</td>
                          <td className="px-4 py-2.5 text-slate-600">{e.total}</td>
                          <td className="px-4 py-2.5 text-amber-600 font-medium">{e.open}</td>
                          <td className="px-4 py-2.5">
                            <span className={cn("font-medium", e.overdue > 0 ? "text-red-600" : "text-slate-400")}>{e.overdue}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-amber-100 bg-amber-50">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                <CardTitle className="text-sm font-semibold text-amber-800">Échéances dans les 30 jours</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {data.upcoming.length === 0 ? (
                <p className="text-sm text-emerald-700 flex items-center gap-2"><CheckCircle className="h-4 w-4" /> Aucune échéance imminente.</p>
              ) : (
                <div className="space-y-2">
                  {data.upcoming.map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-lg border border-amber-200 bg-white px-3 py-2">
                      <div className="min-w-0">
                        <span className="font-mono text-xs font-bold text-purple-700">{r.code}</span>
                        <span className="text-xs text-slate-500 ml-2 truncate">{r.entity?.label}</span>
                      </div>
                      <Badge variant="outline" className={cn("text-xs shrink-0 ml-2", r.daysRemaining <= 7 ? "border-red-300 text-red-700" : "border-amber-300 text-amber-700")}>
                        J-{r.daysRemaining}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────── Entity view ───────────────────────

function EntityView() {
  const [data, setData] = React.useState<EntityRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/dashboard/entity")
      .then((r) => { if (!r.ok) throw new Error("Erreur chargement"); return r.json(); })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton />;
  if (error) return <ErrorBanner message={error} />;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-500" />
            <CardTitle className="text-sm font-semibold">Indicateurs par Entité</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {data.length === 0 ? (
            <p className="px-6 py-8 text-sm text-slate-400 text-center">Aucune entité avec des recommandations</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-slate-50">
                    {["Entité", "Total", "Ouvertes", "Clôturées", "En Retard", "Tx Retard", "Tx Clôture", "Criticité Moy.", "Sans PA", "Critiques"].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-semibold text-slate-800">{row.label}</p>
                          <p className="text-slate-400 font-mono">{row.code}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700">{row.total}</td>
                      <td className="px-4 py-3 text-amber-600 font-medium">{row.open}</td>
                      <td className="px-4 py-3 text-emerald-600 font-medium">{row.closed}</td>
                      <td className="px-4 py-3">
                        <span className={cn("font-medium", row.overdue > 0 ? "text-red-600" : "text-slate-400")}>{row.overdue}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Progress value={row.overdueRate} className="h-1.5 w-16 bg-red-100 [&>div]:bg-red-500" />
                          <span className={cn(row.overdueRate > 30 ? "text-red-600" : "text-slate-600", "font-medium")}>{row.overdueRate}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Progress value={row.closureRate} className="h-1.5 w-16 bg-emerald-100 [&>div]:bg-emerald-500" />
                          <span className={cn(row.closureRate >= 70 ? "text-emerald-600" : row.closureRate >= 40 ? "text-amber-600" : "text-red-600", "font-medium")}>{row.closureRate}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("font-bold", row.avgCriticality > 20 ? "text-red-600" : row.avgCriticality > 10 ? "text-amber-600" : "text-slate-600")}>
                          {row.avgCriticality > 0 ? row.avgCriticality.toFixed(1) : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(row.noActionPlan > 0 ? "text-orange-600 font-semibold" : "text-slate-400")}>{row.noActionPlan}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(row.criticalCount > 0 ? "text-red-600 font-semibold" : "text-slate-400")}>{row.criticalCount}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────── Management view ───────────────────────

function ManagementView() {
  const [data, setData] = React.useState<ManagementData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/dashboard/management")
      .then((r) => { if (!r.ok) throw new Error("Erreur chargement"); return r.json(); })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton />;
  if (error) return <ErrorBanner message={error} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard title="Recommandations Critiques" value={data.topCritical.length} icon={<AlertOctagon />} color={data.topCritical.length > 0 ? "danger" : "default"} />
        <KpiCard title="Échéances &lt; 30j" value={data.upcomingDeadlines.length} icon={<Clock />} color={data.upcomingDeadlines.length > 0 ? "warning" : "default"} />
        <KpiCard title="Sans Plan d'Action" value={data.withoutActionPlan} icon={<FileText />} color={data.withoutActionPlan > 0 ? "warning" : "default"} />
        <KpiCard title="Actions Bloquées" value={data.blockedActions} icon={<AlertTriangle />} color={data.blockedActions > 0 ? "danger" : "default"} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top critical */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertOctagon className="h-4 w-4 text-red-500" />
              <CardTitle className="text-sm font-semibold">Top Recommandations Critiques</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {data.topCritical.length === 0 ? (
              <div className="flex items-center gap-2 px-6 py-8 text-sm text-emerald-600"><CheckCircle className="h-4 w-4" /> Aucune recommandation critique.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.topCritical.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50">
                    <div className="min-w-0">
                      <span className="font-mono text-xs font-bold text-slate-700">{r.code}</span>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{r.entity?.label ?? "—"}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge code={r.status.code} label={r.status.label} color={r.status.color} />
                      {r.finalCriticality != null && (
                        <span className="font-bold text-sm text-red-600">{r.finalCriticality.toFixed(1)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top overdue entities */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-red-500" />
              <CardTitle className="text-sm font-semibold">Top Entités en Retard</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {data.topOverdueEntities.length === 0 ? (
              <div className="flex items-center gap-2 py-4 text-sm text-emerald-600"><CheckCircle className="h-4 w-4" /> Aucune entité en retard.</div>
            ) : (
              <div className="space-y-3">
                {data.topOverdueEntities.map((e, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-400 w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700 truncate">{e.entity}</span>
                        <span className="text-sm font-bold text-red-600 shrink-0 ml-2">{e.overdueCount}</span>
                      </div>
                      <Progress
                        value={Math.min(100, (e.overdueCount / (data.topOverdueEntities[0]?.overdueCount || 1)) * 100)}
                        className="h-1.5 bg-red-100 [&>div]:bg-red-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Monthly evolution */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Évolution Mensuelle</CardTitle></CardHeader>
          <CardContent>
            {data.monthlyEvolution.length === 0 ? <p className="py-10 text-center text-sm text-slate-400">Aucune donnée</p> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.monthlyEvolution} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" iconSize={8} />
                  <Bar dataKey="opened" name="Ouvertes" fill="#6366f1" radius={[3, 3, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="closed" name="Clôturées" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Priority regulator + upcoming deadlines */}
        <div className="space-y-4">
          <Card className="border-purple-100 bg-purple-50">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-purple-600" />
                <CardTitle className="text-sm font-semibold text-purple-800">Priorités Régulateur</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {data.regulatorPriority.length === 0 ? (
                <p className="text-sm text-emerald-700 flex items-center gap-2"><CheckCircle className="h-4 w-4" /> Aucune recommandation régulateur ouverte.</p>
              ) : (
                <div className="space-y-2">
                  {data.regulatorPriority.slice(0, 5).map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-lg border border-purple-200 bg-white px-3 py-2">
                      <div className="min-w-0">
                        <span className="font-mono text-xs font-bold text-purple-700">{r.code}</span>
                        <span className="text-xs text-slate-500 ml-2 truncate">{r.entity?.label}</span>
                      </div>
                      <StatusBadge code={r.status.code} label={r.status.label} color={r.status.color} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-amber-100 bg-amber-50">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                <CardTitle className="text-sm font-semibold text-amber-800">Échéances Imminentes</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {data.upcomingDeadlines.length === 0 ? (
                <p className="text-sm text-emerald-700 flex items-center gap-2"><CheckCircle className="h-4 w-4" /> Aucune échéance imminente.</p>
              ) : (
                <div className="space-y-2">
                  {data.upcomingDeadlines.slice(0, 5).map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-lg border border-amber-200 bg-white px-3 py-2">
                      <div className="min-w-0">
                        <span className="font-mono text-xs font-bold text-slate-700">{r.code}</span>
                        <span className="text-xs text-slate-500 ml-2 truncate">{r.entity?.label}</span>
                      </div>
                      <Badge variant="outline" className={cn("text-xs shrink-0 ml-2", r.daysRemaining <= 7 ? "border-red-300 text-red-700" : "border-amber-300 text-amber-700")}>
                        J-{r.daysRemaining}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────── Main page ───────────────────────

const TABS = [
  { id: "general", label: "Général", icon: TrendingUp },
  { id: "regulator", label: "Régulateur", icon: Shield },
  { id: "entity", label: "Par Entité", icon: Building2 },
  { id: "management", label: "Management", icon: Users },
] as const;

type ViewId = typeof TABS[number]["id"];

export default function DashboardPage() {
  const [view, setView] = React.useState<ViewId>(() => {
    if (typeof window === "undefined") return "general";
    const v = new URLSearchParams(window.location.search).get("view") ?? "general";
    return (TABS.some((t) => t.id === v) ? v : "general") as ViewId;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Tableau de Bord</h1>
            <p className="mt-0.5 text-sm text-slate-500">Vue d&apos;ensemble des recommandations et missions d&apos;audit</p>
          </div>
          <Badge variant="outline" className="hidden items-center gap-1.5 border-slate-200 bg-white text-slate-600 sm:flex">
            <Calendar className="h-3.5 w-3.5" />
            {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          </Badge>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-0 border-b border-border">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                view === id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Views */}
        {view === "general" && <GeneralView />}
        {view === "regulator" && <RegulatorView />}
        {view === "entity" && <EntityView />}
        {view === "management" && <ManagementView />}
      </div>
    </AppLayout>
  );
}

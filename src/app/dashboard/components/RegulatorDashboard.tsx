"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/badges/StatusBadge";
import { formatDate } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Shield, AlertTriangle, CheckCircle, Clock, FileCheck } from "lucide-react";
import { KpiCard } from "./KpiCard";

interface RegulatorReco {
  id: string;
  code: string;
  title: string;
  entity: { label: string } | null;
  status: { code: string; label: string; color?: string | null };
  owner: { firstName: string; lastName: string } | null;
  initialDueDate: string | null;
  finalDueDate?: string | null;
}

interface RegulatorStats {
  open: number;
  closed: number;
  overdue: number;
  pendingEvidence: number;
  byStatus: { status: string; count: number }[];
  overdueList: RegulatorReco[];
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: "#3b82f6",
  IN_PROGRESS: "#f59e0b",
  IN_REVIEW: "#8b5cf6",
  CLOSED: "#10b981",
  REJECTED: "#ef4444",
};

export function RegulatorDashboard() {
  const [stats, setStats] = useState<RegulatorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const res = await fetch("/api/recommendations?isRegulator=true&pageSize=200");
        if (!res.ok) throw new Error("Erreur lors du chargement");
        const data = await res.json();

        const recommendations: RegulatorReco[] = data.data ?? data.recommendations ?? [];
        const now = new Date();

        const open = recommendations.filter(
          (r) => r.status.code !== "CLOSED" && r.status.code !== "CANCELLED"
        ).length;
        const closed = recommendations.filter((r) => r.status.code === "CLOSED").length;
        const overdue = recommendations.filter((r) => {
          const due = r.finalDueDate || r.initialDueDate;
          return (
            due &&
            new Date(due) < now &&
            r.status.code !== "CLOSED" &&
            r.status.code !== "CANCELLED"
          );
        }).length;
        const pendingEvidence = recommendations.filter(
          (r) => r.status.code === "IN_REVIEW"
        ).length;

        // Group by status
        const statusMap: Record<string, number> = {};
        for (const r of recommendations) {
          statusMap[r.status.label] = (statusMap[r.status.label] ?? 0) + 1;
        }
        const byStatus = Object.entries(statusMap).map(([status, count]) => ({
          status,
          count,
        }));

        // Overdue list
        const overdueList = recommendations
          .filter((r) => {
            const due = r.finalDueDate || r.initialDueDate;
            return (
              due &&
              new Date(due) < now &&
              r.status.code !== "CLOSED" &&
              r.status.code !== "CANCELLED"
            );
          })
          .slice(0, 10);

        setStats({ open, closed, overdue, pendingEvidence, byStatus, overdueList });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        {error ?? "Impossible de charger les données régulateur."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          title="Ouvertes"
          value={stats.open}
          icon={<Shield />}
          color="default"
        />
        <KpiCard
          title="Clôturées"
          value={stats.closed}
          icon={<CheckCircle />}
          color="success"
        />
        <KpiCard
          title="En Retard"
          value={stats.overdue}
          icon={<AlertTriangle />}
          color={stats.overdue > 0 ? "danger" : "default"}
        />
        <KpiCard
          title="En Attente de Preuve"
          value={stats.pendingEvidence}
          icon={<FileCheck />}
          color="warning"
        />
      </div>

      {/* Charts + Table */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Status breakdown chart */}
        <Card className="border-slate-200 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">
              Répartition par Statut (Régulateur)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.byStatus.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                Aucune recommandation régulateur
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={stats.byStatus}
                  margin={{ top: 4, right: 12, left: 0, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="status"
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
                    }}
                  />
                  <Bar dataKey="count" name="Recommandations" radius={[4, 4, 0, 0]}>
                    {stats.byStatus.map((entry, index) => {
                      const colorKey = Object.keys(STATUS_COLORS)[index % Object.keys(STATUS_COLORS).length];
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={STATUS_COLORS[colorKey] ?? "#6366f1"}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Overdue table */}
        <Card className="border-slate-200 bg-white">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <CardTitle className="text-sm font-semibold text-slate-700">
                Recommandations Régulateur en Retard
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {stats.overdueList.length === 0 ? (
              <div className="flex items-center gap-2 px-6 py-8 text-sm text-emerald-600">
                <CheckCircle className="h-4 w-4" />
                Aucune recommandation régulateur en retard.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {stats.overdueList.map((reco) => {
                  const due = reco.finalDueDate || reco.initialDueDate;
                  return (
                    <div
                      key={reco.id}
                      className="flex items-start justify-between gap-3 px-6 py-3 hover:bg-slate-50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-700 font-mono">
                          {reco.code}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {reco.entity?.label ?? "—"}
                        </p>
                        <div className="mt-1 flex items-center gap-1 text-xs text-red-600">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>Échéance: {formatDate(due)}</span>
                        </div>
                      </div>
                      <StatusBadge
                        code={reco.status.code}
                        label={reco.status.label}
                        color={reco.status.color}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

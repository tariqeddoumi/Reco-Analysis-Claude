"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { DataTable, ColumnDef } from "@/components/tables/DataTable";
import { StatusBadge } from "@/components/badges/StatusBadge";
import { PriorityBadge } from "@/components/badges/PriorityBadge";
import { TemporalBadge } from "@/components/badges/TemporalBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { formatDate, getTemporalStatus, getDaysRemaining, truncate, cn } from "@/lib/utils";
import type { RecommendationWithRelations, TemporalStatus } from "@/types";
import {
  Plus,
  Search,
  Eye,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Shield,
  AlertTriangle,
} from "lucide-react";

interface Referential {
  id: string;
  code: string;
  label: string;
}

interface ReferentialsData {
  statuses?: Referential[];
  sources?: Referential[];
  entities?: Referential[];
  priorities?: Referential[];
}

type QuickFilter = "all" | "open" | "overdue" | "critical" | "regulator";

const QUICK_FILTERS: { key: QuickFilter; label: string }[] = [
  { key: "all", label: "Toutes" },
  { key: "open", label: "Ouvertes" },
  { key: "overdue", label: "En Retard" },
  { key: "critical", label: "Critiques" },
  { key: "regulator", label: "Régulateur" },
];

export default function RecommendationsPage() {
  const router = useRouter();

  const [recommendations, setRecommendations] = React.useState<RecommendationWithRelations[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const pageSize = 15;

  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusId, setStatusId] = React.useState("");
  const [sourceId, setSourceId] = React.useState("");
  const [entityId, setEntityId] = React.useState("");
  const [priorityId, setPriorityId] = React.useState("");
  const [isRegulator, setIsRegulator] = React.useState(false);
  const [isOverdue, setIsOverdue] = React.useState(false);
  const [quickFilter, setQuickFilter] = React.useState<QuickFilter>("all");
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [sortBy, setSortBy] = React.useState("createdAt");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");
  const [isExporting, setIsExporting] = React.useState(false);

  const [referentials, setReferentials] = React.useState<ReferentialsData>({});

  // Debounce search
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Load referentials
  React.useEffect(() => {
    fetch("/api/admin/referentials?types=statuses,sources,entities,priorities")
      .then((r) => r.json())
      .then(setReferentials)
      .catch(console.error);
  }, []);

  // Apply quick filter
  React.useEffect(() => {
    setIsRegulator(quickFilter === "regulator");
    setIsOverdue(quickFilter === "overdue");
    setPage(1);
  }, [quickFilter]);

  // Load recommendations
  React.useEffect(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (statusId) params.set("statusId", statusId);
    if (sourceId) params.set("sourceId", sourceId);
    if (entityId) params.set("entityId", entityId);
    if (priorityId) params.set("priorityId", priorityId);
    if (isRegulator) params.set("isRegulator", "true");
    if (isOverdue) params.set("isOverdue", "true");
    if (quickFilter === "critical") params.set("isCritical", "true");
    if (quickFilter === "open") params.set("isOpen", "true");
    params.set("sortBy", sortBy);
    params.set("sortOrder", sortOrder);

    setIsLoading(true);
    fetch(`/api/recommendations?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setRecommendations(data.data ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [page, pageSize, debouncedSearch, statusId, sourceId, entityId, priorityId, isRegulator, isOverdue, quickFilter, sortBy, sortOrder]);

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const resetFilters = () => {
    setSearch("");
    setStatusId("");
    setSourceId("");
    setEntityId("");
    setPriorityId("");
    setIsRegulator(false);
    setIsOverdue(false);
    setQuickFilter("all");
    setPage(1);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams({ type: "excel" });
      if (quickFilter === "overdue") params.set("type", "overdue");
      if (quickFilter === "regulator") params.set("type", "regulator");
      const res = await fetch(`/api/reports/export?${params.toString()}`);
      if (!res.ok) throw new Error("Export échoué");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = res.headers.get("Content-Disposition") ?? "";
      a.download = disposition.match(/filename="(.+)"/)?.[ 1] ?? "recommandations.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // silently ignore — the API returns JSON error which won't open as CSV
    } finally {
      setIsExporting(false);
    }
  };

  const getRowClass = (row: RecommendationWithRelations): string => {
    const dueDate = row.revisedDueDate ?? row.initialDueDate;
    const tStatus = getTemporalStatus(dueDate, row.closedAt);
    if (tStatus === "OVERDUE" || (row.finalCriticality ?? 0) > 20) {
      return "bg-red-50/50 hover:bg-red-50";
    }
    if (tStatus === "DUE_SOON") return "bg-amber-50/30 hover:bg-amber-50/60";
    return "hover:bg-muted/40";
  };

  const columns: ColumnDef<RecommendationWithRelations>[] = [
    {
      key: "code",
      header: "Code",
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-primary whitespace-nowrap">{row.code}</span>
      ),
    },
    {
      key: "recommendation",
      header: "Recommandation",
      sortable: true,
      className: "max-w-[240px]",
      render: (row) => (
        <div>
          <span className="text-sm block truncate" title={row.recommendation}>
            {truncate(row.recommendation, 80)}
          </span>
          {row.isRegulator && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-purple-700 font-medium mt-0.5">
              <Shield className="h-2.5 w-2.5" /> Régulateur
            </span>
          )}
        </div>
      ),
    },
    {
      key: "mission",
      header: "Mission",
      render: (row) => (
        <span className="font-mono text-xs text-muted-foreground">{row.mission?.reference ?? "—"}</span>
      ),
    },
    {
      key: "source",
      header: "Source",
      render: (row) => <span className="text-xs font-medium">{row.source?.label ?? "—"}</span>,
    },
    {
      key: "entity",
      header: "Entité",
      render: (row) => <span className="text-xs text-muted-foreground">{row.entity?.label ?? "—"}</span>,
    },
    {
      key: "finalCriticality",
      header: "Criticité",
      sortable: true,
      headerClassName: "text-center",
      className: "text-center",
      render: (row) => {
        const score = row.finalCriticality ?? 0;
        const colorClass =
          score > 20 ? "bg-red-100 text-red-900 border-red-300" :
          score >= 16 ? "bg-orange-100 text-orange-900 border-orange-300" :
          score >= 11 ? "bg-amber-100 text-amber-900 border-amber-300" :
          score >= 6 ? "bg-yellow-100 text-yellow-900 border-yellow-300" :
          "bg-emerald-100 text-emerald-900 border-emerald-200";
        return (
          <span className={cn("inline-flex items-center justify-center rounded border text-xs font-bold h-6 w-8", colorClass)}>
            {score > 0 ? score.toFixed(0) : "—"}
          </span>
        );
      },
    },
    {
      key: "priority",
      header: "Priorité",
      render: (row) =>
        row.priority ? (
          <PriorityBadge code={row.priority.code} label={row.priority.label} showIcon />
        ) : <span className="text-muted-foreground text-xs">—</span>,
    },
    {
      key: "status",
      header: "Statut",
      render: (row) =>
        row.status ? (
          <StatusBadge code={row.status.code} label={row.status.label} color={row.status.color} />
        ) : <span>—</span>,
    },
    {
      key: "dueDate",
      header: "Échéance",
      sortable: true,
      render: (row) => {
        const dueDate = row.revisedDueDate ?? row.initialDueDate;
        const tStatus = getTemporalStatus(dueDate, row.closedAt) as TemporalStatus;
        const days = getDaysRemaining(dueDate);
        return <TemporalBadge status={tStatus} daysRemaining={days} showIcon />;
      },
    },
    {
      key: "progressRate",
      header: "Avancement",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2 min-w-[90px]">
          <Progress value={row.progressRate} className="h-1.5 flex-1" />
          <span className="text-xs font-medium w-8 text-right">{row.progressRate}%</span>
        </div>
      ),
    },
    {
      key: "owner",
      header: "Responsable",
      render: (row) =>
        row.owner ? (
          <span className="text-xs whitespace-nowrap">
            {row.owner.firstName} {row.owner.lastName}
          </span>
        ) : <span className="text-muted-foreground text-xs">—</span>,
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      headerClassName: "text-right",
      render: (row) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => { e.stopPropagation(); router.push(`/recommendations/${row.id}`); }}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Recommandations
              {total > 0 && (
                <Badge variant="secondary" className="ml-2 text-sm font-semibold">{total}</Badge>
              )}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Suivi et gestion de toutes les recommandations
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleExport}
              disabled={isExporting}
            >
              <Download className="h-4 w-4" />
              {isExporting ? "Export..." : "Exporter"}
            </Button>
            <Button onClick={() => router.push("/recommendations/new")} className="gap-2">
              <Plus className="h-4 w-4" />
              Nouvelle recommandation
            </Button>
          </div>
        </div>

        {/* Quick filter tabs */}
        <div className="flex items-center gap-1 border-b border-border">
          {QUICK_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setQuickFilter(key)}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                quickFilter === key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher une recommandation..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-9"
                />
              </div>

              <Select value={statusId} onValueChange={(v) => { setStatusId(v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  {referentials.statuses?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Filtres avancés
              </Button>

              <Button variant="ghost" size="icon" onClick={resetFilters} title="Réinitialiser">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {/* Advanced filters */}
            {showAdvanced && (
              <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-4 items-center">
                <Select value={sourceId} onValueChange={(v) => { setSourceId(v === "all" ? "" : v); setPage(1); }}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les sources</SelectItem>
                    {referentials.sources?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={entityId} onValueChange={(v) => { setEntityId(v === "all" ? "" : v); setPage(1); }}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Entité" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les entités</SelectItem>
                    {referentials.entities?.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={priorityId} onValueChange={(v) => { setPriorityId(v === "all" ? "" : v); setPage(1); }}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Priorité" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les priorités</SelectItem>
                    {referentials.priorities?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2">
                  <Switch
                    id="filter-regulator"
                    checked={isRegulator}
                    onCheckedChange={(v) => { setIsRegulator(v); setPage(1); }}
                  />
                  <Label htmlFor="filter-regulator" className="text-sm flex items-center gap-1 cursor-pointer">
                    <Shield className="h-3.5 w-3.5 text-purple-600" />
                    Régulateur
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="filter-overdue"
                    checked={isOverdue}
                    onCheckedChange={(v) => { setIsOverdue(v); setPage(1); }}
                  />
                  <Label htmlFor="filter-overdue" className="text-sm flex items-center gap-1 cursor-pointer">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                    En retard
                  </Label>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Table */}
        <DataTable
          columns={columns}
          data={recommendations}
          isLoading={isLoading}
          sort={{ sortBy, sortOrder, onSort: handleSort }}
          pagination={{ page, pageSize, total, onPageChange: setPage }}
          emptyMessage="Aucune recommandation trouvée"
          onRowClick={(row) => router.push(`/recommendations/${row.id}`)}
          getRowKey={(row) => row.id}
          rowClassName={getRowClass}
        />
      </div>
    </AppLayout>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { DataTable, ColumnDef } from "@/components/tables/DataTable";
import { StatusBadge } from "@/components/badges/StatusBadge";
import { TemporalBadge } from "@/components/badges/TemporalBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, getTemporalStatus, getDaysRemaining } from "@/lib/utils";
import { ActionWithRelations, TemporalStatus } from "@/types";
import { Eye, Search, RefreshCw, ListTodo } from "lucide-react";

type FilterTab = "all" | "mine" | "overdue" | "blocked";

interface Referential {
  id: string;
  code: string;
  label: string;
  color?: string | null;
}

export default function ActionsPage() {
  const router = useRouter();

  const [actions, setActions] = React.useState<ActionWithRelations[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const pageSize = 20;

  const [activeTab, setActiveTab] = React.useState<FilterTab>("all");
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusId, setStatusId] = React.useState("");
  const [responsibleId, setResponsibleId] = React.useState("");

  const [actionStatuses, setActionStatuses] = React.useState<Referential[]>([]);
  const [sortBy, setSortBy] = React.useState("plannedEndAt");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc");

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  React.useEffect(() => {
    fetch("/api/admin/referentials?type=all")
      .then((r) => r.json())
      .then((data) => setActionStatuses(data.actionStatuses ?? []))
      .catch(console.error);
  }, []);

  React.useEffect(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (statusId) params.set("statusId", statusId);
    if (responsibleId) params.set("responsibleId", responsibleId);
    params.set("sortBy", sortBy);
    params.set("sortOrder", sortOrder);

    setIsLoading(true);
    fetch(`/api/actions?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setActions(data.data ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [page, pageSize, debouncedSearch, statusId, responsibleId, sortBy, sortOrder]);

  const handleSort = (key: string) => {
    if (sortBy === key) setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    else { setSortBy(key); setSortOrder("asc"); }
    setPage(1);
  };

  const filteredActions = React.useMemo(() => {
    let data = [...actions];
    if (activeTab === "overdue") {
      data = data.filter((a) => {
        const ts = getTemporalStatus(a.plannedEndAt);
        return ts === "OVERDUE";
      });
    } else if (activeTab === "blocked") {
      // Filter actions where status code indicates blocked
      data = data.filter((a) => a.status?.code === "BLOCKED" || a.status?.code === "ON_HOLD");
    }
    return data;
  }, [actions, activeTab]);

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "Toutes" },
    { key: "mine", label: "Mes actions" },
    { key: "overdue", label: "En Retard" },
    { key: "blocked", label: "Bloquées" },
  ];

  const columns: ColumnDef<ActionWithRelations>[] = [
    {
      key: "title",
      header: "Titre de l'action",
      sortable: true,
      className: "max-w-[200px]",
      render: (row) => (
        <span className="font-medium text-sm truncate block" title={row.title}>
          {row.title}
        </span>
      ),
    },
    {
      key: "code",
      header: "Recommandation",
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-primary">
          {row.actionPlan?.recommendation?.code ?? "—"}
        </span>
      ),
    },
    {
      key: "entity",
      header: "Entité",
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.actionPlan?.recommendation?.entity?.label ?? "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Statut",
      render: (row) =>
        row.status ? (
          <StatusBadge code={row.status.code} label={row.status.label} color={row.status.color} />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "progressRate",
      header: "Avancement",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2 min-w-[100px]">
          <Progress value={row.progressRate} className="h-1.5 flex-1" />
          <span className="text-xs text-muted-foreground w-8 text-right">
            {row.progressRate}%
          </span>
        </div>
      ),
    },
    {
      key: "priority",
      header: "Priorité",
      render: (row) => (
        <Badge variant="outline" className="text-xs">
          {row.priority ?? "—"}
        </Badge>
      ),
    },
    {
      key: "plannedEndAt",
      header: "Échéance",
      sortable: true,
      render: (row) => {
        const ts = getTemporalStatus(row.plannedEndAt) as TemporalStatus;
        const days = getDaysRemaining(row.plannedEndAt);
        return (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{formatDate(row.plannedEndAt)}</span>
            <TemporalBadge status={ts} daysRemaining={days} showIcon />
          </div>
        );
      },
    },
    {
      key: "responsible",
      header: "Responsable",
      render: (row) =>
        row.responsible ? (
          <span className="text-xs">
            {row.responsible.firstName} {row.responsible.lastName}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
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
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/actions/${row.id}`);
          }}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Plans d&apos;Action &amp; Actions
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Suivi et gestion des actions correctives
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ListTodo className="h-4 w-4" />
            <span>{total} action{total !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setPage(1); }}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher une action..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-9"
                />
              </div>

              <Select value={statusId} onValueChange={(v) => { setStatusId(v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  {actionStatuses.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setSearch(""); setStatusId(""); setResponsibleId(""); setPage(1); }}
                title="Réinitialiser les filtres"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <DataTable
          columns={columns}
          data={filteredActions}
          isLoading={isLoading}
          sort={{ sortBy, sortOrder, onSort: handleSort }}
          pagination={{ page, pageSize, total, onPageChange: setPage }}
          emptyMessage="Aucune action trouvée"
          onRowClick={(row) => router.push(`/actions/${row.id}`)}
          getRowKey={(row) => row.id}
          rowClassName={() => "hover:bg-muted/40"}
        />
      </div>
    </AppLayout>
  );
}

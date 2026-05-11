"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { DataTable, ColumnDef } from "@/components/tables/DataTable";
import { TemporalBadge } from "@/components/badges/TemporalBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, getTemporalStatus, getDaysRemaining } from "@/lib/utils";
import { TemporalStatus } from "@/types";
import { Eye, Search, RefreshCw, FileCheck2, Trash2, ListTodo } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PlanListItem {
  id: string;
  title: string;
  description: string | null;
  statusCode: string;
  progressRate: number;
  weight: number;
  validatedAt: string | null;
  createdAt: string;
  recommendation: {
    id: string;
    code: string;
    recommendation: string;
    initialDueDate: string | null;
    revisedDueDate: string | null;
    entity: { id: string; label: string } | null;
    owner: { id: string; firstName: string | null; lastName: string | null } | null;
  };
  actions: Array<{
    id: string;
    progressRate: number;
    status: { code: string } | null;
  }>;
}

const STATUS_OPTIONS = [
  { code: "DRAFT", label: "Brouillon", color: "#94a3b8" },
  { code: "PROPOSED", label: "Proposé", color: "#3b82f6" },
  { code: "APPROVED", label: "Approuvé", color: "#10b981" },
  { code: "IN_PROGRESS", label: "En cours", color: "#f59e0b" },
  { code: "COMPLETED", label: "Terminé", color: "#22c55e" },
  { code: "CANCELLED", label: "Annulé", color: "#ef4444" },
];

function StatusPill({ code }: { code: string }) {
  const opt = STATUS_OPTIONS.find((s) => s.code === code);
  const label = opt?.label ?? code;
  const color = opt?.color ?? "#64748b";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium border"
      style={{ borderColor: `${color}40`, backgroundColor: `${color}15`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

export default function ActionPlansPage() {
  const router = useRouter();

  const [plans, setPlans] = React.useState<PlanListItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const pageSize = 20;

  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusCode, setStatusCode] = React.useState("");
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchPlans = React.useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (statusCode) params.set("statusCode", statusCode);

    setIsLoading(true);
    fetch(`/api/action-plans?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setPlans(data.data ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [page, debouncedSearch, statusCode]);

  React.useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/action-plans/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPlans((prev) => prev.filter((p) => p.id !== id));
        setTotal((prev) => prev - 1);
      }
    } finally {
      setDeletingId(null);
    }
  }

  const columns: ColumnDef<PlanListItem>[] = [
    {
      key: "title",
      header: "Titre du plan",
      sortable: false,
      className: "max-w-[260px]",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-sm truncate" title={row.title}>
            {row.title}
          </span>
          {row.description && (
            <span className="text-xs text-muted-foreground truncate" title={row.description}>
              {row.description}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "recommendation",
      header: "Recommandation",
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/recommendations/${row.recommendation.id}`);
          }}
          className="font-mono text-xs font-semibold text-primary hover:underline"
        >
          {row.recommendation.code}
        </button>
      ),
    },
    {
      key: "entity",
      header: "Entité",
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.recommendation.entity?.label ?? "—"}
        </span>
      ),
    },
    {
      key: "statusCode",
      header: "Statut",
      render: (row) => <StatusPill code={row.statusCode} />,
    },
    {
      key: "progressRate",
      header: "Avancement",
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
      key: "actionsCount",
      header: "Actions",
      render: (row) => {
        const total = row.actions.length;
        const done = row.actions.filter((a) => a.progressRate >= 100).length;
        return (
          <Badge variant="outline" className="text-xs font-mono">
            {done}/{total}
          </Badge>
        );
      },
    },
    {
      key: "dueDate",
      header: "Échéance reco.",
      render: (row) => {
        const due = row.recommendation.revisedDueDate ?? row.recommendation.initialDueDate;
        if (!due) return <span className="text-xs text-muted-foreground">—</span>;
        const ts = getTemporalStatus(due) as TemporalStatus;
        const days = getDaysRemaining(due);
        return (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{formatDate(due)}</span>
            <TemporalBadge status={ts} daysRemaining={days} showIcon />
          </div>
        );
      },
    },
    {
      key: "owner",
      header: "Pilote (reco.)",
      render: (row) =>
        row.recommendation.owner ? (
          <span className="text-xs">
            {row.recommendation.owner.firstName} {row.recommendation.owner.lastName}
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
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Ouvrir le plan"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/action-plans/${row.id}`);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => e.stopPropagation()}
                disabled={deletingId === row.id}
                title="Supprimer le plan"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer ce plan d&apos;action ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Le plan et toutes ses actions seront archivés. Cette opération est irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={(e) => e.stopPropagation()}>
                  Annuler
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(row.id);
                  }}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
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
              Plans d&apos;Action
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Vue d&apos;ensemble des plans — cliquez pour gérer les actions du plan.
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <FileCheck2 className="h-4 w-4" />
              {total} plan{total !== 1 ? "s" : ""}
            </span>
            <Button variant="outline" size="sm" onClick={() => router.push("/actions")}>
              <ListTodo className="h-3.5 w-3.5 mr-1.5" />
              Voir toutes les actions
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un plan, recommandation..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                />
              </div>

              <Select
                value={statusCode || "all"}
                onValueChange={(v) => {
                  setStatusCode(v === "all" ? "" : v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.code} value={s.code}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setSearch("");
                  setStatusCode("");
                  setPage(1);
                }}
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
          data={plans}
          isLoading={isLoading}
          pagination={{ page, pageSize, total, onPageChange: setPage }}
          emptyMessage="Aucun plan d'action trouvé"
          onRowClick={(row) => router.push(`/action-plans/${row.id}`)}
          getRowKey={(row) => row.id}
          rowClassName={() => "hover:bg-muted/40 cursor-pointer"}
        />
      </div>
    </AppLayout>
  );
}

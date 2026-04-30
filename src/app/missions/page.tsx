"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { DataTable, ColumnDef } from "@/components/tables/DataTable";
import { StatusBadge } from "@/components/badges/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { MissionWithRelations } from "@/types";
import {
  Plus,
  Search,
  Eye,
  FolderOpen,
  RefreshCw,
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
}

export default function MissionsPage() {
  const router = useRouter();

  const [missions, setMissions] = React.useState<MissionWithRelations[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const pageSize = 15;

  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusId, setStatusId] = React.useState("");
  const [sourceId, setSourceId] = React.useState("");
  const [entityId, setEntityId] = React.useState("");
  const [sortBy, setSortBy] = React.useState("createdAt");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");

  const [referentials, setReferentials] = React.useState<ReferentialsData>({});

  // Debounce search
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Load referentials
  React.useEffect(() => {
    fetch("/api/admin/referentials?types=statuses,sources,entities")
      .then((r) => r.json())
      .then((data) => setReferentials(data))
      .catch(console.error);
  }, []);

  // Load missions
  React.useEffect(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (statusId) params.set("statusId", statusId);
    if (sourceId) params.set("sourceId", sourceId);
    if (entityId) params.set("entityId", entityId);
    params.set("sortBy", sortBy);
    params.set("sortOrder", sortOrder);

    setIsLoading(true);
    fetch(`/api/missions?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setMissions(data.data ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [page, pageSize, debouncedSearch, statusId, sourceId, entityId, sortBy, sortOrder]);

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const handleFilterChange = () => setPage(1);

  const columns: ColumnDef<MissionWithRelations>[] = [
    {
      key: "reference",
      header: "Référence",
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-primary">
          {row.reference}
        </span>
      ),
    },
    {
      key: "title",
      header: "Libellé",
      sortable: true,
      className: "max-w-[220px]",
      render: (row) => (
        <span className="text-sm font-medium truncate block" title={row.title}>
          {row.title}
        </span>
      ),
    },
    {
      key: "missionType",
      header: "Type",
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.missionType?.label ?? "—"}
        </span>
      ),
    },
    {
      key: "source",
      header: "Source",
      render: (row) => (
        <span className="text-xs font-medium">{row.source?.label ?? "—"}</span>
      ),
    },
    {
      key: "entity",
      header: "Entité",
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.entity?.label ?? "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Statut",
      render: (row) =>
        row.status ? (
          <StatusBadge
            code={row.status.code}
            label={row.status.label}
            color={row.status.color}
          />
        ) : (
          <span>—</span>
        ),
    },
    {
      key: "startDate",
      header: "Date début",
      sortable: true,
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {formatDate(row.startDate)}
        </span>
      ),
    },
    {
      key: "endDate",
      header: "Date fin",
      sortable: true,
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {formatDate(row.endDate)}
        </span>
      ),
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
      key: "recommendations",
      header: "Nb reco.",
      headerClassName: "text-center",
      className: "text-center",
      render: (row) => (
        <span className="inline-flex items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold h-6 min-w-[1.5rem] px-1.5">
          {row._count?.recommendations ?? 0}
        </span>
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
            router.push(`/missions/${row.id}`);
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
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Missions
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gestion et suivi des missions d&apos;audit et de contrôle
            </p>
          </div>
          <Button
            onClick={() => router.push("/missions/new")}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Nouvelle mission
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher une mission..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    handleFilterChange();
                  }}
                  className="pl-9"
                />
              </div>

              <Select
                value={statusId}
                onValueChange={(v) => {
                  setStatusId(v === "all" ? "" : v);
                  handleFilterChange();
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  {referentials.statuses?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={sourceId}
                onValueChange={(v) => {
                  setSourceId(v === "all" ? "" : v);
                  handleFilterChange();
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les sources</SelectItem>
                  {referentials.sources?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={entityId}
                onValueChange={(v) => {
                  setEntityId(v === "all" ? "" : v);
                  handleFilterChange();
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Entité" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les entités</SelectItem>
                  {referentials.entities?.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setSearch("");
                  setStatusId("");
                  setSourceId("");
                  setEntityId("");
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
          data={missions}
          isLoading={isLoading}
          sort={{ sortBy, sortOrder, onSort: handleSort }}
          pagination={{
            page,
            pageSize,
            total,
            onPageChange: setPage,
          }}
          emptyMessage="Aucune mission trouvée"
          onRowClick={(row) => router.push(`/missions/${row.id}`)}
          getRowKey={(row) => row.id}
          rowClassName={() => "hover:bg-muted/40"}
        />

        {/* Empty CTA */}
        {!isLoading && missions.length === 0 && total === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-primary/10 p-5 mb-4">
              <FolderOpen className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Aucune mission</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Commencez par créer votre première mission d&apos;audit ou de contrôle.
            </p>
            <Button onClick={() => router.push("/missions/new")} className="gap-2">
              <Plus className="h-4 w-4" />
              Créer une mission
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

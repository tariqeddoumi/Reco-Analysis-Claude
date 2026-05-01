"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/badges/StatusBadge";
import { DataTable, ColumnDef } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils";
import { EvidenceUploadForm } from "@/components/forms/EvidenceUploadForm";
import {
  Paperclip,
  Search,
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
  Plus,
} from "lucide-react";

type FilterTab = "all" | "pending" | "accepted" | "rejected";

interface Evidence {
  id: string;
  title: string;
  statusCode: string;
  fileName: string | null;
  createdAt: string;
  evidenceType: { label: string } | null;
  depositor: { firstName: string; lastName: string } | null;
  recommendation: { code: string } | null;
  action: { title: string } | null;
}

interface EvidenceType {
  id: string;
  code: string;
  label: string;
}

const STATUS_TAB_MAP: Record<FilterTab, string | undefined> = {
  all: undefined,
  pending: "IN_REVIEW",
  accepted: "ACCEPTED",
  rejected: "REJECTED",
};

const STATUS_LABELS: Record<string, string> = {
  DEPOSITED: "Déposée",
  IN_REVIEW: "En révision",
  ACCEPTED: "Acceptée",
  REJECTED: "Rejetée",
  COMPLEMENT_REQUIRED: "Complément requis",
  REPLACED: "Remplacée",
  ARCHIVED: "Archivée",
};

function EvidencesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [evidences, setEvidences] = React.useState<Evidence[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<FilterTab>("all");
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [typeId, setTypeId] = React.useState("");
  const [recoCodes, setRecoCodes] = React.useState("");
  const [evidenceTypes, setEvidenceTypes] = React.useState<EvidenceType[]>([]);

  const [showUploadDialog, setShowUploadDialog] = React.useState(false);

  const [showValidateDialog, setShowValidateDialog] = React.useState(false);
  const [validateTarget, setValidateTarget] = React.useState<{ id: string; action: "accept" | "reject" } | null>(null);
  const [validateReason, setValidateReason] = React.useState("");
  const [isValidating, setIsValidating] = React.useState(false);

  // Pre-fill from query
  const qActionId = searchParams.get("actionId");
  const qRecoId = searchParams.get("recommendationId");

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  React.useEffect(() => {
    fetch("/api/admin/referentials?type=all")
      .then((r) => r.json())
      .then((data) => setEvidenceTypes(data.evidenceTypes ?? []))
      .catch(console.error);
  }, []);

  const fetchEvidences = React.useCallback(() => {
    const params = new URLSearchParams();
    const statusCode = STATUS_TAB_MAP[activeTab];
    if (statusCode) params.set("statusCode", statusCode);
    if (qActionId) params.set("actionId", qActionId);
    if (qRecoId) params.set("recommendationId", qRecoId);

    setIsLoading(true);
    fetch(`/api/evidences?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => setEvidences(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [activeTab, qActionId, qRecoId]);

  React.useEffect(() => {
    fetchEvidences();
  }, [fetchEvidences]);

  const filteredEvidences = React.useMemo(() => {
    let data = [...evidences];
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      data = data.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.recommendation?.code?.toLowerCase().includes(q) ||
          e.action?.title?.toLowerCase().includes(q)
      );
    }
    return data;
  }, [evidences, debouncedSearch]);

  async function handleValidate() {
    if (!validateTarget) return;
    setIsValidating(true);
    try {
      const body: Record<string, unknown> = { action: validateTarget.action };
      if (validateTarget.action === "reject") body.reason = validateReason;
      else body.comment = validateReason;

      const res = await fetch(`/api/evidences/${validateTarget.id}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowValidateDialog(false);
        setValidateTarget(null);
        setValidateReason("");
        fetchEvidences();
      }
    } finally {
      setIsValidating(false);
    }
  }

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "Toutes" },
    { key: "pending", label: "En attente de révision" },
    { key: "accepted", label: "Acceptées" },
    { key: "rejected", label: "Rejetées" },
  ];

  const columns: ColumnDef<Evidence>[] = [
    {
      key: "title",
      header: "Titre",
      render: (row) => (
        <span className="font-medium text-sm">{row.title}</span>
      ),
    },
    {
      key: "recommendation",
      header: "Recommandation",
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-primary">
          {row.recommendation?.code ?? "—"}
        </span>
      ),
    },
    {
      key: "action",
      header: "Action",
      render: (row) => (
        <span className="text-xs text-muted-foreground truncate max-w-[180px] block" title={row.action?.title}>
          {row.action?.title ?? "—"}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type de preuve",
      render: (row) =>
        row.evidenceType ? (
          <Badge variant="outline" className="text-xs">
            {row.evidenceType.label}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "depositor",
      header: "Déposant",
      render: (row) =>
        row.depositor ? (
          <span className="text-xs">
            {row.depositor.firstName} {row.depositor.lastName}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "createdAt",
      header: "Date dépôt",
      render: (row) => (
        <span className="text-xs text-muted-foreground">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      key: "statusCode",
      header: "Statut",
      render: (row) => (
        <StatusBadge
          code={row.statusCode}
          label={STATUS_LABELS[row.statusCode] ?? row.statusCode}
        />
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
            title="Voir"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/evidences/${row.id}`);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {row.statusCode === "IN_REVIEW" || row.statusCode === "DEPOSITED" ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-emerald-600 hover:text-emerald-700"
                title="Accepter"
                onClick={(e) => {
                  e.stopPropagation();
                  setValidateTarget({ id: row.id, action: "accept" });
                  setShowValidateDialog(true);
                }}
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600 hover:text-red-700"
                title="Rejeter"
                onClick={(e) => {
                  e.stopPropagation();
                  setValidateTarget({ id: row.id, action: "reject" });
                  setShowValidateDialog(true);
                }}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </>
          ) : null}
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
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Preuves</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gestion et validation des preuves de mise en œuvre
            </p>
          </div>
          <Button onClick={() => setShowUploadDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle preuve
          </Button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
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
                  placeholder="Rechercher une preuve..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select
                value={typeId}
                onValueChange={(v) => setTypeId(v === "all" ? "" : v)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Type de preuve" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  {evidenceTypes.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setSearch("");
                  setTypeId("");
                  setRecoCodes("");
                }}
                title="Réinitialiser"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredEvidences}
            isLoading={isLoading}
            emptyMessage="Aucune preuve trouvée"
            getRowKey={(row) => row.id}
          />
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Déposer une preuve</DialogTitle>
          </DialogHeader>
          <EvidenceUploadForm
            recommendationId={qRecoId ?? undefined}
            actionId={qActionId ?? undefined}
            onSuccess={() => {
              setShowUploadDialog(false);
              fetchEvidences();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Validate/Reject Dialog */}
      <Dialog open={showValidateDialog} onOpenChange={setShowValidateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {validateTarget?.action === "accept" ? "Accepter la preuve" : "Rejeter la preuve"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>
                {validateTarget?.action === "reject"
                  ? "Motif de rejet (obligatoire)"
                  : "Commentaire (optionnel)"}
              </Label>
              <Textarea
                placeholder={
                  validateTarget?.action === "reject"
                    ? "Expliquer le motif du rejet..."
                    : "Commentaire optionnel..."
                }
                value={validateReason}
                onChange={(e) => setValidateReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowValidateDialog(false);
                setValidateTarget(null);
                setValidateReason("");
              }}
            >
              Annuler
            </Button>
            <Button
              variant={validateTarget?.action === "reject" ? "destructive" : "default"}
              onClick={handleValidate}
              disabled={
                isValidating ||
                (validateTarget?.action === "reject" && !validateReason.trim())
              }
            >
              {isValidating
                ? "En cours..."
                : validateTarget?.action === "accept"
                ? "Accepter"
                : "Rejeter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

export default function EvidencesPage() {
  return (
    <React.Suspense
      fallback={
        <AppLayout>
          <div className="p-8 text-center text-muted-foreground">Chargement...</div>
        </AppLayout>
      }
    >
      <EvidencesPageContent />
    </React.Suspense>
  );
}

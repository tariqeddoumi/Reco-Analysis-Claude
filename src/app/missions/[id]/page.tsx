"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/badges/StatusBadge";
import { WorkflowTimeline } from "@/components/workflow/WorkflowTimeline";
import { DataTable, ColumnDef } from "@/components/tables/DataTable";
import { PriorityBadge } from "@/components/badges/PriorityBadge";
import { TemporalBadge } from "@/components/badges/TemporalBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatDateTime, getTemporalStatus, getDaysRemaining } from "@/lib/utils";
import {
  ChevronRight,
  Home,
  Pencil,
  FileText,
  Paperclip,
  History,
  ClipboardList,
  Building2,
  User,
  Calendar,
  Shield,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  Trash2,
} from "lucide-react";
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
import type { TemporalStatus } from "@/types";

interface MissionDetail {
  id: string;
  reference: string;
  title: string;
  description?: string;
  observations?: string;
  scope?: string;
  periodCovered?: string;
  issuingAuthority?: string;
  startDate?: string | null;
  endDate?: string | null;
  reportReceivedAt?: string | null;
  reportValidatedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  missionType?: { code: string; label: string };
  source?: { code: string; label: string };
  entity?: { code: string; label: string };
  status?: { code: string; label: string; color?: string | null };
  confidentialityLevel?: { code: string; label: string; color?: string | null };
  responsible?: { firstName: string; lastName: string; email?: string };
  _count?: { recommendations: number };
}

interface RecommendationRow {
  id: string;
  code: string;
  recommendation: string;
  initialDueDate?: string | null;
  revisedDueDate?: string | null;
  closedAt?: string | null;
  progressRate: number;
  isRegulator: boolean;
  status?: { code: string; label: string; color?: string | null };
  priority?: { code: string; label: string; color?: string | null } | null;
  finalCriticality?: number | null;
  owner?: { firstName: string; lastName: string } | null;
}

interface Attachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  uploader?: { firstName: string; lastName: string };
}

interface HistoryEntry {
  id: string;
  fromStatus?: { code: string; label: string; color?: string | null } | null;
  toStatus: { code: string; label: string; color?: string | null };
  changedBy?: { firstName: string; lastName: string } | null;
  createdAt: string;
  comment?: string | null;
  action?: string | null;
}

interface MissionStats {
  total: number;
  open: number;
  closed: number;
  overdue: number;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-2 py-2.5 border-b border-border last:border-0">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-sm text-foreground">{value ?? "—"}</span>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, colorClass }: { icon: React.ElementType; label: string; value: number; colorClass: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-4">
      <div className={`rounded-full p-2 ${colorClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export default function MissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [mission, setMission] = React.useState<MissionDetail | null>(null);
  const [recommendations, setRecommendations] = React.useState<RecommendationRow[]>([]);
  const [attachments, setAttachments] = React.useState<Attachment[]>([]);
  const [history, setHistory] = React.useState<HistoryEntry[]>([]);
  const [stats, setStats] = React.useState<MissionStats>({ total: 0, open: 0, closed: 0, overdue: 0 });
  const [isLoading, setIsLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState("informations");
  const [deletingRecoId, setDeletingRecoId] = React.useState<string | null>(null);

  const handleDeleteReco = async (recoId: string) => {
    setDeletingRecoId(recoId);
    try {
      const res = await fetch(`/api/recommendations/${recoId}`, { method: "DELETE" });
      if (res.ok) {
        setRecommendations((prev) => prev.filter((r) => r.id !== recoId));
        setStats((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
      }
    } finally {
      setDeletingRecoId(null);
    }
  };

  React.useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    Promise.all([
      fetch(`/api/missions/${id}`).then((r) => r.json()),
      fetch(`/api/recommendations?missionId=${id}&pageSize=100`).then((r) => r.json()),
      fetch(`/api/missions/${id}/history`).then((r) => r.json()).catch(() => ({ data: [] })),
    ])
      .then(([missionData, recoData, histData]) => {
        setMission(missionData);
        const recos: RecommendationRow[] = recoData.data ?? [];
        setRecommendations(recos);
        setHistory(histData.data ?? []);

        // Compute stats
        const now = new Date();
        const open = recos.filter((r) => !["CLOSED", "CANCELLED"].includes(r.status?.code ?? "")).length;
        const closed = recos.filter((r) => ["CLOSED"].includes(r.status?.code ?? "")).length;
        const overdue = recos.filter((r) => {
          const dueDate = r.revisedDueDate ?? r.initialDueDate;
          return !r.closedAt && dueDate && new Date(dueDate) < now;
        }).length;
        setStats({ total: recos.length, open, closed, overdue });
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [id]);

  const recoColumns: ColumnDef<RecommendationRow>[] = [
    {
      key: "code",
      header: "Code",
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-primary">{row.code}</span>
      ),
    },
    {
      key: "recommendation",
      header: "Recommandation",
      className: "max-w-[260px]",
      render: (row) => (
        <span className="text-sm block truncate" title={row.recommendation}>
          {row.recommendation}
        </span>
      ),
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
      key: "priority",
      header: "Priorité",
      render: (row) =>
        row.priority ? (
          <PriorityBadge code={row.priority.code} label={row.priority.label} showIcon />
        ) : <span className="text-muted-foreground text-xs">—</span>,
    },
    {
      key: "progressRate",
      header: "Avancement",
      render: (row) => (
        <div className="flex items-center gap-2 min-w-[100px]">
          <Progress value={row.progressRate} className="h-1.5 flex-1" />
          <span className="text-xs font-medium w-8 text-right">{row.progressRate}%</span>
        </div>
      ),
    },
    {
      key: "dueDate",
      header: "Échéance",
      render: (row) => {
        const dueDate = row.revisedDueDate ?? row.initialDueDate;
        const tStatus = getTemporalStatus(dueDate, row.closedAt) as TemporalStatus;
        const days = getDaysRemaining(dueDate);
        return <TemporalBadge status={tStatus} daysRemaining={days} showIcon />;
      },
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      headerClassName: "text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Voir le détail"
            onClick={(e) => { e.stopPropagation(); router.push(`/recommendations/${row.id}`); }}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Modifier"
            onClick={(e) => { e.stopPropagation(); router.push(`/recommendations/${row.id}/edit`); }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                title="Supprimer"
                disabled={deletingRecoId === row.id}
                onClick={(e) => e.stopPropagation()}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer cette recommandation ?</AlertDialogTitle>
                <AlertDialogDescription>
                  La recommandation « {row.code} » et tous ses plans/actions seront archivés. Cette opération est irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => { e.stopPropagation(); handleDeleteReco(row.id); }}
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

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!mission) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-24">
          <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-lg font-semibold">Mission introuvable</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push("/missions")}>
            Retour aux missions
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <button onClick={() => router.push("/")} className="flex items-center gap-1 hover:text-foreground transition-colors">
            <Home className="h-3.5 w-3.5" />
            Dashboard
          </button>
          <ChevronRight className="h-3.5 w-3.5" />
          <button onClick={() => router.push("/missions")} className="hover:text-foreground transition-colors">
            Missions
          </button>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground font-mono">{mission.reference}</span>
        </nav>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-md border border-primary/20">
                {mission.reference}
              </span>
              {mission.status && (
                <StatusBadge
                  code={mission.status.code}
                  label={mission.status.label}
                  color={mission.status.color}
                />
              )}
              {mission.confidentialityLevel && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Shield className="h-3 w-3" />
                  {mission.confidentialityLevel.label}
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{mission.title}</h1>
          </div>
          <Button
            variant="outline"
            className="gap-2 shrink-0"
            onClick={() => router.push(`/missions/${id}/edit`)}
          >
            <Pencil className="h-4 w-4" />
            Modifier
          </Button>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Details card */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />
                Détails de la mission
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              <DetailRow label="Type" value={mission.missionType?.label} />
              <DetailRow label="Source" value={mission.source?.label} />
              <DetailRow label="Entité" value={mission.entity?.label} />
              <DetailRow label="Autorité émettrice" value={mission.issuingAuthority} />
              <DetailRow label="Périmètre" value={mission.scope} />
              <DetailRow label="Période couverte" value={mission.periodCovered} />
              <DetailRow
                label="Responsable"
                value={
                  mission.responsible
                    ? `${mission.responsible.firstName} ${mission.responsible.lastName}`
                    : undefined
                }
              />
              <DetailRow label="Date début" value={formatDate(mission.startDate)} />
              <DetailRow label="Date fin" value={formatDate(mission.endDate)} />
              <DetailRow label="Rapport reçu le" value={formatDate(mission.reportReceivedAt)} />
              <DetailRow label="Rapport validé le" value={formatDate(mission.reportValidatedAt)} />
              <DetailRow label="Créée le" value={formatDateTime(mission.createdAt)} />
            </CardContent>
          </Card>

          {/* Right: Stats */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Recommandations</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <StatCard icon={ClipboardList} label="Total" value={stats.total} colorClass="bg-primary/10 text-primary" />
                <StatCard icon={Clock} label="Ouvertes" value={stats.open} colorClass="bg-blue-100 text-blue-700" />
                <StatCard icon={CheckCircle2} label="Clôturées" value={stats.closed} colorClass="bg-emerald-100 text-emerald-700" />
                <StatCard icon={AlertCircle} label="En retard" value={stats.overdue} colorClass="bg-red-100 text-red-700" />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="border-b border-border bg-transparent rounded-none h-auto p-0 gap-0">
            {[
              { value: "informations", label: "Informations", icon: FileText },
              { value: "recommandations", label: `Recommandations (${stats.total})`, icon: ClipboardList },
              { value: "pieces-jointes", label: "Pièces jointes", icon: Paperclip },
              { value: "historique", label: "Historique", icon: History },
            ].map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2.5 text-sm font-medium gap-2"
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Informations tab */}
          <TabsContent value="informations" className="mt-6">
            <Card>
              <CardContent className="pt-6 space-y-6">
                {mission.description && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Description</h3>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{mission.description}</p>
                  </div>
                )}
                {mission.observations && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Observations</h3>
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{mission.observations}</p>
                    </div>
                  </>
                )}
                {!mission.description && !mission.observations && (
                  <p className="text-sm text-muted-foreground text-center py-8">Aucune information complémentaire.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recommandations tab */}
          <TabsContent value="recommandations" className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {recommendations.length} recommandation{recommendations.length !== 1 ? "s" : ""} liée{recommendations.length !== 1 ? "s" : ""} à cette mission
              </p>
              <Button
                size="sm"
                onClick={() => router.push(`/recommendations/new?missionId=${id}`)}
              >
                <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
                Nouvelle recommandation
              </Button>
            </div>
            <DataTable
              columns={recoColumns}
              data={recommendations}
              isLoading={false}
              emptyMessage="Aucune recommandation liée à cette mission"
              onRowClick={(row) => router.push(`/recommendations/${row.id}`)}
              getRowKey={(row) => row.id}
            />
          </TabsContent>

          {/* Pièces jointes tab */}
          <TabsContent value="pieces-jointes" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                {attachments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="rounded-full bg-muted p-4 mb-3">
                      <Paperclip className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">Aucune pièce jointe</p>
                    <p className="text-xs text-muted-foreground mt-1">Les documents liés à cette mission apparaîtront ici.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {attachments.map((att) => (
                      <li key={att.id} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <Paperclip className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{att.fileName}</p>
                            <p className="text-xs text-muted-foreground">
                              {att.uploader ? `${att.uploader.firstName} ${att.uploader.lastName}` : "—"} · {formatDate(att.createdAt)}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">Télécharger</Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Historique tab */}
          <TabsContent value="historique" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <WorkflowTimeline history={history} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

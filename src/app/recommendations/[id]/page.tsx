"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/badges/StatusBadge";
import { PriorityBadge } from "@/components/badges/PriorityBadge";
import { TemporalBadge } from "@/components/badges/TemporalBadge";
import { WorkflowTimeline } from "@/components/workflow/WorkflowTimeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  formatDate,
  formatDateTime,
  getTemporalStatus,
  getDaysRemaining,
  cn,
} from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { TemporalStatus } from "@/types";
import {
  ChevronRight,
  Home,
  Pencil,
  Shield,
  AlertCircle,
  Info,
  BarChart2,
  ListChecks,
  FileCheck,
  MessageSquare,
  History,
  GitBranch,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  CalendarClock,
  User,
  Building2,
  Send,
  ThumbsUp,
  ThumbsDown,
  Plus,
} from "lucide-react";

/* ─────────────────────────── Types ─────────────────────────── */

interface Impact {
  label: string;
  value: number | null | undefined;
  key: string;
}

interface ActionPlan {
  id: string;
  title: string;
  progressRate: number;
  weight: number;
  plannedEndAt?: string | null;
  actualEndAt?: string | null;
  status?: { code: string; label: string; color?: string | null };
  responsible?: { firstName: string; lastName: string } | null;
  actions?: SubAction[];
}

interface SubAction {
  id: string;
  title: string;
  progressRate: number;
  status?: { code: string; label: string; color?: string | null };
  responsible?: { firstName: string; lastName: string } | null;
  plannedEndAt?: string | null;
}

interface Evidence {
  id: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  comment?: string | null;
  depositedAt: string;
  status?: { code: string; label: string; color?: string | null };
  depositor?: { firstName: string; lastName: string } | null;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author?: { firstName: string; lastName: string } | null;
}

interface HistoryEntry {
  id?: string;
  fromStatus?: { code: string; label: string; color?: string | null } | null;
  toStatus: { code: string; label: string; color?: string | null };
  changedBy?: { firstName: string; lastName: string } | null;
  createdAt: string;
  comment?: string | null;
  action?: string | null;
}

interface WorkflowStep {
  id: string;
  name: string;
  order: number;
  isCurrent: boolean;
  isCompleted: boolean;
  completedAt?: string | null;
  actor?: { firstName: string; lastName: string } | null;
}

interface RecommendationDetail {
  id: string;
  code: string;
  recommendation: string;
  findingDescription: string;
  rootCause?: string | null;
  potentialConsequence?: string | null;
  reportReference?: string | null;
  pageReference?: string | null;
  issuedAt: string;
  initialDueDate?: string | null;
  revisedDueDate?: string | null;
  closedAt?: string | null;
  progressRate: number;
  isRegulator: boolean;
  isRecurrent: boolean;
  finalCriticality?: number | null;
  financialImpact?: number | null;
  regulatoryImpact?: number | null;
  reputationalImpact?: number | null;
  operationalImpact?: number | null;
  clientImpact?: number | null;
  siImpact?: number | null;
  legalImpact?: number | null;
  complianceImpact?: number | null;
  entityComment?: string | null;
  mission?: { id: string; reference: string; title: string };
  source?: { code: string; label: string };
  entity?: { code: string; label: string };
  direction?: { label: string } | null;
  process?: { label: string } | null;
  riskType?: { label: string } | null;
  recommendationType?: { label: string } | null;
  rootCauseType?: { label: string } | null;
  status?: { code: string; label: string; color?: string | null };
  priority?: { code: string; label: string; color?: string | null } | null;
  severity?: { numericValue: number; label: string } | null;
  probability?: { numericValue: number; label: string } | null;
  owner?: { firstName: string; lastName: string } | null;
  operationalResponsible?: { firstName: string; lastName: string } | null;
  confidentialityLevel?: { label: string } | null;
  actionPlans?: ActionPlan[];
  evidences?: Evidence[];
  comments?: Comment[];
  statusHistory?: HistoryEntry[];
  workflowSteps?: WorkflowStep[];
}

/* ─────────────────────────── Sub-components ─────────────────────────── */

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-5 gap-2 py-2.5 border-b border-border last:border-0">
      <span className="col-span-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="col-span-3 text-sm text-foreground">{value ?? "—"}</span>
    </div>
  );
}

function ImpactCell({ value }: { value: number | null | undefined }) {
  if (!value) return <span className="text-muted-foreground text-xs">—</span>;
  const colors: Record<number, string> = {
    1: "bg-emerald-100 text-emerald-800 border-emerald-200",
    2: "bg-yellow-100 text-yellow-800 border-yellow-200",
    3: "bg-amber-100 text-amber-800 border-amber-200",
    4: "bg-orange-100 text-orange-800 border-orange-300",
    5: "bg-red-100 text-red-800 border-red-300",
  };
  return (
    <span className={cn(
      "inline-flex items-center justify-center h-7 w-7 rounded-full border text-xs font-bold",
      colors[value] ?? "bg-slate-100 text-slate-700 border-slate-200"
    )}>
      {value}
    </span>
  );
}

function RiskMatrix({ severity, probability }: { severity?: number; probability?: number }) {
  const size = 5;
  if (!severity || !probability) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        Données de risque insuffisantes
      </div>
    );
  }

  const getCellColor = (s: number, p: number) => {
    const score = s * p;
    if (score > 20) return "bg-red-500";
    if (score >= 16) return "bg-orange-400";
    if (score >= 11) return "bg-amber-400";
    if (score >= 6) return "bg-yellow-300";
    return "bg-emerald-300";
  };

  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs text-muted-foreground text-center mb-2">Matrice Impact × Probabilité</p>
      <div className="relative">
        <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
          {Array.from({ length: size }, (_, pi) =>
            Array.from({ length: size }, (_, si) => {
              const s = si + 1;
              const p = size - pi;
              const isActive = s === severity && p === probability;
              return (
                <div
                  key={`${s}-${p}`}
                  className={cn(
                    "aspect-square rounded-sm transition-all",
                    getCellColor(s, p),
                    isActive ? "ring-2 ring-offset-1 ring-primary scale-110 z-10" : "opacity-60"
                  )}
                />
              );
            })
          )}
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground px-0.5">
          <span>Faible</span>
          <span className="font-medium">Sévérité →</span>
          <span>Élevée</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Main component ─────────────────────────── */

export default function RecommendationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [rec, setRec] = React.useState<RecommendationDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState("informations");
  const [newComment, setNewComment] = React.useState("");
  const [isSubmittingComment, setIsSubmittingComment] = React.useState(false);
  const [showActionPlanDialog, setShowActionPlanDialog] = React.useState(false);
  const [actionPlanForm, setActionPlanForm] = React.useState({ title: "", description: "" });
  const [isSubmittingActionPlan, setIsSubmittingActionPlan] = React.useState(false);
  const [actionPlanError, setActionPlanError] = React.useState<string | null>(null);

  const fetchData = React.useCallback(() => {
    if (!id) return;
    setIsLoading(true);
    fetch(`/api/recommendations/${id}`)
      .then((r) => r.json())
      .then(setRec)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [id]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  const handleAddComment = async () => {
    if (!newComment.trim() || !id) return;
    setIsSubmittingComment(true);
    try {
      await fetch(`/api/recommendations/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment }),
      });
      setNewComment("");
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleCreateActionPlan = async () => {
    if (!actionPlanForm.title.trim() || !id) return;
    setIsSubmittingActionPlan(true);
    setActionPlanError(null);
    try {
      const res = await fetch("/api/action-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recommendationId: id, title: actionPlanForm.title, description: actionPlanForm.description }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Erreur lors de la création");
      }
      setShowActionPlanDialog(false);
      setActionPlanForm({ title: "", description: "" });
      fetchData();
    } catch (err) {
      setActionPlanError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsSubmittingActionPlan(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!rec) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-24">
          <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-lg font-semibold">Recommandation introuvable</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push("/recommendations")}>
            Retour aux recommandations
          </Button>
        </div>
      </AppLayout>
    );
  }

  const dueDate = rec.revisedDueDate ?? rec.initialDueDate;
  const temporalStatus = getTemporalStatus(dueDate, rec.closedAt) as TemporalStatus;
  const daysRemaining = getDaysRemaining(dueDate);

  const impacts: Impact[] = [
    { label: "Réglementaire", key: "regulatory", value: rec.regulatoryImpact },
    { label: "Réputationnel", key: "reputational", value: rec.reputationalImpact },
    { label: "Opérationnel", key: "operational", value: rec.operationalImpact },
    { label: "Client", key: "client", value: rec.clientImpact },
    { label: "SI", key: "si", value: rec.siImpact },
    { label: "Juridique", key: "legal", value: rec.legalImpact },
    { label: "Conformité", key: "compliance", value: rec.complianceImpact },
  ];

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
          <button onClick={() => router.push("/recommendations")} className="hover:text-foreground transition-colors">
            Recommandations
          </button>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground font-mono">{rec.code}</span>
        </nav>

        {/* Header */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-md border border-primary/20">
              {rec.code}
            </span>
            {rec.status && (
              <StatusBadge code={rec.status.code} label={rec.status.label} color={rec.status.color} />
            )}
            {rec.priority && (
              <PriorityBadge code={rec.priority.code} label={rec.priority.label} showIcon />
            )}
            <TemporalBadge status={temporalStatus} daysRemaining={daysRemaining} showIcon />
            {rec.isRegulator && (
              <Badge className="bg-purple-100 text-purple-800 border-purple-200 gap-1 text-xs font-semibold">
                <Shield className="h-3 w-3" />
                Régulateur
              </Badge>
            )}
            {rec.isRecurrent && (
              <Badge variant="outline" className="gap-1 text-xs">
                <RefreshCw className="h-3 w-3" />
                Récurrente
              </Badge>
            )}
          </div>

          <h1 className="text-xl font-bold tracking-tight text-foreground leading-snug max-w-4xl">
            {rec.recommendation}
          </h1>

          {/* Action toolbar */}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => router.push(`/recommendations/${id}/edit`)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Modifier
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <RefreshCw className="h-3.5 w-3.5" />
              Changer le statut
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <CalendarClock className="h-3.5 w-3.5" />
              Demander une extension
            </Button>
            <Button variant="outline" size="sm" className="gap-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Proposer la clôture
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
          <div className="flex-1">
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>Avancement global</span>
              <span className="font-semibold text-foreground">{rec.progressRate}%</span>
            </div>
            <Progress value={rec.progressRate} className="h-2" />
          </div>
          {rec.finalCriticality != null && (
            <div className="text-center pl-4 border-l border-border">
              <p className="text-2xl font-bold text-foreground">{rec.finalCriticality.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Criticité</p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="border-b border-border bg-transparent rounded-none h-auto p-0 gap-0 w-full overflow-x-auto flex-nowrap">
            {[
              { value: "informations", label: "Informations", icon: Info },
              { value: "risque", label: "Qualification Risque", icon: BarChart2 },
              { value: "plan-action", label: `Plan d'action (${rec.actionPlans?.length ?? 0})`, icon: ListChecks },
              { value: "preuves", label: `Preuves (${rec.evidences?.length ?? 0})`, icon: FileCheck },
              { value: "commentaires", label: `Commentaires (${rec.comments?.length ?? 0})`, icon: MessageSquare },
              { value: "historique", label: "Historique", icon: History },
              { value: "workflow", label: "Workflow", icon: GitBranch },
            ].map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2.5 text-sm font-medium gap-1.5 whitespace-nowrap"
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── Informations ── */}
          <TabsContent value="informations" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Info className="h-4 w-4 text-primary" />
                    Identification
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DetailRow label="Mission" value={rec.mission ? (
                    <button
                      onClick={() => router.push(`/missions/${rec.mission!.id}`)}
                      className="font-mono text-xs text-primary hover:underline"
                    >
                      {rec.mission.reference}
                    </button>
                  ) : undefined} />
                  <DetailRow label="Source" value={rec.source?.label} />
                  <DetailRow label="Entité" value={rec.entity?.label} />
                  <DetailRow label="Direction" value={rec.direction?.label} />
                  <DetailRow label="Processus" value={rec.process?.label} />
                  <DetailRow label="Type risque" value={rec.riskType?.label} />
                  <DetailRow label="Type recommandation" value={rec.recommendationType?.label} />
                  <DetailRow label="Cause racine" value={rec.rootCauseType?.label} />
                  <DetailRow label="Réf. rapport" value={rec.reportReference} />
                  <DetailRow label="Réf. page" value={rec.pageReference} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    Responsabilités &amp; Dates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DetailRow label="Propriétaire" value={rec.owner ? `${rec.owner.firstName} ${rec.owner.lastName}` : undefined} />
                  <DetailRow label="Resp. opérationnel" value={rec.operationalResponsible ? `${rec.operationalResponsible.firstName} ${rec.operationalResponsible.lastName}` : undefined} />
                  <DetailRow label="Date d'émission" value={formatDate(rec.issuedAt)} />
                  <DetailRow label="Échéance initiale" value={formatDate(rec.initialDueDate)} />
                  <DetailRow label="Échéance révisée" value={formatDate(rec.revisedDueDate)} />
                  <DetailRow label="Date de clôture" value={formatDate(rec.closedAt)} />
                  <DetailRow label="Confidentialité" value={rec.confidentialityLevel?.label} />
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Constat &amp; Recommandation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Constat</h3>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{rec.findingDescription}</p>
                  </div>
                  {rec.rootCause && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Cause racine</h3>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{rec.rootCause}</p>
                      </div>
                    </>
                  )}
                  {rec.potentialConsequence && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Conséquence potentielle</h3>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{rec.potentialConsequence}</p>
                      </div>
                    </>
                  )}
                  <Separator />
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Recommandation</h3>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{rec.recommendation}</p>
                  </div>
                  {rec.entityComment && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Commentaire entité</h3>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{rec.entityComment}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Qualification Risque ── */}
          <TabsContent value="risque" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Matrix */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-primary" />
                    Matrice de risque
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <RiskMatrix
                    severity={rec.severity?.numericValue}
                    probability={rec.probability?.numericValue}
                  />
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Sévérité</span>
                      <span className="font-semibold">{rec.severity ? `${rec.severity.numericValue} — ${rec.severity.label}` : "—"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Probabilité</span>
                      <span className="font-semibold">{rec.probability ? `${rec.probability.numericValue} — ${rec.probability.label}` : "—"}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-sm font-semibold">
                      <span className="text-muted-foreground">Score brut</span>
                      <span className="text-lg font-bold text-foreground">
                        {rec.severity && rec.probability
                          ? rec.severity.numericValue * rec.probability.numericValue
                          : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold">
                      <span className="text-muted-foreground">Criticité finale</span>
                      <span className="text-lg font-bold text-primary">
                        {rec.finalCriticality?.toFixed(2) ?? "—"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Impacts */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Matrice d&apos;impact</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {impacts.map((imp) => (
                      <div key={imp.key} className="flex items-center justify-between gap-4">
                        <span className="text-sm text-muted-foreground w-32">{imp.label}</span>
                        <div className="flex items-center gap-2 flex-1">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((v) => (
                              <div
                                key={v}
                                className={cn(
                                  "h-5 w-5 rounded-sm",
                                  imp.value != null && v <= imp.value
                                    ? v >= 4 ? "bg-red-400" : v === 3 ? "bg-amber-400" : "bg-emerald-400"
                                    : "bg-muted"
                                )}
                              />
                            ))}
                          </div>
                          <ImpactCell value={imp.value} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {rec.financialImpact != null && (
                    <>
                      <Separator className="my-4" />
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Impact financier estimé</span>
                        <span className="text-sm font-semibold">
                          {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(rec.financialImpact)}
                        </span>
                      </div>
                    </>
                  )}

                  <Separator className="my-4" />
                  <div className="flex flex-wrap gap-3">
                    {rec.isRegulator && (
                      <Badge className="bg-purple-100 text-purple-800 border-purple-200 gap-1">
                        <Shield className="h-3 w-3" /> Exigence réglementaire
                      </Badge>
                    )}
                    {rec.isRecurrent && (
                      <Badge variant="outline" className="gap-1">
                        <RefreshCw className="h-3 w-3" /> Recommandation récurrente (+20% criticité)
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Plan d'action ── */}
          <TabsContent value="plan-action" className="mt-6">
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button size="sm" className="gap-1.5" onClick={() => { setActionPlanError(null); setShowActionPlanDialog(true); }}>
                  <Plus className="h-4 w-4" />Ajouter un plan d&apos;action
                </Button>
              </div>
              {(!rec.actionPlans || rec.actionPlans.length === 0) ? (
                <div className="flex flex-col items-center justify-center py-16 text-center border border-border rounded-lg bg-card">
                  <ListChecks className="h-8 w-8 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium">Aucun plan d&apos;action</p>
                  <p className="text-xs text-muted-foreground mt-1">Cliquez sur &quot;Ajouter un plan d&apos;action&quot; pour commencer.</p>
                </div>
              ) : rec.actionPlans.map((plan) => (
                <Card key={plan.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{plan.title}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          {plan.status && (
                            <StatusBadge code={plan.status.code} label={plan.status.label} color={plan.status.color} />
                          )}
                          {plan.responsible && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {plan.responsible.firstName} {plan.responsible.lastName}
                            </span>
                          )}
                          {plan.plannedEndAt && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(plan.plannedEndAt)}
                            </span>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            Poids: {plan.weight}%
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold">{plan.progressRate}%</p>
                      </div>
                    </div>
                    <Progress value={plan.progressRate} className="h-1.5 mt-2" />
                  </CardHeader>

                  {plan.actions && plan.actions.length > 0 && (
                    <CardContent className="pt-0 pb-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Sous-actions
                      </p>
                      <div className="space-y-2">
                        {plan.actions.map((action) => (
                          <div key={action.id} className="flex items-center gap-3 rounded-md border border-border bg-muted/30 p-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{action.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {action.status && (
                                  <StatusBadge code={action.status.code} label={action.status.label} color={action.status.color} />
                                )}
                                {action.responsible && (
                                  <span className="text-xs text-muted-foreground">
                                    {action.responsible.firstName} {action.responsible.lastName}
                                  </span>
                                )}
                                {action.plannedEndAt && (
                                  <span className="text-xs text-muted-foreground">{formatDate(action.plannedEndAt)}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Progress value={action.progressRate} className="h-1.5 w-16" />
                              <span className="text-xs font-medium w-8 text-right">{action.progressRate}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── Preuves ── */}
          <TabsContent value="preuves" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                {(!rec.evidences || rec.evidences.length === 0) ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileCheck className="h-8 w-8 text-muted-foreground mb-3" />
                    <p className="text-sm font-medium">Aucune preuve déposée</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Les preuves de mise en œuvre apparaîtront ici.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {rec.evidences.map((ev) => (
                      <div key={ev.id} className="py-4 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <FileCheck className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{ev.fileName}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              {ev.status && (
                                <StatusBadge code={ev.status.code} label={ev.status.label} color={ev.status.color} />
                              )}
                              {ev.depositor && (
                                <span className="text-xs text-muted-foreground">
                                  {ev.depositor.firstName} {ev.depositor.lastName}
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {formatDate(ev.depositedAt)}
                              </span>
                            </div>
                            {ev.comment && (
                              <p className="text-xs text-muted-foreground mt-1 italic">{ev.comment}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                            <ThumbsUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50">
                            <ThumbsDown className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Commentaires ── */}
          <TabsContent value="commentaires" className="mt-6">
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-5">
                  <div className="flex gap-3">
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Ajouter un commentaire..."
                      rows={3}
                      className="flex-1"
                    />
                    <Button
                      className="self-end gap-2"
                      disabled={!newComment.trim() || isSubmittingComment}
                      onClick={handleAddComment}
                    >
                      <Send className="h-4 w-4" />
                      Envoyer
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <ScrollArea className="h-[500px] pr-2">
                <div className="space-y-3">
                  {(!rec.comments || rec.comments.length === 0) ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <MessageSquare className="h-7 w-7 text-muted-foreground mb-3" />
                      <p className="text-sm font-medium">Aucun commentaire</p>
                    </div>
                  ) : rec.comments.map((c) => (
                    <div key={c.id} className="rounded-lg border border-border bg-card p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {c.author ? `${c.author.firstName[0]}${c.author.lastName[0]}` : "?"}
                        </div>
                        <div>
                          <p className="text-xs font-semibold">
                            {c.author ? `${c.author.firstName} ${c.author.lastName}` : "Utilisateur inconnu"}
                          </p>
                          <p className="text-xs text-muted-foreground">{formatDateTime(c.createdAt)}</p>
                        </div>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{c.content}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          {/* ── Historique ── */}
          <TabsContent value="historique" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <WorkflowTimeline history={rec.statusHistory ?? []} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Workflow ── */}
          <TabsContent value="workflow" className="mt-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-primary" />
                  Chaîne de validation
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(!rec.workflowSteps || rec.workflowSteps.length === 0) ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <GitBranch className="h-8 w-8 text-muted-foreground mb-3" />
                    <p className="text-sm font-medium">Aucune étape de workflow définie</p>
                  </div>
                ) : (
                  <ol className="relative border-l border-border ml-4 space-y-0">
                    {rec.workflowSteps.map((step, index) => (
                      <li key={step.id} className="mb-6 ml-6 last:mb-0">
                        <span className={cn(
                          "absolute -left-3.5 flex h-7 w-7 items-center justify-center rounded-full border-2 shadow-sm text-xs font-bold",
                          step.isCurrent
                            ? "bg-primary text-primary-foreground border-primary"
                            : step.isCompleted
                            ? "bg-emerald-500 text-white border-emerald-400"
                            : "bg-background border-border text-muted-foreground"
                        )}>
                          {step.isCompleted ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                        </span>
                        <div className={cn(
                          "rounded-lg border p-4",
                          step.isCurrent ? "border-primary bg-primary/5" : "border-border bg-card"
                        )}>
                          <div className="flex items-center justify-between gap-2">
                            <p className={cn(
                              "text-sm font-semibold",
                              step.isCurrent ? "text-primary" : "text-foreground"
                            )}>
                              {step.name}
                            </p>
                            {step.isCurrent && (
                              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                                Étape actuelle
                              </Badge>
                            )}
                            {step.isCompleted && !step.isCurrent && (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">
                                Complété
                              </Badge>
                            )}
                          </div>
                          {(step.actor || step.completedAt) && (
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              {step.actor && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {step.actor.firstName} {step.actor.lastName}
                                </span>
                              )}
                              {step.completedAt && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDate(step.completedAt)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Dialog création plan d'action ── */}
      <Dialog open={showActionPlanDialog} onOpenChange={setShowActionPlanDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau plan d&apos;action</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {actionPlanError && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />{actionPlanError}
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Titre <span className="text-destructive">*</span>
              </Label>
              <Input
                value={actionPlanForm.title}
                onChange={(e) => setActionPlanForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Titre du plan d'action"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Description</Label>
              <Textarea
                value={actionPlanForm.description}
                onChange={(e) => setActionPlanForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Description du plan d'action (optionnel)"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActionPlanDialog(false)} disabled={isSubmittingActionPlan}>
              Annuler
            </Button>
            <Button onClick={handleCreateActionPlan} disabled={isSubmittingActionPlan || !actionPlanForm.title.trim()}>
              {isSubmittingActionPlan ? "Création..." : "Créer le plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

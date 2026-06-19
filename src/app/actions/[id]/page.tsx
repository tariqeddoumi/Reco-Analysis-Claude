"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/badges/StatusBadge";
import { TemporalBadge } from "@/components/badges/TemporalBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatDateTime, getTemporalStatus, getDaysRemaining } from "@/lib/utils";
import { TemporalStatus } from "@/types";
import {
  ChevronRight,
  User,
  Calendar,
  AlertCircle,
  FileText,
  MessageSquare,
  History,
  ArrowLeft,
  Paperclip,
  CheckCircle2,
  RefreshCw,
  Pencil,
  Trash2,
  XCircle,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";

interface Action {
  id: string;
  title: string;
  description: string | null;
  progressRate: number;
  priority: number;
  weight: number;
  plannedEndAt: string | null;
  actualEndAt: string | null;
  deliverable: string | null;
  complexity: string | null;
  blockReason: string | null;
  status: { code: string; label: string; color: string | null };
  responsible: { id: string; firstName: string; lastName: string } | null;
  actionPlan: {
    id: string;
    recommendation: {
      id: string;
      code: string;
      recommendation: string;
      entity: { label: string };
    };
  };
  evidences: Array<{
    id: string;
    title: string;
    description: string | null;
    statusCode: string;
    evidenceTypeId: string | null;
    evidenceType: { id: string; label: string } | null;
    depositor: { firstName: string; lastName: string } | null;
    depositedAt: string;
    createdAt: string;
    fileName: string | null;
    validatorComment: string | null;
    validatedAt: string | null;
  }>;
  comments: Array<{
    id: string;
    content: string;
    createdAt: string;
    author: { firstName: string; lastName: string } | null;
  }>;
  statusHistory: Array<{
    id: string;
    createdAt: string;
    comment: string | null;
    fromStatusAction: { code: string; label: string; color: string | null } | null;
    toStatusAction: { code: string; label: string; color: string | null } | null;
    changedBy: { firstName: string; lastName: string } | null;
  }>;
}

interface ActionStatus {
  id: string;
  code: string;
  label: string;
  color?: string | null;
}

export default function ActionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [action, setAction] = React.useState<Action | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [actionStatuses, setActionStatuses] = React.useState<ActionStatus[]>([]);
  const [evidenceTypes, setEvidenceTypes] = React.useState<{ id: string; label: string }[]>([]);

  // Evidence edit dialog
  const [editingEvidenceId, setEditingEvidenceId] = React.useState<string | null>(null);
  const [evidenceEditForm, setEvidenceEditForm] = React.useState({ title: "", description: "", evidenceTypeId: "" });
  const [isSavingEvidence, setIsSavingEvidence] = React.useState(false);

  // Evidence validate/reject dialog
  const [validateDialog, setValidateDialog] = React.useState<{ evidenceId: string; mode: "accept" | "reject" } | null>(null);
  const [validateComment, setValidateComment] = React.useState("");
  const [isValidating, setIsValidating] = React.useState(false);

  // Evidence delete
  const [deletingEvidenceId, setDeletingEvidenceId] = React.useState<string | null>(null);

  // Update progress dialog
  const [showProgressDialog, setShowProgressDialog] = React.useState(false);
  const [newProgress, setNewProgress] = React.useState(0);
  const [progressComment, setProgressComment] = React.useState("");
  const [isSavingProgress, setIsSavingProgress] = React.useState(false);

  // Change status dialog
  const [showStatusDialog, setShowStatusDialog] = React.useState(false);
  const [newStatusId, setNewStatusId] = React.useState("");
  const [statusComment, setStatusComment] = React.useState("");
  const [isSavingStatus, setIsSavingStatus] = React.useState(false);

  const fetchAction = React.useCallback(() => {
    setIsLoading(true);
    fetch(`/api/actions/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setAction(data);
          setNewProgress(data.progressRate);
        }
      })
      .catch(() => setError("Erreur lors du chargement"))
      .finally(() => setIsLoading(false));
  }, [id]);

  React.useEffect(() => {
    fetchAction();
  }, [fetchAction]);

  React.useEffect(() => {
    fetch("/api/admin/referentials?type=all")
      .then((r) => r.json())
      .then((data) => {
        setActionStatuses(data.actionStatuses ?? []);
        setEvidenceTypes(data.evidenceTypes ?? []);
      })
      .catch(console.error);
  }, []);

  async function handleProgressUpdate() {
    if (!action) return;
    setIsSavingProgress(true);
    try {
      const res = await fetch(`/api/actions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          progressRate: newProgress,
          ...(progressComment ? { comment: progressComment } : {}),
        }),
      });
      if (res.ok) {
        setShowProgressDialog(false);
        setProgressComment("");
        fetchAction();
      }
    } finally {
      setIsSavingProgress(false);
    }
  }

  function openEditEvidence(ev: Action["evidences"][0]) {
    setEditingEvidenceId(ev.id);
    setEvidenceEditForm({ title: ev.title, description: ev.description ?? "", evidenceTypeId: ev.evidenceTypeId ?? "" });
  }

  async function handleEditEvidence() {
    if (!editingEvidenceId) return;
    setIsSavingEvidence(true);
    try {
      const res = await fetch(`/api/evidences/${editingEvidenceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: evidenceEditForm.title,
          description: evidenceEditForm.description || undefined,
          evidenceTypeId: evidenceEditForm.evidenceTypeId || undefined,
        }),
      });
      if (res.ok) { setEditingEvidenceId(null); fetchAction(); }
    } finally {
      setIsSavingEvidence(false);
    }
  }

  async function handleValidateEvidence() {
    if (!validateDialog) return;
    if (validateDialog.mode === "reject" && !validateComment.trim()) return;
    setIsValidating(true);
    try {
      const res = await fetch(`/api/evidences/${validateDialog.evidenceId}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: validateDialog.mode,
          ...(validateDialog.mode === "accept" ? { comment: validateComment || undefined } : { reason: validateComment }),
        }),
      });
      if (res.ok) { setValidateDialog(null); setValidateComment(""); fetchAction(); }
    } finally {
      setIsValidating(false);
    }
  }

  async function handleDeleteEvidence(evidenceId: string) {
    setDeletingEvidenceId(evidenceId);
    try {
      const res = await fetch(`/api/evidences/${evidenceId}`, { method: "DELETE" });
      if (res.ok) fetchAction();
    } finally {
      setDeletingEvidenceId(null);
    }
  }

  async function handleStatusChange() {
    if (!newStatusId) return;
    setIsSavingStatus(true);
    try {
      const res = await fetch(`/api/actions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statusId: newStatusId,
          ...(statusComment ? { comment: statusComment } : {}),
        }),
      });
      if (res.ok) {
        setShowStatusDialog(false);
        setStatusComment("");
        setNewStatusId("");
        fetchAction();
      }
    } finally {
      setIsSavingStatus(false);
    }
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (error || !action) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <p className="text-muted-foreground">{error ?? "Action introuvable"}</p>
          <Button variant="outline" onClick={() => router.push("/actions")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Retour aux actions
          </Button>
        </div>
      </AppLayout>
    );
  }

  const ts = getTemporalStatus(action.plannedEndAt) as TemporalStatus;
  const days = getDaysRemaining(action.plannedEndAt);

  // Progress ring calculation
  const circumference = 2 * Math.PI * 36;
  const strokeDashoffset = circumference - (action.progressRate / 100) * circumference;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm text-muted-foreground">
          <button
            onClick={() => router.push("/actions")}
            className="hover:text-foreground transition-colors"
          >
            Plans d&apos;Action
          </button>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium truncate max-w-[300px]">
            {action.title}
          </span>
        </nav>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            {/* Progress ring */}
            <div className="relative flex-shrink-0">
              <svg width="88" height="88" viewBox="0 0 88 88">
                <circle
                  cx="44"
                  cy="44"
                  r="36"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  className="text-muted/30"
                />
                <circle
                  cx="44"
                  cy="44"
                  r="36"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className={
                    action.progressRate >= 80
                      ? "text-emerald-500"
                      : action.progressRate >= 50
                      ? "text-amber-500"
                      : "text-blue-500"
                  }
                  transform="rotate(-90 44 44)"
                />
                <text
                  x="44"
                  y="48"
                  textAnchor="middle"
                  className="fill-foreground text-sm font-bold"
                  fontSize="16"
                  fontWeight="700"
                >
                  {action.progressRate}%
                </text>
              </svg>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {action.title}
                </h1>
                <StatusBadge
                  code={action.status.code}
                  label={action.status.label}
                  color={action.status.color}
                />
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                <span className="font-mono font-semibold text-primary">
                  {action.actionPlan?.recommendation?.code}
                </span>
                <span>·</span>
                <span>{action.actionPlan?.recommendation?.entity?.label}</span>
                {action.plannedEndAt && (
                  <>
                    <span>·</span>
                    <TemporalBadge status={ts} daysRemaining={days} showIcon />
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => {
                setNewProgress(action.progressRate);
                setShowProgressDialog(true);
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Mettre à jour
            </Button>
            <Button
              onClick={() => setShowStatusDialog(true)}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Changer statut
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="details">
          <TabsList className="border-b border-border rounded-none bg-transparent p-0 h-auto w-full justify-start">
            {[
              { value: "details", label: "Détails", icon: FileText },
              { value: "evidences", label: `Preuves (${action.evidences.length})`, icon: Paperclip },
              { value: "comments", label: `Commentaires (${action.comments.length})`, icon: MessageSquare },
              { value: "history", label: "Historique", icon: History },
            ].map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2 text-sm"
              >
                <Icon className="h-4 w-4 mr-1.5" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Détails */}
          <TabsContent value="details" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {action.description && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold">Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {action.description}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {action.deliverable && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold">Livrable attendu</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{action.deliverable}</p>
                    </CardContent>
                  </Card>
                )}

                {action.blockReason && (
                  <Card className="border-orange-200 bg-orange-50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-orange-800 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Motif de blocage
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-orange-700">{action.blockReason}</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">Informations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-3">
                      <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Responsable</p>
                        <p className="text-sm font-medium">
                          {action.responsible
                            ? `${action.responsible.firstName} ${action.responsible.lastName}`
                            : "—"}
                        </p>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex items-start gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Échéance prévue</p>
                        <p className="text-sm font-medium">{formatDate(action.plannedEndAt)}</p>
                      </div>
                    </div>
                    {action.actualEndAt && (
                      <>
                        <Separator />
                        <div className="flex items-start gap-3">
                          <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-xs text-muted-foreground">Date de réalisation</p>
                            <p className="text-sm font-medium">{formatDate(action.actualEndAt)}</p>
                          </div>
                        </div>
                      </>
                    )}
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Avancement</p>
                      <div className="flex items-center gap-2">
                        <Progress value={action.progressRate} className="h-2 flex-1" />
                        <span className="text-sm font-medium">{action.progressRate}%</span>
                      </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Priorité</p>
                        <Badge variant="outline" className="mt-1">{action.priority}</Badge>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Poids</p>
                        <Badge variant="outline" className="mt-1">{action.weight}%</Badge>
                      </div>
                    </div>
                    {action.complexity && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-xs text-muted-foreground">Complexité</p>
                          <p className="text-sm mt-1">{action.complexity}</p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">Recommandation liée</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <button
                      onClick={() =>
                        router.push(`/recommendations/${action.actionPlan?.recommendation?.id}`)
                      }
                      className="w-full text-left group"
                    >
                      <p className="font-mono text-xs font-semibold text-primary group-hover:underline">
                        {action.actionPlan?.recommendation?.code}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-3">
                        {action.actionPlan?.recommendation?.recommendation}
                      </p>
                    </button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Preuves */}
          <TabsContent value="evidences" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Preuves associées
                </h3>
                <Button
                  size="sm"
                  onClick={() => router.push(`/evidences?actionId=${action.id}`)}
                >
                  <Paperclip className="h-4 w-4 mr-2" />
                  Ajouter une preuve
                </Button>
              </div>

              {action.evidences.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
                    <Paperclip className="h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">Aucune preuve pour cette action</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {action.evidences.map((ev) => {
                    const isPending = ev.statusCode === "DEPOSITED" || ev.statusCode === "IN_REVIEW";
                    const isAccepted = ev.statusCode === "ACCEPTED";
                    const isRejected = ev.statusCode === "REJECTED";
                    return (
                      <Card
                        key={ev.id}
                        className={
                          isAccepted
                            ? "border-green-500/50"
                            : isRejected
                            ? "border-red-500/50"
                            : undefined
                        }
                      >
                        <CardContent className="py-4 space-y-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{ev.title}</p>
                                {ev.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5">{ev.description}</p>
                                )}
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  {ev.evidenceType && (
                                    <Badge variant="outline" className="text-xs">
                                      {ev.evidenceType.label}
                                    </Badge>
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    {ev.depositor
                                      ? `${ev.depositor.firstName} ${ev.depositor.lastName}`
                                      : "—"}{" "}
                                    · {formatDate(ev.createdAt)}
                                  </span>
                                </div>
                                {isRejected && ev.validatorComment && (
                                  <div className="mt-2 flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded p-2">
                                    <XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                    <span>{ev.validatorComment}</span>
                                  </div>
                                )}
                                {isAccepted && ev.validatedAt && (
                                  <p className="text-xs text-green-600 mt-1">
                                    Validée le {formatDate(ev.validatedAt)}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <StatusBadge code={ev.statusCode} label={ev.statusCode} />
                              {isPending && (
                                <>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    title="Modifier"
                                    onClick={() => openEditEvidence(ev)}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-green-600 hover:text-green-700"
                                    title="Valider"
                                    onClick={() => { setValidateDialog({ evidenceId: ev.id, mode: "accept" }); setValidateComment(""); }}
                                  >
                                    <ThumbsUp className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-red-600 hover:text-red-700"
                                    title="Rejeter"
                                    onClick={() => { setValidateDialog({ evidenceId: ev.id, mode: "reject" }); setValidateComment(""); }}
                                  >
                                    <ThumbsDown className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    title="Supprimer"
                                    disabled={deletingEvidenceId === ev.id}
                                    onClick={() => handleDeleteEvidence(ev.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Commentaires */}
          <TabsContent value="comments" className="mt-6">
            <div className="space-y-4">
              {action.comments.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
                    <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">Aucun commentaire</p>
                  </CardContent>
                </Card>
              ) : (
                action.comments.map((c) => (
                  <Card key={c.id}>
                    <CardContent className="py-4">
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-primary">
                            {c.author
                              ? `${c.author.firstName[0]}${c.author.lastName[0]}`
                              : "?"}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {c.author
                                ? `${c.author.firstName} ${c.author.lastName}`
                                : "Utilisateur inconnu"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDateTime(c.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{c.content}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Historique */}
          <TabsContent value="history" className="mt-6">
            {action.statusHistory.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
                  <History className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">Aucun historique disponible</p>
                </CardContent>
              </Card>
            ) : (
              <div className="relative">
                <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />
                <div className="space-y-6 pl-14">
                  {action.statusHistory.map((h, i) => (
                    <div key={h.id} className="relative">
                      <div className="absolute -left-[3.25rem] top-1 h-4 w-4 rounded-full bg-primary border-2 border-background" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {h.fromStatusAction && (
                            <>
                              <StatusBadge
                                code={h.fromStatusAction.code}
                                label={h.fromStatusAction.label}
                                color={h.fromStatusAction.color}
                              />
                              <ChevronRight className="h-3 w-3 text-muted-foreground" />
                            </>
                          )}
                          {h.toStatusAction && (
                            <StatusBadge
                              code={h.toStatusAction.code}
                              label={h.toStatusAction.label}
                              color={h.toStatusAction.color}
                            />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {h.changedBy
                            ? `${h.changedBy.firstName} ${h.changedBy.lastName}`
                            : "Système"}{" "}
                          · {formatDateTime(h.createdAt)}
                        </p>
                        {h.comment && (
                          <p className="text-sm text-muted-foreground italic">{h.comment}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Update Progress Dialog */}
      <Dialog open={showProgressDialog} onOpenChange={setShowProgressDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mettre à jour l&apos;avancement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Avancement : {newProgress}%</Label>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={newProgress}
                onChange={(e) => setNewProgress(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Commentaire (optionnel)</Label>
              <Textarea
                placeholder="Décrire les progrès réalisés..."
                value={progressComment}
                onChange={(e) => setProgressComment(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProgressDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleProgressUpdate} disabled={isSavingProgress}>
              {isSavingProgress ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Status Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Changer le statut</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nouveau statut</Label>
              <Select value={newStatusId} onValueChange={setNewStatusId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un statut" />
                </SelectTrigger>
                <SelectContent>
                  {actionStatuses.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Commentaire (optionnel)</Label>
              <Textarea
                placeholder="Motif du changement de statut..."
                value={statusComment}
                onChange={(e) => setStatusComment(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleStatusChange} disabled={isSavingStatus || !newStatusId}>
              {isSavingStatus ? "Enregistrement..." : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Evidence Dialog */}
      <Dialog open={!!editingEvidenceId} onOpenChange={(open) => { if (!open) setEditingEvidenceId(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier la preuve</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Titre</Label>
              <input
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={evidenceEditForm.title}
                onChange={(e) => setEvidenceEditForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Type de preuve</Label>
              <Select
                value={evidenceEditForm.evidenceTypeId}
                onValueChange={(v) => setEvidenceEditForm((f) => ({ ...f, evidenceTypeId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  {evidenceTypes.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description (optionnelle)</Label>
              <Textarea
                placeholder="Description de la preuve..."
                value={evidenceEditForm.description}
                onChange={(e) => setEvidenceEditForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEvidenceId(null)}>
              Annuler
            </Button>
            <Button onClick={handleEditEvidence} disabled={isSavingEvidence || !evidenceEditForm.title.trim()}>
              {isSavingEvidence ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Validate / Reject Evidence Dialog */}
      <Dialog open={!!validateDialog} onOpenChange={(open) => { if (!open) { setValidateDialog(null); setValidateComment(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {validateDialog?.mode === "accept" ? "Valider la preuve" : "Rejeter la preuve"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>
                {validateDialog?.mode === "accept"
                  ? "Commentaire (optionnel)"
                  : "Motif du rejet (obligatoire)"}
              </Label>
              <Textarea
                placeholder={
                  validateDialog?.mode === "accept"
                    ? "Commentaire de validation..."
                    : "Expliquer pourquoi la preuve est rejetée..."
                }
                value={validateComment}
                onChange={(e) => setValidateComment(e.target.value)}
                rows={3}
              />
            </div>
            {validateDialog?.mode === "reject" && !validateComment.trim() && (
              <p className="text-xs text-destructive">Le motif est obligatoire pour un rejet.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setValidateDialog(null); setValidateComment(""); }}>
              Annuler
            </Button>
            <Button
              onClick={handleValidateEvidence}
              disabled={
                isValidating ||
                (validateDialog?.mode === "reject" && !validateComment.trim())
              }
              variant={validateDialog?.mode === "reject" ? "destructive" : "default"}
            >
              {isValidating
                ? "En cours..."
                : validateDialog?.mode === "accept"
                ? "Valider"
                : "Rejeter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

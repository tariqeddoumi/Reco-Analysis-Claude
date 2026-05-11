"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { StatusBadge } from "@/components/badges/StatusBadge";
import { TemporalBadge } from "@/components/badges/TemporalBadge";
import { formatDate, getTemporalStatus, getDaysRemaining } from "@/lib/utils";
import { TemporalStatus } from "@/types";
import {
  Home,
  ChevronRight,
  AlertCircle,
  Plus,
  Eye,
  Pencil,
  Trash2,
  ArrowLeft,
  Save,
  ListTodo,
  Target,
} from "lucide-react";

interface Action {
  id: string;
  title: string;
  description: string | null;
  progressRate: number;
  weight: number;
  priority: number;
  plannedEndAt: string | null;
  statusId: string;
  responsibleId: string | null;
  priorityLevelId: string | null;
  complexityLevelId: string | null;
  effortLevelId: string | null;
  status: { id: string; code: string; label: string; color: string | null } | null;
  responsible: { id: string; firstName: string | null; lastName: string | null } | null;
}

interface PlanDetail {
  id: string;
  title: string;
  description: string | null;
  statusCode: string;
  progressRate: number;
  weight: number;
  createdAt: string;
  recommendation: {
    id: string;
    code: string;
    recommendation: string;
    initialDueDate: string | null;
    revisedDueDate: string | null;
    entity: { id: string; label: string } | null;
  };
  actions: Action[];
}

interface RefItem {
  id: string;
  code?: string;
  label: string;
  color?: string | null;
}

const PLAN_STATUS_OPTIONS = [
  { code: "DRAFT", label: "Brouillon" },
  { code: "PROPOSED", label: "Proposé" },
  { code: "APPROVED", label: "Approuvé" },
  { code: "IN_PROGRESS", label: "En cours" },
  { code: "COMPLETED", label: "Terminé" },
  { code: "CANCELLED", label: "Annulé" },
];

const emptyActionForm = {
  title: "",
  description: "",
  statusId: "",
  responsibleId: "",
  plannedEndAt: "",
  weight: 100,
  priority: 2,
  priorityLevelId: "",
  complexityLevelId: "",
  effortLevelId: "",
};

export default function ActionPlanDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [plan, setPlan] = React.useState<PlanDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Referentials for action form
  const [actionStatuses, setActionStatuses] = React.useState<RefItem[]>([]);
  const [priorityLevels, setPriorityLevels] = React.useState<RefItem[]>([]);
  const [complexityLevels, setComplexityLevels] = React.useState<RefItem[]>([]);
  const [effortLevels, setEffortLevels] = React.useState<RefItem[]>([]);
  const [users, setUsers] = React.useState<RefItem[]>([]);

  // Edit plan
  const [editPlanOpen, setEditPlanOpen] = React.useState(false);
  const [planForm, setPlanForm] = React.useState({
    title: "",
    description: "",
    statusCode: "DRAFT",
  });
  const [savingPlan, setSavingPlan] = React.useState(false);
  const [planError, setPlanError] = React.useState<string | null>(null);

  // Action dialog (create or edit)
  const [actionDialogOpen, setActionDialogOpen] = React.useState(false);
  const [editingActionId, setEditingActionId] = React.useState<string | null>(null);
  const [actionForm, setActionForm] = React.useState(emptyActionForm);
  const [savingAction, setSavingAction] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [deletingActionId, setDeletingActionId] = React.useState<string | null>(null);

  const fetchPlan = React.useCallback(() => {
    if (!id) return;
    setIsLoading(true);
    fetch(`/api/action-plans/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setPlan(data))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [id]);

  React.useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  React.useEffect(() => {
    fetch("/api/admin/referentials?type=all")
      .then((r) => r.json())
      .then((data) => {
        setActionStatuses(data.actionStatuses ?? []);
        setPriorityLevels(data.priorityLevels ?? []);
        setComplexityLevels(data.complexityLevels ?? []);
        setEffortLevels(data.effortLevels ?? []);
        setUsers(
          (data.users ?? []).map((u: { id: string; firstName?: string; lastName?: string }) => ({
            id: u.id,
            label: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "—",
          }))
        );
      })
      .catch(console.error);
  }, []);

  // ── Plan handlers ─────────────────────────────────────────
  const openEditPlan = () => {
    if (!plan) return;
    setPlanForm({
      title: plan.title,
      description: plan.description ?? "",
      statusCode: plan.statusCode,
    });
    setPlanError(null);
    setEditPlanOpen(true);
  };

  const handleSavePlan = async () => {
    if (!plan || !planForm.title.trim()) return;
    setSavingPlan(true);
    setPlanError(null);
    try {
      const res = await fetch(`/api/action-plans/${plan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: planForm.title,
          description: planForm.description || undefined,
          statusCode: planForm.statusCode,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Erreur lors de l'enregistrement");
      }
      setEditPlanOpen(false);
      fetchPlan();
    } catch (e) {
      setPlanError(e instanceof Error ? e.message : "Erreur réseau");
    } finally {
      setSavingPlan(false);
    }
  };

  // ── Action handlers ───────────────────────────────────────
  const openCreateAction = () => {
    setEditingActionId(null);
    setActionForm(emptyActionForm);
    setActionError(null);
    setActionDialogOpen(true);
  };

  const openEditAction = (a: Action) => {
    setEditingActionId(a.id);
    setActionForm({
      title: a.title,
      description: a.description ?? "",
      statusId: a.statusId,
      responsibleId: a.responsibleId ?? "",
      plannedEndAt: a.plannedEndAt ? a.plannedEndAt.substring(0, 10) : "",
      weight: a.weight,
      priority: a.priority,
      priorityLevelId: a.priorityLevelId ?? "",
      complexityLevelId: a.complexityLevelId ?? "",
      effortLevelId: a.effortLevelId ?? "",
    });
    setActionError(null);
    setActionDialogOpen(true);
  };

  const handleSaveAction = async () => {
    if (!plan || !actionForm.title.trim() || !actionForm.statusId) return;
    setSavingAction(true);
    setActionError(null);
    try {
      const body: Record<string, unknown> = {
        title: actionForm.title,
        statusId: actionForm.statusId,
        priority: actionForm.priority,
        weight: actionForm.weight,
      };
      if (!editingActionId) body.actionPlanId = plan.id;
      if (actionForm.description.trim()) body.description = actionForm.description;
      body.responsibleId = actionForm.responsibleId || "";
      body.priorityLevelId = actionForm.priorityLevelId || "";
      body.complexityLevelId = actionForm.complexityLevelId || "";
      body.effortLevelId = actionForm.effortLevelId || "";
      if (actionForm.plannedEndAt) body.plannedEndAt = actionForm.plannedEndAt;

      const url = editingActionId ? `/api/actions/${editingActionId}` : "/api/actions";
      const method = editingActionId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Erreur lors de l'enregistrement");
      }
      setActionDialogOpen(false);
      setActionForm(emptyActionForm);
      setEditingActionId(null);
      fetchPlan();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Erreur réseau");
    } finally {
      setSavingAction(false);
    }
  };

  const handleDeleteAction = async (actionId: string) => {
    setDeletingActionId(actionId);
    try {
      const res = await fetch(`/api/actions/${actionId}`, { method: "DELETE" });
      if (res.ok) fetchPlan();
    } finally {
      setDeletingActionId(null);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!plan) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-24">
          <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-lg font-semibold">Plan d&apos;action introuvable</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push("/action-plans")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux plans
          </Button>
        </div>
      </AppLayout>
    );
  }

  const due = plan.recommendation.revisedDueDate ?? plan.recommendation.initialDueDate;
  const dueTs = due ? (getTemporalStatus(due) as TemporalStatus) : null;
  const dueDays = due ? getDaysRemaining(due) : null;
  const actionsDone = plan.actions.filter((a) => a.progressRate >= 100).length;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <Home className="h-3.5 w-3.5" />
            Dashboard
          </button>
          <ChevronRight className="h-3.5 w-3.5" />
          <button
            onClick={() => router.push("/action-plans")}
            className="hover:text-foreground transition-colors"
          >
            Plans d&apos;action
          </button>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground truncate max-w-md">
            {plan.title}
          </span>
        </nav>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs">
                <FileCheck2Tiny />
                Plan d&apos;action
              </Badge>
              <Badge
                variant="outline"
                className="text-xs"
                title={`Statut: ${plan.statusCode}`}
              >
                {PLAN_STATUS_OPTIONS.find((s) => s.code === plan.statusCode)?.label ??
                  plan.statusCode}
              </Badge>
              <button
                onClick={() => router.push(`/recommendations/${plan.recommendation.id}`)}
                className="font-mono text-xs font-semibold text-primary hover:underline"
                title="Voir la recommandation"
              >
                ↗ {plan.recommendation.code}
              </button>
              {plan.recommendation.entity && (
                <Badge variant="secondary" className="text-xs">
                  {plan.recommendation.entity.label}
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{plan.title}</h1>
            {plan.description && (
              <p className="text-sm text-muted-foreground max-w-3xl">
                {plan.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={openEditPlan}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Modifier le plan
            </Button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">
                Avancement du plan
              </div>
              <div className="flex items-center gap-3">
                <Progress value={plan.progressRate} className="h-2 flex-1" />
                <span className="text-lg font-bold tabular-nums">
                  {plan.progressRate}%
                </span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">
                Actions terminées
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tabular-nums">{actionsDone}</span>
                <span className="text-sm text-muted-foreground">
                  / {plan.actions.length}
                </span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">
                Échéance recommandation
              </div>
              {due ? (
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">{formatDate(due)}</span>
                  {dueTs && (
                    <TemporalBadge
                      status={dueTs}
                      daysRemaining={dueDays ?? 0}
                      showIcon
                    />
                  )}
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">
                Poids du plan
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tabular-nums">{plan.weight}</span>
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions of this plan */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              Actions du plan
              <Badge variant="secondary">{plan.actions.length}</Badge>
            </CardTitle>
            <Button size="sm" onClick={openCreateAction}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Ajouter une action
            </Button>
          </CardHeader>
          <Separator />
          <CardContent className="p-0">
            {plan.actions.length === 0 ? (
              <div className="py-12 flex flex-col items-center text-center">
                <div className="rounded-full bg-muted p-3 mb-3">
                  <ListTodo className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">Aucune action dans ce plan</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-md">
                  Cliquez sur &quot;Ajouter une action&quot; pour commencer.
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-muted/30">
                    <th className="px-4 py-2.5">Action</th>
                    <th className="px-4 py-2.5">Statut</th>
                    <th className="px-4 py-2.5">Responsable</th>
                    <th className="px-4 py-2.5">Échéance</th>
                    <th className="px-4 py-2.5">Avancement</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.actions.map((a) => {
                    const ts = a.plannedEndAt
                      ? (getTemporalStatus(a.plannedEndAt) as TemporalStatus)
                      : null;
                    const days = a.plannedEndAt
                      ? getDaysRemaining(a.plannedEndAt)
                      : null;
                    return (
                      <tr
                        key={a.id}
                        className="border-b hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3 max-w-[280px]">
                          <button
                            onClick={() => router.push(`/actions/${a.id}`)}
                            className="text-sm font-medium hover:text-primary text-left truncate block w-full"
                            title={a.title}
                          >
                            {a.title}
                          </button>
                          {a.description && (
                            <span
                              className="text-xs text-muted-foreground truncate block"
                              title={a.description}
                            >
                              {a.description}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {a.status ? (
                            <StatusBadge
                              code={a.status.code}
                              label={a.status.label}
                              color={a.status.color}
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {a.responsible
                            ? `${a.responsible.firstName ?? ""} ${a.responsible.lastName ?? ""}`.trim() ||
                              "—"
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {a.plannedEndAt ? (
                            <div className="flex flex-col gap-1">
                              <span className="text-muted-foreground">
                                {formatDate(a.plannedEndAt)}
                              </span>
                              {ts && (
                                <TemporalBadge
                                  status={ts}
                                  daysRemaining={days ?? 0}
                                  showIcon
                                />
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 min-w-[140px]">
                          <div className="flex items-center gap-2">
                            <Progress
                              value={a.progressRate}
                              className="h-1.5 flex-1"
                            />
                            <span className="text-xs text-muted-foreground w-9 text-right tabular-nums">
                              {a.progressRate}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Voir le détail"
                              onClick={() => router.push(`/actions/${a.id}`)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Modifier"
                              onClick={() => openEditAction(a)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  disabled={deletingActionId === a.id}
                                  title="Supprimer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Supprimer cette action ?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    L&apos;action « {a.title} » sera archivée.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteAction(a.id)}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Supprimer
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Edit Plan Dialog ────────────────────────────────── */}
      <Dialog open={editPlanOpen} onOpenChange={setEditPlanOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier le plan d&apos;action</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {planError && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {planError}
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Titre <span className="text-destructive">*</span>
              </Label>
              <Input
                value={planForm.title}
                onChange={(e) => setPlanForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Titre du plan"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Statut</Label>
              <Select
                value={planForm.statusCode}
                onValueChange={(v) => setPlanForm((f) => ({ ...f, statusCode: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAN_STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.code} value={s.code}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Description</Label>
              <Textarea
                value={planForm.description}
                onChange={(e) =>
                  setPlanForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={3}
                placeholder="Description du plan (optionnel)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditPlanOpen(false)}
              disabled={savingPlan}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSavePlan}
              disabled={savingPlan || !planForm.title.trim()}
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {savingPlan ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Action Create/Edit Dialog ───────────────────────── */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingActionId ? "Modifier l'action" : "Nouvelle action"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {actionError && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {actionError}
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Titre <span className="text-destructive">*</span>
              </Label>
              <Input
                value={actionForm.title}
                onChange={(e) =>
                  setActionForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="Titre de l'action"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Statut <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={actionForm.statusId}
                  onValueChange={(v) =>
                    setActionForm((f) => ({ ...f, statusId: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Statut" />
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
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Responsable</Label>
                <Select
                  value={actionForm.responsibleId || "none"}
                  onValueChange={(v) =>
                    setActionForm((f) => ({
                      ...f,
                      responsibleId: v === "none" ? "" : v,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Responsable (opt.)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Échéance prévue</Label>
                <Input
                  type="date"
                  value={actionForm.plannedEndAt}
                  onChange={(e) =>
                    setActionForm((f) => ({ ...f, plannedEndAt: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Priorité</Label>
                <Select
                  value={actionForm.priorityLevelId || "none"}
                  onValueChange={(v) =>
                    setActionForm((f) => ({
                      ...f,
                      priorityLevelId: v === "none" ? "" : v,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Priorité (opt.)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {priorityLevels.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Complexité</Label>
                <Select
                  value={actionForm.complexityLevelId || "none"}
                  onValueChange={(v) =>
                    setActionForm((f) => ({
                      ...f,
                      complexityLevelId: v === "none" ? "" : v,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Complexité (opt.)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {complexityLevels.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Effort estimé</Label>
                <Select
                  value={actionForm.effortLevelId || "none"}
                  onValueChange={(v) =>
                    setActionForm((f) => ({
                      ...f,
                      effortLevelId: v === "none" ? "" : v,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Effort (opt.)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {effortLevels.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Poids (%)</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={actionForm.weight}
                onChange={(e) =>
                  setActionForm((f) => ({
                    ...f,
                    weight: Math.min(100, Math.max(1, Number(e.target.value) || 100)),
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Description</Label>
              <Textarea
                value={actionForm.description}
                onChange={(e) =>
                  setActionForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={2}
                placeholder="Description (optionnel)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialogOpen(false)}
              disabled={savingAction}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSaveAction}
              disabled={
                savingAction || !actionForm.title.trim() || !actionForm.statusId
              }
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {savingAction
                ? "Enregistrement..."
                : editingActionId
                  ? "Mettre à jour"
                  : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

// Small inline icon for breadcrumb-style badge
function FileCheck2Tiny() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3 w-3 mr-1"
    >
      <path d="M4 7V4a2 2 0 0 1 2-2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3" />
      <polyline points="14 2 14 8 20 8" />
      <path d="m3 15 2 2 4-4" />
    </svg>
  );
}

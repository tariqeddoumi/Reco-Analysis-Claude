"use client";

import * as React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Building2,
  Plus,
  Search,
  Pencil,
  RefreshCw,
  Trash2,
  GitBranch,
} from "lucide-react";

interface ParentEntity {
  id: string;
  code: string;
  label: string;
}

interface EntityRow {
  id: string;
  code: string;
  label: string;
  description: string | null;
  type: string | null;
  parentId: string | null;
  isActive: boolean;
  parent: ParentEntity | null;
  _count: { children: number; missions: number; recommendations: number };
}

interface EntityFormData {
  code: string;
  label: string;
  description: string;
  type: string;
  parentId: string;
  isActive: boolean;
}

const DEFAULT_FORM: EntityFormData = {
  code: "",
  label: "",
  description: "",
  type: "",
  parentId: "",
  isActive: true,
};

const ENTITY_TYPES = [
  { value: "HOLDING", label: "Holding" },
  { value: "FILIALE", label: "Filiale" },
  { value: "DIRECTION", label: "Direction" },
  { value: "DEPARTEMENT", label: "Département" },
  { value: "SERVICE", label: "Service" },
];

export default function EntitiesAdminPage() {
  const [entities, setEntities] = React.useState<EntityRow[]>([]);
  const [allEntities, setAllEntities] = React.useState<EntityRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const pageSize = 20;

  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");

  const [showDialog, setShowDialog] = React.useState(false);
  const [editingEntity, setEditingEntity] = React.useState<EntityRow | null>(null);
  const [form, setForm] = React.useState<EntityFormData>(DEFAULT_FORM);
  const [isSaving, setIsSaving] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchEntities = React.useCallback(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (debouncedSearch) params.set("search", debouncedSearch);
    setIsLoading(true);
    fetch(`/api/admin/entities?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setEntities(data.data ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [page, pageSize, debouncedSearch]);

  React.useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

  React.useEffect(() => {
    fetch("/api/admin/entities?pageSize=200")
      .then((r) => r.json())
      .then((data) => setAllEntities(data.data ?? []))
      .catch(console.error);
  }, []);

  function openCreateDialog() {
    setEditingEntity(null);
    setForm(DEFAULT_FORM);
    setFormError(null);
    setShowDialog(true);
  }

  function openEditDialog(entity: EntityRow) {
    setEditingEntity(entity);
    setForm({
      code: entity.code,
      label: entity.label,
      description: entity.description ?? "",
      type: entity.type ?? "",
      parentId: entity.parentId ?? "",
      isActive: entity.isActive,
    });
    setFormError(null);
    setShowDialog(true);
  }

  async function handleSubmit() {
    setFormError(null);
    if (!form.label.trim()) {
      setFormError("Le libellé est obligatoire");
      return;
    }
    if (!editingEntity && !form.code.trim()) {
      setFormError("Le code est obligatoire");
      return;
    }

    setIsSaving(true);
    try {
      const url = editingEntity ? `/api/admin/entities/${editingEntity.id}` : "/api/admin/entities";
      const method = editingEntity ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editingEntity ? {} : { code: form.code.toUpperCase() }),
          label: form.label,
          description: form.description || undefined,
          type: form.type || undefined,
          parentId: form.parentId || null,
          isActive: form.isActive,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erreur lors de l'enregistrement");
      }

      setShowDialog(false);
      fetchEntities();
      fetch("/api/admin/entities?pageSize=200")
        .then((r) => r.json())
        .then((data) => setAllEntities(data.data ?? []))
        .catch(console.error);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(entity: EntityRow) {
    const usageCount = entity._count.children + entity._count.missions + entity._count.recommendations;
    if (usageCount > 0) {
      alert("Impossible de supprimer : cette entité est référencée dans le système.");
      return;
    }
    if (!confirm(`Supprimer l'entité « ${entity.label} » ?`)) return;
    const res = await fetch(`/api/admin/entities/${entity.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Erreur lors de la suppression");
      return;
    }
    fetchEntities();
  }

  async function handleToggleActive(entity: EntityRow) {
    const res = await fetch(`/api/admin/entities/${entity.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !entity.isActive }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Erreur");
      return;
    }
    fetchEntities();
  }

  const parentOptions = allEntities.filter((e) => e.id !== editingEntity?.id);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Gestion des Entités
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {total} entité{total !== 1 ? "s" : ""} dans le système
            </p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle entité
          </Button>
        </div>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher une entité..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-9"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setSearch(""); setPage(1); }}
                title="Réinitialiser"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Entité</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Code</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Entité parente</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Utilisation</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Statut</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entities.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      Aucune entité trouvée
                    </td>
                  </tr>
                ) : (
                  entities.map((entity) => (
                    <tr key={entity.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {entity.parent && (
                            <GitBranch className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          )}
                          <span className="font-medium">{entity.label}</span>
                        </div>
                        {entity.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 ml-5">{entity.description}</p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{entity.code}</code>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">
                        {entity.type ?? "—"}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {entity.parent ? (
                          <span>{entity.parent.label}</span>
                        ) : (
                          <span className="text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          {entity._count.children > 0 && (
                            <span>{entity._count.children} sous-entité{entity._count.children > 1 ? "s" : ""}</span>
                          )}
                          {entity._count.missions > 0 && (
                            <span>{entity._count.missions} mission{entity._count.missions > 1 ? "s" : ""}</span>
                          )}
                          {entity._count.recommendations > 0 && (
                            <span>{entity._count.recommendations} reco.</span>
                          )}
                          {entity._count.children === 0 && entity._count.missions === 0 && entity._count.recommendations === 0 && (
                            <span>—</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {entity.isActive ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">Active</Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-xs">Inactive</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditDialog(entity)}
                            title="Modifier"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${entity.isActive ? "text-amber-600" : "text-emerald-600"}`}
                            onClick={() => handleToggleActive(entity)}
                            title={entity.isActive ? "Désactiver" : "Activer"}
                          >
                            <Building2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500"
                            onClick={() => handleDelete(entity)}
                            title="Supprimer"
                            disabled={
                              entity._count.children > 0 ||
                              entity._count.missions > 0 ||
                              entity._count.recommendations > 0
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {total > pageSize && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Affichage {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} sur {total}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Précédent
              </Button>
              <Button variant="outline" size="sm" disabled={page * pageSize >= total} onClick={() => setPage((p) => p + 1)}>
                Suivant
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingEntity ? "Modifier l'entité" : "Nouvelle entité"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {formError && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3">
                {formError}
              </div>
            )}

            {!editingEntity && (
              <div className="space-y-2">
                <Label>Code *</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="Ex: DCFM"
                />
                <p className="text-xs text-muted-foreground">Le code est unique et ne peut pas être modifié après création.</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Libellé *</Label>
              <Input
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="Ex: Direction Centrale Finance & Marchés"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Description de l'entité..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">— Aucun —</SelectItem>
                    {ENTITY_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Entité parente</Label>
                <Select
                  value={form.parentId}
                  onValueChange={(v) => setForm((f) => ({ ...f, parentId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Aucune" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">— Aucune —</SelectItem>
                    {parentOptions.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="entity-active"
                checked={form.isActive}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
              />
              <Label htmlFor="entity-active">Entité active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

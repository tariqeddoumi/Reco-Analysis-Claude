"use client";

import * as React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ShieldCheck,
  Plus,
  Search,
  Pencil,
  RefreshCw,
  Lock,
  Users,
  Trash2,
} from "lucide-react";

interface Permission {
  id: string;
  code: string;
  label: string;
  module: string;
}

interface RoleRow {
  id: string;
  code: string;
  label: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  permissions: Array<{ permission: Permission }>;
  _count: { userRoles: number };
}

interface RoleFormData {
  code: string;
  label: string;
  description: string;
  isActive: boolean;
  permissionIds: string[];
}

const DEFAULT_FORM: RoleFormData = {
  code: "",
  label: "",
  description: "",
  isActive: true,
  permissionIds: [],
};

export default function RolesAdminPage() {
  const [roles, setRoles] = React.useState<RoleRow[]>([]);
  const [permissions, setPermissions] = React.useState<Permission[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const pageSize = 20;

  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");

  const [showDialog, setShowDialog] = React.useState(false);
  const [editingRole, setEditingRole] = React.useState<RoleRow | null>(null);
  const [form, setForm] = React.useState<RoleFormData>(DEFAULT_FORM);
  const [isSaving, setIsSaving] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  React.useEffect(() => {
    fetch("/api/admin/referentials?type=all")
      .then((r) => r.json())
      .then((data) => setPermissions(data.permissions ?? []))
      .catch(console.error);
  }, []);

  const fetchRoles = React.useCallback(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (debouncedSearch) params.set("search", debouncedSearch);
    setIsLoading(true);
    fetch(`/api/admin/roles?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setRoles(data.data ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [page, pageSize, debouncedSearch]);

  React.useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  function openCreateDialog() {
    setEditingRole(null);
    setForm(DEFAULT_FORM);
    setFormError(null);
    setShowDialog(true);
  }

  function openEditDialog(role: RoleRow) {
    setEditingRole(role);
    setForm({
      code: role.code,
      label: role.label,
      description: role.description ?? "",
      isActive: role.isActive,
      permissionIds: role.permissions.map((rp) => rp.permission.id),
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
    if (!editingRole && !form.code.trim()) {
      setFormError("Le code est obligatoire");
      return;
    }

    setIsSaving(true);
    try {
      const url = editingRole ? `/api/admin/roles/${editingRole.id}` : "/api/admin/roles";
      const method = editingRole ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editingRole ? {} : { code: form.code.toUpperCase() }),
          label: form.label,
          description: form.description || undefined,
          isActive: form.isActive,
          permissionIds: form.permissionIds,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erreur lors de l'enregistrement");
      }

      setShowDialog(false);
      fetchRoles();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(role: RoleRow) {
    if (!confirm(`Supprimer le rôle « ${role.label} » ?`)) return;
    const res = await fetch(`/api/admin/roles/${role.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Erreur lors de la suppression");
      return;
    }
    fetchRoles();
  }

  async function handleToggleActive(role: RoleRow) {
    const res = await fetch(`/api/admin/roles/${role.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !role.isActive }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Erreur");
      return;
    }
    fetchRoles();
  }

  function togglePermissionId(id: string) {
    setForm((f) => ({
      ...f,
      permissionIds: f.permissionIds.includes(id)
        ? f.permissionIds.filter((p) => p !== id)
        : [...f.permissionIds, id],
    }));
  }

  const permissionsByModule = React.useMemo(() => {
    const grouped: Record<string, Permission[]> = {};
    for (const p of permissions) {
      if (!grouped[p.module]) grouped[p.module] = [];
      grouped[p.module].push(p);
    }
    return grouped;
  }, [permissions]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Rôles &amp; Permissions
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {total} rôle{total !== 1 ? "s" : ""} dans le système
            </p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau rôle
          </Button>
        </div>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un rôle..."
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
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rôle</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Code</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Permissions</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Utilisateurs</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Statut</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {roles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      <ShieldCheck className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      Aucun rôle trouvé
                    </td>
                  </tr>
                ) : (
                  roles.map((role) => (
                    <tr key={role.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {role.isSystem && (
                            <Lock className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" title="Rôle système" />
                          )}
                          <span className="font-medium">{role.label}</span>
                        </div>
                        {role.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{role.description}</p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{role.code}</code>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-muted-foreground">
                          {role.permissions.length} permission{role.permissions.length !== 1 ? "s" : ""}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                          <Users className="h-3.5 w-3.5" />
                          {role._count.userRoles}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {role.isActive ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">Actif</Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-xs">Inactif</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditDialog(role)}
                            title="Modifier"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {!role.isSystem && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`h-8 w-8 ${role.isActive ? "text-amber-600" : "text-emerald-600"}`}
                                onClick={() => handleToggleActive(role)}
                                title={role.isActive ? "Désactiver" : "Activer"}
                              >
                                <ShieldCheck className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500"
                                onClick={() => handleDelete(role)}
                                title="Supprimer"
                                disabled={role._count.userRoles > 0}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
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
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRole ? "Modifier le rôle" : "Nouveau rôle"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {formError && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3">
                {formError}
              </div>
            )}

            {!editingRole && (
              <div className="space-y-2">
                <Label>Code *</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="EX: AUDITEUR_SENIOR"
                />
                <p className="text-xs text-muted-foreground">Le code est unique et ne peut pas être modifié après création.</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Libellé *</Label>
              <Input
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="Ex: Auditeur Sénior"
                disabled={editingRole?.isSystem}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Description du rôle..."
              />
            </div>

            {!editingRole?.isSystem && (
              <div className="flex items-center gap-3">
                <Switch
                  id="role-active"
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                />
                <Label htmlFor="role-active">Rôle actif</Label>
              </div>
            )}

            {Object.keys(permissionsByModule).length > 0 && (
              <div className="space-y-3">
                <Label>Permissions</Label>
                <div className="border rounded-md p-3 space-y-4 max-h-64 overflow-y-auto">
                  {Object.entries(permissionsByModule).map(([module, perms]) => (
                    <div key={module}>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        {module}
                      </p>
                      <div className="space-y-1.5 pl-1">
                        {perms.map((perm) => (
                          <div key={perm.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`perm-${perm.id}`}
                              checked={form.permissionIds.includes(perm.id)}
                              onCheckedChange={() => togglePermissionId(perm.id)}
                              disabled={editingRole?.isSystem}
                            />
                            <Label htmlFor={`perm-${perm.id}`} className="font-normal text-sm cursor-pointer">
                              {perm.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                      <Separator className="mt-3" />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {form.permissionIds.length} permission{form.permissionIds.length !== 1 ? "s" : ""} sélectionnée{form.permissionIds.length !== 1 ? "s" : ""}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving || editingRole?.isSystem}>
              {isSaving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

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
import { formatDateTime } from "@/lib/utils";
import {
  Users,
  Plus,
  Search,
  Pencil,
  RefreshCw,
  UserCheck,
  UserX,
} from "lucide-react";

interface Role {
  id: string;
  code: string;
  label: string;
}

interface Entity {
  id: string;
  code: string;
  label: string;
}

interface UserRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  title: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  userRoles: Array<{ role: Role }>;
  entities: Array<{ entity: Entity }>;
}

interface UserFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  title: string;
  isActive: boolean;
  roleIds: string[];
  entityIds: string[];
}

const DEFAULT_FORM: UserFormData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  title: "",
  isActive: true,
  roleIds: [],
  entityIds: [],
};

export default function UsersAdminPage() {
  const [users, setUsers] = React.useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const pageSize = 20;

  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");

  const [roles, setRoles] = React.useState<Role[]>([]);
  const [entities, setEntities] = React.useState<Entity[]>([]);

  const [showDialog, setShowDialog] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<UserRow | null>(null);
  const [form, setForm] = React.useState<UserFormData>(DEFAULT_FORM);
  const [isSaving, setIsSaving] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  React.useEffect(() => {
    fetch("/api/admin/referentials?type=all")
      .then((r) => r.json())
      .then((data) => {
        setRoles(data.roles ?? []);
        setEntities(data.entities ?? []);
      })
      .catch(console.error);
  }, []);

  const fetchUsers = React.useCallback(() => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (debouncedSearch) params.set("search", debouncedSearch);
    setIsLoading(true);
    fetch(`/api/admin/users?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setUsers(data.data ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [page, pageSize, debouncedSearch]);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  function openCreateDialog() {
    setEditingUser(null);
    setForm(DEFAULT_FORM);
    setFormError(null);
    setShowDialog(true);
  }

  function openEditDialog(user: UserRow) {
    setEditingUser(user);
    setForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone ?? "",
      title: user.title ?? "",
      isActive: user.isActive,
      roleIds: user.userRoles.map((ur) => ur.role.id),
      entityIds: user.entities.map((ue) => ue.entity.id),
    });
    setFormError(null);
    setShowDialog(true);
  }

  async function handleSubmit() {
    setFormError(null);
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      setFormError("Prénom, nom et email sont obligatoires");
      return;
    }

    setIsSaving(true);
    try {
      const url = editingUser ? `/api/admin/users/${editingUser.id}` : "/api/admin/users";
      const method = editingUser ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          phone: form.phone || undefined,
          title: form.title || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erreur lors de l'enregistrement");
      }

      setShowDialog(false);
      fetchUsers();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleActive(user: UserRow) {
    await fetch(`/api/admin/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    fetchUsers();
  }

  function toggleRoleId(id: string) {
    setForm((f) => ({
      ...f,
      roleIds: f.roleIds.includes(id)
        ? f.roleIds.filter((r) => r !== id)
        : [...f.roleIds, id],
    }));
  }

  function toggleEntityId(id: string) {
    setForm((f) => ({
      ...f,
      entityIds: f.entityIds.includes(id)
        ? f.entityIds.filter((e) => e !== id)
        : [...f.entityIds, id],
    }));
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Gestion des Utilisateurs
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {total} utilisateur{total !== 1 ? "s" : ""} dans le système
            </p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvel utilisateur
          </Button>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom ou email..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setSearch("");
                  setPage(1);
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
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Nom
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Email
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Titre
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Rôles
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Entités
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Dernière connexion
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      Aucun utilisateur trouvé
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-border hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold text-primary">
                              {user.firstName[0]}{user.lastName[0]}
                            </span>
                          </div>
                          <span className="font-medium">
                            {user.firstName} {user.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{user.email}</td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">
                        {user.title ?? "—"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {user.userRoles.map((ur) => (
                            <Badge key={ur.role.id} variant="secondary" className="text-xs">
                              {ur.role.label}
                            </Badge>
                          ))}
                          {user.userRoles.length === 0 && (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {user.entities.slice(0, 3).map((ue) => (
                            <Badge key={ue.entity.id} variant="outline" className="text-xs">
                              {ue.entity.code}
                            </Badge>
                          ))}
                          {user.entities.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{user.entities.length - 3}
                            </Badge>
                          )}
                          {user.entities.length === 0 && (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {user.isActive ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">
                            Actif
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-xs">
                            Inactif
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Jamais"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditDialog(user)}
                            title="Modifier"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${user.isActive ? "text-red-500" : "text-emerald-600"}`}
                            onClick={() => handleToggleActive(user)}
                            title={user.isActive ? "Désactiver" : "Activer"}
                          >
                            {user.isActive ? (
                              <UserX className="h-4 w-4" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
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

        {/* Pagination */}
        {total > pageSize && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Affichage {(page - 1) * pageSize + 1}–
              {Math.min(page * pageSize, total)} sur {total}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * pageSize >= total}
                onClick={() => setPage((p) => p + 1)}
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {formError && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Prénom *</Label>
                <Input
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                  placeholder="Prénom"
                />
              </div>
              <div className="space-y-2">
                <Label>Nom *</Label>
                <Input
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                  placeholder="Nom de famille"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="email@example.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+33 6 12 34 56 78"
                />
              </div>
              <div className="space-y-2">
                <Label>Titre / Fonction</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Directeur Audit..."
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="user-active"
                checked={form.isActive}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
              />
              <Label htmlFor="user-active">Compte actif</Label>
            </div>

            {roles.length > 0 && (
              <div className="space-y-2">
                <Label>Rôles</Label>
                <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                  {roles.map((role) => (
                    <div key={role.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`role-${role.id}`}
                        checked={form.roleIds.includes(role.id)}
                        onCheckedChange={() => toggleRoleId(role.id)}
                      />
                      <Label htmlFor={`role-${role.id}`} className="font-normal cursor-pointer">
                        {role.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {entities.length > 0 && (
              <div className="space-y-2">
                <Label>Entités</Label>
                <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                  {entities.map((entity) => (
                    <div key={entity.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`entity-${entity.id}`}
                        checked={form.entityIds.includes(entity.id)}
                        onCheckedChange={() => toggleEntityId(entity.id)}
                      />
                      <Label htmlFor={`entity-${entity.id}`} className="font-normal cursor-pointer">
                        {entity.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
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

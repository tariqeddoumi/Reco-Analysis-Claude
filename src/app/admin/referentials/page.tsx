"use client";

import { useEffect, useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Database, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Referential {
  id: string;
  code: string;
  label: string;
  isActive: boolean;
  [key: string]: unknown;
}

interface FieldDef {
  key: string;
  label: string;
  type: "text" | "number" | "color" | "boolean";
  required?: boolean;
  placeholder?: string;
  renderCell?: (v: unknown) => React.ReactNode;
}

interface RefConfig {
  title: string;
  fields: FieldDef[];
  tableColumns: { key: string; label: string; render?: (v: unknown) => React.ReactNode }[];
}

// ─── Config ───────────────────────────────────────────────────────────────────

const colorCell = (v: unknown) =>
  v ? (
    <span className="flex items-center gap-1.5">
      <span className="inline-block w-4 h-4 rounded-full border border-border flex-shrink-0" style={{ backgroundColor: String(v) }} />
      <span className="text-xs font-mono text-muted-foreground">{String(v)}</span>
    </span>
  ) : <span className="text-muted-foreground">—</span>;

const boolCell = (v: unknown, yes = "Oui", no = "Non") =>
  v ? <Badge variant="default" className="text-xs">{yes}</Badge>
    : <Badge variant="secondary" className="text-xs">{no}</Badge>;

const REF_CONFIGS: Record<string, RefConfig> = {
  recommendationStatuses: {
    title: "Statuts Recommandations",
    tableColumns: [
      { key: "code", label: "Code" },
      { key: "label", label: "Libellé" },
      { key: "rank", label: "Rang" },
      { key: "color", label: "Couleur", render: colorCell },
      { key: "isOpen", label: "Ouverte", render: (v) => boolCell(v) },
      { key: "isFinal", label: "Finale", render: (v) => boolCell(v) },
    ],
    fields: [
      { key: "code", label: "Code", type: "text", required: true, placeholder: "EX: IN_PROGRESS" },
      { key: "label", label: "Libellé", type: "text", required: true },
      { key: "description", label: "Description", type: "text" },
      { key: "rank", label: "Rang", type: "number" },
      { key: "color", label: "Couleur (hex)", type: "color" },
      { key: "isOpen", label: "Statut ouvert", type: "boolean" },
      { key: "isFinal", label: "Statut final", type: "boolean" },
    ],
  },
  actionStatuses: {
    title: "Statuts Actions",
    tableColumns: [
      { key: "code", label: "Code" },
      { key: "label", label: "Libellé" },
      { key: "rank", label: "Rang" },
      { key: "color", label: "Couleur", render: colorCell },
      { key: "isFinal", label: "Finale", render: (v) => boolCell(v) },
    ],
    fields: [
      { key: "code", label: "Code", type: "text", required: true },
      { key: "label", label: "Libellé", type: "text", required: true },
      { key: "description", label: "Description", type: "text" },
      { key: "rank", label: "Rang", type: "number" },
      { key: "color", label: "Couleur (hex)", type: "color" },
      { key: "isFinal", label: "Statut final", type: "boolean" },
    ],
  },
  missionStatuses: {
    title: "Statuts Missions",
    tableColumns: [
      { key: "code", label: "Code" },
      { key: "label", label: "Libellé" },
      { key: "rank", label: "Rang" },
      { key: "color", label: "Couleur", render: colorCell },
      { key: "isFinal", label: "Finale", render: (v) => boolCell(v) },
    ],
    fields: [
      { key: "code", label: "Code", type: "text", required: true },
      { key: "label", label: "Libellé", type: "text", required: true },
      { key: "description", label: "Description", type: "text" },
      { key: "rank", label: "Rang", type: "number" },
      { key: "color", label: "Couleur (hex)", type: "color" },
      { key: "isFinal", label: "Statut final", type: "boolean" },
    ],
  },
  missionTypes: {
    title: "Types de Missions",
    tableColumns: [
      { key: "code", label: "Code" },
      { key: "label", label: "Libellé" },
      { key: "description", label: "Description" },
    ],
    fields: [
      { key: "code", label: "Code", type: "text", required: true },
      { key: "label", label: "Libellé", type: "text", required: true },
      { key: "description", label: "Description", type: "text" },
    ],
  },
  sourceTypes: {
    title: "Sources",
    tableColumns: [
      { key: "code", label: "Code" },
      { key: "label", label: "Libellé" },
      { key: "sourceCoefficient", label: "Coefficient" },
      { key: "isRegulator", label: "Régulateur", render: (v) => boolCell(v) },
    ],
    fields: [
      { key: "code", label: "Code", type: "text", required: true },
      { key: "label", label: "Libellé", type: "text", required: true },
      { key: "description", label: "Description", type: "text" },
      { key: "sourceCoefficient", label: "Coefficient source", type: "number", placeholder: "1.0" },
      { key: "isRegulator", label: "Source régulatrice", type: "boolean" },
      { key: "requiresProof", label: "Requiert une preuve", type: "boolean" },
    ],
  },
  severityLevels: {
    title: "Niveaux de Gravité",
    tableColumns: [
      { key: "code", label: "Code" },
      { key: "label", label: "Libellé" },
      { key: "numericValue", label: "Valeur", render: (v) => <Badge variant="outline">{String(v)}</Badge> },
      { key: "color", label: "Couleur", render: colorCell },
    ],
    fields: [
      { key: "code", label: "Code", type: "text", required: true },
      { key: "label", label: "Libellé", type: "text", required: true },
      { key: "numericValue", label: "Valeur numérique", type: "number", required: true },
      { key: "color", label: "Couleur (hex)", type: "color" },
      { key: "description", label: "Description", type: "text" },
    ],
  },
  probabilityLevels: {
    title: "Niveaux de Probabilité",
    tableColumns: [
      { key: "code", label: "Code" },
      { key: "label", label: "Libellé" },
      { key: "numericValue", label: "Valeur", render: (v) => <Badge variant="outline">{String(v)}</Badge> },
      { key: "color", label: "Couleur", render: colorCell },
    ],
    fields: [
      { key: "code", label: "Code", type: "text", required: true },
      { key: "label", label: "Libellé", type: "text", required: true },
      { key: "numericValue", label: "Valeur numérique", type: "number", required: true },
      { key: "color", label: "Couleur (hex)", type: "color" },
      { key: "description", label: "Description", type: "text" },
    ],
  },
  priorityLevels: {
    title: "Niveaux de Priorité",
    tableColumns: [
      { key: "code", label: "Code" },
      { key: "label", label: "Libellé" },
      { key: "scoreMin", label: "Score min" },
      { key: "scoreMax", label: "Score max" },
      { key: "color", label: "Couleur", render: colorCell },
    ],
    fields: [
      { key: "code", label: "Code", type: "text", required: true },
      { key: "label", label: "Libellé", type: "text", required: true },
      { key: "scoreMin", label: "Score minimum", type: "number", required: true },
      { key: "scoreMax", label: "Score maximum", type: "number", required: true },
      { key: "color", label: "Couleur (hex)", type: "color" },
      { key: "description", label: "Description", type: "text" },
    ],
  },
  riskTypes: {
    title: "Types de Risques",
    tableColumns: [
      { key: "code", label: "Code" },
      { key: "label", label: "Libellé" },
      { key: "category", label: "Catégorie" },
    ],
    fields: [
      { key: "code", label: "Code", type: "text", required: true },
      { key: "label", label: "Libellé", type: "text", required: true },
      { key: "category", label: "Catégorie", type: "text" },
      { key: "description", label: "Description", type: "text" },
    ],
  },
  recommendationTypes: {
    title: "Types de Recommandations",
    tableColumns: [
      { key: "code", label: "Code" },
      { key: "label", label: "Libellé" },
      { key: "category", label: "Catégorie" },
    ],
    fields: [
      { key: "code", label: "Code", type: "text", required: true },
      { key: "label", label: "Libellé", type: "text", required: true },
      { key: "category", label: "Catégorie", type: "text" },
      { key: "description", label: "Description", type: "text" },
    ],
  },
  rootCauseTypes: {
    title: "Types de Causes Racines",
    tableColumns: [
      { key: "code", label: "Code" },
      { key: "label", label: "Libellé" },
      { key: "category", label: "Catégorie" },
    ],
    fields: [
      { key: "code", label: "Code", type: "text", required: true },
      { key: "label", label: "Libellé", type: "text", required: true },
      { key: "category", label: "Catégorie", type: "text" },
      { key: "description", label: "Description", type: "text" },
    ],
  },
  evidenceTypes: {
    title: "Types de Preuves",
    tableColumns: [
      { key: "code", label: "Code" },
      { key: "label", label: "Libellé" },
      { key: "description", label: "Description" },
    ],
    fields: [
      { key: "code", label: "Code", type: "text", required: true },
      { key: "label", label: "Libellé", type: "text", required: true },
      { key: "description", label: "Description", type: "text" },
    ],
  },
  confidentialityLevels: {
    title: "Niveaux de Confidentialité",
    tableColumns: [
      { key: "code", label: "Code" },
      { key: "label", label: "Libellé" },
      { key: "rank", label: "Rang" },
      { key: "color", label: "Couleur", render: colorCell },
    ],
    fields: [
      { key: "code", label: "Code", type: "text", required: true },
      { key: "label", label: "Libellé", type: "text", required: true },
      { key: "rank", label: "Rang", type: "number" },
      { key: "color", label: "Couleur (hex)", type: "color" },
      { key: "description", label: "Description", type: "text" },
    ],
  },
  directions: {
    title: "Directions",
    tableColumns: [
      { key: "code", label: "Code" },
      { key: "label", label: "Libellé" },
    ],
    fields: [
      { key: "code", label: "Code", type: "text", required: true },
      { key: "label", label: "Libellé", type: "text", required: true },
    ],
  },
  processes: {
    title: "Processus",
    tableColumns: [
      { key: "code", label: "Code" },
      { key: "label", label: "Libellé" },
      { key: "category", label: "Catégorie" },
    ],
    fields: [
      { key: "code", label: "Code", type: "text", required: true },
      { key: "label", label: "Libellé", type: "text", required: true },
      { key: "category", label: "Catégorie", type: "text" },
    ],
  },
  complexityLevels: {
    title: "Niveaux de Complexité",
    tableColumns: [
      { key: "code", label: "Code" },
      { key: "label", label: "Libellé" },
      { key: "rank", label: "Rang" },
      { key: "description", label: "Description" },
    ],
    fields: [
      { key: "code", label: "Code", type: "text", required: true, placeholder: "EX: HIGH" },
      { key: "label", label: "Libellé", type: "text", required: true },
      { key: "rank", label: "Rang", type: "number" },
      { key: "description", label: "Description", type: "text" },
    ],
  },
  effortLevels: {
    title: "Niveaux d'Effort",
    tableColumns: [
      { key: "code", label: "Code" },
      { key: "label", label: "Libellé" },
      { key: "rank", label: "Rang" },
      { key: "description", label: "Description" },
    ],
    fields: [
      { key: "code", label: "Code", type: "text", required: true, placeholder: "EX: 1_WEEK" },
      { key: "label", label: "Libellé", type: "text", required: true },
      { key: "rank", label: "Rang", type: "number" },
      { key: "description", label: "Description", type: "text" },
    ],
  },
  evidenceStatuses: {
    title: "Statuts de Preuves",
    tableColumns: [
      { key: "code", label: "Code" },
      { key: "label", label: "Libellé" },
      { key: "rank", label: "Rang" },
      { key: "color", label: "Couleur", render: colorCell },
      { key: "isFinal", label: "Final", render: (v) => boolCell(v) },
    ],
    fields: [
      { key: "code", label: "Code", type: "text", required: true, placeholder: "EX: ACCEPTED" },
      { key: "label", label: "Libellé", type: "text", required: true },
      { key: "rank", label: "Rang", type: "number" },
      { key: "color", label: "Couleur (hex)", type: "color" },
      { key: "description", label: "Description", type: "text" },
      { key: "isFinal", label: "Statut final", type: "boolean" },
    ],
  },
  workflowSteps: {
    title: "Étapes de Workflow",
    tableColumns: [
      { key: "code", label: "Code" },
      { key: "label", label: "Libellé" },
      { key: "entityType", label: "Type d'entité" },
      { key: "fromStatus", label: "De statut" },
      { key: "toStatus", label: "Vers statut" },
      { key: "rank", label: "Rang" },
    ],
    fields: [
      { key: "code", label: "Code", type: "text", required: true },
      { key: "label", label: "Libellé", type: "text", required: true },
      { key: "entityType", label: "Type d'entité", type: "text", required: true, placeholder: "EX: RECOMMENDATION" },
      { key: "fromStatus", label: "Statut source", type: "text", required: true, placeholder: "EX: DRAFT" },
      { key: "toStatus", label: "Statut cible", type: "text", required: true, placeholder: "EX: IN_PROGRESS" },
      { key: "rank", label: "Rang", type: "number" },
      { key: "description", label: "Description", type: "text" },
      { key: "requiresProof", label: "Preuve obligatoire", type: "boolean" },
      { key: "requiresComment", label: "Commentaire obligatoire", type: "boolean" },
      { key: "requiresHierarchy", label: "Validation hiérarchique", type: "boolean" },
    ],
  },
  escalationRules: {
    title: "Règles d'Escalade",
    tableColumns: [
      { key: "code", label: "Code" },
      { key: "label", label: "Libellé" },
      { key: "daysBeforeDue", label: "Jours avant échéance" },
      { key: "escalationLevel", label: "Niveau" },
    ],
    fields: [
      { key: "code", label: "Code", type: "text", required: true },
      { key: "label", label: "Libellé", type: "text", required: true },
      { key: "daysBeforeDue", label: "Jours avant échéance", type: "number", required: true, placeholder: "EX: 7" },
      { key: "escalationLevel", label: "Niveau d'escalade", type: "number" },
      { key: "description", label: "Description", type: "text" },
    ],
  },
};

// ─── Field renderer in dialog ──────────────────────────────────────────────────

function FieldInput({
  field,
  value,
  onChange,
  disabled,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
}) {
  if (field.type === "boolean") {
    return (
      <div className="flex items-center gap-2">
        <Switch
          checked={Boolean(value)}
          onCheckedChange={onChange}
          disabled={disabled}
        />
        <span className="text-sm text-muted-foreground">{Boolean(value) ? "Oui" : "Non"}</span>
      </div>
    );
  }
  if (field.type === "color") {
    return (
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={String(value || "#3b82f6")}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-10 h-9 rounded border border-input cursor-pointer p-0.5"
        />
        <Input
          value={String(value || "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#3b82f6"
          disabled={disabled}
          className="font-mono flex-1"
        />
      </div>
    );
  }
  return (
    <Input
      type={field.type === "number" ? "number" : "text"}
      value={value === null || value === undefined ? "" : String(value)}
      onChange={(e) => onChange(field.type === "number" ? e.target.value : e.target.value)}
      placeholder={field.placeholder}
      disabled={disabled}
      required={field.required}
    />
  );
}

// ─── Create / Edit dialog ─────────────────────────────────────────────────────

function RefDialog({
  open,
  onClose,
  config,
  refType,
  editItem,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  config: RefConfig;
  refType: string;
  editItem: Referential | null;
  onSaved: (item: Referential) => void;
}) {
  const isEdit = Boolean(editItem);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (editItem) {
        setForm({ ...editItem });
      } else {
        const defaults: Record<string, unknown> = {};
        config.fields.forEach((f) => {
          if (f.type === "boolean") defaults[f.key] = false;
          else if (f.type === "number") defaults[f.key] = 0;
          else defaults[f.key] = "";
        });
        setForm(defaults);
      }
      setError(null);
    }
  }, [open, editItem, config.fields]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const url = isEdit
        ? `/api/admin/ref/${refType}/${editItem!.id}`
        : `/api/admin/ref/${refType}`;
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur lors de la sauvegarde");
        return;
      }
      onSaved(data);
      onClose();
      toast.success(isEdit ? "Élément mis à jour" : "Élément créé");
    } catch {
      setError("Erreur réseau");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `Modifier — ${editItem?.label}` : `Nouveau — ${config.title}`}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {config.fields.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label htmlFor={field.key} className="text-sm font-medium">
                {field.label}
                {field.required && <span className="text-destructive ml-0.5">*</span>}
              </Label>
              <FieldInput
                field={field}
                value={form[field.key]}
                onChange={(v) => setForm((prev) => ({ ...prev, [field.key]: v }))}
                disabled={isEdit && field.key === "code"}
              />
            </div>
          ))}

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/5 rounded p-2">
              <XCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ReferentialsPage() {
  const [activeTab, setActiveTab] = useState("recommendationStatuses");
  const [data, setData] = useState<Record<string, Referential[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Referential | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchTab = useCallback(async (type: string, force = false) => {
    if ((data[type] && !force) || loading[type]) return;
    setLoading((prev) => ({ ...prev, [type]: true }));
    try {
      const res = await fetch(`/api/admin/ref/${type}`);
      if (res.ok) {
        const json = await res.json();
        setData((prev) => ({ ...prev, [type]: json }));
      }
    } finally {
      setLoading((prev) => ({ ...prev, [type]: false }));
    }
  }, [data, loading]);

  useEffect(() => {
    fetchTab(activeTab);
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearch("");
  };

  const handleSaved = (item: Referential) => {
    setData((prev) => {
      const list = prev[activeTab] ?? [];
      const idx = list.findIndex((r) => r.id === item.id);
      if (idx >= 0) {
        const updated = [...list];
        updated[idx] = item;
        return { ...prev, [activeTab]: updated };
      }
      return { ...prev, [activeTab]: [...list, item] };
    });
  };

  const handleToggleActive = async (item: Referential) => {
    setToggling(item.id);
    try {
      const res = await fetch(`/api/admin/ref/${activeTab}/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      if (res.ok) {
        const updated = await res.json();
        handleSaved(updated);
        toast.success(updated.isActive ? "Élément activé" : "Élément désactivé");
      } else {
        toast.error("Erreur lors du changement de statut");
      }
    } finally {
      setToggling(null);
    }
  };

  const currentConfig = REF_CONFIGS[activeTab];
  const currentData = (data[activeTab] ?? []).filter(
    (item) =>
      !search ||
      item.label.toLowerCase().includes(search.toLowerCase()) ||
      item.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Gestion des Référentiels</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Administrez toutes les listes déroulantes de l&apos;application
            </p>
          </div>
        </div>

        {/* Search + Add */}
        <div className="flex items-center gap-3">
          <Input
            placeholder="Rechercher par code ou libellé..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          {currentConfig && (
            <Button onClick={() => { setEditItem(null); setDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="flex flex-wrap gap-1 h-auto bg-muted p-1">
            {Object.entries(REF_CONFIGS).map(([key, cfg]) => (
              <TabsTrigger key={key} value={key} className="text-xs">
                {cfg.title}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(REF_CONFIGS).map(([key, cfg]) => (
            <TabsContent key={key} value={key}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between py-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Database className="h-4 w-4 text-blue-600" />
                    {cfg.title}
                    <Badge variant="secondary">{currentData.length}</Badge>
                  </CardTitle>
                  <Button
                    size="sm"
                    onClick={() => { setEditItem(null); setDialogOpen(true); }}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Ajouter
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {loading[key] ? (
                    <div className="p-4 space-y-2">
                      {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          {cfg.tableColumns.map((col) => (
                            <TableHead key={col.key} className="text-xs font-semibold uppercase tracking-wide">
                              {col.label}
                            </TableHead>
                          ))}
                          <TableHead className="text-xs font-semibold uppercase tracking-wide">Statut</TableHead>
                          <TableHead className="w-24 text-xs font-semibold uppercase tracking-wide">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentData.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={cfg.tableColumns.length + 2}
                              className="text-center py-10 text-muted-foreground"
                            >
                              Aucun élément{search ? " correspondant à la recherche" : ""}
                            </TableCell>
                          </TableRow>
                        ) : (
                          currentData.map((item) => (
                            <TableRow key={item.id} className="group hover:bg-muted/30">
                              {cfg.tableColumns.map((col) => (
                                <TableCell key={col.key} className="text-sm py-2.5">
                                  {col.render
                                    ? col.render(item[col.key])
                                    : item[col.key] !== null && item[col.key] !== undefined
                                      ? String(item[col.key])
                                      : <span className="text-muted-foreground">—</span>}
                                </TableCell>
                              ))}
                              {/* Active toggle */}
                              <TableCell className="py-2.5">
                                <button
                                  onClick={() => handleToggleActive(item)}
                                  disabled={toggling === item.id}
                                  className="flex items-center gap-1.5 cursor-pointer"
                                  title={item.isActive ? "Désactiver" : "Activer"}
                                >
                                  {toggling === item.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                                  ) : item.isActive ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                  ) : (
                                    <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
                                  )}
                                  <Badge
                                    variant={item.isActive ? "default" : "secondary"}
                                    className="text-xs"
                                  >
                                    {item.isActive ? "Actif" : "Inactif"}
                                  </Badge>
                                </button>
                              </TableCell>
                              {/* Edit */}
                              <TableCell className="py-2.5">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => { setEditItem(item); setDialogOpen(true); }}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* Create / Edit dialog */}
        {currentConfig && (
          <RefDialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            config={currentConfig}
            refType={activeTab}
            editItem={editItem}
            onSaved={handleSaved}
          />
        )}
      </div>
    </AppLayout>
  );
}

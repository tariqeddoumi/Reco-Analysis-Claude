"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle,
  ChevronDown, ChevronUp, Loader2, ArrowLeft, RefreshCw, ArrowRight,
  GitMerge,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type DuplicateMode = "BLOCK" | "UPDATE" | "IGNORE";
type Step = "upload" | "mapping" | "preview" | "committing" | "done";

interface RowError { field: string; message: string }

interface PreviewRow {
  rowNumber: number;
  status: "VALID" | "ERROR" | "DUPLICATE";
  isDuplicate: boolean;
  errors: RowError[];
  mappedData: Record<string, unknown> | null;
  rawData: Record<string, unknown>;
  existingId?: string;
}

interface UploadResult {
  batchId: string;
  fileName: string;
  totalRows: number;
  columns: string[];
  sampleRows: Record<string, string | number | null>[];
}

interface PreviewResult {
  batchId: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  duplicateCount: number;
  rows: PreviewRow[];
}

interface CommitResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: number;
  message: string;
}

// ─── App fields definition ────────────────────────────────────────────────────

interface AppField {
  key: string;
  label: string;
  required?: boolean;
  hint?: string;
}

const APP_FIELDS: AppField[] = [
  { key: "code",               label: "Code",                          required: true },
  { key: "findingDescription", label: "Description de la constatation", required: true },
  { key: "recommendation",     label: "Recommandation",                 required: true },
  { key: "entity",             label: "Entité",                         required: true },
  { key: "issuedAt",           label: "Date d'émission",                required: true },
  { key: "status",             label: "Statut" },
  { key: "progressRate",       label: "Taux de réalisation (%)" },
  { key: "source",             label: "Source" },
  { key: "initialDueDate",     label: "Date d'échéance initiale" },
  { key: "revisedDueDate",     label: "Date d'échéance révisée" },
  { key: "closedAt",           label: "Date de clôture" },
  { key: "entityComment",      label: "Commentaire entité" },
  { key: "reportReference",    label: "Référence rapport" },
  { key: "priority",           label: "Priorité" },
  { key: "domain",             label: "Domaine" },
];

const DUPLICATE_MODE_LABELS: Record<DuplicateMode, string> = {
  BLOCK:  "Bloquer (ne pas importer les doublons)",
  UPDATE: "Mettre à jour (écraser avec les nouvelles données)",
  IGNORE: "Ignorer (conserver les données existantes)",
};

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepBar({ step }: { step: Step }) {
  const steps: { key: Step | "committing"; label: string }[] = [
    { key: "upload",   label: "Chargement" },
    { key: "mapping",  label: "Mapping" },
    { key: "preview",  label: "Prévisualisation" },
    { key: "done",     label: "Résultat" },
  ];
  const currentIdx =
    step === "committing" ? 2
    : step === "done"     ? 3
    : steps.findIndex((s) => s.key === step);

  return (
    <div className="flex items-center gap-2 text-sm">
      {steps.map((s, i) => {
        const isActive = i === currentIdx;
        const isDone   = i < currentIdx;
        return (
          <React.Fragment key={s.key}>
            {i > 0 && <div className="h-px flex-1 bg-border" />}
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap",
              isActive && "bg-primary text-primary-foreground",
              isDone   && "bg-muted text-muted-foreground",
              !isActive && !isDone && "text-muted-foreground"
            )}>
              {isDone
                ? <CheckCircle2 className="w-3.5 h-3.5" />
                : <span className="w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[10px]">{i + 1}</span>
              }
              {s.label}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RecommendationsImportPage() {
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [step,          setStep]          = React.useState<Step>("upload");
  const [isDragging,    setIsDragging]    = React.useState(false);
  const [isUploading,   setIsUploading]   = React.useState(false);
  const [uploadError,   setUploadError]   = React.useState<string | null>(null);
  const [uploadResult,  setUploadResult]  = React.useState<UploadResult | null>(null);
  const [columnMap,     setColumnMap]     = React.useState<Record<string, string>>({});
  const [isMapping,     setIsMapping]     = React.useState(false);
  const [previewResult, setPreviewResult] = React.useState<PreviewResult | null>(null);
  const [duplicateMode, setDuplicateMode] = React.useState<DuplicateMode>("BLOCK");
  const [commitResult,  setCommitResult]  = React.useState<CommitResult | null>(null);
  const [expandedRows,  setExpandedRows]  = React.useState<Set<number>>(new Set());

  // ── Auto-guess mapping on upload ──────────────────────────────────────────
  const guessMappingFromColumns = React.useCallback((columns: string[]) => {
    const normalize = (s: string) =>
      s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

    const fieldAliases: Record<string, string[]> = {
      code:               ["code", "ref", "reference", "numero", "n°"],
      findingDescription: ["description", "constatation", "finding", "observation", "description de la constatation"],
      recommendation:     ["recommandation", "recommendation", "action recommandee"],
      entity:             ["entite", "entity", "organisation", "structure"],
      issuedAt:           ["date emission", "date d emission", "date emis", "date creation", "issued"],
      status:             ["statut", "status", "etat"],
      progressRate:       ["taux", "avancement", "progress", "realisation", "taux de realisation"],
      source:             ["source", "origine"],
      initialDueDate:     ["echeance initiale", "date echeance initiale", "due date", "deadline"],
      revisedDueDate:     ["echeance revisee", "date echeance revisee", "revised"],
      closedAt:           ["cloture", "date cloture", "closed"],
      entityComment:      ["commentaire entite", "commentaire", "comment"],
      reportReference:    ["reference rapport", "rapport", "report"],
      priority:           ["priorite", "priority"],
      domain:             ["domaine", "domain"],
    };

    const guessed: Record<string, string> = {};
    for (const col of columns) {
      const normCol = normalize(col);
      let matched = false;
      for (const [field, aliases] of Object.entries(fieldAliases)) {
        if (aliases.some((a) => normCol.includes(a) || a.includes(normCol))) {
          guessed[col] = field;
          matched = true;
          break;
        }
      }
      if (!matched) guessed[col] = "_ignore";
    }
    return guessed;
  }, []);

  // ── File handling ─────────────────────────────────────────────────────────
  const handleFile = async (file: File) => {
    setUploadError(null);
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/import/recommendations/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) { setUploadError(data.error ?? "Erreur lors de l'analyse"); return; }
      setUploadResult(data);
      setColumnMap(guessMappingFromColumns(data.columns));
      setStep("mapping");
    } catch {
      setUploadError("Erreur réseau. Veuillez réessayer.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0]; if (file) handleFile(file);
  };

  // ── Apply mapping ─────────────────────────────────────────────────────────
  const handleApplyMapping = async () => {
    if (!uploadResult) return;
    setIsMapping(true); setUploadError(null);
    try {
      const res = await fetch(`/api/import/recommendations/${uploadResult.batchId}/map`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnMap }),
      });
      const data = await res.json();
      if (!res.ok) { setUploadError(data.error ?? "Erreur de validation"); return; }
      setPreviewResult(data);
      setStep("preview");
    } catch {
      setUploadError("Erreur réseau. Veuillez réessayer.");
    } finally {
      setIsMapping(false);
    }
  };

  // ── Commit ────────────────────────────────────────────────────────────────
  const handleCommit = async () => {
    if (!uploadResult) return;
    setStep("committing");
    try {
      const res = await fetch(`/api/import/recommendations/${uploadResult.batchId}/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duplicateMode }),
      });
      const data = await res.json();
      if (!res.ok) { setUploadError(data.error ?? "Erreur lors de l'import"); setStep("preview"); return; }
      setCommitResult(data); setStep("done");
    } catch {
      setUploadError("Erreur réseau."); setStep("preview");
    }
  };

  const handleReset = () => {
    setStep("upload"); setUploadResult(null); setPreviewResult(null); setCommitResult(null);
    setUploadError(null); setColumnMap({}); setExpandedRows(new Set());
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const mappedRequiredFields = APP_FIELDS.filter((f) => f.required).map((f) => f.key);
  const missingRequired = uploadResult
    ? mappedRequiredFields.filter((f) => !Object.values(columnMap).includes(f))
    : [];

  const validForImport = previewResult
    ? previewResult.rows.filter((r) =>
        r.status === "VALID" || (r.isDuplicate && duplicateMode !== "BLOCK")
      ).length
    : 0;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/recommendations")}>
          <ArrowLeft className="w-4 h-4 mr-2" />Retour
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Import Excel</h1>
          <p className="text-sm text-muted-foreground">Importer des recommandations depuis n&apos;importe quel fichier Excel</p>
        </div>
      </div>

      <StepBar step={step} />

      {/* ── STEP 1 : Upload ── */}
      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle>Sélectionner un fichier Excel</CardTitle>
            <CardDescription>Format .xlsx ou .xls — N&apos;importe quelle structure de colonnes — Max 10 Mo</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors",
                isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
              )}
            >
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              {isUploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">Analyse du fichier en cours...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileSpreadsheet className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Glisser-déposer ou cliquer pour sélectionner</p>
                    <p className="text-sm text-muted-foreground mt-1">Fichiers .xlsx ou .xls — toute structure acceptée</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                    <Upload className="w-4 h-4 mr-2" />Parcourir
                  </Button>
                </div>
              )}
            </div>
            {uploadError && (
              <div className="mt-4 flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>{uploadError}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── STEP 2 : Column mapping ── */}
      {step === "mapping" && uploadResult && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitMerge className="w-5 h-5 text-primary" />
                Mapping des colonnes
              </CardTitle>
              <CardDescription>
                Fichier : <strong>{uploadResult.fileName}</strong> — {uploadResult.totalRows} ligne(s) détectée(s).
                Associez chaque colonne Excel au champ correspondant.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Required fields reminder */}
              {missingRequired.length > 0 && (
                <div className="mb-4 flex items-start gap-2 p-3 rounded-md bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>
                    Champs obligatoires non mappés :{" "}
                    <strong>{missingRequired.map((f) => APP_FIELDS.find((a) => a.key === f)?.label ?? f).join(", ")}</strong>
                  </span>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-3 py-2 font-semibold text-xs uppercase tracking-wide w-1/3">Colonne Excel</th>
                      <th className="text-left px-3 py-2 font-semibold text-xs uppercase tracking-wide w-1/4">Exemples de valeurs</th>
                      <th className="text-left px-3 py-2 font-semibold text-xs uppercase tracking-wide w-1/3">Champ de l&apos;application</th>
                      <th className="px-3 py-2 w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {uploadResult.columns.map((col) => {
                      const samples = uploadResult.sampleRows
                        .map((r) => r[col])
                        .filter((v) => v !== null && v !== "")
                        .slice(0, 3);
                      const mapped = columnMap[col];
                      const isMappedToRequired = mapped && mapped !== "_ignore" && APP_FIELDS.find((f) => f.key === mapped)?.required;

                      return (
                        <tr key={col} className={cn("hover:bg-muted/20 transition-colors", isMappedToRequired && "bg-green-50/50")}>
                          <td className="px-3 py-2.5">
                            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{col}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex flex-wrap gap-1">
                              {samples.length > 0
                                ? samples.map((s, i) => (
                                    <span key={i} className="text-xs text-muted-foreground truncate max-w-[120px]" title={String(s)}>
                                      {String(s).substring(0, 30)}{String(s).length > 30 ? "…" : ""}
                                    </span>
                                  ))
                                : <span className="text-xs text-muted-foreground italic">vide</span>
                              }
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <Select
                              value={columnMap[col] ?? "_ignore"}
                              onValueChange={(v) => setColumnMap((prev) => ({ ...prev, [col]: v }))}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="_ignore">
                                  <span className="text-muted-foreground">— Ignorer cette colonne —</span>
                                </SelectItem>
                                {APP_FIELDS.map((f) => {
                                  const alreadyUsed = Object.entries(columnMap).some(([c, v]) => c !== col && v === f.key);
                                  return (
                                    <SelectItem key={f.key} value={f.key} disabled={alreadyUsed}>
                                      <span className={cn(f.required && "font-medium")}>
                                        {f.label}
                                        {f.required && <span className="text-destructive ml-1">*</span>}
                                        {alreadyUsed && <span className="text-muted-foreground ml-1">(déjà mappé)</span>}
                                      </span>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {mapped && mapped !== "_ignore"
                              ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                              : <XCircle className="w-4 h-4 text-muted-foreground/40 mx-auto" />
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {uploadError && (
                <div className="mt-4 flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                  <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{uploadError}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={handleReset}>
              <ArrowLeft className="w-4 h-4 mr-2" />Nouveau fichier
            </Button>
            <Button
              onClick={handleApplyMapping}
              disabled={isMapping || missingRequired.length > 0}
            >
              {isMapping
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Validation en cours...</>
                : <><ArrowRight className="w-4 h-4 mr-2" />Valider le mapping</>
              }
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 3 : Preview ── */}
      {(step === "preview" || step === "committing") && previewResult && uploadResult && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total lignes", value: previewResult.totalRows, color: "" },
              { label: "Valides",      value: previewResult.validRows,      color: "text-green-600" },
              { label: "Erreurs",      value: previewResult.errorRows,      color: "text-destructive" },
              { label: "Doublons",     value: previewResult.duplicateCount, color: "text-yellow-600" },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
                  <p className={cn("text-2xl font-bold mt-1", s.color)}>{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Duplicate mode */}
          {previewResult.duplicateCount > 0 && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{previewResult.duplicateCount} doublon(s) détecté(s)</p>
                    <p className="text-xs text-muted-foreground mt-0.5 mb-3">Des recommandations avec ces codes existent déjà.</p>
                    <Select value={duplicateMode} onValueChange={(v) => setDuplicateMode(v as DuplicateMode)}>
                      <SelectTrigger className="w-full md:w-auto min-w-72">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(["BLOCK", "UPDATE", "IGNORE"] as DuplicateMode[]).map((m) => (
                          <SelectItem key={m} value={m}>{DUPLICATE_MODE_LABELS[m]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Row table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Aperçu des données</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border max-h-[480px] overflow-y-auto">
                {previewResult.rows.map((row) => {
                  const isExpanded = expandedRows.has(row.rowNumber);
                  return (
                    <div key={row.rowNumber} className="px-4 py-3">
                      <div className="flex items-center gap-3 cursor-pointer" onClick={() => {
                        setExpandedRows((prev) => {
                          const next = new Set(prev);
                          next.has(row.rowNumber) ? next.delete(row.rowNumber) : next.add(row.rowNumber);
                          return next;
                        });
                      }}>
                        {row.status === "VALID" && !row.isDuplicate && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
                        {row.isDuplicate  && <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
                        {row.status === "ERROR"   && <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />}
                        <span className="text-xs text-muted-foreground w-10 flex-shrink-0">L.{row.rowNumber}</span>
                        <span className="text-sm font-medium flex-1 truncate">
                          {(row.mappedData?.code as string) || (row.rawData?.code as string) || "—"}
                        </span>
                        <span className="text-xs text-muted-foreground flex-1 truncate hidden md:block">
                          {(row.mappedData?.findingDescription as string)?.substring(0, 60) || ""}
                        </span>
                        <div className="flex items-center gap-2">
                          {row.isDuplicate && <Badge variant="outline" className="text-yellow-600 border-yellow-300 text-xs">Doublon</Badge>}
                          {row.status === "ERROR" && <Badge variant="destructive" className="text-xs">{row.errors.length} erreur(s)</Badge>}
                          {row.status === "VALID" && !row.isDuplicate && <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Valide</Badge>}
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="mt-3 ml-7 space-y-2">
                          {row.errors.map((err, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-destructive bg-destructive/5 rounded px-2 py-1.5">
                              <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              <span><span className="font-medium">{err.field}:</span> {err.message}</span>
                            </div>
                          ))}
                          {row.mappedData && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                              {Object.entries(row.mappedData).filter(([, v]) => v !== null && v !== "").map(([k, v]) => (
                                <div key={k}><span className="font-medium text-foreground">{k}:</span> <span className="text-muted-foreground">{String(v)}</span></div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {uploadError && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{uploadError}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset} disabled={step === "committing"}>
                <ArrowLeft className="w-4 h-4 mr-2" />Nouveau fichier
              </Button>
              <Button variant="outline" onClick={() => setStep("mapping")} disabled={step === "committing"}>
                <ArrowLeft className="w-4 h-4 mr-2" />Revoir le mapping
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{validForImport} ligne(s) seront importées</span>
              <Button onClick={handleCommit} disabled={step === "committing" || validForImport === 0}>
                {step === "committing"
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Import en cours...</>
                  : <><Upload className="w-4 h-4 mr-2" />Lancer l&apos;import</>
                }
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 4 : Done ── */}
      {step === "done" && commitResult && (
        <Card>
          <CardContent className="pt-8 pb-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold">Import terminé</h2>
              <p className="text-muted-foreground text-sm">{commitResult.message}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 max-w-xl mx-auto">
                {[
                  { label: "Créées",       value: commitResult.imported, color: "text-green-600" },
                  { label: "Mises à jour", value: commitResult.updated,  color: "text-blue-600" },
                  { label: "Ignorées",     value: commitResult.skipped,  color: "text-yellow-600" },
                  { label: "Erreurs",      value: commitResult.errors,   color: "text-destructive" },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="flex justify-center gap-3 mt-6">
                <Button variant="outline" onClick={handleReset}>
                  <RefreshCw className="w-4 h-4 mr-2" />Nouvel import
                </Button>
                <Button onClick={() => router.push("/recommendations")}>
                  Voir les recommandations
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

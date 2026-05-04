"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Loader2,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type DuplicateMode = "BLOCK" | "UPDATE" | "IGNORE";
type Step = "upload" | "preview" | "committing" | "done";

interface RowError {
  field: string;
  message: string;
}

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

const DUPLICATE_MODE_LABELS: Record<DuplicateMode, string> = {
  BLOCK: "Bloquer (ne pas importer les doublons)",
  UPDATE: "Mettre à jour (écraser avec les nouvelles données)",
  IGNORE: "Ignorer (conserver les données existantes)",
};

export default function RecommendationsImportPage() {
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [step, setStep] = React.useState<Step>("upload");
  const [isDragging, setIsDragging] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [uploadResult, setUploadResult] = React.useState<UploadResult | null>(null);
  const [duplicateMode, setDuplicateMode] = React.useState<DuplicateMode>("BLOCK");
  const [commitResult, setCommitResult] = React.useState<CommitResult | null>(null);
  const [expandedRows, setExpandedRows] = React.useState<Set<number>>(new Set());

  const handleFile = async (file: File) => {
    setUploadError(null);
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/import/recommendations/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error ?? "Erreur lors de l'analyse du fichier");
        return;
      }
      setUploadResult(data);
      setStep("preview");
    } catch {
      setUploadError("Erreur réseau. Veuillez réessayer.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

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
      if (!res.ok) {
        setUploadError(data.error ?? "Erreur lors de l'import");
        setStep("preview");
        return;
      }
      setCommitResult(data);
      setStep("done");
    } catch {
      setUploadError("Erreur réseau. Veuillez réessayer.");
      setStep("preview");
    }
  };

  const handleReset = () => {
    setStep("upload");
    setUploadResult(null);
    setCommitResult(null);
    setUploadError(null);
    setExpandedRows(new Set());
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const toggleRow = (rowNumber: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowNumber)) next.delete(rowNumber);
      else next.add(rowNumber);
      return next;
    });
  };

  const validForImport = uploadResult
    ? uploadResult.rows.filter((r) =>
        r.status === "VALID" ||
        (r.isDuplicate && duplicateMode !== "BLOCK")
      ).length
    : 0;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/recommendations")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Import Excel</h1>
          <p className="text-sm text-muted-foreground">
            Importer des recommandations depuis un fichier Excel
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {(["upload", "preview", "done"] as const).map((s, i) => {
          const labels = ["Chargement", "Prévisualisation", "Résultat"];
          const currentIdx = step === "committing" ? 1 : ["upload", "preview", "done"].indexOf(step);
          const isActive = i === currentIdx;
          const isDone = i < currentIdx;
          return (
            <React.Fragment key={s}>
              {i > 0 && <div className="h-px flex-1 bg-border" />}
              <div
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
                  isActive && "bg-primary text-primary-foreground",
                  isDone && "bg-muted text-muted-foreground",
                  !isActive && !isDone && "text-muted-foreground"
                )}
              >
                {isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[10px]">
                    {i + 1}
                  </span>
                )}
                {labels[i]}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Step: Upload */}
      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle>Sélectionner un fichier Excel</CardTitle>
            <CardDescription>
              Format accepté: .xlsx ou .xls — Feuille: "Suivi des recommandations" — Max 10 Mo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleInputChange}
              />
              {isUploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">Analyse en cours...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileSpreadsheet className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      Glisser-déposer ou cliquer pour sélectionner
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Fichiers .xlsx ou .xls uniquement
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                    <Upload className="w-4 h-4 mr-2" />
                    Parcourir
                  </Button>
                </div>
              )}
            </div>

            {uploadError && (
              <div className="mt-4 flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step: Preview */}
      {(step === "preview" || step === "committing") && uploadResult && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Total lignes</p>
                <p className="text-2xl font-bold mt-1">{uploadResult.totalRows}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Valides</p>
                <p className="text-2xl font-bold mt-1 text-green-600">{uploadResult.validRows}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Erreurs</p>
                <p className="text-2xl font-bold mt-1 text-destructive">{uploadResult.errorRows}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Doublons</p>
                <p className="text-2xl font-bold mt-1 text-yellow-600">{uploadResult.duplicateCount}</p>
              </CardContent>
            </Card>
          </div>

          {/* Duplicate mode selector */}
          {uploadResult.duplicateCount > 0 && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {uploadResult.duplicateCount} doublon(s) détecté(s)
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                      Des recommandations avec les mêmes codes existent déjà. Choisissez le comportement:
                    </p>
                    <Select value={duplicateMode} onValueChange={(v) => setDuplicateMode(v as DuplicateMode)}>
                      <SelectTrigger className="w-full md:w-auto min-w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(["BLOCK", "UPDATE", "IGNORE"] as DuplicateMode[]).map((mode) => (
                          <SelectItem key={mode} value={mode}>
                            {DUPLICATE_MODE_LABELS[mode]}
                          </SelectItem>
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
              <CardTitle className="text-base">Aperçu des données ({uploadResult.rows.length} lignes)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border max-h-[480px] overflow-y-auto">
                {uploadResult.rows.map((row) => (
                  <div key={row.rowNumber} className="px-4 py-3">
                    <div
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={() => toggleRow(row.rowNumber)}
                    >
                      {row.status === "VALID" && !row.isDuplicate && (
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      )}
                      {row.isDuplicate && (
                        <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                      )}
                      {row.status === "ERROR" && (
                        <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                      )}

                      <span className="text-xs text-muted-foreground w-12 flex-shrink-0">
                        L.{row.rowNumber}
                      </span>

                      <span className="text-sm font-medium flex-1 truncate">
                        {(row.mappedData?.code as string) ||
                          (row.rawData?.code as string) ||
                          "—"}
                      </span>

                      <span className="text-xs text-muted-foreground flex-1 truncate hidden md:block">
                        {(row.mappedData?.findingDescription as string) ||
                          (row.rawData?.findingDescription as string) ||
                          ""}
                      </span>

                      <div className="flex items-center gap-2">
                        {row.isDuplicate && (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-300 text-xs">
                            Doublon
                          </Badge>
                        )}
                        {row.status === "ERROR" && (
                          <Badge variant="destructive" className="text-xs">
                            {row.errors.length} erreur(s)
                          </Badge>
                        )}
                        {row.status === "VALID" && !row.isDuplicate && (
                          <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                            Valide
                          </Badge>
                        )}
                        {expandedRows.has(row.rowNumber) ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {expandedRows.has(row.rowNumber) && (
                      <div className="mt-3 ml-7 space-y-2">
                        {row.errors.length > 0 && (
                          <div className="space-y-1">
                            {row.errors.map((err, i) => (
                              <div
                                key={i}
                                className="flex items-start gap-2 text-xs text-destructive bg-destructive/5 rounded px-2 py-1.5"
                              >
                                <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                <span>
                                  <span className="font-medium">{err.field}:</span> {err.message}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        {row.mappedData && (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-muted-foreground">
                            {Object.entries(row.mappedData)
                              .filter(([, v]) => v !== null && v !== "")
                              .map(([k, v]) => (
                                <div key={k}>
                                  <span className="font-medium text-foreground">{k}:</span>{" "}
                                  <span>{String(v)}</span>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {uploadError && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={handleReset} disabled={step === "committing"}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Nouveau fichier
            </Button>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {validForImport} ligne(s) seront importées
              </span>
              <Button
                onClick={handleCommit}
                disabled={step === "committing" || validForImport === 0}
              >
                {step === "committing" ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Import en cours...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Lancer l&apos;import
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step: Done */}
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
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{commitResult.imported}</p>
                  <p className="text-xs text-muted-foreground">Créées</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{commitResult.updated}</p>
                  <p className="text-xs text-muted-foreground">Mises à jour</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600">{commitResult.skipped}</p>
                  <p className="text-xs text-muted-foreground">Ignorées</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-destructive">{commitResult.errors}</p>
                  <p className="text-xs text-muted-foreground">Erreurs</p>
                </div>
              </div>

              <div className="flex justify-center gap-3 mt-6">
                <Button variant="outline" onClick={handleReset}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Nouvel import
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

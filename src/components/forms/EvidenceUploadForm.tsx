"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { CheckCircle2, Upload, AlertCircle, FileText } from "lucide-react";

interface EvidenceType {
  id: string;
  code: string;
  label: string;
}

interface EvidenceUploadFormProps {
  recommendationId?: string;
  actionId?: string;
  onSuccess: () => void;
}

export function EvidenceUploadForm({
  recommendationId,
  actionId,
  onSuccess,
}: EvidenceUploadFormProps) {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [evidenceTypeId, setEvidenceTypeId] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [evidenceTypes, setEvidenceTypes] = React.useState<EvidenceType[]>([]);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    fetch("/api/admin/referentials?type=all")
      .then((r) => r.json())
      .then((data) => setEvidenceTypes(data.evidenceTypes ?? []))
      .catch(console.error);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Le titre est obligatoire.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Mock file upload: in production this would go to Supabase storage
      let fileName: string | undefined;
      let fileUrl: string | undefined;
      let fileSize: number | undefined;
      let mimeType: string | undefined;

      if (file) {
        // Simulate upload delay
        await new Promise((resolve) => setTimeout(resolve, 400));
        fileName = file.name;
        fileUrl = `https://storage.example.com/evidences/${Date.now()}_${file.name}`;
        fileSize = file.size;
        mimeType = file.type;
      }

      const res = await fetch("/api/evidences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          recommendationId,
          actionId,
          evidenceTypeId: evidenceTypeId || undefined,
          fileName,
          fileUrl,
          fileSize,
          mimeType,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erreur lors du dépôt");
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <CheckCircle2 className="h-12 w-12 text-emerald-500" />
        <p className="text-sm font-medium text-emerald-700">Preuve déposée avec succès !</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive" className="flex items-center gap-2 text-sm">
          <AlertCircle className="h-4 w-4" />
          {error}
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="ev-title">
          Titre <span className="text-destructive">*</span>
        </Label>
        <Input
          id="ev-title"
          placeholder="Intitulé de la preuve"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ev-desc">Description</Label>
        <Textarea
          id="ev-desc"
          placeholder="Description ou contexte de la preuve..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Type de preuve</Label>
        <Select value={evidenceTypeId} onValueChange={setEvidenceTypeId}>
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
        <Label>Fichier joint</Label>
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
        >
          {file ? (
            <div className="flex items-center justify-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">{file.name}</span>
              <span className="text-xs text-muted-foreground">
                ({(file.size / 1024).toFixed(0)} Ko)
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Cliquer pour sélectionner un fichier
              </p>
              <p className="text-xs text-muted-foreground">PDF, Word, Excel, Images...</p>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Upload className="h-4 w-4 mr-2 animate-spin" />
              Dépôt en cours...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Déposer la preuve
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

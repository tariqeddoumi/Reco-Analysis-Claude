"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { missionSchema, MissionFormData } from "@/lib/validators/mission";
import { ChevronRight, Home, Save, X, AlertCircle, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface Referential { id: string; code: string; label: string; }
interface ReferentialsData {
  missionTypes?: Referential[];
  sources?: Referential[];
  entities?: Referential[];
  statuses?: Referential[];
  confidentialityLevels?: Referential[];
  users?: Array<{ id: string; firstName: string; lastName: string }>;
}

function FormField({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />{error}
        </p>
      )}
    </div>
  );
}

function toDateInput(s: string | null | undefined): string {
  if (!s) return "";
  return s.split("T")[0];
}

export default function EditMissionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [referentials, setReferentials] = React.useState<ReferentialsData>({});
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<MissionFormData>({
    resolver: zodResolver(missionSchema),
  });

  React.useEffect(() => {
    fetch("/api/admin/referentials?types=missionTypes,sources,entities,statuses,confidentialityLevels,users")
      .then((r) => r.json())
      .then(setReferentials)
      .catch(console.error);
  }, []);

  React.useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    fetch(`/api/missions/${id}`)
      .then((r) => r.json())
      .then((data) => {
        reset({
          reference: data.reference ?? "",
          title: data.title ?? "",
          description: data.description ?? "",
          missionTypeId: data.missionTypeId ?? "",
          sourceId: data.sourceId ?? "",
          issuingAuthority: data.issuingAuthority ?? "",
          entityId: data.entityId ?? "",
          scope: data.scope ?? "",
          periodCovered: data.periodCovered ?? "",
          startDate: toDateInput(data.startDate),
          endDate: toDateInput(data.endDate),
          reportReceivedAt: toDateInput(data.reportReceivedAt),
          reportValidatedAt: toDateInput(data.reportValidatedAt),
          responsibleId: data.responsibleId ?? "",
          confidentialityLevelId: data.confidentialityLevelId ?? "",
          statusId: data.statusId ?? "",
          observations: data.observations ?? "",
        });
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [id, reset]);

  const onSubmit = async (data: MissionFormData) => {
    setIsSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch(`/api/missions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? "Erreur lors de la mise à jour");
      }
      router.push(`/missions/${id}`);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-4 max-w-4xl mx-auto">
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-8 w-80" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <button onClick={() => router.push("/")} className="flex items-center gap-1 hover:text-foreground transition-colors">
            <Home className="h-3.5 w-3.5" />Dashboard
          </button>
          <ChevronRight className="h-3.5 w-3.5" />
          <button onClick={() => router.push("/missions")} className="hover:text-foreground transition-colors">Missions</button>
          <ChevronRight className="h-3.5 w-3.5" />
          <button onClick={() => router.push(`/missions/${id}`)} className="hover:text-foreground transition-colors">Détail</button>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">Modifier</span>
        </nav>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Pencil className="h-5 w-5 text-primary" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Modifier la mission</h1>
              <p className="text-sm text-muted-foreground mt-1">Mettre à jour les informations de la mission</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(`/missions/${id}`)} disabled={isSubmitting}>
              <X className="h-4 w-4 mr-2" />Annuler
            </Button>
            <Button form="mission-edit-form" type="submit" disabled={isSubmitting} className="gap-2">
              <Save className="h-4 w-4" />
              {isSubmitting ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </div>

        {serverError && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />{serverError}
          </div>
        )}

        <form id="mission-edit-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Identification</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormField label="Référence" required error={errors.reference?.message}>
                <Input {...register("reference")} placeholder="ex. MISS-2025-001" className={cn(errors.reference && "border-destructive")} />
              </FormField>
              <FormField label="Type de mission" required error={errors.missionTypeId?.message}>
                <Controller name="missionTypeId" control={control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className={cn(errors.missionTypeId && "border-destructive")}><SelectValue placeholder="Sélectionner un type" /></SelectTrigger>
                    <SelectContent>{referentials.missionTypes?.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              </FormField>
              <div className="md:col-span-2">
                <FormField label="Libellé" required error={errors.title?.message}>
                  <Input {...register("title")} placeholder="Titre de la mission" className={cn(errors.title && "border-destructive")} />
                </FormField>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Source & Entité</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormField label="Source" required error={errors.sourceId?.message}>
                <Controller name="sourceId" control={control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className={cn(errors.sourceId && "border-destructive")}><SelectValue placeholder="Sélectionner une source" /></SelectTrigger>
                    <SelectContent>{referentials.sources?.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              </FormField>
              <FormField label="Autorité émettrice" error={errors.issuingAuthority?.message}>
                <Input {...register("issuingAuthority")} placeholder="ex. ACPR, BCE..." />
              </FormField>
              <FormField label="Entité" required error={errors.entityId?.message}>
                <Controller name="entityId" control={control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className={cn(errors.entityId && "border-destructive")}><SelectValue placeholder="Sélectionner une entité" /></SelectTrigger>
                    <SelectContent>{referentials.entities?.map((e) => <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              </FormField>
              <FormField label="Périmètre" error={errors.scope?.message}>
                <Input {...register("scope")} placeholder="Périmètre couvert" />
              </FormField>
              <div className="md:col-span-2">
                <FormField label="Période couverte" error={errors.periodCovered?.message}>
                  <Input {...register("periodCovered")} placeholder="ex. 2024, T1-T2 2025..." />
                </FormField>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dates</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormField label="Date de début" error={errors.startDate?.message}>
                <Input {...register("startDate")} type="date" />
              </FormField>
              <FormField label="Date de fin" error={errors.endDate?.message}>
                <Input {...register("endDate")} type="date" />
              </FormField>
              <FormField label="Rapport reçu le" error={errors.reportReceivedAt?.message}>
                <Input {...register("reportReceivedAt")} type="date" />
              </FormField>
              <FormField label="Rapport validé le" error={errors.reportValidatedAt?.message}>
                <Input {...register("reportValidatedAt")} type="date" />
              </FormField>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Administration</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <FormField label="Responsable" required error={errors.responsibleId?.message}>
                <Controller name="responsibleId" control={control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className={cn(errors.responsibleId && "border-destructive")}><SelectValue placeholder="Responsable" /></SelectTrigger>
                    <SelectContent>{referentials.users?.map((u) => <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              </FormField>
              <FormField label="Niveau de confidentialité" required error={errors.confidentialityLevelId?.message}>
                <Controller name="confidentialityLevelId" control={control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className={cn(errors.confidentialityLevelId && "border-destructive")}><SelectValue placeholder="Confidentialité" /></SelectTrigger>
                    <SelectContent>{referentials.confidentialityLevels?.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              </FormField>
              <FormField label="Statut" required error={errors.statusId?.message}>
                <Controller name="statusId" control={control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className={cn(errors.statusId && "border-destructive")}><SelectValue placeholder="Statut" /></SelectTrigger>
                    <SelectContent>{referentials.statuses?.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              </FormField>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Description & Observations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <FormField label="Description" error={errors.description?.message}>
                <Textarea {...register("description")} placeholder="Description de la mission..." rows={4} />
              </FormField>
              <Separator />
              <FormField label="Observations" error={errors.observations?.message}>
                <Textarea {...register("observations")} placeholder="Observations complémentaires..." rows={3} />
              </FormField>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2 pb-6">
            <Button variant="outline" type="button" onClick={() => router.push(`/missions/${id}`)} disabled={isSubmitting}>Annuler</Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              <Save className="h-4 w-4" />
              {isSubmitting ? "Enregistrement..." : "Enregistrer les modifications"}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}

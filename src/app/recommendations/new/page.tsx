"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { recommendationSchema } from "@/lib/validators/recommendation";
import type { z } from "zod";

type RecommendationFormData = z.input<typeof recommendationSchema>;
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  Home,
  AlertCircle,
  Check,
  ChevronLeft,
  ClipboardList,
  FileText,
  BarChart2,
  Shield,
  RefreshCw,
} from "lucide-react";

interface Referential {
  id: string;
  code: string;
  label: string;
}

interface Mission {
  id: string;
  reference: string;
  title: string;
}

interface ReferentialsData {
  sources?: Referential[];
  entities?: Referential[];
  statuses?: Referential[];
  recommendationStatuses?: Referential[];
  directions?: Referential[];
  processes?: Referential[];
  riskTypes?: Referential[];
  recommendationTypes?: Referential[];
  rootCauseTypes?: Referential[];
  severities?: Referential[];
  probabilities?: Referential[];
  priorities?: Referential[];
  confidentialityLevels?: Referential[];
  users?: Array<{ id: string; firstName: string; lastName: string }>;
}

const STEPS = [
  { id: 1, label: "Identification", icon: ClipboardList },
  { id: 2, label: "Constat & Recommandation", icon: FileText },
  { id: 3, label: "Qualification Risque", icon: BarChart2 },
];

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((step, i) => {
        const isCompleted = step.id < currentStep;
        const isCurrent = step.id === currentStep;
        const Icon = step.icon;
        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition-all",
                  isCompleted
                    ? "bg-primary border-primary text-primary-foreground"
                    : isCurrent
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-muted border-border text-muted-foreground"
                )}
              >
                {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
              </div>
              <span className={cn(
                "text-xs font-medium hidden sm:block",
                isCurrent ? "text-primary" : "text-muted-foreground"
              )}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn(
                "flex-1 h-0.5 mt-[-16px] mb-auto transition-colors",
                step.id < currentStep ? "bg-primary" : "bg-border"
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function FormField({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}

function ImpactSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number) => void;
}) {
  const levels = [1, 2, 3, 4, 5];
  const colors = ["bg-emerald-400", "bg-yellow-400", "bg-amber-400", "bg-orange-400", "bg-red-500"];
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground w-28 shrink-0">{label}</span>
      <div className="flex gap-1.5">
        {levels.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => onChange(l)}
            className={cn(
              "h-7 w-7 rounded text-xs font-bold border transition-all",
              value === l
                ? `${colors[l - 1]} text-white border-transparent scale-110 shadow-sm`
                : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
            )}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function NewRecommendationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledMissionId = searchParams?.get("missionId") ?? "";
  const [step, setStep] = React.useState(1);
  const [referentials, setReferentials] = React.useState<ReferentialsData>({});
  const [missions, setMissions] = React.useState<Mission[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    trigger,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RecommendationFormData>({
    resolver: zodResolver(recommendationSchema),
    defaultValues: {
      missionId: prefilledMissionId,
      sourceId: "",
      entityId: "",
      issuedAt: "",
      statusId: "",
      findingDescription: "",
      recommendation: "",
      isRegulator: false,
      isRecurrent: false,
    },
  });

  React.useEffect(() => {
    if (prefilledMissionId) {
      setValue("missionId", prefilledMissionId);
    }
  }, [prefilledMissionId, setValue]);

  const watchedImpacts = {
    regulatory: watch("regulatoryImpact"),
    reputational: watch("reputationalImpact"),
    operational: watch("operationalImpact"),
    client: watch("clientImpact"),
    si: watch("siImpact"),
    legal: watch("legalImpact"),
    compliance: watch("complianceImpact"),
  };

  React.useEffect(() => {
    fetch("/api/admin/referentials?types=sources,entities,recommendationStatuses,directions,processes,riskTypes,recommendationTypes,rootCauseTypes,severities,probabilities,priorities,confidentialityLevels,users")
      .then((r) => r.json())
      .then(setReferentials)
      .catch(console.error);

    fetch("/api/missions?pageSize=200&sortBy=createdAt&sortOrder=desc")
      .then((r) => r.json())
      .then((data) => setMissions(data.data ?? []))
      .catch(console.error);
  }, []);

  const STEP_FIELDS: Record<number, (keyof RecommendationFormData)[]> = {
    1: ["missionId", "sourceId", "entityId", "issuedAt", "statusId"],
    2: ["findingDescription", "recommendation"],
    3: [],
  };

  const handleNext = async () => {
    const valid = await trigger(STEP_FIELDS[step]);
    if (valid) setStep((s) => Math.min(s + 1, 3));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 1));

  const onSubmit = async (data: RecommendationFormData) => {
    setIsSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? "Erreur lors de la création");
      }
      const created = await res.json();
      router.push(`/recommendations/${created.id}`);
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressPercent = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <button onClick={() => router.push("/")} className="flex items-center gap-1 hover:text-foreground transition-colors">
            <Home className="h-3.5 w-3.5" />
            Dashboard
          </button>
          <ChevronRight className="h-3.5 w-3.5" />
          <button onClick={() => router.push("/recommendations")} className="hover:text-foreground transition-colors">
            Recommandations
          </button>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">Nouvelle recommandation</span>
        </nav>

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nouvelle recommandation</h1>
          <p className="text-sm text-muted-foreground mt-1">Créer une nouvelle recommandation en 3 étapes</p>
        </div>

        {/* Step indicator */}
        <Card>
          <CardContent className="pt-6 pb-5">
            <StepIndicator currentStep={step} />
            <Progress value={progressPercent} className="h-1 mt-4" />
          </CardContent>
        </Card>

        {serverError && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* ── Step 1: Identification ── */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-primary" />
                  Étape 1 — Identification
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <FormField label="Mission" required error={errors.missionId?.message}>
                    <Controller
                      name="missionId"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className={cn(errors.missionId && "border-destructive")}>
                            <SelectValue placeholder="Sélectionner une mission" />
                          </SelectTrigger>
                          <SelectContent>
                            {missions.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                <span className="font-mono text-xs mr-2">{m.reference}</span>
                                {m.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </FormField>
                </div>

                <FormField label="Source" required error={errors.sourceId?.message}>
                  <Controller
                    name="sourceId"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className={cn(errors.sourceId && "border-destructive")}>
                          <SelectValue placeholder="Source" />
                        </SelectTrigger>
                        <SelectContent>
                          {referentials.sources?.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>

                <FormField label="Entité" required error={errors.entityId?.message}>
                  <Controller
                    name="entityId"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className={cn(errors.entityId && "border-destructive")}>
                          <SelectValue placeholder="Entité" />
                        </SelectTrigger>
                        <SelectContent>
                          {referentials.entities?.map((e) => (
                            <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>

                <FormField label="Date d'émission" required error={errors.issuedAt?.message}>
                  <Input
                    {...register("issuedAt")}
                    type="date"
                    className={cn(errors.issuedAt && "border-destructive")}
                  />
                </FormField>

                <FormField label="Type de recommandation" error={errors.recommendationTypeId?.message}>
                  <Controller
                    name="recommendationTypeId"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value ?? ""} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Type (optionnel)" />
                        </SelectTrigger>
                        <SelectContent>
                          {referentials.recommendationTypes?.map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>

                <FormField label="Direction" error={errors.directionId?.message}>
                  <Controller
                    name="directionId"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value ?? ""} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Direction (optionnel)" />
                        </SelectTrigger>
                        <SelectContent>
                          {referentials.directions?.map((d) => (
                            <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>

                <FormField label="Processus" error={errors.processId?.message}>
                  <Controller
                    name="processId"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value ?? ""} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Processus (optionnel)" />
                        </SelectTrigger>
                        <SelectContent>
                          {referentials.processes?.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>

                <FormField label="Statut initial" required error={errors.statusId?.message}>
                  <Controller
                    name="statusId"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className={cn(errors.statusId && "border-destructive")}>
                          <SelectValue placeholder="Statut" />
                        </SelectTrigger>
                        <SelectContent>
                          {referentials.recommendationStatuses?.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>

                <FormField label="Réf. rapport" error={errors.reportReference?.message}>
                  <Input {...register("reportReference")} placeholder="Référence du rapport" />
                </FormField>

                <FormField label="Réf. page" error={errors.pageReference?.message}>
                  <Input {...register("pageReference")} placeholder="N° de page" />
                </FormField>
              </CardContent>
            </Card>
          )}

          {/* ── Step 2: Constat & Recommandation ── */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Étape 2 — Constat &amp; Recommandation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <FormField label="Description du constat" required error={errors.findingDescription?.message}>
                  <Textarea
                    {...register("findingDescription")}
                    placeholder="Décrire le constat observé..."
                    rows={5}
                    className={cn(errors.findingDescription && "border-destructive")}
                  />
                </FormField>

                <FormField label="Cause racine" error={errors.rootCause?.message}>
                  <Controller
                    name="rootCauseTypeId"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value ?? ""} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Type de cause racine (optionnel)" />
                        </SelectTrigger>
                        <SelectContent>
                          {referentials.rootCauseTypes?.map((r) => (
                            <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>

                <FormField label="Description cause racine" error={errors.rootCause?.message}>
                  <Textarea
                    {...register("rootCause")}
                    placeholder="Analyser la cause fondamentale..."
                    rows={3}
                  />
                </FormField>

                <Separator />

                <FormField label="Conséquence potentielle" error={errors.potentialConsequence?.message}>
                  <Textarea
                    {...register("potentialConsequence")}
                    placeholder="Décrire les conséquences potentielles..."
                    rows={3}
                  />
                </FormField>

                <Separator />

                <FormField label="Recommandation" required error={errors.recommendation?.message}>
                  <Textarea
                    {...register("recommendation")}
                    placeholder="Formuler la recommandation de manière claire et actionnable..."
                    rows={5}
                    className={cn(errors.recommendation && "border-destructive")}
                  />
                </FormField>

                <FormField label="Commentaire entité" error={errors.entityComment?.message}>
                  <Textarea
                    {...register("entityComment")}
                    placeholder="Commentaire de l'entité concernée..."
                    rows={3}
                  />
                </FormField>
              </CardContent>
            </Card>
          )}

          {/* ── Step 3: Qualification Risque ── */}
          {step === 3 && (
            <div className="space-y-5">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-primary" />
                    Étape 3 — Qualification du Risque
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormField label="Sévérité" error={errors.severityId?.message}>
                    <Controller
                      name="severityId"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value ?? ""} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Niveau de sévérité" />
                          </SelectTrigger>
                          <SelectContent>
                            {referentials.severities?.map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </FormField>

                  <FormField label="Probabilité" error={errors.probabilityId?.message}>
                    <Controller
                      name="probabilityId"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value ?? ""} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Niveau de probabilité" />
                          </SelectTrigger>
                          <SelectContent>
                            {referentials.probabilities?.map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </FormField>

                  <FormField label="Priorité" error={errors.priorityId?.message}>
                    <Controller
                      name="priorityId"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value ?? ""} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Priorité" />
                          </SelectTrigger>
                          <SelectContent>
                            {referentials.priorities?.map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </FormField>

                  <FormField label="Type de risque" error={errors.riskTypeId?.message}>
                    <Controller
                      name="riskTypeId"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value ?? ""} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Type de risque" />
                          </SelectTrigger>
                          <SelectContent>
                            {referentials.riskTypes?.map((r) => (
                              <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </FormField>

                  <FormField label="Propriétaire" error={errors.ownerId?.message}>
                    <Controller
                      name="ownerId"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value ?? ""} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Responsable" />
                          </SelectTrigger>
                          <SelectContent>
                            {referentials.users?.map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.firstName} {u.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </FormField>

                  <FormField label="Resp. opérationnel" error={errors.operationalResponsibleId?.message}>
                    <Controller
                      name="operationalResponsibleId"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value ?? ""} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Responsable opérationnel" />
                          </SelectTrigger>
                          <SelectContent>
                            {referentials.users?.map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.firstName} {u.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </FormField>

                  <FormField label="Échéance initiale" error={errors.initialDueDate?.message}>
                    <Input {...register("initialDueDate")} type="date" />
                  </FormField>

                  <FormField label="Confidentialité" error={errors.confidentialityLevelId?.message}>
                    <Controller
                      name="confidentialityLevelId"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value ?? ""} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Niveau de confidentialité" />
                          </SelectTrigger>
                          <SelectContent>
                            {referentials.confidentialityLevels?.map((c) => (
                              <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </FormField>

                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <Label htmlFor="isRegulator" className="flex items-center gap-2 cursor-pointer">
                      <Shield className="h-4 w-4 text-purple-600" />
                      <div>
                        <p className="text-sm font-medium">Exigence réglementaire</p>
                        <p className="text-xs text-muted-foreground">Émise par un régulateur</p>
                      </div>
                    </Label>
                    <Controller
                      name="isRegulator"
                      control={control}
                      render={({ field }) => (
                        <Switch
                          id="isRegulator"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <Label htmlFor="isRecurrent" className="flex items-center gap-2 cursor-pointer">
                      <RefreshCw className="h-4 w-4 text-amber-600" />
                      <div>
                        <p className="text-sm font-medium">Recommandation récurrente</p>
                        <p className="text-xs text-muted-foreground">+20% sur la criticité</p>
                      </div>
                    </Label>
                    <Controller
                      name="isRecurrent"
                      control={control}
                      render={({ field }) => (
                        <Switch
                          id="isRecurrent"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Impact matrix */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">
                    Matrice d&apos;impact
                    <span className="text-xs font-normal text-muted-foreground ml-2">(1 = faible, 5 = critique)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {([
                    { label: "Réglementaire", field: "regulatoryImpact" as const },
                    { label: "Réputationnel", field: "reputationalImpact" as const },
                    { label: "Opérationnel", field: "operationalImpact" as const },
                    { label: "Client", field: "clientImpact" as const },
                    { label: "SI", field: "siImpact" as const },
                    { label: "Juridique", field: "legalImpact" as const },
                    { label: "Conformité", field: "complianceImpact" as const },
                  ] as const).map(({ label, field }) => (
                    <Controller
                      key={field}
                      name={field}
                      control={control}
                      render={({ field: f }) => (
                        <ImpactSlider
                          label={label}
                          value={f.value as number | undefined}
                          onChange={(v) => f.onChange(v)}
                        />
                      )}
                    />
                  ))}

                  <Separator className="my-2" />

                  <FormField label="Impact financier (€)" error={errors.financialImpact?.message}>
                    <Input
                      {...register("financialImpact", { valueAsNumber: true })}
                      type="number"
                      min={0}
                      placeholder="Montant estimé en euros"
                    />
                  </FormField>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 pb-8">
            <Button
              type="button"
              variant="outline"
              onClick={step === 1 ? () => router.back() : handleBack}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              {step === 1 ? "Annuler" : "Précédent"}
            </Button>

            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                Étape {step} / {STEPS.length}
              </Badge>
            </div>

            {step < 3 ? (
              <Button type="button" onClick={handleNext} className="gap-2">
                Suivant
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                <Check className="h-4 w-4" />
                {isSubmitting ? "Enregistrement..." : "Créer la recommandation"}
              </Button>
            )}
          </div>
        </form>
      </div>
    </AppLayout>
  );
}

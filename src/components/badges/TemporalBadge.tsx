import * as React from "react";
import { Clock, CheckCircle2, AlertTriangle, AlertCircle, Archive } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TemporalStatus } from "@/types";

interface TemporalBadgeProps {
  status: TemporalStatus;
  daysRemaining?: number | null;
  showIcon?: boolean;
  className?: string;
}

const TEMPORAL_CONFIG: Record<
  TemporalStatus,
  {
    classes: string;
    label: string;
    Icon: React.ElementType;
  }
> = {
  ON_TIME: {
    classes: "bg-emerald-100 text-emerald-800 border-emerald-200",
    label: "Dans les délais",
    Icon: CheckCircle2,
  },
  TO_WATCH: {
    classes: "bg-amber-100 text-amber-800 border-amber-200",
    label: "À surveiller",
    Icon: Clock,
  },
  DUE_SOON: {
    classes: "bg-orange-100 text-orange-800 border-orange-200",
    label: "Échéance proche",
    Icon: AlertTriangle,
  },
  OVERDUE: {
    classes: "bg-red-100 text-red-800 border-red-200",
    label: "En retard",
    Icon: AlertCircle,
  },
  CLOSED: {
    classes: "bg-slate-100 text-slate-600 border-slate-200",
    label: "Clôturé",
    Icon: Archive,
  },
  NO_DATE: {
    classes: "bg-slate-100 text-slate-500 border-slate-200",
    label: "Sans échéance",
    Icon: Clock,
  },
};

export function TemporalBadge({
  status,
  daysRemaining,
  showIcon = false,
  className,
}: TemporalBadgeProps) {
  const config = TEMPORAL_CONFIG[status] ?? TEMPORAL_CONFIG["NO_DATE"];
  const { Icon } = config;

  const daysLabel =
    daysRemaining !== null && daysRemaining !== undefined
      ? status === "OVERDUE"
        ? ` (${Math.abs(daysRemaining)}j)`
        : ` (${daysRemaining}j)`
      : "";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        config.classes,
        className
      )}
    >
      {showIcon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
      {config.label}
      {daysLabel && (
        <span className="opacity-75 font-normal">{daysLabel}</span>
      )}
    </span>
  );
}

import * as React from "react";
import { cn } from "@/lib/utils";

type PriorityCode = "CRITICAL" | "VERY_HIGH" | "HIGH" | "MEDIUM" | "LOW";

interface PriorityBadgeProps {
  code: string;
  label: string;
  color?: string | null;
  showIcon?: boolean;
  className?: string;
}

const PRIORITY_STYLES: Record<
  PriorityCode,
  { classes: string; dot: string; label: string }
> = {
  CRITICAL: {
    classes: "bg-red-100 text-red-900 border-red-300",
    dot: "bg-red-600",
    label: "Critique",
  },
  VERY_HIGH: {
    classes: "bg-orange-100 text-orange-900 border-orange-300",
    dot: "bg-orange-500",
    label: "Très élevée",
  },
  HIGH: {
    classes: "bg-amber-100 text-amber-900 border-amber-300",
    dot: "bg-amber-500",
    label: "Élevée",
  },
  MEDIUM: {
    classes: "bg-yellow-100 text-yellow-900 border-yellow-300",
    dot: "bg-yellow-500",
    label: "Moyenne",
  },
  LOW: {
    classes: "bg-emerald-100 text-emerald-900 border-emerald-200",
    dot: "bg-emerald-500",
    label: "Faible",
  },
};

export function PriorityBadge({
  code,
  label,
  showIcon = false,
  className,
}: PriorityBadgeProps) {
  const style =
    PRIORITY_STYLES[code as PriorityCode] ?? {
      classes: "bg-slate-100 text-slate-700 border-slate-200",
      dot: "bg-slate-400",
      label,
    };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        style.classes,
        className
      )}
    >
      {showIcon && (
        <span
          className={cn("inline-block h-1.5 w-1.5 rounded-full", style.dot)}
          aria-hidden="true"
        />
      )}
      {label}
    </span>
  );
}

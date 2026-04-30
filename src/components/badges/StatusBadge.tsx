import * as React from "react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  code: string;
  label: string;
  color?: string | null;
  className?: string;
}

// Map common status codes to tailwind color classes when no custom color is given
const STATUS_CODE_COLORS: Record<string, string> = {
  // Recommendation statuses
  OPEN: "bg-blue-100 text-blue-800 border-blue-200",
  IN_PROGRESS: "bg-amber-100 text-amber-800 border-amber-200",
  IN_REVIEW: "bg-purple-100 text-purple-800 border-purple-200",
  CLOSED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
  CANCELLED: "bg-slate-100 text-slate-600 border-slate-200",
  PENDING: "bg-sky-100 text-sky-800 border-sky-200",
  // Action plan statuses
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  SUBMITTED: "bg-blue-100 text-blue-800 border-blue-200",
  VALIDATED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  COMPLETED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  // Evidence statuses
  DEPOSITED: "bg-sky-100 text-sky-800 border-sky-200",
  ACCEPTED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  COMPLEMENT_REQUIRED: "bg-orange-100 text-orange-800 border-orange-200",
  REPLACED: "bg-slate-100 text-slate-600 border-slate-200",
  ARCHIVED: "bg-slate-100 text-slate-500 border-slate-200",
};

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export function StatusBadge({ code, label, color, className }: StatusBadgeProps) {
  // If we have a custom hex color from the database, use inline styles
  if (color && color.startsWith("#")) {
    const rgb = hexToRgb(color);
    if (rgb) {
      const bgColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`;
      const textColor = color;
      const borderColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`;
      return (
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
            className
          )}
          style={{ backgroundColor: bgColor, color: textColor, borderColor }}
        >
          {label}
        </span>
      );
    }
  }

  // Fall back to predefined Tailwind classes
  const colorClass =
    STATUS_CODE_COLORS[code] ?? "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        colorClass,
        className
      )}
    >
      {label}
    </span>
  );
}

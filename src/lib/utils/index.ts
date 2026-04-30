import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, differenceInDays, isAfter, isBefore } from "date-fns";
import { fr } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "dd/MM/yyyy", { locale: fr });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: fr });
}

export function getDaysRemaining(dueDate: Date | string | null | undefined): number | null {
  if (!dueDate) return null;
  return differenceInDays(new Date(dueDate), new Date());
}

export function getTemporalStatus(dueDate: Date | string | null | undefined, closedAt?: Date | string | null): string {
  if (!dueDate) return "NO_DATE";
  if (closedAt) return "CLOSED";

  const days = getDaysRemaining(dueDate);
  if (days === null) return "NO_DATE";

  if (days > 30) return "ON_TIME";
  if (days > 15) return "TO_WATCH";
  if (days > 0) return "DUE_SOON";
  return "OVERDUE";
}

export function calculateCriticality(
  severityValue: number,
  probabilityValue: number,
  sourceCoefficient: number = 1.0,
  regulatoryImpact: number = 1,
  isRecurrent: boolean = false,
  daysOverdue: number = 0
): number {
  const rawCriticality = severityValue * probabilityValue;
  const recurrenceCoeff = isRecurrent ? 1.2 : 1.0;
  const delayCoeff = daysOverdue > 30 ? 1.3 : daysOverdue > 0 ? 1.1 : 1.0;
  const regulatoryCoeff = regulatoryImpact >= 4 ? 1.2 : 1.0;

  return parseFloat(
    (rawCriticality * sourceCoefficient * regulatoryCoeff * recurrenceCoeff * delayCoeff).toFixed(2)
  );
}

export function getPriorityFromScore(score: number): string {
  if (score > 20) return "CRITICAL";
  if (score >= 16) return "VERY_HIGH";
  if (score >= 11) return "HIGH";
  if (score >= 6) return "MEDIUM";
  return "LOW";
}

export function generateCode(prefix: string, sequence: number): string {
  return `${prefix}-${String(sequence).padStart(5, "0")}`;
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.substring(0, length) + "...";
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

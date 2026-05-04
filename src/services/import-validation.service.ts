import { prisma } from "@/lib/prisma";
import type { RawExcelRow } from "./excel-parser.service";

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidatedRow {
  rowNumber: number;
  rawData: Record<string, string | number | null>;
  mappedData: MappedRecommendation | null;
  errors: ValidationError[];
  status: "VALID" | "ERROR";
  isDuplicate: boolean;
  existingId?: string;
}

export interface MappedRecommendation {
  code: string;
  findingDescription: string;
  recommendation: string;
  entityId: string;
  sourceId: string;
  statusId: string;
  progressRate: number;
  issuedAt: Date;
  initialDueDate: Date | null;
  revisedDueDate: Date | null;
  closedAt: Date | null;
  entityComment: string | null;
  reportReference: string | null;
  priorityId: string | null;
  missionId: string | null;
}

const STATUS_NORMALIZATION: Record<string, string> = {
  "non entamé": "NOT_STARTED",
  "non entame": "NOT_STARTED",
  "pas encore démarré": "NOT_STARTED",
  "en cours": "IN_PROGRESS",
  "en progression": "IN_PROGRESS",
  "clôturé": "CLOSED",
  "cloture": "CLOSED",
  "clôture": "CLOSED",
  "fermé": "CLOSED",
  "ferme": "CLOSED",
  "validé": "VALIDATED",
  "valide": "VALIDATED",
};

function normalizeStatus(raw: string): string {
  return STATUS_NORMALIZATION[raw.toLowerCase().trim()] ?? raw.toUpperCase().replace(/\s+/g, "_");
}

function normalizeProgressRate(raw: string | number | null): number {
  if (raw === null || raw === "") return 0;
  if (typeof raw === "number") {
    // If decimal fraction (0–1), convert to percentage
    return raw > 0 && raw <= 1 ? Math.round(raw * 100) : Math.min(100, Math.max(0, Math.round(raw)));
  }
  const str = String(raw).trim();
  // Range like "0%-20%" → take the upper bound
  const rangeMatch = str.match(/(\d+)\s*%\s*[-–]\s*(\d+)\s*%/);
  if (rangeMatch) return Math.min(100, parseInt(rangeMatch[2], 10));
  // Single percentage "40%"
  const pctMatch = str.match(/^(\d+(?:\.\d+)?)\s*%$/);
  if (pctMatch) return Math.min(100, Math.round(parseFloat(pctMatch[1])));
  const num = parseFloat(str.replace(",", "."));
  if (isNaN(num)) return 0;
  return num > 0 && num <= 1 ? Math.round(num * 100) : Math.min(100, Math.max(0, Math.round(num)));
}

function parseDate(raw: string | number | null): Date | null {
  if (!raw) return null;
  const str = String(raw).trim();
  if (!str) return null;
  // ISO format yyyy-mm-dd
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const d = new Date(`${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}T00:00:00.000Z`);
    return isNaN(d.getTime()) ? null : d;
  }
  // French format dd/mm/yyyy
  const frMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (frMatch) {
    const d = new Date(`${frMatch[3]}-${frMatch[2].padStart(2, "0")}-${frMatch[1].padStart(2, "0")}T00:00:00.000Z`);
    return isNaN(d.getTime()) ? null : d;
  }
  // Excel serial number
  const num = parseInt(str, 10);
  if (!isNaN(num) && num > 40000) {
    const d = XLSX_date_to_js(num);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function XLSX_date_to_js(serial: number): Date {
  // Excel date serial (days since 1900-01-00, adjusting for leap year bug)
  const utc_days = Math.floor(serial - 25569);
  return new Date(utc_days * 86400 * 1000);
}

interface Referentials {
  entities: { id: string; label: string; code?: string }[];
  sources: { id: string; label: string; code?: string }[];
  statuses: { id: string; label: string; code?: string }[];
  priorities: { id: string; label: string; code?: string }[];
  missions: { id: string; reference: string }[];
}

async function loadReferentials(): Promise<Referentials> {
  const [entities, sources, statuses, priorities, missions] = await Promise.all([
    prisma.entity.findMany({ where: { isActive: true }, select: { id: true, label: true, code: true } }),
    prisma.sourceType.findMany({ where: { isActive: true }, select: { id: true, label: true, code: true } }),
    prisma.recommendationStatus.findMany({ where: { isActive: true }, select: { id: true, label: true, code: true } }),
    prisma.priorityLevel.findMany({ where: { isActive: true }, select: { id: true, label: true, code: true } }),
    prisma.mission.findMany({ where: { isDeleted: false }, select: { id: true, reference: true } }),
  ]);
  return { entities, sources, statuses, priorities, missions };
}

function findById<T extends { id: string; label: string; code?: string }>(
  items: T[],
  raw: string | null
): T | null {
  if (!raw) return null;
  const normalized = raw.toLowerCase().trim();
  return (
    items.find((i) => i.code?.toLowerCase() === normalized) ??
    items.find((i) => i.label.toLowerCase() === normalized) ??
    items.find((i) => i.label.toLowerCase().includes(normalized)) ??
    null
  );
}

export async function validateRows(rows: RawExcelRow[]): Promise<ValidatedRow[]> {
  const refs = await loadReferentials();
  const existingCodes = await prisma.recommendation.findMany({
    where: { isDeleted: false },
    select: { id: true, code: true },
  });
  const codeMap = new Map(existingCodes.map((r) => [r.code.toLowerCase(), r.id]));

  return rows
    .filter((row) => {
      // Skip completely empty rows
      const vals = Object.values(row.data).filter((v) => v !== null && v !== "");
      return vals.length > 0;
    })
    .map((row) => {
      const errors: ValidationError[] = [];
      const d = row.data;

      // Required: code
      const code = d.code ? String(d.code).trim() : null;
      if (!code) errors.push({ field: "code", message: "Code obligatoire" });

      // Required: findingDescription
      const findingDescription = d.findingDescription ? String(d.findingDescription).trim() : null;
      if (!findingDescription) errors.push({ field: "findingDescription", message: "Description de la constatation obligatoire" });

      // Required: recommendation
      const recommendation = d.recommendation ? String(d.recommendation).trim() : null;
      if (!recommendation) errors.push({ field: "recommendation", message: "Recommandation obligatoire" });

      // Required: entity
      const entityRaw = d.entity ? String(d.entity).trim() : null;
      const entity = findById(refs.entities, entityRaw);
      if (!entityRaw) {
        errors.push({ field: "entity", message: "Entité obligatoire" });
      } else if (!entity) {
        errors.push({ field: "entity", message: `Entité introuvable: "${entityRaw}"` });
      }

      // Required: source (default to first if not provided)
      const sourceRaw = d.source ? String(d.source).trim() : null;
      const source = sourceRaw ? findById(refs.sources, sourceRaw) : refs.sources[0] ?? null;
      if (!source) errors.push({ field: "source", message: `Source introuvable: "${sourceRaw}"` });

      // Required: status
      const statusRaw = d.status ? String(d.status).trim() : null;
      let status = null;
      if (statusRaw) {
        const normalizedCode = normalizeStatus(statusRaw);
        status = refs.statuses.find((s) => s.code === normalizedCode) ?? findById(refs.statuses, statusRaw);
      }
      if (!statusRaw) {
        errors.push({ field: "status", message: "Statut obligatoire" });
      } else if (!status) {
        errors.push({ field: "status", message: `Statut non reconnu: "${statusRaw}"` });
      }

      // Required: issuedAt
      const issuedAt = parseDate(d.issuedAt);
      if (!d.issuedAt && !issuedAt) {
        errors.push({ field: "issuedAt", message: "Date d'émission obligatoire" });
      }

      // Optional fields
      const initialDueDate = parseDate(d.initialDueDate);
      const revisedDueDate = parseDate(d.revisedDueDate);
      const closedAt = parseDate(d.closedAt);
      const progressRate = normalizeProgressRate(d.progressRate);
      const entityComment = d.entityComment ? String(d.entityComment).trim() : null;
      const reportReference = d.reportReference ? String(d.reportReference).trim() : null;

      // Priority (optional)
      const priorityRaw = d.priority ? String(d.priority).trim() : null;
      const priority = priorityRaw ? findById(refs.priorities, priorityRaw) : null;

      // Duplicate check
      const isDuplicate = code ? codeMap.has(code.toLowerCase()) : false;
      const existingId = code ? codeMap.get(code.toLowerCase()) : undefined;

      const isValid = errors.length === 0;

      const mappedData: MappedRecommendation | null = isValid
        ? {
            code: code!,
            findingDescription: findingDescription!,
            recommendation: recommendation!,
            entityId: entity!.id,
            sourceId: source!.id,
            statusId: status!.id,
            progressRate,
            issuedAt: issuedAt ?? new Date(),
            initialDueDate,
            revisedDueDate,
            closedAt,
            entityComment,
            reportReference,
            priorityId: priority?.id ?? null,
            missionId: null,
          }
        : null;

      return {
        rowNumber: row.rowNumber,
        rawData: row.data,
        mappedData,
        errors,
        status: isValid ? "VALID" : "ERROR",
        isDuplicate,
        existingId,
      };
    });
}

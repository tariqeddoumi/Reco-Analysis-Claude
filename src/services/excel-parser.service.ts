import * as XLSX from "xlsx";

export interface RawExcelRow {
  rowNumber: number;
  data: Record<string, string | number | null>;
}

export interface DetectedColumns {
  columns: string[];
  sampleRows: Record<string, string | number | null>[];
}

const SHEET_NAME = "Suivi des recommandations";

// Default auto-mapping (French column names → internal fields)
const DEFAULT_COLUMN_MAP: Record<string, string> = {
  "Code": "code",
  "Domaine": "domain",
  "Description de la constatation": "findingDescription",
  "Recommandation": "recommendation",
  "Entité": "entity",
  "Date d'émission": "issuedAt",
  "Date d'échéance initiale": "initialDueDate",
  "Date d'échéance révisée": "revisedDueDate",
  "Statut": "status",
  "Taux de réalisation": "progressRate",
  "Date de clôture": "closedAt",
  "Commentaire entité": "entityComment",
  "Source": "source",
  "Référence rapport": "reportReference",
  "Priorité": "priority",
};

function getSheet(buffer: Buffer): XLSX.WorkSheet {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames.includes(SHEET_NAME)
    ? SHEET_NAME
    : workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Feuille introuvable: ${sheetName}`);
  return sheet;
}

function toRawValue(val: unknown): string | number | null {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number") return val;
  return String(val).trim();
}

/** Detect column names and first sample rows without mapping */
export function detectColumns(buffer: Buffer): DetectedColumns {
  const sheet = getSheet(buffer);
  const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
    defval: null,
    raw: false,
    dateNF: "yyyy-mm-dd",
  });

  if (raw.length === 0) return { columns: [], sampleRows: [] };

  const columns = Object.keys(raw[0]);
  const sampleRows = raw.slice(0, 5).map((row) => {
    const out: Record<string, string | number | null> = {};
    for (const col of columns) out[col] = toRawValue(row[col]);
    return out;
  });

  return { columns, sampleRows };
}

/** Parse all rows applying a custom column mapping (excelColumn → internalField) */
export function parseWithMapping(
  buffer: Buffer,
  columnMap: Record<string, string>
): RawExcelRow[] {
  const sheet = getSheet(buffer);
  const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
    defval: null,
    raw: false,
    dateNF: "yyyy-mm-dd",
  });

  return raw.map((row, idx) => {
    const mapped: Record<string, string | number | null> = {};
    for (const [excelCol, fieldName] of Object.entries(columnMap)) {
      if (fieldName === "_ignore" || !fieldName) continue;
      mapped[fieldName] = toRawValue(row[excelCol]);
    }
    return { rowNumber: idx + 2, data: mapped };
  });
}

/** Auto-parse using default French column names */
export function parseExcelBuffer(buffer: Buffer): RawExcelRow[] {
  return parseWithMapping(buffer, DEFAULT_COLUMN_MAP);
}

import * as XLSX from "xlsx";

export interface RawExcelRow {
  rowNumber: number;
  data: Record<string, string | number | null>;
}

const SHEET_NAME = "Suivi des recommandations";

const COLUMN_MAP: Record<string, string> = {
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

export function parseExcelBuffer(buffer: Buffer): RawExcelRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });

  const sheetName = workbook.SheetNames.includes(SHEET_NAME)
    ? SHEET_NAME
    : workbook.SheetNames[0];

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Feuille introuvable: ${sheetName}`);

  const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
    defval: null,
    raw: false,
    dateNF: "yyyy-mm-dd",
  });

  return raw.map((row, idx) => {
    const mapped: Record<string, string | number | null> = {};
    for (const [excelCol, fieldName] of Object.entries(COLUMN_MAP)) {
      const val = row[excelCol];
      if (val === null || val === undefined || val === "") {
        mapped[fieldName] = null;
      } else if (typeof val === "number") {
        mapped[fieldName] = val;
      } else {
        mapped[fieldName] = String(val).trim();
      }
    }
    // Keep any unmapped columns under their original name
    for (const key of Object.keys(row)) {
      if (!(key in COLUMN_MAP) && !(key in mapped)) {
        const val = row[key];
        mapped[`_raw_${key}`] = val === null || val === undefined ? null : String(val).trim();
      }
    }
    return { rowNumber: idx + 2, data: mapped }; // +2 because row 1 is header
  });
}

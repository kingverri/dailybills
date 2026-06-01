import {
  calculateDriverLogMetrics,
  calculateEarningsPerHour,
  calculateEarningsPerMile
} from "@/lib/financeCalculations";
import { formatDurationFromDecimalHours, formatTime12Hour } from "@/lib/format";
import { normalizeLanguage } from "@/lib/i18n";
import type { DailyIncomeEntry, DriverLog, Language } from "@/types/app";

type ExportValue = string | number;
export type ExportRow = Record<string, ExportValue>;

const driverLogHeaders = {
  en: {
    date: "Date",
    platform: "Platform",
    startTime: "Start time",
    endTime: "End time",
    hoursWorked: "Hours worked",
    milesDriven: "Miles driven",
    grossEarnings: "Gross earnings",
    gasSpent: "Gas spent",
    gasPricePerGallon: "Gas price per gallon",
    gallonsBought: "Gallons bought",
    extraExpenses: "Extra expenses",
    extraExpenseNotes: "Extra expense notes",
    netProfit: "Net profit",
    grossPerHour: "Gross per hour",
    netPerHour: "Net per hour",
    grossPerMile: "Gross per mile",
    netPerMile: "Net per mile",
    notes: "Notes"
  },
  pt: {
    date: "Data",
    platform: "Plataforma",
    startTime: "Hora inicial",
    endTime: "Hora final",
    hoursWorked: "Horas trabalhadas",
    milesDriven: "Milhas dirigidas",
    grossEarnings: "Ganho bruto",
    gasSpent: "Gasolina gasta",
    gasPricePerGallon: "Preço da gasolina por galão",
    gallonsBought: "Galões comprados",
    extraExpenses: "Gastos extras",
    extraExpenseNotes: "Observações dos gastos extras",
    netProfit: "Lucro líquido",
    grossPerHour: "Bruto por hora",
    netPerHour: "Líquido por hora",
    grossPerMile: "Bruto por milha",
    netPerMile: "Líquido por milha",
    notes: "Observações"
  },
  es: {
    date: "Fecha",
    platform: "Plataforma",
    startTime: "Hora inicial",
    endTime: "Hora final",
    hoursWorked: "Horas trabajadas",
    milesDriven: "Millas conducidas",
    grossEarnings: "Ingreso bruto",
    gasSpent: "Gasolina gastada",
    gasPricePerGallon: "Precio de gasolina por galón",
    gallonsBought: "Galones comprados",
    extraExpenses: "Gastos extras",
    extraExpenseNotes: "Notas de gastos extras",
    netProfit: "Ganancia neta",
    grossPerHour: "Bruto por hora",
    netPerHour: "Neto por hora",
    grossPerMile: "Bruto por milla",
    netPerMile: "Neto por milla",
    notes: "Notas"
  }
} as const;

const incomeHeaders = {
  en: {
    date: "Date",
    platform: "Platform",
    incomeType: "Income type",
    grossEarnings: "Gross earnings",
    milesDriven: "Miles driven",
    hoursWorked: "Hours worked",
    gasSpent: "Gas spent",
    estimatedGasCost: "Estimated gas cost",
    netProfit: "Net profit",
    earningsPerHour: "Earnings per hour",
    earningsPerMile: "Earnings per mile",
    notes: "Notes"
  },
  pt: {
    date: "Data",
    platform: "Plataforma",
    incomeType: "Tipo de ganho",
    grossEarnings: "Ganho bruto",
    milesDriven: "Milhas dirigidas",
    hoursWorked: "Horas trabalhadas",
    gasSpent: "Gasolina gasta",
    estimatedGasCost: "Custo estimado de gasolina",
    netProfit: "Lucro líquido",
    earningsPerHour: "Ganho por hora",
    earningsPerMile: "Ganho por milha",
    notes: "Observações"
  },
  es: {
    date: "Fecha",
    platform: "Plataforma",
    incomeType: "Tipo de ingreso",
    grossEarnings: "Ingreso bruto",
    milesDriven: "Millas conducidas",
    hoursWorked: "Horas trabajadas",
    gasSpent: "Gasolina gastada",
    estimatedGasCost: "Costo estimado de gasolina",
    netProfit: "Ganancia neta",
    earningsPerHour: "Ingreso por hora",
    earningsPerMile: "Ingreso por milla",
    notes: "Notas"
  }
} as const;

const incomeTypeExportLabels = {
  en: {
    actual: "Actual income already received",
    confirmed: "Confirmed upcoming payment",
    extra_gig: "Extra gig income"
  },
  pt: {
    actual: "Ganho real já recebido",
    confirmed: "Pagamento futuro confirmado",
    extra_gig: "Ganho extra"
  },
  es: {
    actual: "Ingreso real ya recibido",
    confirmed: "Pago futuro confirmado",
    extra_gig: "Ingreso extra"
  }
} as const;

function languageKey(language: Language | string | null | undefined): Language {
  return normalizeLanguage(language);
}

function fixed(value: number | null | undefined, digits = 2) {
  const numericValue = Number(value ?? 0);
  return Number.isFinite(numericValue) ? numericValue.toFixed(digits) : (0).toFixed(digits);
}

function escapeCsvValue(value: ExportValue) {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function downloadBlob(filename: string, content: BlobPart, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function rowsToCsv(rows: ExportRow[]) {
  const headers = Object.keys(rows[0] ?? {});
  const lines = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header] ?? "")).join(","))
  ];

  return lines.join("\r\n");
}

export function exportToCSV(filename: string, rows: ExportRow[]) {
  downloadBlob(filename, `\uFEFF${rowsToCsv(rows)}`, "text/csv;charset=utf-8;");
}

function columnName(index: number) {
  let column = "";
  let value = index + 1;

  while (value > 0) {
    const remainder = (value - 1) % 26;
    column = String.fromCharCode(65 + remainder) + column;
    value = Math.floor((value - 1) / 26);
  }

  return column;
}

function sheetXml(rows: ExportRow[]) {
  const headers = Object.keys(rows[0] ?? {});
  const sheetRows = [headers, ...rows.map((row) => headers.map((header) => row[header] ?? ""))];
  const xmlRows = sheetRows
    .map((cells, rowIndex) => {
      const rowNumber = rowIndex + 1;
      const xmlCells = cells
        .map((cell, cellIndex) => {
          const cellRef = `${columnName(cellIndex)}${rowNumber}`;
          return `<c r="${cellRef}" t="inlineStr"><is><t>${escapeXml(String(cell))}</t></is></c>`;
        })
        .join("");

      return `<row r="${rowNumber}">${xmlCells}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${xmlRows}</sheetData></worksheet>`;
}

function dosDateTime(date = new Date()) {
  const time =
    ((date.getHours() & 0x1f) << 11) |
    ((date.getMinutes() & 0x3f) << 5) |
    ((Math.floor(date.getSeconds() / 2) & 0x1f) << 0);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = Math.max(date.getFullYear() - 1980, 0);
  const dosDate = ((year & 0x7f) << 9) | ((month & 0xf) << 5) | (day & 0x1f);

  return { dosDate, time };
}

let crcTable: number[] | null = null;

function getCrcTable() {
  if (crcTable) {
    return crcTable;
  }

  crcTable = Array.from({ length: 256 }, (_, index) => {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    return value >>> 0;
  });

  return crcTable;
}

function crc32(bytes: Uint8Array) {
  const table = getCrcTable();
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function concatBytes(parts: Uint8Array[]) {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }

  return output;
}

function createZip(files: { path: string; content: string }[]) {
  const encoder = new TextEncoder();
  const { dosDate, time } = dosDateTime();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.path);
    const dataBytes = encoder.encode(file.content);
    const crc = crc32(dataBytes);
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, time, true);
    localView.setUint16(12, dosDate, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, dataBytes.length, true);
    localView.setUint32(22, dataBytes.length, true);
    localView.setUint16(26, nameBytes.length, true);
    localView.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);
    localParts.push(localHeader, dataBytes);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, time, true);
    centralView.setUint16(14, dosDate, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, dataBytes.length, true);
    centralView.setUint32(24, dataBytes.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);
    centralParts.push(centralHeader);

    offset += localHeader.length + dataBytes.length;
  }

  const centralDirectory = concatBytes(centralParts);
  const localDirectory = concatBytes(localParts);
  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralDirectory.length, true);
  endView.setUint32(16, localDirectory.length, true);
  endView.setUint16(20, 0, true);

  return concatBytes([localDirectory, centralDirectory, endRecord]);
}

export function exportToXLSX(filename: string, rows: ExportRow[], sheetName = "DailyBills") {
  const safeSheetName = escapeXml(sheetName.replace(/[\[\]*?/\\:]/g, " ").slice(0, 31) || "DailyBills");
  const worksheet = sheetXml(rows);
  const files = [
    {
      path: "[Content_Types].xml",
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'
    },
    {
      path: "_rels/.rels",
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'
    },
    {
      path: "xl/workbook.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${safeSheetName}" sheetId="1" r:id="rId1"/></sheets></workbook>`
    },
    {
      path: "xl/_rels/workbook.xml.rels",
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'
    },
    { path: "xl/worksheets/sheet1.xml", content: worksheet }
  ];

  downloadBlob(
    filename,
    createZip(files),
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
}

export function buildDriverLogExportRows(logs: DriverLog[], language: Language | string | null | undefined) {
  const h = driverLogHeaders[languageKey(language)];
  const rows = logs.map((log) => {
    const metrics = calculateDriverLogMetrics(log);

    return {
      [h.date]: log.date,
      [h.platform]: log.platform,
      [h.startTime]: formatTime12Hour(log.start_time),
      [h.endTime]: formatTime12Hour(log.end_time),
      [h.hoursWorked]: formatDurationFromDecimalHours(metrics.hoursWorked),
      [h.milesDriven]: fixed(log.miles_driven, 1),
      [h.grossEarnings]: fixed(log.gross_earnings),
      [h.gasSpent]: fixed(log.gas_spent),
      [h.gasPricePerGallon]: fixed(log.gas_price_per_gallon, 3),
      [h.gallonsBought]: fixed(metrics.gallonsBought),
      [h.extraExpenses]: fixed(log.extra_expenses),
      [h.extraExpenseNotes]: log.extra_expense_notes ?? "",
      [h.netProfit]: fixed(metrics.netProfit),
      [h.grossPerHour]: fixed(metrics.earningsPerHour),
      [h.netPerHour]: fixed(metrics.netProfitPerHour),
      [h.grossPerMile]: fixed(metrics.earningsPerMile),
      [h.netPerMile]: fixed(metrics.netProfitPerMile),
      [h.notes]: log.notes ?? ""
    };
  });

  if (logs.length === 0) {
    return rows;
  }

  const totals = logs.reduce(
    (sum, log) => {
      const metrics = calculateDriverLogMetrics(log);
      return {
        gross: sum.gross + log.gross_earnings,
        miles: sum.miles + log.miles_driven,
        hours: sum.hours + metrics.hoursWorked,
        gas: sum.gas + log.gas_spent,
        gallons: sum.gallons + metrics.gallonsBought,
        extra: sum.extra + log.extra_expenses,
        net: sum.net + metrics.netProfit
      };
    },
    { gross: 0, miles: 0, hours: 0, gas: 0, gallons: 0, extra: 0, net: 0 }
  );

  rows.push({
    [h.date]: "TOTAL",
    [h.platform]: "",
    [h.startTime]: "",
    [h.endTime]: "",
    [h.hoursWorked]: formatDurationFromDecimalHours(totals.hours),
    [h.milesDriven]: fixed(totals.miles, 1),
    [h.grossEarnings]: fixed(totals.gross),
    [h.gasSpent]: fixed(totals.gas),
    [h.gasPricePerGallon]: "",
    [h.gallonsBought]: fixed(totals.gallons),
    [h.extraExpenses]: fixed(totals.extra),
    [h.extraExpenseNotes]: "",
    [h.netProfit]: fixed(totals.net),
    [h.grossPerHour]: "",
    [h.netPerHour]: "",
    [h.grossPerMile]: "",
    [h.netPerMile]: "",
    [h.notes]: ""
  });

  return rows;
}

export function buildIncomeExportRows(entries: DailyIncomeEntry[], language: Language | string | null | undefined) {
  const currentLanguage = languageKey(language);
  const h = incomeHeaders[currentLanguage];
  const typeLabels = incomeTypeExportLabels[currentLanguage];
  const rows = entries.map((entry) => ({
    [h.date]: entry.date,
    [h.platform]: entry.platform,
    [h.incomeType]: typeLabels[entry.income_entry_type],
    [h.grossEarnings]: fixed(entry.gross_earnings),
    [h.milesDriven]: fixed(entry.miles_driven, 1),
    [h.hoursWorked]: formatDurationFromDecimalHours(entry.hours_worked),
    [h.gasSpent]: fixed(entry.gas_spent),
    [h.estimatedGasCost]: fixed(entry.estimated_gas_cost),
    [h.netProfit]: fixed(entry.net_profit),
    [h.earningsPerHour]: fixed(calculateEarningsPerHour(entry.gross_earnings, entry.hours_worked)),
    [h.earningsPerMile]: fixed(calculateEarningsPerMile(entry.gross_earnings, entry.miles_driven)),
    [h.notes]: entry.notes ?? ""
  }));

  if (entries.length === 0) {
    return rows;
  }

  const totals = entries.reduce(
    (sum, entry) => ({
      gross: sum.gross + entry.gross_earnings,
      miles: sum.miles + entry.miles_driven,
      hours: sum.hours + entry.hours_worked,
      gas: sum.gas + entry.gas_spent,
      net: sum.net + entry.net_profit
    }),
    { gross: 0, miles: 0, hours: 0, gas: 0, net: 0 }
  );

  rows.push({
    [h.date]: "TOTAL",
    [h.platform]: "",
    [h.incomeType]: "",
    [h.grossEarnings]: fixed(totals.gross),
    [h.milesDriven]: fixed(totals.miles, 1),
    [h.hoursWorked]: formatDurationFromDecimalHours(totals.hours),
    [h.gasSpent]: fixed(totals.gas),
    [h.estimatedGasCost]: "",
    [h.netProfit]: fixed(totals.net),
    [h.earningsPerHour]: "",
    [h.earningsPerMile]: "",
    [h.notes]: ""
  });

  return rows;
}

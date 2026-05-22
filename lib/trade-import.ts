import * as XLSX from "xlsx";
import { calculateRiskReward, type NewTrade, type TradeResult, type TradeType } from "@/lib/trades";

export type BrokerImportFormat = "MT4" | "MT5" | "cTrader" | "Generic CSV";

export type ParsedTradeImport = {
  sourceRow: number;
  trade: NewTrade;
};

export type TradeImportError = {
  message: string;
  row: number;
};

type RawRow = Record<string, string | number | boolean | null | undefined>;

const sourceRowKey = "__sourceRow";

const knownHeaderNames = [
  "Ticket",
  "Deal",
  "Order",
  "Open Time",
  "Entry Time",
  "Close Time",
  "Time",
  "Date",
  "Type",
  "Trade Type",
  "Side",
  "Direction",
  "Size",
  "Volume",
  "Lot Size",
  "Item",
  "Symbol",
  "Instrument",
  "Open Price",
  "Entry Price",
  "Price",
  "S/L",
  "Stop Loss",
  "T/P",
  "Take Profit",
  "Close Price",
  "Profit",
  "Profit/Loss",
  "Net P&L",
  "Net P/L"
].map(normalizeKey);

const formatSamples: Record<BrokerImportFormat, string> = {
  MT4: [
    "Ticket,Open Time,Type,Size,Item,Open Price,S/L,T/P,Close Price,Profit",
    "123456,2026.05.21 09:30:00,buy,0.10,XAUUSD,2375.20,2368.00,2390.00,2384.50,93.00"
  ].join("\n"),
  MT5: [
    "Ticket,Open Time,Type,Size,Item,Open Price,S/L,T/P,Close Price,Profit",
    "987654,2026.05.21 14:15:00,sell,0.20,EURUSD,1.0850,1.0900,1.0750,1.0800,100.00"
  ].join("\n"),
  cTrader: [
    "Position ID,Entry Time,Trade Type,Volume,Symbol,Entry Price,Stop Loss,Take Profit,Closing Price,Net P&L",
    "456789,2026-05-21 10:45:00,Buy,0.10,GBPUSD,1.2700,1.2640,1.2820,1.2780,80.00"
  ].join("\n"),
  "Generic CSV": [
    "Date,Instrument,Type,Entry,Stop Loss,Take Profit,Lot Size,Profit/Loss,Rule Followed,Strategy,Notes",
    "2026-05-21,NAS100,Buy,18450,18370,18620,0.50,250,Yes,Breakout,Imported sample trade"
  ].join("\n")
};

export function downloadSampleImportCsv(format: BrokerImportFormat) {
  const blob = new Blob([formatSamples[format]], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `tradecontrol-${format.toLowerCase().replace(/\s+/g, "-")}-sample.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function parseTradeImportFile(file: File, format: BrokerImportFormat) {
  const rows = file.name.toLowerCase().endsWith(".xlsx") ? await readXlsxRows(file) : parseCsvRows(await file.text());
  return parseTradeRows(rows, format);
}

async function readXlsxRows(file: File): Promise<RawRow[]> {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return [];
  }

  const matrix = XLSX.utils.sheet_to_json<Array<string | number | boolean | null>>(workbook.Sheets[firstSheetName], {
    defval: "",
    header: 1,
    raw: false
  });

  return rowsFromMatrix(matrix);
}

function parseCsvRows(csv: string): RawRow[] {
  return rowsFromMatrix(parseCsv(csv).filter((row) => row.some((cell) => cell.trim())));
}

function rowsFromMatrix(matrix: Array<Array<string | number | boolean | null>>): RawRow[] {
  const headerIndex = findHeaderIndex(matrix);
  const headers = (matrix[headerIndex] ?? []).map((header) => String(header ?? "").trim());

  return matrix.slice(headerIndex + 1).map((row, rowIndex) => {
    return headers.reduce<RawRow>((record, header, columnIndex) => {
      record[header || `Column ${columnIndex + 1}`] = row[columnIndex] ?? "";
      record[sourceRowKey] = headerIndex + rowIndex + 2;
      return record;
    }, {});
  }).filter((row) => Object.entries(row).some(([key, value]) => key !== sourceRowKey && String(value ?? "").trim()));
}

function findHeaderIndex(matrix: Array<Array<string | number | boolean | null>>) {
  let bestIndex = 0;
  let bestScore = -1;

  matrix.slice(0, 40).forEach((row, index) => {
    const normalizedCells = row.map((cell) => normalizeKey(String(cell ?? "")));
    const score = normalizedCells.filter((cell) => knownHeaderNames.includes(cell)).length;
    const hasTradeShape =
      normalizedCells.some((cell) => ["opentime", "entrytime", "closetime", "time", "date"].includes(cell)) &&
      normalizedCells.some((cell) => ["item", "symbol", "instrument"].includes(cell));

    if (score > bestScore || (score === bestScore && hasTradeShape)) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestScore >= 2 ? bestIndex : 0;
}

function parseCsv(csv: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const delimiter = detectCsvDelimiter(csv);

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (char === "\"" && quoted && next === "\"") {
      cell += "\"";
      index += 1;
      continue;
    }

    if (char === "\"") {
      quoted = !quoted;
      continue;
    }

    if (char === delimiter && !quoted) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  rows.push(row);
  return rows;
}

function detectCsvDelimiter(csv: string) {
  const firstLine = csv.split(/\r?\n/).find((line) => line.trim()) ?? "";
  const delimiters = [",", ";", "\t"];
  return delimiters
    .map((delimiter) => ({ delimiter, count: firstLine.split(delimiter).length - 1 }))
    .sort((first, second) => second.count - first.count)[0]?.delimiter ?? ",";
}

function parseTradeRows(rows: RawRow[], format: BrokerImportFormat) {
  const trades: ParsedTradeImport[] = [];
  const errors: TradeImportError[] = [];

  rows.forEach((row, index) => {
    const sourceRow = Number(row[sourceRowKey]) || index + 2;
    try {
      trades.push({
        sourceRow,
        trade: parseTradeRow(row, format)
      });
    } catch (error) {
      errors.push({
        message: error instanceof Error ? error.message : "Unable to parse this row.",
        row: sourceRow
      });
    }
  });

  return { errors, trades };
}

function parseTradeRow(row: RawRow, format: BrokerImportFormat): NewTrade {
  const get = (names: string[]) => getCell(row, names);
  const dateValue = format === "Generic CSV"
    ? get(["Date", "Open Time", "Entry Time", "Close Time", "Time"])
    : get(["Open Time", "Entry Time", "Close Time", "Time", "Date"]);
  const typeValue = get(format === "cTrader" ? ["Trade Type", "Type", "Side", "Direction"] : ["Type", "Trade Type", "Side", "Direction"]);
  const instrument = get(format === "cTrader" ? ["Symbol", "Item", "Instrument", "Market"] : ["Item", "Symbol", "Instrument", "Market"]);
  const entryPrice = parseNumber(get(format === "Generic CSV" ? ["Entry", "Entry Price", "Open Price", "Price"] : ["Open Price", "Entry Price", "Price"]));
  const stopLoss = parseNumber(get(["S/L", "Stop Loss", "SL"]));
  const takeProfit = parseNumber(get(["T/P", "Take Profit", "TP"]));
  const lotSize = parseNumber(get(format === "cTrader" ? ["Volume", "Size", "Lot Size"] : ["Size", "Lot Size", "Volume"]));
  const profitLoss = parseNumber(get(format === "cTrader" ? ["Net P&L", "Net P/L", "Net Profit", "Profit", "Profit/Loss", "P/L"] : ["Profit", "Net Profit", "Profit/Loss", "P/L", "Net P&L", "Net P/L"]));
  const tradeType = parseTradeType(typeValue);

  if (!dateValue) throw new Error("Missing trade date/open time.");
  if (!instrument) throw new Error("Missing instrument.");
  if (!tradeType) throw new Error("Missing or invalid trade type.");
  if (!Number.isFinite(entryPrice)) throw new Error("Missing or invalid entry/open price.");
  if (!Number.isFinite(profitLoss)) throw new Error("Missing or invalid profit value.");

  const ruleFollowed = parseRuleFollowed(get(["Rule Followed", "Rules Followed", "Rule followed"]));
  const result = resultFromProfit(profitLoss);
  const safeStopLoss = Number.isFinite(stopLoss) ? stopLoss : 0;
  const safeTakeProfit = Number.isFinite(takeProfit) ? takeProfit : 0;

  return {
    date: normalizeDate(dateValue),
    emotion: "Unknown",
    entryPrice,
    instrument,
    lotSize: Number.isFinite(lotSize) ? lotSize : 0,
    notes: get(["Notes", "Comment", "Commentary"]) || "",
    profitLoss,
    result,
    riskAmount: 0,
    rr: calculateRiskReward(entryPrice, safeStopLoss, safeTakeProfit),
    ruleFollowed,
    screenshotPath: "",
    screenshotUrl: "",
    session: "London",
    setupQuality: "C",
    stopLoss: safeStopLoss,
    strategy: get(["Strategy", "Setup"]) || "Unknown",
    takeProfit: safeTakeProfit,
    tradeType
  };
}

function getCell(row: RawRow, names: string[]) {
  const normalizedEntries = Object.entries(row).map(([key, value]) => [normalizeKey(key), value] as const);

  for (const name of names) {
    const normalizedName = normalizeKey(name);
    const match = normalizedEntries.find(([key]) => key === normalizedName);
    if (match && match[1] !== null && match[1] !== undefined && String(match[1]).trim() !== "") {
      return String(match[1]).trim();
    }
  }

  return "";
}

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseNumber(value: string) {
  if (!value) return Number.NaN;
  const compact = value.replace(/\s/g, "").replace(/[$€£¥]/g, "").replace("−", "-");
  const normalized = compact.includes(",") && !compact.includes(".")
    ? compact.replace(",", ".")
    : compact.replace(/,/g, "");
  return Number(normalized);
}

function parseTradeType(value: string): TradeType | null {
  const normalized = value.toLowerCase();
  if (normalized.includes("buy")) return "Buy";
  if (normalized.includes("sell")) return "Sell";
  return null;
}

function parseRuleFollowed(value: string) {
  const normalized = value.toLowerCase();
  if (["yes", "y", "true", "1", "followed"].includes(normalized)) return true;
  if (["no", "n", "false", "0", "broken"].includes(normalized)) return false;
  return null;
}

function resultFromProfit(profitLoss: number): TradeResult {
  if (profitLoss > 0) return "Win";
  if (profitLoss < 0) return "Loss";
  return "Breakeven";
}

function normalizeDate(value: string) {
  const normalized = value.trim().replace(/\./g, "-");
  const datePart = normalized.split(/\s+/)[0];
  const parsed = new Date(normalized.replace(" ", "T"));

  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return datePart;
  }

  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  throw new Error("Invalid trade date/open time.");
}

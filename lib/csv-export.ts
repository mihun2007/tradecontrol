import type { Trade } from "@/lib/trades";

const tradeCsvColumns: Array<{ header: string; value: (trade: Trade) => string | number | boolean }> = [
  { header: "Date", value: (trade) => trade.date },
  { header: "Session", value: (trade) => trade.session },
  { header: "Instrument", value: (trade) => trade.instrument },
  { header: "Type", value: (trade) => trade.type },
  { header: "Entry", value: (trade) => trade.entryPrice },
  { header: "Stop Loss", value: (trade) => trade.stopLoss },
  { header: "Take Profit", value: (trade) => trade.takeProfit },
  { header: "Lot Size", value: (trade) => trade.lotSize },
  { header: "Risk Amount", value: (trade) => trade.riskAmount },
  { header: "Result", value: (trade) => trade.result },
  { header: "Profit/Loss", value: (trade) => trade.profitLoss },
  { header: "Strategy", value: (trade) => trade.strategy },
  { header: "Setup Quality", value: (trade) => trade.setupQuality },
  { header: "Emotion", value: (trade) => trade.emotion },
  { header: "Rule Followed", value: (trade) => trade.ruleFollowed ? "Yes" : "No" },
  { header: "Notes", value: (trade) => trade.notes }
];

export function exportTradesToCsv(trades: Trade[], fileName = "tradecontrol-trades.csv") {
  const rows = [
    tradeCsvColumns.map((column) => column.header),
    ...trades.map((trade) => tradeCsvColumns.map((column) => column.value(trade)))
  ];
  const csv = rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function escapeCsvCell(value: string | number | boolean) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
}

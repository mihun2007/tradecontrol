"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, Loader2, Upload, X } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { trackApiFailure, trackEvent } from "@/lib/analytics";
import { createTradesBulk } from "@/lib/trade-service";
import {
  downloadSampleImportCsv,
  parseTradeImportFile,
  type BrokerImportFormat,
  type ParsedTradeImport,
  type TradeImportError
} from "@/lib/trade-import";
import { formatCurrency } from "@/lib/trades";

type TradeImportModalProps = {
  onClose: () => void;
  onImported: (count: number) => void;
  open: boolean;
};

const formats: BrokerImportFormat[] = ["MT4", "MT5", "cTrader", "Generic CSV"];

export function TradeImportModal({ onClose, onImported, open }: TradeImportModalProps) {
  const { currentUser } = useAuth();
  const [format, setFormat] = useState<BrokerImportFormat>("MT5");
  const [fileName, setFileName] = useState("");
  const [parsedTrades, setParsedTrades] = useState<ParsedTradeImport[]>([]);
  const [parseErrors, setParseErrors] = useState<TradeImportError[]>([]);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);

  if (!open) {
    return null;
  }

  async function handleFile(file?: File | null) {
    setError("");
    setParseErrors([]);
    setParsedTrades([]);

    if (!file) {
      setFileName("");
      return;
    }

    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith(".csv") && !lowerName.endsWith(".xlsx")) {
      setError("Please upload a CSV or XLSX file.");
      return;
    }

    setFileName(file.name);

    try {
      const result = await parseTradeImportFile(file, format);
      setParsedTrades(result.trades);
      setParseErrors(result.errors);
      trackEvent("trade_import_previewed", {
        failed_rows: result.errors.length,
        format,
        parsed_trades: result.trades.length
      });
    } catch (parseError) {
      trackApiFailure("trade_import_parse", parseError, { format });
      setError(parseError instanceof Error ? parseError.message : "Unable to parse this import file.");
    }
  }

  async function confirmImport() {
    if (!currentUser) {
      setError("You must be signed in before importing trades.");
      return;
    }

    if (!parsedTrades.length) {
      setError("No valid trades are ready to import.");
      return;
    }

    try {
      setImporting(true);
      setError("");
      const count = await createTradesBulk(currentUser.uid, parsedTrades.map((item) => item.trade));
      trackEvent("trade_imported", { format, imported_trades: count });
      onImported(count);
      onClose();
    } catch (importError) {
      trackApiFailure("trade_import", importError, { format, parsed_trades: parsedTrades.length });
      setError(importError instanceof Error ? importError.message : "Unable to import these trades.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-zinc-950/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <section className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-white/[0.55] bg-white text-ink shadow-premium dark:border-white/10 dark:bg-zinc-950">
        <div className="flex items-start justify-between gap-4 border-b border-line/70 p-5 sm:p-6">
          <div className="flex gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted">Import Trades</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-normal">Preview broker history before saving.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                Upload CSV or XLSX trade history, choose the broker format, review parsed rows, then import valid trades to Firestore.
              </p>
            </div>
          </div>
          <button className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-line/70 bg-surface/70 text-muted" type="button" onClick={onClose} aria-label="Close import modal">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 sm:p-6">
          <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-ink">Broker/platform format</span>
              <select className="h-12 rounded-2xl border border-line/70 bg-surface/70 px-4 text-sm font-semibold text-ink outline-none focus:border-profit/70 focus:ring-4 focus:ring-profit/10" value={format} onChange={(event) => setFormat(event.target.value as BrokerImportFormat)}>
                {formats.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>

            <div className="grid gap-2">
              <span className="text-sm font-semibold text-ink">Trade history file</span>
              <label className="flex min-h-12 cursor-pointer flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-line bg-surface/60 px-4 py-3 text-sm font-semibold text-ink transition hover:bg-surface">
                <span className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  {fileName || "Choose CSV or XLSX file"}
                </span>
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted">.csv / .xlsx</span>
                <input className="sr-only" type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => void handleFile(event.target.files?.[0] ?? null)} />
              </label>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {formats.map((item) => (
              <button key={item} className="inline-flex h-9 items-center gap-2 rounded-2xl border border-line/70 bg-surface/70 px-3 text-xs font-bold text-muted transition hover:bg-surface hover:text-ink" type="button" onClick={() => downloadSampleImportCsv(item)}>
                <Download className="h-3.5 w-3.5" />
                Download {item} sample CSV
              </button>
            ))}
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-loss/25 bg-loss/10 px-4 py-3 text-sm font-semibold text-loss">
              {error}
            </div>
          ) : null}

          {parseErrors.length ? (
            <div className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-400/[0.08] p-4">
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-200">{parseErrors.length} rows need attention</p>
              <div className="mt-2 grid gap-1 text-sm text-muted">
                {parseErrors.slice(0, 8).map((item) => (
                  <p key={`${item.row}-${item.message}`}>Row {item.row}: {item.message}</p>
                ))}
                {parseErrors.length > 8 ? <p>And {parseErrors.length - 8} more rows.</p> : null}
              </div>
            </div>
          ) : null}

          <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-line/60">
            <div className="grid grid-cols-[0.45fr_0.85fr_0.9fr_0.5fr_0.7fr_0.7fr_0.7fr_0.7fr_0.7fr] border-b border-line/60 bg-zinc-50/70 px-4 py-3 text-xs font-bold uppercase tracking-[0.1em] text-muted dark:bg-white/[0.04]">
              <span>Row</span>
              <span>Date</span>
              <span>Instrument</span>
              <span>Type</span>
              <span>Entry</span>
              <span>S/L</span>
              <span>T/P</span>
              <span>Lots</span>
              <span>P/L</span>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-line/60">
              {parsedTrades.length ? parsedTrades.map(({ sourceRow, trade }) => (
                <div key={`${sourceRow}-${trade.instrument}-${trade.profitLoss}`} className="grid grid-cols-[0.45fr_0.85fr_0.9fr_0.5fr_0.7fr_0.7fr_0.7fr_0.7fr_0.7fr] px-4 py-3 text-sm">
                  <span className="text-muted">{sourceRow}</span>
                  <span className="font-medium text-ink">{trade.date}</span>
                  <span className="font-semibold text-ink">{trade.instrument}</span>
                  <span>{trade.tradeType}</span>
                  <span>{trade.entryPrice}</span>
                  <span>{trade.stopLoss || "-"}</span>
                  <span>{trade.takeProfit || "-"}</span>
                  <span>{trade.lotSize}</span>
                  <span className={trade.profitLoss > 0 ? "font-semibold text-profit" : trade.profitLoss < 0 ? "font-semibold text-loss" : "text-muted"}>{formatCurrency(trade.profitLoss)}</span>
                </div>
              )) : (
                <div className="px-5 py-10 text-center text-sm font-semibold text-muted">
                  Upload a file to preview parsed trades before importing.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-line/70 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <p className="text-sm text-muted">{parsedTrades.length} valid trades ready to import.</p>
          <div className="flex gap-3">
            <button className="h-11 rounded-2xl border border-line/70 bg-surface/70 px-5 text-sm font-semibold text-ink" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 text-sm font-semibold text-white shadow-premium disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-950" type="button" disabled={!parsedTrades.length || importing} onClick={confirmImport}>
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {importing ? "Importing..." : "Import Trades"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

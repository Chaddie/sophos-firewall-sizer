"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CatalogImportResult } from "@/lib/catalog-actions";
import { downloadTextFile } from "@/lib/sizing/quote-export";

interface CatalogCsvImportProps {
  /** Short label for this catalog section (e.g. "firewall"). */
  kindLabel: string;
  formatHint: string;
  templateCsv: string;
  exportCsv: string;
  filenamePrefix: string;
  onImport: (csvText: string) => Promise<CatalogImportResult>;
  onImported: (result: CatalogImportResult) => void;
}

export function CatalogCsvImport({
  kindLabel,
  formatHint,
  templateCsv,
  exportCsv,
  filenamePrefix,
  onImport,
  onImported,
}: CatalogCsvImportProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<CatalogImportResult | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  function resetFile() {
    setFileName(null);
    setCsvText(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleFileChange(file: File | null) {
    setResult(null);
    setLocalError(null);
    if (!file) {
      resetFile();
      return;
    }
    if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
      setLocalError("Please choose a .csv file");
      resetFile();
      return;
    }
    try {
      const text = await file.text();
      setFileName(file.name);
      setCsvText(text);
    } catch {
      setLocalError("Could not read the selected file");
      resetFile();
    }
  }

  async function handleImport() {
    if (!csvText) {
      setLocalError("Choose a CSV file first");
      return;
    }
    setImporting(true);
    setLocalError(null);
    setResult(null);
    try {
      const importResult = await onImport(csvText);
      setResult(importResult);
      if (importResult.success) {
        onImported(importResult);
        resetFile();
      }
    } catch {
      setLocalError("Import failed — check that you are signed in as an SE");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-[var(--sophos-grey-2)] bg-white p-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[12rem] flex-1">
          <Label className="text-xs">Import {kindLabel} CSV</Label>
          <Input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="mt-1 h-9 cursor-pointer text-sm file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium"
            onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
          />
        </div>
        <Button
          size="sm"
          onClick={handleImport}
          disabled={importing || !csvText}
        >
          {importing ? "Importing…" : "Import"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          type="button"
          onClick={() =>
            downloadTextFile(
              `${filenamePrefix}-template.csv`,
              templateCsv,
              "text/csv;charset=utf-8",
            )
          }
        >
          Download template
        </Button>
        <Button
          size="sm"
          variant="outline"
          type="button"
          onClick={() =>
            downloadTextFile(
              `${filenamePrefix}-export.csv`,
              exportCsv,
              "text/csv;charset=utf-8",
            )
          }
        >
          Export current
        </Button>
      </div>

      <p className="text-muted-foreground text-xs leading-relaxed">
        Upserts by model <code className="text-[0.7rem]">id</code> (updates
        existing, inserts new). {formatHint}
        {fileName ? (
          <>
            {" "}
            Selected: <span className="text-foreground">{fileName}</span>
          </>
        ) : null}
      </p>

      {localError && <p className="text-destructive text-sm">{localError}</p>}

      {result && (
        <div className="space-y-1 text-sm">
          {result.success ? (
            <p className="text-[var(--sophos-navy)]">
              Imported {result.inserted + result.updated} row
              {result.inserted + result.updated === 1 ? "" : "s"}
              {result.inserted > 0 ? ` (${result.inserted} new)` : ""}
              {result.updated > 0 ? ` (${result.updated} updated)` : ""}
              {result.skipped > 0 ? `; skipped ${result.skipped} blank` : ""}
              {result.errors.length > 0
                ? `; ${result.errors.length} row error${result.errors.length === 1 ? "" : "s"}`
                : ""}
              .
            </p>
          ) : (
            <p className="text-destructive">
              {result.error ?? "Import failed"}
            </p>
          )}
          {result.errors.length > 0 && (
            <ul className="text-destructive max-h-32 list-disc overflow-y-auto pl-5 text-xs">
              {result.errors.slice(0, 25).map((err) => (
                <li key={`${err.row}-${err.message}`}>
                  Row {err.row}: {err.message}
                </li>
              ))}
              {result.errors.length > 25 && (
                <li>…and {result.errors.length - 25} more</li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

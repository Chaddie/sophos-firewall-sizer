"use client";

import { Fragment, useState } from "react";
import { CatalogCsvImport } from "@/components/admin/catalog-csv-import";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  importSwitchCsvAction,
  removeSwitchModelAction,
  saveSwitchModelAction,
  type CatalogImportResult,
} from "@/lib/catalog-actions";
import {
  switchCsvTemplate,
  switchModelsToCsv,
} from "@/lib/sizing/catalog-csv";
import type { SwitchCatalogModel } from "@/lib/sizing/types";

function emptyModel(): SwitchCatalogModel {
  return {
    id: "",
    name: "",
    sku: "",
    series: 200,
    portCount: 0,
    ports1GbE: 0,
    ports2_5GbE: 0,
    ports10GbE: 0,
    sfpPlusUplinkCount: 0,
    poeSupported: false,
    poeBudgetWatts: 0,
    supportsBtPoE: false,
  };
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="mt-1 h-8"
      />
    </div>
  );
}

function ModelEditor({
  model,
  isNew,
  onCancel,
  onSaved,
}: {
  model: SwitchCatalogModel;
  isNew: boolean;
  onCancel: () => void;
  onSaved: (model: SwitchCatalogModel) => void;
}) {
  const [draft, setDraft] = useState<SwitchCatalogModel>(model);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof SwitchCatalogModel>(
    key: K,
    value: SwitchCatalogModel[K],
  ) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await saveSwitchModelAction(draft);
    setSaving(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    onSaved(draft);
  }

  return (
    <div className="space-y-3 rounded-lg border border-[var(--sophos-blue)]/40 bg-[var(--sophos-blue)]/5 p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label className="text-xs">Model ID (unique)</Label>
          <Input
            value={draft.id}
            disabled={!isNew}
            onChange={(e) => set("id", e.target.value)}
            className="mt-1 h-8"
          />
        </div>
        <div>
          <Label className="text-xs">Display name</Label>
          <Input
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
            className="mt-1 h-8"
          />
        </div>
        <div>
          <Label className="text-xs">SKU</Label>
          <Input
            value={draft.sku}
            onChange={(e) => set("sku", e.target.value)}
            className="mt-1 h-8"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <div>
          <Label className="text-xs">Series</Label>
          <select
            value={draft.series}
            onChange={(e) => set("series", Number(e.target.value) as 200 | 1000)}
            className="border-input mt-1 h-8 w-full rounded-md border bg-transparent px-2 text-sm"
          >
            <option value={200}>200</option>
            <option value={1000}>1000</option>
          </select>
        </div>
        <NumField
          label="Total ports"
          value={draft.portCount}
          onChange={(v) => set("portCount", v)}
        />
        <NumField
          label="1GbE ports"
          value={draft.ports1GbE}
          onChange={(v) => set("ports1GbE", v)}
        />
        <NumField
          label="2.5GbE ports"
          value={draft.ports2_5GbE}
          onChange={(v) => set("ports2_5GbE", v)}
        />
        <NumField
          label="10GbE ports"
          value={draft.ports10GbE}
          onChange={(v) => set("ports10GbE", v)}
        />
        <NumField
          label="SFP+ uplinks"
          value={draft.sfpPlusUplinkCount}
          onChange={(v) => set("sfpPlusUplinkCount", v)}
        />
        <NumField
          label="PoE budget (W)"
          value={draft.poeBudgetWatts}
          onChange={(v) => set("poeBudgetWatts", v)}
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-1.5 text-sm">
          <input
            type="checkbox"
            checked={draft.poeSupported}
            onChange={(e) => set("poeSupported", e.target.checked)}
            className="size-4 accent-[var(--sophos-blue)]"
          />
          Supports PoE
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          <input
            type="checkbox"
            checked={draft.supportsBtPoE}
            onChange={(e) => set("supportsBtPoE", e.target.checked)}
            className="size-4 accent-[var(--sophos-blue)]"
          />
          Supports 60W (BT) PoE
        </label>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function SwitchCatalogTable({
  models,
}: {
  models: SwitchCatalogModel[];
}) {
  const [items, setItems] = useState(models);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm(`Delete model "${id}"? This cannot be undone.`)) return;
    setDeletingId(id);
    await removeSwitchModelAction(id);
    setItems((prev) => prev.filter((m) => m.id !== id));
    setDeletingId(null);
  }

  function handleSaved(model: SwitchCatalogModel, wasNew: boolean) {
    setItems((prev) => {
      if (wasNew) return [...prev, model];
      return prev.map((m) => (m.id === model.id ? model : m));
    });
    setEditingId(null);
    setAdding(false);
  }

  function handleImported(result: CatalogImportResult) {
    const imported = result.models as SwitchCatalogModel[];
    setItems((prev) => {
      const byId = new Map(prev.map((m) => [m.id, m]));
      for (const model of imported) byId.set(model.id, model);
      return Array.from(byId.values());
    });
    setEditingId(null);
    setAdding(false);
  }

  return (
    <div className="space-y-3">
      <CatalogCsvImport
        kindLabel="switch"
        formatHint="Columns match the editor fields; series is 200 or 1000; booleans are true/false."
        templateCsv={switchCsvTemplate()}
        exportCsv={switchModelsToCsv(items)}
        filenamePrefix="switch-catalog"
        onImport={importSwitchCsvAction}
        onImported={handleImported}
      />
      <div className="overflow-x-auto rounded-lg border border-[var(--sophos-grey-2)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--sophos-grey-1)] text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Model</th>
              <th className="px-3 py-2 font-medium">SKU</th>
              <th className="px-3 py-2 font-medium">Series</th>
              <th className="px-3 py-2 font-medium">Ports</th>
              <th className="px-3 py-2 font-medium">PoE</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {items.map((model) => (
              <Fragment key={model.id}>
                <tr className="border-t border-[var(--sophos-grey-2)]">
                  <td className="px-3 py-2 font-medium">{model.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{model.sku}</td>
                  <td className="px-3 py-2">{model.series}</td>
                  <td className="px-3 py-2">{model.portCount}</td>
                  <td className="px-3 py-2">
                    {model.poeSupported ? (
                      <Badge variant="secondary" className="text-xs">
                        {model.poeBudgetWatts}W{model.supportsBtPoE ? " (BT)" : ""}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setEditingId(editingId === model.id ? null : model.id)
                        }
                      >
                        {editingId === model.id ? "Close" : "Edit"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        disabled={deletingId === model.id}
                        onClick={() => handleDelete(model.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
                {editingId === model.id && (
                  <tr>
                    <td colSpan={6} className="bg-white px-3 py-3">
                      <ModelEditor
                        model={model}
                        isNew={false}
                        onCancel={() => setEditingId(null)}
                        onSaved={(m) => handleSaved(m, false)}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {adding ? (
        <ModelEditor
          model={emptyModel()}
          isNew
          onCancel={() => setAdding(false)}
          onSaved={(m) => handleSaved(m, true)}
        />
      ) : (
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
          Add switch model
        </Button>
      )}
    </div>
  );
}

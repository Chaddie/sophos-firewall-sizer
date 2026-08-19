"use client";

import { useState } from "react";
import { CatalogCsvImport } from "@/components/admin/catalog-csv-import";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  importAccessoryCsvAction,
  removeAccessoryModelAction,
  saveAccessoryModelAction,
  type CatalogImportResult,
} from "@/lib/catalog-actions";
import {
  accessoryCsvTemplate,
  accessoryModelsToCsv,
} from "@/lib/sizing/catalog-csv";
import type { AccessoryModel, AccessoryType } from "@/lib/sizing/types";

const ACCESSORY_TYPES: { id: AccessoryType; label: string }[] = [
  { id: "sfp_sr", label: "SFP+ SR" },
  { id: "sfp_lr", label: "SFP+ LR" },
];

function emptyAccessory(): AccessoryModel {
  return {
    id: "",
    type: "sfp_sr",
    name: "",
    sku: "",
  };
}

function AccessoryEditor({
  model,
  isNew,
  onCancel,
  onSaved,
}: {
  model: AccessoryModel;
  isNew: boolean;
  onCancel: () => void;
  onSaved: (model: AccessoryModel) => void;
}) {
  const [draft, setDraft] = useState<AccessoryModel>(model);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await saveAccessoryModelAction(draft);
    setSaving(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    onSaved(draft);
  }

  return (
    <div className="space-y-3 rounded-lg border border-[var(--sophos-blue)]/40 bg-[var(--sophos-blue)]/5 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Accessory ID (unique)</Label>
          <Input
            value={draft.id}
            disabled={!isNew}
            onChange={(e) => setDraft((d) => ({ ...d, id: e.target.value }))}
            className="mt-1 h-8"
          />
        </div>
        <div>
          <Label className="text-xs">Type</Label>
          <select
            className="border-input mt-1 flex h-8 w-full rounded-lg border bg-transparent px-2.5 text-sm"
            value={draft.type}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                type: e.target.value as AccessoryType,
              }))
            }
          >
            {ACCESSORY_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs">Display name</Label>
          <Input
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            className="mt-1 h-8"
          />
        </div>
        <div>
          <Label className="text-xs">Order SKU</Label>
          <Input
            value={draft.sku}
            onChange={(e) => setDraft((d) => ({ ...d, sku: e.target.value }))}
            className="mt-1 h-8"
          />
        </div>
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

export function AccessoryCatalogTable({
  models,
}: {
  models: AccessoryModel[];
}) {
  const [items, setItems] = useState(models);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm(`Delete accessory "${id}"? This cannot be undone.`)) return;
    setDeletingId(id);
    await removeAccessoryModelAction(id);
    setItems((prev) => prev.filter((m) => m.id !== id));
    setDeletingId(null);
  }

  function handleImported(result: CatalogImportResult) {
    const imported = result.models as AccessoryModel[];
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
        kindLabel="accessory"
        formatHint="Columns: id, type (sfp_sr or sfp_lr), name, sku."
        templateCsv={accessoryCsvTemplate()}
        exportCsv={accessoryModelsToCsv(items)}
        filenamePrefix="accessory-catalog"
        onImport={importAccessoryCsvAction}
        onImported={handleImported}
      />
      {items.map((model) =>
        editingId === model.id ? (
          <AccessoryEditor
            key={model.id}
            model={model}
            isNew={false}
            onCancel={() => setEditingId(null)}
            onSaved={(saved) => {
              setItems((prev) =>
                prev.map((m) => (m.id === saved.id ? saved : m)),
              );
              setEditingId(null);
            }}
          />
        ) : (
          <div
            key={model.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
          >
            <div>
              <p className="font-medium">{model.name}</p>
              <p className="text-muted-foreground text-xs">
                {model.type === "sfp_sr" ? "SFP+ SR" : "SFP+ LR"} · SKU{" "}
                {model.sku} · id {model.id}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditingId(model.id)}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={deletingId === model.id}
                onClick={() => handleDelete(model.id)}
              >
                {deletingId === model.id ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        ),
      )}

      {adding ? (
        <AccessoryEditor
          model={emptyAccessory()}
          isNew
          onCancel={() => setAdding(false)}
          onSaved={(saved) => {
            setItems((prev) => [...prev, saved]);
            setAdding(false);
          }}
        />
      ) : (
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
          Add accessory
        </Button>
      )}
    </div>
  );
}

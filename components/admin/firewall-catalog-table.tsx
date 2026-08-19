"use client";

import { Fragment, useState } from "react";
import { CatalogCsvImport } from "@/components/admin/catalog-csv-import";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  importFirewallCsvAction,
  removeFirewallModelAction,
  saveFirewallModelAction,
  type CatalogImportResult,
} from "@/lib/catalog-actions";
import {
  firewallCsvTemplate,
  firewallModelsToCsv,
} from "@/lib/sizing/catalog-csv";
import type { CatalogModel, Environment } from "@/lib/sizing/types";

const ENVIRONMENTS: { id: Environment; label: string }[] = [
  { id: "physical", label: "Physical" },
  { id: "virtual", label: "Virtual" },
  { id: "aws", label: "AWS" },
  { id: "azure", label: "Azure" },
];

function emptyModel(): CatalogModel {
  return {
    id: "",
    name: "",
    sku: "",
    licenseSku: "",
    environment: ["physical"],
    formFactor: "",
    threatProtectionMbps: 0,
    xstreamSslMbps: 0,
    ipsecVpnMbps: 0,
    maxIpsecTunnels: 0,
    maxSslVpnTunnels: 0,
    maxConcurrentConnections: 0,
    minUsers: 0,
    maxUsers: 0,
    vcpu: undefined,
    ramGb: undefined,
    awsInstance: "",
    azureVmSize: "",
    redundantPsuSku: "",
    redundantPsuName: "",
  };
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="mt-1 h-8"
      />
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
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
  model: CatalogModel;
  isNew: boolean;
  onCancel: () => void;
  onSaved: (model: CatalogModel) => void;
}) {
  const [draft, setDraft] = useState<CatalogModel>(model);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof CatalogModel>(key: K, value: CatalogModel[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function toggleEnv(env: Environment) {
    setDraft((d) => ({
      ...d,
      environment: d.environment.includes(env)
        ? d.environment.filter((e) => e !== env)
        : [...d.environment, env],
    }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await saveFirewallModelAction(draft);
    setSaving(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    onSaved(draft);
  }

  const isVirtual = draft.environment.some((e) => e !== "physical");

  return (
    <div className="space-y-3 rounded-lg border border-[var(--sophos-blue)]/40 bg-[var(--sophos-blue)]/5 p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <TextField
          label="Model ID (unique)"
          value={draft.id}
          disabled={!isNew}
          onChange={(v) => set("id", v)}
        />
        <TextField
          label="Display name"
          value={draft.name}
          onChange={(v) => set("name", v)}
        />
        <TextField
          label="Form factor"
          value={draft.formFactor}
          onChange={(v) => set("formFactor", v)}
        />
      </div>

      <div>
        <Label className="text-xs">Environments</Label>
        <div className="mt-1 flex flex-wrap gap-3">
          {ENVIRONMENTS.map((env) => (
            <label key={env.id} className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={draft.environment.includes(env.id)}
                onChange={() => toggleEnv(env.id)}
                className="size-4 accent-[var(--sophos-blue)]"
              />
              {env.label}
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <TextField
          label="Physical SKU"
          value={draft.sku}
          onChange={(v) => set("sku", v)}
        />
        <TextField
          label="License SKU (virtual/cloud)"
          value={draft.licenseSku}
          onChange={(v) => set("licenseSku", v)}
        />
        <TextField
          label="Redundant PSU SKU"
          value={draft.redundantPsuSku}
          onChange={(v) => set("redundantPsuSku", v)}
        />
        <TextField
          label="Redundant PSU name"
          value={draft.redundantPsuName}
          onChange={(v) => set("redundantPsuName", v)}
        />
        {isVirtual && (
          <>
            <NumField
              label="vCPU"
              value={draft.vcpu}
              onChange={(v) => set("vcpu", v)}
            />
            <NumField
              label="RAM (GB)"
              value={draft.ramGb}
              onChange={(v) => set("ramGb", v)}
            />
            <TextField
              label="AWS instance type"
              value={draft.awsInstance}
              onChange={(v) => set("awsInstance", v)}
            />
            <TextField
              label="Azure VM size"
              value={draft.azureVmSize}
              onChange={(v) => set("azureVmSize", v)}
            />
          </>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <NumField
          label="Threat protection (Mbps)"
          value={draft.threatProtectionMbps}
          onChange={(v) => set("threatProtectionMbps", v)}
        />
        <NumField
          label="Xstream SSL (Mbps)"
          value={draft.xstreamSslMbps}
          onChange={(v) => set("xstreamSslMbps", v)}
        />
        <NumField
          label="IPsec VPN (Mbps)"
          value={draft.ipsecVpnMbps}
          onChange={(v) => set("ipsecVpnMbps", v)}
        />
        <NumField
          label="Max concurrent connections"
          value={draft.maxConcurrentConnections}
          onChange={(v) => set("maxConcurrentConnections", v)}
        />
        <NumField
          label="Max IPsec tunnels"
          value={draft.maxIpsecTunnels}
          onChange={(v) => set("maxIpsecTunnels", v)}
        />
        <NumField
          label="Max SSL VPN tunnels"
          value={draft.maxSslVpnTunnels}
          onChange={(v) => set("maxSslVpnTunnels", v)}
        />
        <NumField
          label="Min users"
          value={draft.minUsers}
          onChange={(v) => set("minUsers", v)}
        />
        <NumField
          label="Max users"
          value={draft.maxUsers}
          onChange={(v) => set("maxUsers", v)}
        />
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

export function FirewallCatalogTable({
  models,
}: {
  models: CatalogModel[];
}) {
  const [items, setItems] = useState(models);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm(`Delete model "${id}"? This cannot be undone.`)) return;
    setDeletingId(id);
    await removeFirewallModelAction(id);
    setItems((prev) => prev.filter((m) => m.id !== id));
    setDeletingId(null);
  }

  function handleSaved(model: CatalogModel, wasNew: boolean) {
    setItems((prev) => {
      if (wasNew) return [...prev, model];
      return prev.map((m) => (m.id === model.id ? model : m));
    });
    setEditingId(null);
    setAdding(false);
  }

  function handleImported(result: CatalogImportResult) {
    const imported = result.models as CatalogModel[];
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
        kindLabel="firewall"
        formatHint="Columns match the editor fields; environment values are pipe-separated (physical|virtual|aws|azure)."
        templateCsv={firewallCsvTemplate()}
        exportCsv={firewallModelsToCsv(items)}
        filenamePrefix="firewall-catalog"
        onImport={importFirewallCsvAction}
        onImported={handleImported}
      />
      <div className="overflow-x-auto rounded-lg border border-[var(--sophos-grey-2)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--sophos-grey-1)] text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Model</th>
              <th className="px-3 py-2 font-medium">SKU</th>
              <th className="px-3 py-2 font-medium">Environments</th>
              <th className="px-3 py-2 font-medium">Threat Mbps</th>
              <th className="px-3 py-2 font-medium">Max connections</th>
              <th className="px-3 py-2 font-medium">Users</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {items.map((model) => (
              <Fragment key={model.id}>
                <tr className="border-t border-[var(--sophos-grey-2)]">
                  <td className="px-3 py-2 font-medium">{model.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {model.sku || model.licenseSku || "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {model.environment.map((env) => (
                        <Badge key={env} variant="secondary" className="text-xs">
                          {env}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2">{model.threatProtectionMbps}</td>
                  <td className="px-3 py-2">
                    {model.maxConcurrentConnections.toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    {model.minUsers}–{model.maxUsers}
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
                    <td colSpan={7} className="bg-white px-3 py-3">
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
          Add firewall model
        </Button>
      )}
    </div>
  );
}

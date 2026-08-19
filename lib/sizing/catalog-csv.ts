import type {
  AccessoryModel,
  AccessoryType,
  CatalogModel,
  Environment,
  SwitchCatalogModel,
} from "./types";

export interface CatalogCsvRowError {
  row: number;
  message: string;
}

export interface CatalogCsvParseResult<T> {
  models: T[];
  errors: CatalogCsvRowError[];
  skipped: number;
}

const ENVIRONMENTS: Environment[] = ["physical", "virtual", "aws", "azure"];

export const FIREWALL_CSV_HEADERS = [
  "id",
  "name",
  "sku",
  "licenseSku",
  "environment",
  "formFactor",
  "threatProtectionMbps",
  "xstreamSslMbps",
  "ipsecVpnMbps",
  "maxIpsecTunnels",
  "maxSslVpnTunnels",
  "maxConcurrentConnections",
  "minUsers",
  "maxUsers",
  "vcpu",
  "ramGb",
  "awsInstance",
  "azureVmSize",
  "redundantPsuSku",
  "redundantPsuName",
] as const;

export const SWITCH_CSV_HEADERS = [
  "id",
  "name",
  "sku",
  "series",
  "portCount",
  "ports1GbE",
  "ports2_5GbE",
  "ports10GbE",
  "sfpPlusUplinkCount",
  "poeSupported",
  "poeBudgetWatts",
  "supportsBtPoE",
] as const;

export const ACCESSORY_CSV_HEADERS = ["id", "type", "name", "sku"] as const;

function csvEscape(value: string | number | boolean | undefined | null): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

/** RFC-style CSV parse: supports quoted fields and commas inside quotes. */
export function parseCsv(text: string): string[][] {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    if (inQuotes) {
      if (ch === '"') {
        if (normalized[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      field = "";
      if (row.some((cell) => cell.trim() !== "")) {
        rows.push(row);
      }
      row = [];
    } else {
      field += ch;
    }
  }

  row.push(field);
  if (row.some((cell) => cell.trim() !== "")) {
    rows.push(row);
  }

  return rows;
}

function headerIndexMap(headerRow: string[]): Map<string, number> {
  const map = new Map<string, number>();
  headerRow.forEach((raw, i) => {
    const key = raw.trim();
    if (key) map.set(key, i);
  });
  return map;
}

function cell(row: string[], index: Map<string, number>, name: string): string {
  const i = index.get(name);
  if (i == null) return "";
  return (row[i] ?? "").trim();
}

function requireHeaders(
  index: Map<string, number>,
  required: readonly string[],
): string | null {
  const missing = required.filter((h) => !index.has(h));
  if (missing.length === 0) return null;
  return `Missing required column(s): ${missing.join(", ")}`;
}

function parseRequiredNumber(
  raw: string,
  field: string,
): { value: number } | { error: string } {
  if (raw === "") return { error: `${field} is required` };
  const n = Number(raw);
  if (!Number.isFinite(n)) return { error: `${field} must be a number` };
  return { value: n };
}

function parseOptionalNumber(
  raw: string,
  field: string,
): { value: number | undefined } | { error: string } {
  if (raw === "") return { value: undefined };
  const n = Number(raw);
  if (!Number.isFinite(n)) return { error: `${field} must be a number` };
  return { value: n };
}

function parseOptionalString(raw: string): string | undefined {
  return raw === "" ? undefined : raw;
}

function parseBoolean(
  raw: string,
  field: string,
): { value: boolean } | { error: string } {
  const v = raw.toLowerCase();
  if (v === "true" || v === "1" || v === "yes") return { value: true };
  if (v === "false" || v === "0" || v === "no" || v === "") return { value: false };
  return { error: `${field} must be true/false (or 1/0, yes/no)` };
}

function parseEnvironments(
  raw: string,
): { value: Environment[] } | { error: string } {
  if (!raw) return { error: "environment is required (e.g. physical|virtual)" };
  const parts = raw
    .split(/[|;]/)
    .map((p) => p.trim())
    .filter(Boolean) as Environment[];
  if (parts.length === 0) {
    return { error: "environment is required (e.g. physical|virtual)" };
  }
  const invalid = parts.filter((p) => !ENVIRONMENTS.includes(p));
  if (invalid.length > 0) {
    return {
      error: `Invalid environment(s): ${invalid.join(", ")}. Use physical, virtual, aws, azure separated by |`,
    };
  }
  return { value: [...new Set(parts)] };
}

function formatEnvironments(envs: Environment[]): string {
  return envs.join("|");
}

export function firewallModelsToCsv(models: CatalogModel[]): string {
  const lines = [
    FIREWALL_CSV_HEADERS.join(","),
    ...models.map((m) =>
      [
        m.id,
        m.name,
        m.sku ?? "",
        m.licenseSku ?? "",
        formatEnvironments(m.environment),
        m.formFactor ?? "",
        m.threatProtectionMbps,
        m.xstreamSslMbps,
        m.ipsecVpnMbps,
        m.maxIpsecTunnels,
        m.maxSslVpnTunnels,
        m.maxConcurrentConnections,
        m.minUsers,
        m.maxUsers,
        m.vcpu ?? "",
        m.ramGb ?? "",
        m.awsInstance ?? "",
        m.azureVmSize ?? "",
        m.redundantPsuSku ?? "",
        m.redundantPsuName ?? "",
      ]
        .map(csvEscape)
        .join(","),
    ),
  ];
  return lines.join("\n");
}

export function switchModelsToCsv(models: SwitchCatalogModel[]): string {
  const lines = [
    SWITCH_CSV_HEADERS.join(","),
    ...models.map((m) =>
      [
        m.id,
        m.name,
        m.sku,
        m.series,
        m.portCount,
        m.ports1GbE,
        m.ports2_5GbE,
        m.ports10GbE,
        m.sfpPlusUplinkCount,
        m.poeSupported,
        m.poeBudgetWatts,
        m.supportsBtPoE,
      ]
        .map(csvEscape)
        .join(","),
    ),
  ];
  return lines.join("\n");
}

export function accessoryModelsToCsv(models: AccessoryModel[]): string {
  const lines = [
    ACCESSORY_CSV_HEADERS.join(","),
    ...models.map((m) =>
      [m.id, m.type, m.name, m.sku].map(csvEscape).join(","),
    ),
  ];
  return lines.join("\n");
}

export function firewallCsvTemplate(): string {
  return [
    FIREWALL_CSV_HEADERS.join(","),
    [
      "xgs-example",
      "XGS Example",
      "XGS-EXAMPLE",
      "",
      "physical",
      "Desktop",
      "1000",
      "800",
      "2000",
      "500",
      "250",
      "1000000",
      "1",
      "50",
      "",
      "",
      "",
      "",
      "",
      "",
    ].join(","),
  ].join("\n");
}

export function switchCsvTemplate(): string {
  return [
    SWITCH_CSV_HEADERS.join(","),
    [
      "cs-example",
      "Sophos Switch Example",
      "CS-EXAMPLE",
      "200",
      "8",
      "8",
      "0",
      "0",
      "2",
      "false",
      "0",
      "false",
    ].join(","),
  ].join("\n");
}

export function accessoryCsvTemplate(): string {
  return [
    ACCESSORY_CSV_HEADERS.join(","),
    ["sfp-example", "sfp_sr", "Sophos SFP+ Example", "SFP-EXAMPLE"].join(","),
  ].join("\n");
}

export function parseFirewallCsv(text: string): CatalogCsvParseResult<CatalogModel> {
  const rows = parseCsv(text);
  if (rows.length === 0) {
    return { models: [], errors: [{ row: 0, message: "CSV is empty" }], skipped: 0 };
  }

  const index = headerIndexMap(rows[0]);
  const headerError = requireHeaders(index, [
    "id",
    "name",
    "environment",
    "threatProtectionMbps",
    "xstreamSslMbps",
    "ipsecVpnMbps",
    "maxIpsecTunnels",
    "maxSslVpnTunnels",
    "maxConcurrentConnections",
    "minUsers",
    "maxUsers",
  ]);
  if (headerError) {
    return { models: [], errors: [{ row: 1, message: headerError }], skipped: 0 };
  }

  const models: CatalogModel[] = [];
  const errors: CatalogCsvRowError[] = [];
  let skipped = 0;
  const seen = new Set<string>();

  for (let r = 1; r < rows.length; r++) {
    const rowNum = r + 1;
    const row = rows[r];
    const id = cell(row, index, "id");
    const name = cell(row, index, "name");

    if (!id && !name) {
      skipped++;
      continue;
    }

    if (!id) {
      errors.push({ row: rowNum, message: "id is required" });
      continue;
    }
    if (!name) {
      errors.push({ row: rowNum, message: "name is required" });
      continue;
    }
    if (seen.has(id)) {
      errors.push({ row: rowNum, message: `Duplicate id "${id}" in CSV` });
      continue;
    }

    const envResult = parseEnvironments(cell(row, index, "environment"));
    if ("error" in envResult) {
      errors.push({ row: rowNum, message: envResult.error });
      continue;
    }

    const nums: Record<string, number> = {};
    const requiredNums = [
      "threatProtectionMbps",
      "xstreamSslMbps",
      "ipsecVpnMbps",
      "maxIpsecTunnels",
      "maxSslVpnTunnels",
      "maxConcurrentConnections",
      "minUsers",
      "maxUsers",
    ] as const;

    let numError: string | null = null;
    for (const field of requiredNums) {
      const parsed = parseRequiredNumber(cell(row, index, field), field);
      if ("error" in parsed) {
        numError = parsed.error;
        break;
      }
      nums[field] = parsed.value;
    }
    if (numError) {
      errors.push({ row: rowNum, message: numError });
      continue;
    }

    const vcpu = parseOptionalNumber(cell(row, index, "vcpu"), "vcpu");
    if ("error" in vcpu) {
      errors.push({ row: rowNum, message: vcpu.error });
      continue;
    }
    const ramGb = parseOptionalNumber(cell(row, index, "ramGb"), "ramGb");
    if ("error" in ramGb) {
      errors.push({ row: rowNum, message: ramGb.error });
      continue;
    }

    seen.add(id);
    models.push({
      id,
      name,
      sku: parseOptionalString(cell(row, index, "sku")),
      licenseSku: parseOptionalString(cell(row, index, "licenseSku")),
      environment: envResult.value,
      formFactor: parseOptionalString(cell(row, index, "formFactor")),
      threatProtectionMbps: nums.threatProtectionMbps,
      xstreamSslMbps: nums.xstreamSslMbps,
      ipsecVpnMbps: nums.ipsecVpnMbps,
      maxIpsecTunnels: nums.maxIpsecTunnels,
      maxSslVpnTunnels: nums.maxSslVpnTunnels,
      maxConcurrentConnections: nums.maxConcurrentConnections,
      minUsers: nums.minUsers,
      maxUsers: nums.maxUsers,
      vcpu: vcpu.value,
      ramGb: ramGb.value,
      awsInstance: parseOptionalString(cell(row, index, "awsInstance")),
      azureVmSize: parseOptionalString(cell(row, index, "azureVmSize")),
      redundantPsuSku: parseOptionalString(cell(row, index, "redundantPsuSku")),
      redundantPsuName: parseOptionalString(cell(row, index, "redundantPsuName")),
    });
  }

  return { models, errors, skipped };
}

export function parseSwitchCsv(
  text: string,
): CatalogCsvParseResult<SwitchCatalogModel> {
  const rows = parseCsv(text);
  if (rows.length === 0) {
    return { models: [], errors: [{ row: 0, message: "CSV is empty" }], skipped: 0 };
  }

  const index = headerIndexMap(rows[0]);
  const headerError = requireHeaders(index, [
    "id",
    "name",
    "sku",
    "series",
    "portCount",
    "ports1GbE",
    "ports2_5GbE",
    "ports10GbE",
    "sfpPlusUplinkCount",
    "poeSupported",
    "poeBudgetWatts",
    "supportsBtPoE",
  ]);
  if (headerError) {
    return { models: [], errors: [{ row: 1, message: headerError }], skipped: 0 };
  }

  const models: SwitchCatalogModel[] = [];
  const errors: CatalogCsvRowError[] = [];
  let skipped = 0;
  const seen = new Set<string>();

  for (let r = 1; r < rows.length; r++) {
    const rowNum = r + 1;
    const row = rows[r];
    const id = cell(row, index, "id");
    const name = cell(row, index, "name");
    const sku = cell(row, index, "sku");

    if (!id && !name && !sku) {
      skipped++;
      continue;
    }

    if (!id) {
      errors.push({ row: rowNum, message: "id is required" });
      continue;
    }
    if (!name) {
      errors.push({ row: rowNum, message: "name is required" });
      continue;
    }
    if (!sku) {
      errors.push({ row: rowNum, message: "sku is required" });
      continue;
    }
    if (seen.has(id)) {
      errors.push({ row: rowNum, message: `Duplicate id "${id}" in CSV` });
      continue;
    }

    const seriesRaw = cell(row, index, "series");
    const seriesNum = Number(seriesRaw);
    if (seriesNum !== 200 && seriesNum !== 1000) {
      errors.push({ row: rowNum, message: "series must be 200 or 1000" });
      continue;
    }

    const nums: Record<string, number> = {};
    const requiredNums = [
      "portCount",
      "ports1GbE",
      "ports2_5GbE",
      "ports10GbE",
      "sfpPlusUplinkCount",
      "poeBudgetWatts",
    ] as const;

    let numError: string | null = null;
    for (const field of requiredNums) {
      const parsed = parseRequiredNumber(cell(row, index, field), field);
      if ("error" in parsed) {
        numError = parsed.error;
        break;
      }
      nums[field] = parsed.value;
    }
    if (numError) {
      errors.push({ row: rowNum, message: numError });
      continue;
    }

    const poeSupported = parseBoolean(
      cell(row, index, "poeSupported"),
      "poeSupported",
    );
    if ("error" in poeSupported) {
      errors.push({ row: rowNum, message: poeSupported.error });
      continue;
    }
    const supportsBtPoE = parseBoolean(
      cell(row, index, "supportsBtPoE"),
      "supportsBtPoE",
    );
    if ("error" in supportsBtPoE) {
      errors.push({ row: rowNum, message: supportsBtPoE.error });
      continue;
    }

    seen.add(id);
    models.push({
      id,
      name,
      sku,
      series: seriesNum,
      portCount: nums.portCount,
      ports1GbE: nums.ports1GbE,
      ports2_5GbE: nums.ports2_5GbE,
      ports10GbE: nums.ports10GbE,
      sfpPlusUplinkCount: nums.sfpPlusUplinkCount,
      poeSupported: poeSupported.value,
      poeBudgetWatts: nums.poeBudgetWatts,
      supportsBtPoE: supportsBtPoE.value,
    });
  }

  return { models, errors, skipped };
}

export function parseAccessoryCsv(
  text: string,
): CatalogCsvParseResult<AccessoryModel> {
  const rows = parseCsv(text);
  if (rows.length === 0) {
    return { models: [], errors: [{ row: 0, message: "CSV is empty" }], skipped: 0 };
  }

  const index = headerIndexMap(rows[0]);
  const headerError = requireHeaders(index, ["id", "type", "name", "sku"]);
  if (headerError) {
    return { models: [], errors: [{ row: 1, message: headerError }], skipped: 0 };
  }

  const models: AccessoryModel[] = [];
  const errors: CatalogCsvRowError[] = [];
  let skipped = 0;
  const seen = new Set<string>();

  for (let r = 1; r < rows.length; r++) {
    const rowNum = r + 1;
    const row = rows[r];
    const id = cell(row, index, "id");
    const name = cell(row, index, "name");
    const sku = cell(row, index, "sku");
    const type = cell(row, index, "type") as AccessoryType;

    if (!id && !name && !sku) {
      skipped++;
      continue;
    }

    if (!id) {
      errors.push({ row: rowNum, message: "id is required" });
      continue;
    }
    if (!name) {
      errors.push({ row: rowNum, message: "name is required" });
      continue;
    }
    if (!sku) {
      errors.push({ row: rowNum, message: "sku is required" });
      continue;
    }
    if (type !== "sfp_sr" && type !== "sfp_lr") {
      errors.push({ row: rowNum, message: "type must be sfp_sr or sfp_lr" });
      continue;
    }
    if (seen.has(id)) {
      errors.push({ row: rowNum, message: `Duplicate id "${id}" in CSV` });
      continue;
    }

    seen.add(id);
    models.push({ id, type, name, sku });
  }

  return { models, errors, skipped };
}

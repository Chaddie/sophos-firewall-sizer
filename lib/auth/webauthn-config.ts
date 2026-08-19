import { getAppUrl } from "@/lib/app-url";

export function getWebAuthnConfig() {
  const url = new URL(getAppUrl());
  return {
    rpID: url.hostname,
    rpName: "Sophos Hardware Sizing",
    origin: url.origin,
  };
}

export function toBase64Url(data: Uint8Array): string {
  return Buffer.from(data).toString("base64url");
}

export function fromBase64Url(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, "base64url"));
}

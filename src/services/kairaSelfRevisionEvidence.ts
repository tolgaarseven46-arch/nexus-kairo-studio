import type { KairaSelfFactDomain } from "./kairaIdentityContracts";

export type KairaRevisableSelfFactDomain = Extract<KairaSelfFactDomain, "preference" | "belief">;

export interface KairaSelfRevisionEvidence {
  factKey: string;
  domain: KairaRevisableSelfFactDomain;
  value: string | number | boolean;
  confidence: number;
}

export function normalizeKairaSelfRevisionEvidence(
  input?: KairaSelfRevisionEvidence | null,
): KairaSelfRevisionEvidence | null {
  if (!input) return null;
  const factKey = String(input.factKey || "")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9_:-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 96);
  if (!factKey) return null;
  if (input.domain !== "preference" && input.domain !== "belief") return null;
  const confidence = Number(input.confidence);
  if (!Number.isFinite(confidence)) return null;
  const value = input.value;
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
    return null;
  }
  if (typeof value === "number" && !Number.isFinite(value)) return null;
  if (typeof value === "string" && !value.trim()) return null;
  return {
    factKey,
    domain: input.domain,
    value: typeof value === "string" ? value.trim().slice(0, 160) : value,
    confidence: Math.max(0, Math.min(1, confidence)),
  };
}

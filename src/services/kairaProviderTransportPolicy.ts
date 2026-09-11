export const KAIRA_PROVIDER_DEADLINE_MS = 55_000;

export type KairaProviderFailureKind = "timeout" | "http_error" | "empty_response" | "transport_error";

export function kairaProviderFailureMessage(kind: KairaProviderFailureKind, detail?: string) {
  switch (kind) {
    case "timeout":
      return `Provider yanıtı ${Math.round(KAIRA_PROVIDER_DEADLINE_MS / 1000)} saniyelik server sınırını aştı.`;
    case "empty_response":
      return "Provider boş yanıt döndürdü.";
    case "http_error":
      return detail?.trim() || "Provider HTTP hatası döndürdü.";
    default:
      return detail?.trim() || "Provider taşıma hatası oluştu.";
  }
}

/**
 * Live acceptance cost invariant: a single generation request never opens a
 * second paid provider attempt implicitly. Higher-level deterministic fallback
 * remains responsible for a usable reply when the provider fails.
 */
export const KAIRA_IMPLICIT_PROVIDER_RETRY_LIMIT = 0;

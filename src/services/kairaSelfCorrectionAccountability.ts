import type { KairaResponsePlan } from "./kairaResponsePlan";

const CORRECTION_OWNERSHIP_RE =
  /\b(he doğru|evet doğru|doğru diyorsun|haklısın|yanlış söyledim|yanlış demişim|karıştırdım|karıştırmışım|ben yanlış|ben karıştır|öyle değilmiş|düzelt(?:eyim|iyorum)|özür(?: dilerim)?|pardon)\b/iu;

const CORRECTION_DEFLECTION_RE =
  /\b(ben doğru söyledim|ben yanlış söylemedim|hayır ben|sen yanlış|yanlış anladın|öyle demedim|ben öyle demedim)\b/iu;

export function findKairaSelfCorrectionAccountabilityIssues(
  reply: string,
  plan: KairaResponsePlan,
): string[] {
  if (!plan.requiredContent?.includes("own_previous_correction")) return [];
  const text = String(reply ?? "").trim();
  if (!text) return ["self_correction_accountability_missing"];
  if (CORRECTION_DEFLECTION_RE.test(text)) {
    return ["self_correction_accountability_deflected"];
  }
  if (!CORRECTION_OWNERSHIP_RE.test(text)) {
    return ["self_correction_accountability_missing"];
  }
  return [];
}

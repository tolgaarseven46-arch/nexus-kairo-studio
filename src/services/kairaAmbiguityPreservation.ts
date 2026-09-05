import type { KairaResponsePlan } from "./kairaResponsePlan";

const MINIMAL_NEUTRAL_ACK_RE =
  /^\s*(?:(?:h+e+|h+m+|hı+m+|tamam(?:dır)?|peki|olur|anladım|he\s+anladım|hmm\s+anladım|okey|okay|hıhı|ııh)[.!…]*)\s*$/iu;
const EXPLICIT_UNCERTAINTY_RE =
  /^\s*(?:(?:tam|pek)?\s*(?:anlamadım|çözemedim)|ne\s+demek\s+istediğini\s+anlamadım|bundan\s+emin\s+değilim)[.!…]*\s*$/iu;

export function requiresAmbiguityPreservation(plan: KairaResponsePlan): boolean {
  return Boolean(plan.requiredContent?.includes("preserve_ambiguity"));
}

export function findKairaAmbiguityPreservationIssues(
  reply: string,
  plan: KairaResponsePlan,
): string[] {
  if (!requiresAmbiguityPreservation(plan)) return [];
  const text = String(reply ?? "").trim();
  if (!text) return ["response_plan_ambiguity_not_preserved"];
  if (MINIMAL_NEUTRAL_ACK_RE.test(text) || EXPLICIT_UNCERTAINTY_RE.test(text)) return [];
  return ["response_plan_ambiguity_not_preserved"];
}

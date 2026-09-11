const REFLECTIVE_GUIDANCE_RE =
  /\b(?:(?:bugün\s+)?biraz\s+kendine\s+[\p{L}]+|kendine\s+[\p{L}]+\s+(?:biraz|bugün))\b/iu;

/**
 * Delivery-only structural detector. Permission still belongs to ResponsePlan;
 * this helper only recognizes a narrow direct-guidance surface at the final boundary.
 */
export function isTurkishReflectiveGuidanceAct(text: string): boolean {
  const normalized = String(text ?? "").trim();
  return normalized.length > 0 && REFLECTIVE_GUIDANCE_RE.test(normalized);
}

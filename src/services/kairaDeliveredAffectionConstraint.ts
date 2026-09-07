const AFFECTION_VOCATIVE_RE = /(?<![\p{L}\p{N}_])(?:aşkım|bebeğim|tatlım|sevgilim)(?![\p{L}\p{N}_])/giu;

function normalizeAfterRemoval(text: string): string {
  return text
    .replace(/\s+([,.;:!?…])/gu, "$1")
    .replace(/([,;:])\s*([,;:])/gu, "$1")
    .replace(/^\s*[,;:]\s*/u, "")
    .replace(/\s{2,}/gu, " ")
    .trim();
}

/**
 * Mechanical partial repair for a response whose plan forbids affection.
 *
 * Only standalone affectionate VOCATIVES are removable here because deleting
 * them does not alter the proposition or action being expressed. Verbal or
 * physical-affection content (`sarıl`, `öp`, etc.) is intentionally untouched;
 * those cases remain owned by normal semantic repair/fallback instead of being
 * silently rewritten at delivery time.
 */
export function removeForbiddenAffectionVocatives(
  reply: string,
  allowAffection: boolean,
): string {
  const original = String(reply ?? "").trim();
  if (!original || allowAffection) return original;
  const repaired = normalizeAfterRemoval(original.replace(AFFECTION_VOCATIVE_RE, ""));
  return repaired || original;
}

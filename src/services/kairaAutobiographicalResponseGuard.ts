import type { KairaAutobiographicalRecallRuntimeResult } from "./kairaAutobiographicalRecallRuntime";

export interface KairaAutobiographicalResponseGuardResult {
  reply: string;
  changed: boolean;
  reason?: string;
}

function hasResolvedEvidence(runtime: KairaAutobiographicalRecallRuntimeResult): boolean {
  return Boolean(
    runtime.status === "resolved" &&
      runtime.recall &&
      (runtime.recall.selfFacts.length > 0 || runtime.recall.memories.length > 0),
  );
}

const normalizeComparable = (value: unknown) =>
  String(value ?? "")
    .toLocaleLowerCase("tr-TR")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

function enforceResolvedSelfFact(
  reply: string,
  runtime: KairaAutobiographicalRecallRuntimeResult,
): KairaAutobiographicalResponseGuardResult | null {
  const recall = runtime.recall;
  if (
    runtime.status !== "resolved" ||
    !recall ||
    recall.query.scope !== "self_fact" ||
    recall.selfFacts.length === 0
  ) {
    return null;
  }

  const strongest = recall.selfFacts[0]?.fact;
  if (!strongest) return null;
  const canonicalValue = normalizeComparable(strongest.value);
  if (!canonicalValue) return null;

  const normalizedReply = normalizeComparable(reply);
  const affirmsCanonicalValue = normalizedReply.includes(canonicalValue);
  const explicitlyNegatesCanonicalValue = new RegExp(
    `(?:^|\\s)${canonicalValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\p{L}*)?\\s+(?:değil|degil)(?:\\s|$)`,
    "u",
  ).test(normalizedReply);

  if (affirmsCanonicalValue && !explicitlyNegatesCanonicalValue) {
    return null;
  }

  const fallback = `Buna dair net kaydım: ${String(strongest.value)}.`;
  return {
    reply: fallback,
    changed: reply.trim() !== fallback,
    reason: "self_memory_resolved_fact_conformance",
  };
}

export function enforceKairaAutobiographicalResponse(
  reply: string,
  runtime: KairaAutobiographicalRecallRuntimeResult,
): KairaAutobiographicalResponseGuardResult {
  if (runtime.status === "not_requested" || runtime.status === "low_confidence") {
    return { reply, changed: false };
  }

  const resolvedSelfFact = enforceResolvedSelfFact(reply, runtime);
  if (resolvedSelfFact) return resolvedSelfFact;

  if (hasResolvedEvidence(runtime)) {
    return { reply, changed: false };
  }

  const scope = runtime.recall?.query.scope;
  const fallback =
    runtime.status === "ephemeral"
      ? "Buna dair kalıcı bir anı kaydım yok."
      : runtime.status === "unavailable"
        ? "Şu an bundan emin değilim; uydurmak istemem."
        : scope === "self_fact"
          ? "Buna dair net bir bilgim yok."
          : "Buna dair net bir anım yok.";

  return {
    reply: fallback,
    changed: reply.trim() !== fallback,
    reason: `self_memory_${runtime.status}_fallback`,
  };
}

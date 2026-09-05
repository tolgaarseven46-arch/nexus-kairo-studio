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

const evidenceTokens = (value: unknown) =>
  normalizeComparable(value)
    .split(" ")
    .filter((token) => token.length >= 4);

const relatedEvidenceToken = (left: string, right: string) => {
  if (left === right) return true;
  if (Math.min(left.length, right.length) < 5) return false;
  const prefixLength = Math.min(6, left.length, right.length);
  return left.slice(0, prefixLength) === right.slice(0, prefixLength);
};

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

function enforceResolvedAutobiographicalMemoryAnchor(
  reply: string,
  runtime: KairaAutobiographicalRecallRuntimeResult,
): KairaAutobiographicalResponseGuardResult | null {
  const recall = runtime.recall;
  if (
    runtime.status !== "resolved" ||
    !recall ||
    recall.query.scope !== "autobiographical_memory" ||
    recall.memories.length === 0
  ) {
    return null;
  }

  const strongest = recall.memories[0]?.memory;
  if (!strongest) return null;

  const canonicalEvidence = [
    strongest.eventType,
    ...strongest.facts,
    ...strongest.emotions.map((emotion) => emotion.label),
    ...(strongest.placeId ? [strongest.placeId] : []),
    ...strongest.participantIds,
  ].flatMap(evidenceTokens);
  if (canonicalEvidence.length === 0) return null;

  const replyTokens = evidenceTokens(reply);
  const hasCanonicalAnchor = replyTokens.some((replyToken) =>
    canonicalEvidence.some((evidenceToken) =>
      relatedEvidenceToken(replyToken, evidenceToken),
    ),
  );
  if (hasCanonicalAnchor) return null;

  const canonicalSummary = strongest.facts.join("; ");
  const fallback = canonicalSummary
    ? `Buna dair net kaydım şu: ${canonicalSummary}.`
    : "Buna dair net bir anım yok.";
  return {
    reply: fallback,
    changed: reply.trim() !== fallback,
    reason: "self_memory_resolved_memory_anchor_missing",
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

  const resolvedMemoryAnchor = enforceResolvedAutobiographicalMemoryAnchor(reply, runtime);
  if (resolvedMemoryAnchor) return resolvedMemoryAnchor;

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

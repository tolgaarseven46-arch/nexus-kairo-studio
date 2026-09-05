import type { RetrievedWorldEvent } from "./worldEventRetrieval";
import type { WorldStateAppraisal } from "./worldStateAppraisal";
import type { WorldReasoningPolicy } from "./worldReasoningPolicy";
import type { SemanticWorldMemoryQuery } from "../types/semanticInterpretation";

export interface WorldModelResponseIssue {
  code:
    | "memory_evidence_denied"
    | "conflict_collapsed"
    | "reported_attribution_lost"
    | "epistemic_qualifier_lost"
    | "memory_fact_value_missing";
  message: string;
}

export interface WorldModelResponseGuardResult {
  reply: string;
  changed: boolean;
  issues: WorldModelResponseIssue[];
  reason?: string;
}

export interface WorldModelReasoningContext {
  appraisal: WorldStateAppraisal;
  policy: WorldReasoningPolicy;
  memoryQuery?: SemanticWorldMemoryQuery | null;
}

const normalize = (value: string) =>
  value.toLocaleLowerCase("tr-TR").replace(/[’']/g, "'").replace(/\s+/g, " ").trim();

const HARD_MEMORY_DENIAL_RE = /(?:kayd(?:ım|ı|ımız)?\s+(?:yok|bulunmuyor)|kayıt\s+(?:yok|bulunmuyor)|hatırlamıyorum|hatırlayamadım|hatırlamıyorum\s+ki|böyle\s+bir\s+şey\s+hatırlamıyorum)/iu;
const SOFT_MEMORY_DENIAL_RE = /(?:bilmiyorum|emin\s+değilim|net\s+değil|hatırladığımdan\s+emin\s+değilim)/iu;
const CONFLICT_PRESERVED_RE = /(?:çeliş|iki\s+(?:farklı|ayrı)|farklı\s+kayıt|birbiri(?:yle|ne)\s+uym|kesinleştirem|hangisinin\s+doğru|net\s+değil|emin\s+değilim)/iu;
const REPORTED_ATTRIBUTION_RE = /(?:bana\s+daha\s+önce|sen\s+(?:daha\s+önce\s+)?(?:demiştin|söylemiştin|anlatmıştın|aktarmıştın)|demiştin|söylemiştin|anlatmıştın|aktarmıştın|dediğini|söylediğini|anlattığını|aktardığını|senin\s+(?:anlattığın|söylediğin|aktardığın)|kayda\s+göre|kayıtta)/iu;
const EPISTEMIC_QUALIFIER_RE = /(?:hatırladığım\s+kadarıyla|bildiğim\s+kadarıyla|kayda\s+göre|kayıtta|bana\s+daha\s+önce|demiştin|söylemiştin|anlatmıştın|aktarmıştın|dediğini|söylediğini|anlattığını|aktardığını|görünüyordu|plan(?:ı|ına)?\s+göre|olacaktı|emin\s+değilim|net\s+değil|çeliş)/iu;

function grounded(items: RetrievedWorldEvent[]) {
  return items.filter((item) => item.observation.status === "grounded");
}

function matchedFactValues(items: RetrievedWorldEvent[], query?: SemanticWorldMemoryQuery | null) {
  if (!query || query.confidence < 0.72) return [];
  const key = (value: string) => value.toLocaleLowerCase("en-US").trim();
  return grounded(items).flatMap((item) =>
    (item.observation.event.memoryFacts ?? [])
      .filter((fact) => fact.confidence >= 0.72 && key(fact.subjectId) === key(query.subjectId) && key(fact.attributeKey) === key(query.attributeKey))
      .map((fact) => fact.value)
  );
}

/**
 * Deterministic response boundary for canonical world-memory reasoning.
 *
 * The guard consumes the exact read-only appraisal/policy already derived by
 * the canonical runtime, so prompt generation and deterministic enforcement
 * share one reasoning authority. It never mutates relationship, emotion,
 * personality or dynamic state; it may only reject/replace generated
 * world-memory wording.
 */
export function findWorldModelResponseIssues(
  reply: string,
  items: RetrievedWorldEvent[],
  context: WorldModelReasoningContext,
): WorldModelResponseIssue[] {
  const { appraisal, policy } = context;
  const text = normalize(reply);
  const issues: WorldModelResponseIssue[] = [];

  if (!appraisal.mayClaimNoMemory) {
    const conflict = policy.mustPreserveConflict;
    const deniesEvidence = HARD_MEMORY_DENIAL_RE.test(text) || (!conflict && SOFT_MEMORY_DENIAL_RE.test(text));
    if (deniesEvidence) {
      issues.push({
        code: "memory_evidence_denied",
        message: conflict
          ? "Grounded çelişkili world-memory kanıtı mevcut; cevap kayıt/hatıra yokmuş gibi davranamaz. Belirsizlik ifade edilebilir."
          : "Grounded world-memory kanıtı mevcut; cevap kaydım yok/hatırlamıyorum/bilmiyorum diyemez.",
      });
    }
  }

  if (policy.mustPreserveConflict && !CONFLICT_PRESERVED_RE.test(text)) {
    issues.push({
      code: "conflict_collapsed",
      message: "World reasoning policy çelişkiyi korumayı gerektiriyor; cevap tek tarafı kesin gerçek gibi sunamaz.",
    });
  }

  if (
    policy.mustPreserveReportedAttribution &&
    policy.mayAnswerFromMemory &&
    !REPORTED_ATTRIBUTION_RE.test(text) &&
    !CONFLICT_PRESERVED_RE.test(text)
  ) {
    issues.push({
      code: "reported_attribution_lost",
      message: "Grounded bilgi reported-claim kökenli; cevap bunun daha önce kullanıcı tarafından aktarıldığını korumalı.",
    });
  }

  if (
    policy.mustQualify &&
    policy.mayAnswerFromMemory &&
    !EPISTEMIC_QUALIFIER_RE.test(text) &&
    !CONFLICT_PRESERVED_RE.test(text)
  ) {
    issues.push({
      code: "epistemic_qualifier_lost",
      message: "World reasoning policy epistemik niteleme gerektiriyor; cevap kanıtı doğrulanmış dış dünya gerçeğine yükseltemez.",
    });
  }

  const factValues = matchedFactValues(items, context.memoryQuery);
  if (factValues.length && !factValues.some((value) => text.includes(normalize(String(value))))) {
    issues.push({
      code: "memory_fact_value_missing",
      message: "Canonical world-memory query belirli bir typed fact ile eşleşti; cevap eşleşen fact değerini korumalı.",
    });
  }

  return issues;
}

function compactEvidenceText(item: RetrievedWorldEvent): string {
  const raw = String(item.observation.event.raw || "").trim();
  return raw.replace(/[?？]+$/u, "").slice(0, 220);
}

export function buildWorldModelRecallFallback(
  items: RetrievedWorldEvent[],
  context: WorldModelReasoningContext,
): string {
  const evidence = grounded(items);
  if (!evidence.length) return "";

  const { policy } = context;
  const factValues = Array.from(new Set(matchedFactValues(items, context.memoryQuery).map(String)));
  if (factValues.length) {
    const value = factValues.join(" / ");
    return policy.mustPreserveReportedAttribution
      ? `Bana daha önce bunu ${value} olarak aktarmıştın.`
      : `Hatırladığım kayda göre: ${value}.`;
  }
  if (policy.mustPreserveConflict) {
    const distinct = Array.from(
      new Set(evidence.map(compactEvidenceText).filter(Boolean)),
    ).slice(0, 2);
    if (distinct.length >= 2) {
      return `Bununla ilgili bende çelişen iki kayıt var: “${distinct[0]}” ve “${distinct[1]}”. Hangisinin doğru olduğunu kesinleştiremiyorum.`;
    }
    return "Bununla ilgili bir kaydım var ama mevcut world-state çelişkili; kesin gerçekmiş gibi söyleyemem.";
  }

  const first = evidence[0];
  const raw = compactEvidenceText(first);
  if (!raw) return "Bununla ilgili önceki konuşmadan bir kaydım var.";
  if (policy.mustPreserveReportedAttribution || first.observation.kind === "reported_claim") {
    return `Bana daha önce “${raw}” demiştin.`;
  }
  if (policy.mustQualify) {
    return `Hatırladığım kayda göre: “${raw}”.`;
  }
  return `Bunu hatırlıyorum: “${raw}”.`;
}

export function enforceWorldModelRecallResponse(
  reply: string,
  items: RetrievedWorldEvent[],
  context: WorldModelReasoningContext,
): WorldModelResponseGuardResult {
  const issues = findWorldModelResponseIssues(reply, items, context);
  if (!issues.length) return { reply, changed: false, issues: [] };

  const fallback = buildWorldModelRecallFallback(items, context);
  if (!fallback) return { reply, changed: false, issues };
  return {
    reply: fallback,
    changed: true,
    issues,
    reason: "world_reasoning_policy_guard",
  };
}

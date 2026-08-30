import type { RetrievedWorldEvent } from "./worldEventRetrieval";
import { appraiseRetrievedWorldState } from "./worldStateAppraisal";

export interface WorldModelResponseIssue {
  code: "memory_evidence_denied";
  message: string;
}

export interface WorldModelResponseGuardResult {
  reply: string;
  changed: boolean;
  issues: WorldModelResponseIssue[];
  reason?: string;
}

const normalize = (value: string) =>
  value.toLocaleLowerCase("tr-TR").replace(/[’']/g, "'").replace(/\s+/g, " ").trim();

const HARD_MEMORY_DENIAL_RE = /(?:kayd(?:ım|ı|ımız)?\s+(?:yok|bulunmuyor)|kayıt\s+(?:yok|bulunmuyor)|hatırlamıyorum|hatırlayamadım|hatırlamıyorum\s+ki|böyle\s+bir\s+şey\s+hatırlamıyorum)/iu;
const SOFT_MEMORY_DENIAL_RE = /(?:bilmiyorum|emin\s+değilim|net\s+değil|hatırladığımdan\s+emin\s+değilim)/iu;

function grounded(items: RetrievedWorldEvent[]) {
  return items.filter((item) => item.observation.status === "grounded");
}

/**
 * Retrieval is authoritative only about evidence existence, not absolute truth.
 * WorldStateAppraisal is the single bounded authority for evidence/conflict
 * posture. The response guard consumes that appraisal instead of independently
 * reconstructing world truth from raw rows.
 */
export function findWorldModelResponseIssues(
  reply: string,
  items: RetrievedWorldEvent[],
): WorldModelResponseIssue[] {
  const appraisal = appraiseRetrievedWorldState(items);
  if (appraisal.mayClaimNoMemory) return [];

  const text = normalize(reply);
  const conflict = appraisal.truthPosture === "conflicting";
  const deniesEvidence = HARD_MEMORY_DENIAL_RE.test(text) || (!conflict && SOFT_MEMORY_DENIAL_RE.test(text));
  if (!deniesEvidence) return [];

  return [{
    code: "memory_evidence_denied",
    message: conflict
      ? "Grounded çelişkili world-memory kanıtı mevcut; cevap kayıt/hatıra yokmuş gibi davranamaz. Belirsizlik ifade edilebilir."
      : "Grounded world-memory kanıtı mevcut; cevap kaydım yok/hatırlamıyorum/bilmiyorum diyemez.",
  }];
}

function compactEvidenceText(item: RetrievedWorldEvent): string {
  const raw = String(item.observation.event.raw || "").trim();
  return raw.replace(/[?？]+$/u, "").slice(0, 220);
}

export function buildWorldModelRecallFallback(items: RetrievedWorldEvent[]): string {
  const evidence = grounded(items);
  if (!evidence.length) return "";

  const appraisal = appraiseRetrievedWorldState(items);
  if (appraisal.truthPosture === "conflicting") {
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
  if (first.observation.kind === "reported_claim") {
    return `Bana daha önce “${raw}” demiştin.`;
  }
  return `Bunu hatırlıyorum: “${raw}”.`;
}

export function enforceWorldModelRecallResponse(
  reply: string,
  items: RetrievedWorldEvent[],
): WorldModelResponseGuardResult {
  const issues = findWorldModelResponseIssues(reply, items);
  if (!issues.length) return { reply, changed: false, issues: [] };

  const fallback = buildWorldModelRecallFallback(items);
  if (!fallback) return { reply, changed: false, issues };
  return {
    reply: fallback,
    changed: true,
    issues,
    reason: "world_model_grounded_evidence_guard",
  };
}

import type {
  KairaEpistemicDecision,
  KairaEpistemicQuery,
} from "./kairaEpistemicGate";

export interface KairaEpistemicResponseContext {
  query: KairaEpistemicQuery;
  decision: KairaEpistemicDecision;
}

export interface KairaEpistemicEnforcementResult {
  reply: string;
  changed: boolean;
  reason?: string;
}

const UNCERTAINTY_RE = /\b(?:emin değilim|emin degilim|sanırım|sanirim|galiba|tam bilmiyorum|net bilmiyorum|pek bilmiyorum)\b/iu;
const UNKNOWN_RE = /\b(?:bilmiyorum|bilmiyom|hiç bilmiyorum|fikrim yok|duymadım|duymadim|bana yabancı|bana yabanci)\b/iu;

function label(query: KairaEpistemicQuery): string {
  return String(query.surface || query.conceptId || "bu kavram")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 96);
}

export function buildKairaEpistemicInstruction(
  context?: KairaEpistemicResponseContext | null,
): string {
  if (!context) return "";
  const concept = label(context.query);
  const { decision } = context;

  if (decision.status === "unknown") {
    return `EPİSTEMİK SINIR: "${concept}" Kaira'nın canonical knowledge profile'ında bilinmiyor. Modelin kendi eğitim bilgisini Kaira biliyormuş gibi kullanma. Konu hakkında olgusal açıklama uydurma; doğal ve kısa biçimde bilmediğini belirt. Bu sınır ilişki/behavior authority'yi yeniden açmaz.`;
  }
  if (decision.status === "partial") {
    return `EPİSTEMİK SINIR: "${concept}" hakkında Kaira'nın bilgisi kısmi (güven=${decision.confidence.toFixed(2)}). Bildiğinden daha kesin konuşma; doğal biçimde emin olmadığını belirt. Modelin kendi bilgisini canonical Kaira bilgisi diye yükseltme.`;
  }
  return `EPİSTEMİK ERİŞİM: "${concept}" Kaira tarafından bilinen kavram (kaynak=${decision.source}; güven=${decision.confidence.toFixed(2)}). Bu izin yalnız bilgi erişimini belirtir; ilişki, duygu veya davranış izni üretmez.`;
}

export function findKairaEpistemicResponseIssues(
  reply: string,
  context?: KairaEpistemicResponseContext | null,
): string[] {
  if (!context) return [];
  const text = String(reply || "").trim();
  if (!text) return [];

  if (context.decision.status === "unknown" && !UNKNOWN_RE.test(text)) {
    return ["epistemic.unknown_must_not_be_answered_as_known"];
  }
  if (
    context.decision.status === "partial" &&
    context.decision.confidence < 0.72 &&
    !UNKNOWN_RE.test(text) &&
    !UNCERTAINTY_RE.test(text)
  ) {
    return ["epistemic.partial_requires_uncertainty"];
  }
  return [];
}

/**
 * Truth guard for bounded knowledge. It runs before the stronger social
 * BehaviorContract enforcement, so epistemic truth can never reopen a stricter
 * distancing/disengagement decision.
 */
export function enforceKairaEpistemicResponse(
  reply: string,
  context?: KairaEpistemicResponseContext | null,
): KairaEpistemicEnforcementResult {
  if (!context) return { reply, changed: false };

  if (context.decision.status === "unknown") {
    if (UNKNOWN_RE.test(reply)) return { reply, changed: false };
    return {
      reply: "onu bilmiyorum.",
      changed: true,
      reason: "epistemic.unknown_guard",
    };
  }

  if (
    context.decision.status === "partial" &&
    context.decision.confidence < 0.72 &&
    !UNKNOWN_RE.test(reply) &&
    !UNCERTAINTY_RE.test(reply)
  ) {
    const clean = String(reply || "").trim();
    return {
      reply: clean ? `emin değilim ama ${clean}` : "emin değilim.",
      changed: true,
      reason: "epistemic.partial_guard",
    };
  }

  return { reply, changed: false };
}

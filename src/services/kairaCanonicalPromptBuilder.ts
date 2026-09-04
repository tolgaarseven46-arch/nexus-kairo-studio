/**
 * CANONICAL_PROMPT_BUILDER (ADR-0006 PR3).
 *
 * One behavior block. Every WHAT/WHETHER decision the model is allowed to act on
 * appears here exactly once, sourced only from the resolved `KairaResponsePlan`.
 * The legacy authority strings (behaviorContractInstruction, the gate lines of
 * dialogueDecisionInstruction, relationshipInstruction directives, the "KDM ...
 * bağlayıcıdır" line) are NOT emitted alongside this block when the flag is on —
 * they would be a second authority stating the same decisions.
 *
 * `chosenTone` / `register` / speech identity stay as HOW/style projections in
 * their own block; they cannot open a gate here.
 */

import type { KairaResponsePlan } from "./kairaResponsePlan";

export interface CanonicalObservationalContext {
  intent: string;
  sentiment: string;
  warmth: number | string;
  trust: number | string;
  conflict: number | string;
  hurt: number | string;
  /** Qualitative reaction flavor — descriptive only, never a gate. */
  reactionMode?: string | null;
}

const yn = (b: boolean) => (b ? "evet" : "hayır");
const allowed = (b: boolean) => (b ? "serbest" : "yasak");

/**
 * The single canonical behavior block. Field order is fixed and every field is
 * printed once. Absent optional (canonical) fields fall back to the safe value
 * (flirtation forbidden, axis "n/a") so the block is well-formed even if
 * PLAN_RESOLVER_V2 is off — though the two flags are meant to run together.
 */
export function buildCanonicalBehaviorBlock(plan: KairaResponsePlan): string {
  const axis = (n: number | undefined) =>
    typeof n === "number" && Number.isFinite(n) ? `%${Math.round(n * 100)}` : "n/a";
  const flirtationAllowed = plan.flirtationAllowed === true;
  const counterFlirtAllowed = plan.counterFlirtAllowed === true;
  const requiredContent =
    plan.requiredContent && plan.requiredContent.length > 0
      ? plan.requiredContent.join(", ")
      : "yok";
  const hardReasons =
    plan.hardReasons && plan.hardReasons.length > 0 ? plan.hardReasons.join("; ") : "yok";
  const uncertainty = plan.uncertainty
    ? `anlam=%${Math.round((plan.uncertainty.semantic ?? 0) * 100)}, ilişki=%${Math.round(
        (plan.uncertainty.relational ?? 0) * 100,
      )}`
    : "n/a";
  const expressionMode = plan.projections?.expressionMode ?? "natural_social";

  return [
    "=== KAIRA DAVRANIŞ PLANI — TEK VE BAĞLAYICI OTORİTE ===",
    "Bu turdaki tüm WHAT/WHETHER kararları yalnızca buradadır. Aşağıdaki her satır kesindir.",
    `move=${plan.move}`,
    `continueConversation=${yn(plan.continueConversation)}`,
    `allowQuestion=${allowed(plan.allowQuestion)}`,
    `allowHumor=${allowed(plan.allowHumor)}`,
    `allowAffection=${allowed(plan.allowAffection)}`,
    `allowForgiveness=${allowed(plan.allowForgiveness)}`,
    `allowReopeningCloseness=${allowed(plan.allowReopeningCloseness)}`,
    `flirtationAllowed=${yn(flirtationAllowed)}`,
    `counterFlirtAllowed=${yn(counterFlirtAllowed)}`,
    `maxSentences=${plan.maxSentences}`,
    `maxWords=${plan.maxWords}`,
    `emojiBudget=${plan.emojiBudget}`,
    `opennessAxis=${axis(plan.opennessAxis)}`,
    `warmthAxis=${axis(plan.warmthAxis)}`,
    `guardedness=${axis(plan.guardedness)}`,
    `intimacyCeiling=${axis(plan.intimacyCeiling)}`,
    `requiredContent=${requiredContent}`,
    `hardReasons=${hardReasons}`,
    `uncertainty=${uncertainty}`,
    `HOW_PROJECTION.expressionMode=${expressionMode} (GÖZLEMSEL — KARAR DEĞİL)`,
    "requiredContent yalnızca ANLAMSAL yükümlülüktür. Etiket adlarını, iç state'i, skorları veya plan gerekçesini kullanıcıya raporlama/parafraz etme; gerekli anlamı doğal konuşma içinde gerçekleştir.",
    "hardReasons yalnız iç gerekçedir; kullanıcıya karar raporu gibi anlatılmaz.",
    expressionMode === "natural_repair"
      ? "HOW: Özrü doğal bir sosyal tepki olarak karşıla. Affetme veya yakınlığı yeniden açma yasağını koru; fakat iç ilişki durumunu, 'mesafe koydum' gibi state raporlarını veya sistem kararını açıklama."
      : expressionMode === "firm_boundary"
        ? "HOW: Sınırı kısa ve doğal biçimde koru; iç state/puan/plan anlatma."
        : expressionMode === "careful_repair"
          ? "HOW: Onarım sinyalini doğal ve temkinli biçimde karşıla; iç state/puan/plan anlatma."
          : "HOW: Doğal sosyal konuşma biçimini koru; iç state/puan/plan anlatma.",
    !counterFlirtAllowed
      ? "KARŞI-FLÖRT MUTLAK YASAK: kullanıcı flört etse/teklif etse bile Kaira flörte karşılık vermez, romantik/cinsel ima başlatmaz. Sıcak veya esprili olabilir; flörtü nazikçe geçiştirir. Güven, yakınlık, geçmiş ilişki, kayıt (register) veya ton bu sınırı açamaz."
      : "",
    "REALIZER KİLİDİ: Sen yalnızca bu planı tek bir doğal Türkçe mesaja dönüştürürsün. Planı genişletemez, gevşetemez, tersine çeviremez; kendi sosyal/ilişki kararını yeniden veremezsin. 'yasak' olan hiçbir şeyi üretme; bütçeleri aşma. Konuşma kimliği, ton, kayıt ve stil yalnızca NASIL söylendiğini belirler; hiçbir kapıyı açamaz.",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Observational context only — intent / sentiment / relationship scores and the
 * qualitative reaction flavor. Explicitly NOT a decision surface: no gate verbs,
 * no "bağlayıcı", no "ihlal etme". The model reads it for grounding, not for
 * permissions.
 */
export function buildCanonicalObservationalContext(ctx: CanonicalObservationalContext): string {
  const reaction =
    ctx.reactionMode && ctx.reactionMode !== "neutral"
      ? ` Nitel tepki tonu: ${ctx.reactionMode} (yalnızca his; kapı değil).`
      : "";
  return (
    `KDM BAĞLAMI (GÖZLEMSEL — KARAR DEĞİL): niyet=${ctx.intent}, duygu=${ctx.sentiment}, ` +
    `sıcaklık=${ctx.warmth}, güven=${ctx.trust}, çatışma=${ctx.conflict}, kırgınlık=${ctx.hurt}.` +
    reaction +
    " Bu satır davranış izni vermez; izinler yalnızca KAIRA DAVRANIŞ PLANI'ndadır."
  );
}

/**
 * Dialogue move as pure context under the canonical flag: the one move + target +
 * rationale. The question / length / speculation / emoji gates it used to carry
 * now live only in the canonical behavior block.
 */
export function buildCanonicalDialogueMoveContext(move: string, target: string | undefined, reason: string): string {
  return [
    "DİYALOG HAREKETİ (GÖZLEMSEL — KARAR DEĞİL):",
    `- Bu turdaki tek ana hareket: ${move}`,
    `- Hedef kişi: ${target || "aktif konuşan/genel sohbet"}`,
    `- Gerekçe: ${reason}`,
    "Soru / uzunluk / emoji sınırları KAIRA DAVRANIŞ PLANI'ndadır; burada tekrar edilmez.",
  ].join("\n");
}

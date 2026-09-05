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
  reactionMode?: string | null;
}

const yn = (b: boolean) => (b ? "evet" : "hayır");
const allowed = (b: boolean) => (b ? "serbest" : "yasak");

export function buildCanonicalBehaviorBlock(plan: KairaResponsePlan): string {
  const axis = (n: number | undefined) => typeof n === "number" && Number.isFinite(n) ? `%${Math.round(n * 100)}` : "n/a";
  const flirtationAllowed = plan.flirtationAllowed === true;
  const counterFlirtAllowed = plan.counterFlirtAllowed === true;
  const adviceAllowed = plan.allowAdvice === true;
  const requiredContent = plan.requiredContent && plan.requiredContent.length > 0 ? plan.requiredContent.join(", ") : "yok";
  const hardReasons = plan.hardReasons && plan.hardReasons.length > 0 ? plan.hardReasons.join("; ") : "yok";
  const uncertainty = plan.uncertainty
    ? `anlam=%${Math.round((plan.uncertainty.semantic ?? 0) * 100)}, ilişki=%${Math.round((plan.uncertainty.relational ?? 0) * 100)}`
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
    `allowAdvice=${allowed(adviceAllowed)}`,
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
    adviceAllowed ? "" : "TAVSİYE YASAĞI: kullanıcı açıkça tavsiye/öneri istemedi. Ne yapması gerektiğini söyleme; öğüt, reçete veya 'şunu yap' yönlendirmesi ekleme. Yalnız doğal sosyal tepki üret.",
    plan.requiredContent?.includes("engage_user_content")
      ? "İÇERİĞE TEPKİ ZORUNLULUĞU: Kullanıcının somut söylediği şeye en az bir doğal tepki ver. Yalnız he/hee/hmm/anladım/tamam gibi içeriksiz acknowledgement ile geçiştirme. Mesajda olmayan yeni ayrıntı uydurma."
      : "",
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
  ].filter(Boolean).join("\n");
}

export function buildCanonicalObservationalContext(ctx: CanonicalObservationalContext): string {
  const reaction = ctx.reactionMode && ctx.reactionMode !== "neutral" ? ` Nitel tepki tonu: ${ctx.reactionMode} (yalnızca his; kapı değil).` : "";
  return `KDM BAĞLAMI (GÖZLEMSEL — KARAR DEĞİL): niyet=${ctx.intent}, duygu=${ctx.sentiment}, sıcaklık=${ctx.warmth}, güven=${ctx.trust}, çatışma=${ctx.conflict}, kırgınlık=${ctx.hurt}.` + reaction + " Bu satır davranış izni vermez; izinler yalnızca KAIRA DAVRANIŞ PLANI'ndadır.";
}

export function buildCanonicalDialogueMoveContext(move: string, target: string | undefined, reason: string): string {
  return [
    "DİYALOG HAREKETİ (GÖZLEMSEL — KARAR DEĞİL):",
    `- Bu turdaki tek ana hareket: ${move}`,
    `- Hedef kişi: ${target || "aktif konuşan/genel sohbet"}`,
    `- Gerekçe: ${reason}`,
    "Soru / tavsiye / uzunluk / emoji sınırları KAIRA DAVRANIŞ PLANI'ndadır; burada tekrar edilmez.",
  ].join("\n");
}

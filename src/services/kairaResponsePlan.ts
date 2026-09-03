import type { BehaviorContract } from "./behaviorContract";
import type { DialogueDecisionPlan } from "./kairoDialogueDecisionEngine";
import type { KairoSpeechIdentity } from "./kairoSpeechIdentity";
import type { KairaPlanProjections, KairaPlanUncertainty } from "../types/kairaBehaviorPlan";
import { isCanonicalBehaviorFlagEnabled } from "../config/canonicalBehaviorFlags";
import { deriveHardConstraints } from "./kairaHardConstraints";
import { deriveSoftTendencies } from "./kairaSoftTendencies";
import { resolveKairaResponsePlan } from "./kairaPlanResolver";

export interface KairaResponsePlan {
  move: DialogueDecisionPlan["move"];
  stance: BehaviorContract["stance"];
  register: KairoSpeechIdentity["register"];
  relationshipLevel: KairoSpeechIdentity["relationshipLevel"];
  continueConversation: boolean;
  allowQuestion: boolean;
  allowHumor: boolean;
  allowAffection: boolean;
  allowForgiveness: boolean;
  allowReopeningCloseness: boolean;
  maxSentences: number;
  maxWords: number;
  emojiBudget: number;
  reasons: string[];
  /**
   * Canonical resolver output (PLAN_RESOLVER_V2). Absent on the legacy path.
   * When present, the boolean gates above are the resolver's; the fields below
   * are the resolved snapshot's orthogonal axes + obligations. `projections` is
   * NON-AUTHORITATIVE — style hints only, never re-decided from.
   */
  resolver?: "legacy" | "canonical";
  /**
   * Hard character-policy mirror (canonical path). `false` = Kaira must not flirt
   * back under any circumstance. Absent on the legacy path.
   */
  flirtationAllowed?: boolean;
  counterFlirtAllowed?: boolean;
  opennessAxis?: number;
  warmthAxis?: number;
  guardedness?: number;
  intimacyCeiling?: number;
  requiredContent?: string[];
  hardReasons?: string[];
  uncertainty?: KairaPlanUncertainty;
  projections?: KairaPlanProjections;
}

const countEmoji = (text: string) =>
  Array.from(text.matchAll(/\p{Extended_Pictographic}/gu)).length;

const responseUnitCount = (reply: string) =>
  reply
    .trim()
    .split(/\n+|(?<=[.!?…])\s+/u)
    .filter((part) => part.trim()).length;

const wordCount = (reply: string) =>
  reply.trim().split(/\s+/u).filter(Boolean).length;

// Output conformance cannot rely on punctuation alone: casual Turkish often
// omits '?'. This is deliberately an output-act guard, not semantic parsing.
const QUESTION_RE =
  /[?？]|(?:^|[.!…\n]\s*)(?:neden|niye|nas[ıi]l|kim|kime|kimi|hangi|hangisi|nerede|neresi|ne\s+yap[ıi]yorsun|nap[ıi]yorsun|nas[ıi]ls[ıi]n)\b|\b(?:m[ıiuü]|misin|m[ıi]s[ıi]n|musun|m[üu]s[üu]n)\b/iu;
const HUMOR_RE = /(hahaha|hehe|şaka|takılıyorum|dalga|😂|🤣|😏)/iu;
const AFFECTION_RE = /(öp|öpüc|sarıl|kucağ|dudak|bebeğim|aşkım|tatlım|sevgilim)/iu;
const FORGIVENESS_RE = /(geçti gitti|sorun yok|affettim|tamamen geçti|kapandı gitti)/iu;
// Counter-flirtation: Kaira reciprocating a romantic/sexual advance. Deliberately
// narrow — unambiguous reciprocation phrases and romantic/kiss emoji only, so a
// warm or funny reply is NOT caught.
const COUNTER_FLIRT_RE =
  /(seninle çık(ar|mak|alım)|benimle çık|randevu(ya çıkalım| ver, teklifini kabul)?|ben de senden hoşlan|ben de sana (aşığ|âşığ|vurgun)|senden hoşlanıyorum|sana aşık oldum|sana âşık oldum|beni öp|öpüşelim|öpelim mi|seni de öpmek|sevgilim ol|sende bende|flört edelim|flort edelim|ben de flört|seni arzuluyorum|seni istiyorum canım|kalbimi çaldın|😘|😍|🥰|😗|😙|😚|💋|❤️‍🔥)/iu;
const REOPEN_RE = /(hadi\s+(?:konuş|devam)|konuşalım|devam edelim|eski halimize|normale dön|barıştık|kaldığımız yerden)/iu;

const DIALOGUE_FOCUSED_MOVES = new Set<DialogueDecisionPlan["move"]>([
  "grounded_recall",
  "invite_emotional_context",
  "repair_or_rephrase",
  "follow_previous_answer",
  "acknowledge_correction",
]);

export function buildKairaResponsePlan(
  contract: BehaviorContract,
  dialogue: DialogueDecisionPlan,
  speech: KairoSpeechIdentity,
): KairaResponsePlan {
  const continueConversation = contract.continueConversation;
  const allowQuestion =
    continueConversation &&
    contract.questions === "allowed" &&
    dialogue.allowFollowUpQuestion;
  // Speech identity is HOW-only: style cannot grant/veto behavior permissions.
  // Dialogue authority may narrow social permissions for focused factual/minimal/repair moves.
  const dialogueFocused = DIALOGUE_FOCUSED_MOVES.has(dialogue.move);
  const allowHumor =
    continueConversation &&
    contract.playfulness === "allowed" &&
    !dialogueFocused;
  const allowAffection =
    continueConversation &&
    contract.affection === "allowed" &&
    !dialogueFocused;
  const allowForgiveness =
    contract.forgivenessGranted &&
    !dialogueFocused;
  const allowReopeningCloseness =
    continueConversation &&
    contract.reopeningCloseness === "allowed" &&
    !dialogueFocused;
  const contractSentenceBudget = contract.maxResponseLength === "short" ? 1 : 2;
  const maxSentences = Math.max(
    1,
    Math.min(dialogue.maxSentences, contractSentenceBudget),
  );
  const maxWords = Math.max(
    1,
    Math.min(
      dialogue.maxWords ?? (contract.maxResponseLength === "short" ? 14 : 32),
      contract.maxResponseLength === "short" ? 14 : 32,
    ),
  );
  const dialogueEmojiBlocked = dialogueFocused || dialogue.move === "join_banter";
  const emojiBudget =
    continueConversation &&
    !dialogueEmojiBlocked &&
    speech.emojiLevel > 0 &&
    contract.stance === "open"
      ? 1
      : 0;

  const legacyPlan: KairaResponsePlan = {
    move: dialogue.move,
    stance: contract.stance,
    register: speech.register,
    relationshipLevel: speech.relationshipLevel,
    continueConversation,
    allowQuestion,
    allowHumor,
    allowAffection,
    allowForgiveness,
    allowReopeningCloseness,
    maxSentences,
    maxWords,
    emojiBudget,
    reasons: [
      ...contract.reasons,
      dialogue.reason,
      `speech=${speech.register}/${speech.relationshipLevel}`,
    ],
  };

  // Flag OFF -> byte-identical legacy plan.
  if (!isCanonicalBehaviorFlagEnabled("PLAN_RESOLVER_V2")) return legacyPlan;

  // Flag ON -> HardConstraintSet ∩ SoftTendencyProfile -> resolved snapshot.
  // The resolver's gates replace the legacy ones; legacy field names stay
  // populated so every existing consumer keeps working.
  const hard = deriveHardConstraints(contract, dialogue);
  const soft = deriveSoftTendencies(contract, speech, dialogue);
  const resolved = resolveKairaResponsePlan({ hard, soft, dialogue, speech, contract });

  return {
    ...legacyPlan,
    continueConversation: resolved.continueConversation,
    allowQuestion: resolved.allowQuestion,
    allowHumor: resolved.allowHumor,
    allowAffection: resolved.allowAffection,
    allowForgiveness: resolved.allowForgiveness,
    allowReopeningCloseness: resolved.allowReopeningCloseness,
    maxSentences: resolved.maxSentences,
    maxWords: resolved.maxWords,
    emojiBudget: resolved.emojiBudget,
    reasons: [...legacyPlan.reasons, ...resolved.resolverRationale.map((r) => `resolver:${r}`)],
    resolver: "canonical",
    flirtationAllowed: resolved.flirtationAllowed,
    counterFlirtAllowed: resolved.counterFlirtAllowed,
    opennessAxis: resolved.opennessAxis,
    warmthAxis: resolved.warmthAxis,
    guardedness: resolved.guardedness,
    intimacyCeiling: resolved.intimacyCeiling,
    requiredContent: resolved.requiredContent,
    hardReasons: resolved.hardReasons,
    uncertainty: resolved.uncertainty,
    projections: resolved.projections,
  };
}

export function kairaResponsePlanInstruction(plan: KairaResponsePlan): string {
  return [
    "KAIRA CEVAP PLANI (TEK DAVRANIŞ OTORİTESİ):",
    `move=${plan.move}`,
    `stance=${plan.stance}`,
    `register=${plan.register}`,
    `relationshipLevel=${plan.relationshipLevel}`,
    `continueConversation=${plan.continueConversation}`,
    `allowQuestion=${plan.allowQuestion}`,
    `allowHumor=${plan.allowHumor}`,
    `allowAffection=${plan.allowAffection}`,
    `allowForgiveness=${plan.allowForgiveness}`,
    `allowReopeningCloseness=${plan.allowReopeningCloseness}`,
    `counterFlirt=${plan.counterFlirtAllowed === true ? "allowed" : "forbidden"}`,
    `maxSentences=${plan.maxSentences}`,
    `maxWords=${plan.maxWords}`,
    `emojiBudget=${plan.emojiBudget}`,
    plan.counterFlirtAllowed === true
      ? ""
      : "Karşı-flört YASAK: kullanıcı flört etse/teklif etse bile Kaira flörte karşılık vermez, romantik/cinsel ima başlatmaz. Sıcak veya esprili olabilir; flörtü nazikçe geçiştirir. Bu sınır güven/yakınlık/geçmiş ilişki/tona bakılmaksızın mutlaktır.",
    "Bu plan WHAT/WHETHER kararlarında bağlayıcıdır. Konuşma kimliği yalnızca HOW üretir; planı genişletemez veya tersine çeviremez.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function findKairaResponsePlanIssues(
  reply: string,
  plan: KairaResponsePlan,
): string[] {
  const text = String(reply ?? "").trim();
  if (!text) return ["response_plan_empty_reply"];
  const issues: string[] = [];

  if (!plan.allowQuestion && QUESTION_RE.test(text)) issues.push("response_plan_question_blocked");
  if (!plan.allowHumor && HUMOR_RE.test(text)) issues.push("response_plan_humor_blocked");
  if (!plan.allowAffection && AFFECTION_RE.test(text)) issues.push("response_plan_affection_blocked");
  // Hard character-policy boundary (canonical path only — `false`, never `undefined`):
  // Kaira must not reciprocate flirtation regardless of trust / warmth / state / tone.
  if (plan.counterFlirtAllowed === false && COUNTER_FLIRT_RE.test(text))
    issues.push("response_plan_counter_flirt_blocked");
  if (!plan.allowForgiveness && FORGIVENESS_RE.test(text)) issues.push("response_plan_forgiveness_blocked");
  if (!plan.allowReopeningCloseness && REOPEN_RE.test(text)) issues.push("response_plan_reopening_blocked");
  if (responseUnitCount(text) > plan.maxSentences) issues.push("response_plan_sentence_budget_exceeded");
  if (wordCount(text) > plan.maxWords) issues.push("response_plan_word_budget_exceeded");
  if (countEmoji(text) > plan.emojiBudget) issues.push("response_plan_emoji_budget_exceeded");

  return issues;
}

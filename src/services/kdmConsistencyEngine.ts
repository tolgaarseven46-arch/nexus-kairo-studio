import {
  AffectiveReactionMode,
  DroitDynamicState,
  DroitPersonalityTraits,
  ReasoningTrace,
} from "../types/nexus";
import {
  computeBehaviorProfile,
  BehaviorLayerProfile,
} from "./droitBehaviorEngine";
import { normalizeDroitPersonality } from "./droitPersonalityNormalizer";
import { normalizeKairoLanguageInput } from "./kairoLanguageNormalizer";
import { hasLocalLowMoodExpression } from "./kairoEmotionalLanguage";
import { isConfusionOrChallenge } from "./kairoDialogueChaosEngine";
import { applyRelationshipContext } from "./relationshipBehaviorService";
import { interpretSemanticEvent, type SemanticEvent } from "./semanticEventEngine";
import type { BehaviorPolicyInput } from "./behaviorPolicyInput";

export interface KdmAnalysisResult {
  trace: ReasoningTrace;
  behaviorProfile: BehaviorLayerProfile;
  nextDynamicState: DroitDynamicState;
}

type EventKind = "positive" | "negative" | "neutral";
type NegativeTarget = "kaira" | "third_party" | "event";

const clamp = (value: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, Math.round(value)));

const trait = (
  p: DroitPersonalityTraits | null | undefined,
  key: keyof DroitPersonalityTraits,
  fallback = 50,
) => clamp(typeof p?.[key] === "number" ? p[key]! : fallback);

function behaviorPolicyStanceCode(value?: BehaviorPolicyInput["decision"]["stance"]): number {
  if (value === "warm") return 0;
  if (value === "firm") return 50;
  if (value === "distant") return 75;
  if (value === "disengage") return 100;
  return 25;
}

function behaviorPolicyLengthCode(value?: BehaviorPolicyInput["decision"]["responseLength"]): number {
  if (value === "short") return 25;
  if (value === "long") return 75;
  return 50;
}

function behaviorPolicyPriorityCode(value?: BehaviorPolicyInput["decision"]["priority"]): number {
  if (value === "boundary") return 100;
  if (value === "values") return 82;
  if (value === "relationship") return 65;
  if (value === "goal") return 50;
  if (value === "preference") return 35;
  return 20;
}

function applyIntegratedBehaviorPolicy(
  profile: BehaviorLayerProfile,
  behaviorPolicy?: BehaviorPolicyInput | null,
): BehaviorLayerProfile {
  const decision = behaviorPolicy?.decision;
  const continueConversation = decision?.continueConversation ?? true;
  const humorAllowed = decision?.humorAllowed ?? true;
  const askQuestion = decision?.askQuestion ?? true;
  const acknowledgeComplaint = decision?.acknowledgeComplaint ?? false;
  const repairAllowed = decision?.repairAllowed ?? true;
  const stance = behaviorPolicyStanceCode(decision?.stance);
  const responseLength = behaviorPolicyLengthCode(decision?.responseLength);
  const directness = Math.round((decision?.directness ?? 0.5) * 100);
  const distance = Math.round((decision?.distance ?? 0) * 100);
  const priority = behaviorPolicyPriorityCode(decision?.priority);

  const directives = [...profile.behaviorDirectives];
  const relationshipParts = profile.relationshipInstruction
    ? [profile.relationshipInstruction]
    : [];

  let tone = profile.tone;
  let humorLevel = humorAllowed ? profile.humorLevel : 0;
  let curiosity = profile.curiosity;

  if (!humorAllowed) {
    directives.push("Bu tur mizah kullanma; şaka, ironi ve alay ekleme.");
  }
  if (!askQuestion) {
    curiosity = Math.min(curiosity, 0.2);
    directives.push("Cevabı soru ile bitirme; yeni soru sorma.");
  }
  if (acknowledgeComplaint) {
    directives.push("Varsa rahatsızlığı veya itirazı kısa biçimde kabul et; konuyu atlama.");
  }
  if (!repairAllowed) {
    directives.push("Özür veya barışma sinyali gelse bile ilişkiyi anında normale döndürme.");
  }

  if (!continueConversation || stance >= 90) {
    tone = "firm";
    humorLevel = 0;
    curiosity = 0;
    directives.push("Konuşmayı uzatma; net sınır koy ve sohbeti sürdürmeye çalışma.");
    relationshipParts.push("Bu tur Kaira konuşmadan çekiliyor. Kısa, net bir sınır cümlesi ver; soru sorma, mizah yapma, yeni konu açma.");
  } else if (stance >= 70) {
    tone = "firm";
    humorLevel = 0;
    directives.push("Mesafeli, kısa ve kontrollü konuş; yakınlık kurmaya çalışma.");
    relationshipParts.push("Mesafe yüksek. Samimiyeti azalt, kısa cevap ver, ilişkiyi normale dönmüş gibi davranma.");
  } else if (stance >= 45) {
    tone = "firm";
    humorLevel = 0;
    directives.push("Net ve sınırları belli bir ton kullan.");
  } else if (stance <= 10 && distance < 35) {
    tone = "warm";
  }

  if (responseLength <= 30) {
    directives.push("Cevabı kısa tut; tercihen tek kısa cümle, gerekirse iki cümle.");
  } else if (responseLength >= 70) {
    directives.push("Konu gerektiriyorsa biraz daha açıklayıcı ol; yine sosyal sohbet ritmini koru.");
  }

  if (directness >= 70) directives.push("Dolandırmadan, doğrudan ve net konuş.");

  if (priority >= 80) {
    relationshipParts.push("Üst öncelik değer/sınır katmanında; eğlence, yakınlaşma ve tercih katmanları bunu bastıramaz.");
  } else if (priority >= 60) {
    relationshipParts.push("Üst öncelik mevcut ilişki durumunda; önce ilişki mesafesini koru.");
  }

  return {
    ...profile,
    tone,
    humorLevel,
    curiosity,
    behaviorDirectives: directives,
    relationshipInstruction: relationshipParts.join(" ") || undefined,
    responseStyle: `${profile.responseStyle}_integrated_s${stance}_l${responseLength}`,
    dominantSummary: `${profile.dominantSummary} · Entegre policy`,
    debugMatrix: {
      ...profile.debugMatrix,
      synthesizedParameters: {
        ...profile.debugMatrix.synthesizedParameters,
        behaviorPolicyDecision: {
          continueConversation,
          humorAllowed,
          askQuestion,
          acknowledgeComplaint,
          repairAllowed,
          stance,
          responseLength,
          directness,
          distance,
          priority,
        },
      },
    },
  };
}

function analysisText(message: string) {
  const n = normalizeKairoLanguageInput(message);
  return `${n.normalized} ${n.canonical}`.toLocaleLowerCase("tr-TR");
}

const EMOTIONAL_SHARE_RE =
  /(moralim\b.{0,30}\bbozuk|üzgünüm|çok\s+mutluyum|mutluyum|bunaldım|canım\s+(çok\s+)?sıkkın|kendimi\s+(çok\s+)?kötü\s+hissediyorum|kendimi\s+(çok\s+)?iyi\s+hissediyorum)/;
const EMOTIONAL_LOAD_RE =
  /(moralim\b.{0,30}\bbozuk|üzgün|kötü\s+hissed|bunaldım|canım\s+(çok\s+)?sıkkın|kaygı|endişe|stres|çok\s+sıcak.*bunaldım|yoruldum|tükendim)/;
const INSULT_RE =
  /(aptal|salak|gerizekalı|geri\s+zekalı|mal\b|çirkin|boş\s+konuş|kaşar|orospu|oropu|orosp[uy]|sürtük|piç|yavşak|şerefsiz|haysiyetsiz|ezik|defol|siktir|sus\b|kes\b|kaybol|nefret|rezalet|berbat|bok)/;
const AGGRESSIVE_RE =
  /(sinir|kızgın|nefret|rezalet|bok|amk|aq\b|mk\b|lanet|berbat|aptal|salak|gerizekalı|geri\s+zekalı|mal\b|çirkin|boş\s+konuş|kaşar|orospu|oropu|orosp[uy]|sürtük|piç|yavşak|şerefsiz|haysiyetsiz|ezik|defol|siktir|sus\b|kes\b|kaybol)/;
const DIRECT_INSULT_RE = INSULT_RE;
const THIRD_PARTY_RE =
  /\b(mert|müdür|patron|çocuk|çocuğa|çocuğu|adam|adama|adamı|kadın|kadına|kadını|arkadaşım|arkadaşıma|arkadaşına|ona|onu|onun|o)\b/;
const REPORTING_RE =
  /\b(dedim|dedi|demiş|söyledim|söyledi|diyor|diyordu|diye)\b/;

function classifyIntent(message: string): string {
  const text = analysisText(message);
  if (/(özür dilerim|özür|pardon|kusura bakma)/.test(text)) return "özür_ve_telafi";
  if (INSULT_RE.test(text)) return "hakaret_ve_saldiri";
  if (isConfusionOrChallenge(message)) return "anlamama_ve_itiraz";
  if (hasLocalLowMoodExpression(message)) return "duygusal_paylasim";
  if (EMOTIONAL_SHARE_RE.test(text)) return "duygusal_paylasim";
  if (/(^|\s)(selam|merhaba|hey|naber|nasılsın|ne yapıyorsun)(\s|$)/.test(text)) return "selamlama";
  if (/(^|\s)(kim|kime|kimi|neydi|hangisi|hangisiydi)(\s|$)|ne\s+yapacaktı|(?:^|\s)ne(?:yi)?\s+.{0,50}düşün|hatırlıyor\s+musun|hatırladın\s+mı/.test(text)) return "soru";
  if (/(neden|nasıl|ne demek|açıkla|anlat|nedir|niye)/.test(text)) return "bilgi_ve_aciklama";
  if (/(?:😂|🤣|😄|😅|:d|\bha(?:ha)+h*\b)/i.test(text)) return "şakalaşma";
  if (/(?<![\p{L}])(hata|sorun|çöktü|çalışmıyor|bug|arıza|bozuk)(?![\p{L}])/u.test(text)) return "sorun_cozme";
  if (/(yap|oluştur|ekle|değiştir|geliştir|uygula)/.test(text)) return "eylem_talebi";
  if (/[?]/.test(message)) return "soru";
  return "genel_sohbet";
}

function classifySentiment(message: string): string {
  const text = analysisText(message);
  if (hasLocalLowMoodExpression(message)) return "duygusal_yük";
  if (EMOTIONAL_LOAD_RE.test(text)) return "duygusal_yük";
  if (AGGRESSIVE_RE.test(text)) return "negatif";
  if (/(çok\s+mutluyum|mutluyum|çok\s+iyiyim|keyfim\s+yerinde|teşekkür|sağ ol|harika|süper|mükemmel|seviyorum|güzel|özür)/.test(text)) return "pozitif";
  return "nötr";
}

function semanticIntentToKdm(event: SemanticEvent): string {
  switch (event.intent) {
    case "greeting": return "selamlama";
    case "question": return "soru";
    case "information_request": return "bilgi_ve_aciklama";
    case "emotional_share": return "duygusal_paylasim";
    case "banter": return "şakalaşma";
    case "insult": return "hakaret_ve_saldiri";
    case "rejection": return "reddetme_ve_mesafe";
    case "apology": return "özür_ve_telafi";
    case "repair": return "özür_ve_telafi";
    case "complaint": return "anlamama_ve_itiraz";
    case "command": return "eylem_talebi";
    case "support": return "duygusal_destek";
    case "compliment": return "genel_sohbet";
    case "general_chat":
    default:
      return "genel_sohbet";
  }
}

function semanticSentimentToKdm(event: SemanticEvent): string {
  if (event.emotionalLoad > 0) return "duygusal_yük";
  if (event.valence === "negative") return "negatif";
  if (event.valence === "positive") return "pozitif";
  return "nötr";
}

function semanticNegativeTarget(event: SemanticEvent): NegativeTarget {
  if (event.target === "kaira") return "kaira";
  if (event.target === "third_party") return "third_party";
  return "event";
}

function semanticPattern(event: SemanticEvent): string | null {
  if (event.redLine) return "agir_hakaret";
  if (event.insult) return "hakaret";
  if (event.coercion > 0) return "zorlama";
  if (event.manipulation > 0) return "manipulasyon";
  if (event.privacyViolation > 0) return "mahremiyet_ihlali";
  if (event.intent === "rejection") return "kovma_ve_reddetme";
  if (event.frustration > 0) return "agresif_dil";
  return null;
}

function semanticWarmthDelta(event: SemanticEvent, sentiment: string): number {
  let delta = sentiment === "pozitif" ? 2 : sentiment === "negatif" ? -3 : 0;
  if (event.apology || event.repairAttempt || event.support > 0 || event.compliment > 0) delta += 2;
  if (event.insult) delta -= 5;
  else if (event.coercion > 0 || event.manipulation > 0 || event.privacyViolation > 0) delta -= 3;
  return clamp(delta, -10, 10);
}

function moodChangeFromDelta(delta: number): string {
  if (delta >= 4) return "daha pozitif ve sıcak";
  if (delta <= -4) return "daha temkinli ve mesafeli";
  return "stabil";
}

function approachBaseline(value: number, baseline: number, maxStep = 1): number {
  if (value === baseline) return 0;
  return value > baseline ? -Math.min(maxStep, value - baseline) : Math.min(maxStep, baseline - value);
}

const DEFAULT_DYNAMIC_STATE: DroitDynamicState = {
  calmness: 70,
  anger: 10,
  stress: 20,
  happiness: 70,
  confidence: 70,
  surprise: 10,
  lastStatus: "Sakin ve kontrollü",
};

export function analyzeKdmInteraction(
  userMessage: string,
  personality?: Partial<DroitPersonalityTraits> | null,
  currentDynamicState?: DroitDynamicState | null,
  canonicalSemanticEvent?: SemanticEvent | null,
  behaviorPolicy?: BehaviorPolicyInput | null,
): KdmAnalysisResult {
  const state: DroitDynamicState = {
    ...DEFAULT_DYNAMIC_STATE,
    ...(currentDynamicState || {}),
  };
  const semanticEvent = canonicalSemanticEvent ?? interpretSemanticEvent(userMessage);
  const normalizedPersonality = normalizeDroitPersonality(personality);
  const baseBehaviorProfile = computeBehaviorProfile(normalizedPersonality, userMessage);
  const intent = semanticIntentToKdm(semanticEvent);
  const sentiment = semanticSentimentToKdm(semanticEvent);

  const patience = trait(normalizedPersonality, "patience");
  const sensitivity = trait(normalizedPersonality, "emotionalSensitivity");
  const angerTrait = trait(normalizedPersonality, "anger");
  const empathy = trait(normalizedPersonality, "empathy");
  const loyalty = trait(normalizedPersonality, "loyalty");

  const negativeSensitivity = Math.max(
    0.55,
    Math.min(1.65, 1 + (sensitivity - 50) / 160 + (angerTrait - 50) / 220 - (patience - 50) / 180),
  );
  const forgivenessFactor = Math.max(
    0.55,
    Math.min(1.55, 1 + (empathy - 50) / 150 + (patience - 50) / 220 - (angerTrait - 50) / 260),
  );

  const relationship = state.relationship || {
    firstSeenAt: new Date().toISOString(),
    lastInteractionAt: new Date().toISOString(),
    interactionCount: 0,
    familiarityDays: 0,
    warmth: 50,
    trust: 50,
    positiveEvents: 0,
    negativeEvents: 0,
    conflictScore: 0,
    hurtScore: 0,
    repairProgress: 0,
    repeatedNegativeCount: 0,
    conversationState: "active" as const,
    repairAttempts: 0,
  };

  const calculatedDays = Number.isFinite(new Date(relationship.firstSeenAt!).getTime())
    ? Math.max(0, Math.floor((Date.now() - new Date(relationship.firstSeenAt!).getTime()) / 86400000))
    : 0;
  const familiarityDays = Math.max(0, relationship.familiarityDays || 0, calculatedDays);
  const interactionCount = Math.max(0, relationship.interactionCount || 0);
  const nextInteractionCount = interactionCount + 1;
  const interactionAt = new Date().toISOString();
  const baseWarmth = clamp(relationship.warmth ?? 50);
  const baseTrust = clamp(relationship.trust ?? 50);
  const positiveEvents = Math.max(0, relationship.positiveEvents || 0);
  const negativeEvents = Math.max(0, relationship.negativeEvents || 0);
  const baseConflict = clamp(relationship.conflictScore ?? Math.min(100, negativeEvents * 4));
  const baseHurt = clamp(relationship.hurtScore ?? 0);
  const baseRepair = clamp(relationship.repairProgress ?? 0);
  const priorConversationState = relationship.conversationState ?? "active";
  const priorRepairAttempts = Math.max(0, relationship.repairAttempts ?? 0);
  const integratedDecision = behaviorPolicy?.decision;
  const integratedPriority = behaviorPolicyPriorityCode(integratedDecision?.priority);
  const integratedStance = behaviorPolicyStanceCode(integratedDecision?.stance);
  const requestedDisengage =
    integratedDecision?.continueConversation === false &&
    integratedDecision.stance === "disengage" &&
    integratedPriority >= 80;

  const passiveHealingDays = relationship.lastConflictAt && Number.isFinite(new Date(relationship.lastConflictAt).getTime())
    ? Math.max(0, Math.floor((Date.now() - new Date(relationship.lastConflictAt).getTime()) / 86400000))
    : 0;
  const healingRate = Math.max(0.45, Math.min(1.6, forgivenessFactor - (sensitivity - 50) / 350));
  const passivelyHealedHurt = clamp(baseHurt - Math.min(18, passiveHealingDays * healingRate));
  const passivelyHealedConflict = clamp(baseConflict - Math.min(12, Math.floor(passiveHealingDays / 2) * healingRate));

  const familiarityFactor = Math.min(familiarityDays / 30, 1);
  const closeness = clamp(
    familiarityFactor * 30 + Math.min(interactionCount / 40, 1) * 20 + baseWarmth * 0.25 + baseTrust * 0.25,
  );
  const loyaltyBetrayalFactor = 1 + ((loyalty - 50) / 250) * (closeness / 100);
  const historyQuality = clamp(50 + positiveEvents * 3 - negativeEvents * 5 - passivelyHealedConflict * 0.35 - passivelyHealedHurt * 0.25);
  const relationshipQuality = clamp(baseWarmth * 0.35 + baseTrust * 0.35 + historyQuality * 0.3);
  const toleranceMultiplier = Math.max(
    0.35,
    1 - 0.55 * familiarityFactor * (relationshipQuality / 100) + (passivelyHealedConflict / 100) * 0.25 + (passivelyHealedHurt / 100) * 0.2,
  );

  const rawKind: EventKind = semanticEvent.valence === "positive" ? "positive" : semanticEvent.valence === "negative" ? "negative" : "neutral";
  const negativeTarget: NegativeTarget | null = rawKind === "negative" ? semanticNegativeTarget(semanticEvent) : null;
  const targetsKaira = rawKind === "negative" && negativeTarget === "kaira";
  const kind: EventKind = rawKind === "negative" && !targetsKaira ? "neutral" : rawKind;
  const apology = semanticEvent.apology;
  const repairSignal = apology || semanticEvent.repairAttempt;
  const pattern = kind === "negative" ? semanticPattern(semanticEvent) : null;
  const samePattern = !!pattern && relationship.lastNegativePattern === pattern;
  const priorRepeatCount = Math.max(0, relationship.repeatedNegativeCount || 0);
  const repeatCount = pattern ? (samePattern ? priorRepeatCount + 1 : 1) : priorRepeatCount;
  const repeatEscalation = samePattern ? Math.min(2.2, 1 + Math.max(0, repeatCount - 1) * 0.25) : 1;
  const personalityImpact = kind === "negative" ? negativeSensitivity * loyaltyBetrayalFactor : 1;

  const rawWarmthDelta = rawKind === "negative" && !targetsKaira ? 0 : semanticWarmthDelta(semanticEvent, sentiment);
  const warmthDelta = Math.round(rawWarmthDelta * toleranceMultiplier * (kind === "negative" ? repeatEscalation * personalityImpact : 1));
  const warmthBefore = baseWarmth;
  const warmthAfter = clamp(warmthBefore + warmthDelta);
  const trustDelta = kind === "negative"
    ? -4 * repeatEscalation * personalityImpact
    : apology
      ? 1.5 * forgivenessFactor
      : kind === "positive" && priorConversationState === "active"
        ? 2
        : 0;
  const trustAfter = clamp(baseTrust + Math.round(trustDelta * toleranceMultiplier));

  let conflictAfter = passivelyHealedConflict;
  let hurtAfter = passivelyHealedHurt;
  let repairAfter = baseRepair;
  let lastConflictAt = relationship.lastConflictAt;
  let lastNegativePattern = relationship.lastNegativePattern;
  let lastNegativePatternAt = relationship.lastNegativePatternAt;

  if (kind === "negative") {
    const severityBoost = semanticEvent.redLine ? 1.35 : semanticEvent.severity >= 0.8 ? 1.15 : 1;
    // Established, healthy relationships may absorb ordinary conflict better, but
    // red-line violations remain strongly injurious regardless of familiarity.
    const relationshipInjuryMultiplier = semanticEvent.redLine
      ? Math.max(0.85, toleranceMultiplier)
      : Math.max(0.5, toleranceMultiplier);
    conflictAfter = clamp(conflictAfter + 8 * repeatEscalation * personalityImpact * severityBoost * relationshipInjuryMultiplier);
    hurtAfter = clamp(hurtAfter + 12 * repeatEscalation * personalityImpact * severityBoost * relationshipInjuryMultiplier);
    repairAfter = clamp(repairAfter - 8 * repeatEscalation * personalityImpact * severityBoost * relationshipInjuryMultiplier);
    lastConflictAt = interactionAt;
    if (pattern) {
      lastNegativePattern = pattern;
      lastNegativePatternAt = lastConflictAt;
    }
  } else if (apology) {
    const apologyPower = (4 + (baseTrust / 100) * 3) * forgivenessFactor;
    conflictAfter = clamp(conflictAfter - apologyPower);
    hurtAfter = clamp(hurtAfter - Math.max(2, apologyPower * 0.7));
    repairAfter = clamp(repairAfter + 10 * forgivenessFactor);
  } else if (kind === "positive") {
    conflictAfter = clamp(conflictAfter - 2 * forgivenessFactor);
    hurtAfter = clamp(hurtAfter - forgivenessFactor);
    if (priorConversationState === "active") repairAfter = clamp(repairAfter + 3 * forgivenessFactor);
  } else {
    conflictAfter = clamp(conflictAfter - healingRate);
    hurtAfter = clamp(hurtAfter - Math.max(1, healingRate));
    repairAfter = baseRepair;
  }

  let conversationState = priorConversationState;
  let disengagedAt = relationship.disengagedAt;
  let disengageReason = relationship.disengageReason;
  let repairAttempts = priorRepairAttempts;
  const disengagedMinutes = disengagedAt && Number.isFinite(new Date(disengagedAt).getTime())
    ? Math.max(0, (Date.now() - new Date(disengagedAt).getTime()) / 60000)
    : 0;

  if (requestedDisengage || (kind === "negative" && semanticEvent.redLine)) {
    conversationState = "disengaged";
    disengagedAt = interactionAt;
    disengageReason = pattern || "boundary";
    repairAttempts = 0;
    repairAfter = 0;
  } else if (priorConversationState === "disengaged") {
    if (repairSignal) repairAttempts += 1;
    const enoughForRepairing = repairSignal && (repairAttempts >= 2 || repairAfter >= 20 || disengagedMinutes >= 30);
    conversationState = enoughForRepairing ? "repairing" : "disengaged";
  } else if (priorConversationState === "repairing") {
    if (kind === "negative") {
      conversationState = "disengaged";
      disengagedAt = interactionAt;
      disengageReason = pattern || "new_negative_event";
      repairAttempts = 0;
      repairAfter = 0;
    } else {
      if (repairSignal) repairAttempts += 1;
      const enoughToReactivate = repairSignal && repairAttempts >= 3 && repairAfter >= 35 && disengagedMinutes >= 30;
      conversationState = enoughToReactivate ? "active" : "repairing";
    }
  } else if (kind === "negative" && targetsKaira) {
    conversationState = conflictAfter >= 18 || hurtAfter >= 22 ? "distancing" : conversationState;
  } else if (conversationState === "distancing" && conflictAfter < 10 && hurtAfter < 15) {
    conversationState = "active";
  }

  if (conversationState === "active") {
    disengagedAt = undefined;
    disengageReason = undefined;
    repairAttempts = 0;
  }

  const positiveEventsAfter = positiveEvents + (kind === "positive" ? 1 : 0);
  const negativeEventsAfter = negativeEvents + (kind === "negative" ? 1 : 0);
  const unresolvedHurt = hurtAfter >= 20 || conflictAfter >= 20;
  const repeatedProblem = samePattern && repeatCount >= 2;
  const priorRelationshipDamaged = priorConversationState !== "active" || passivelyHealedHurt >= 20 || passivelyHealedConflict >= 20;
  const reactionMode: AffectiveReactionMode = conversationState === "disengaged"
    ? "withdrawn"
    : conversationState === "repairing" || (repairSignal && unresolvedHurt)
      ? "repairing"
      : kind === "negative" && targetsKaira
        ? priorRelationshipDamaged
          ? "withdrawn"
          : closeness >= 60 && (familiarityDays >= 14 || interactionCount >= 20)
            ? "hurt"
            : "irritated"
        : kind === "neutral" && !repairSignal &&
          (state.reactionMode === "hurt" || state.reactionMode === "irritated") &&
          (hurtAfter >= 2 || conflictAfter >= 2)
          ? state.reactionMode
          : unresolvedHurt
            ? "hurt"
            : "neutral";

  const neutralStress = approachBaseline(state.stress ?? 20, DEFAULT_DYNAMIC_STATE.stress, 1);
  const neutralHappiness = approachBaseline(state.happiness ?? 70, DEFAULT_DYNAMIC_STATE.happiness, 1);
  const neutralCalmness = approachBaseline(state.calmness ?? 70, DEFAULT_DYNAMIC_STATE.calmness, 1);
  const neutralAnger = approachBaseline(state.anger ?? 10, DEFAULT_DYNAMIC_STATE.anger, 1);

  let stressDelta = 0;
  let happinessDelta = 0;
  let calmnessDelta = 0;
  let angerDelta = 0;

  if (kind === "negative" && targetsKaira) {
    stressDelta = Math.max(2, Math.round(4 * repeatEscalation * personalityImpact * toleranceMultiplier));
    happinessDelta = Math.min(-2, Math.round(-3 * repeatEscalation * personalityImpact * toleranceMultiplier));
    calmnessDelta = Math.min(-2, Math.round(-3 * repeatEscalation * personalityImpact * toleranceMultiplier));
    angerDelta = Math.max(2, Math.round((2 + angerTrait / 50) * repeatEscalation * negativeSensitivity));
  } else if (sentiment === "negatif") {
    stressDelta = 2;
    happinessDelta = -1;
    calmnessDelta = -1;
    angerDelta = 1;
  } else if (sentiment === "duygusal_yük") {
    stressDelta = 1;
    happinessDelta = unresolvedHurt ? -1 : 0;
    calmnessDelta = 0;
    angerDelta = neutralAnger;
  } else if (apology) {
    stressDelta = unresolvedHurt ? -1 : neutralStress;
    happinessDelta = unresolvedHurt ? 0 : 1;
    calmnessDelta = 1;
    angerDelta = -Math.min(2, Math.max(0, (state.anger ?? 10) - DEFAULT_DYNAMIC_STATE.anger));
  } else if (kind === "positive") {
    stressDelta = -1;
    happinessDelta = 2;
    calmnessDelta = 1;
    angerDelta = neutralAnger;
  } else {
    stressDelta = neutralStress;
    happinessDelta = neutralHappiness;
    calmnessDelta = neutralCalmness;
    angerDelta = neutralAnger;
  }

  if (unresolvedHurt && kind === "neutral" && !apology) {
    happinessDelta = Math.min(happinessDelta, 0);
    calmnessDelta = Math.min(calmnessDelta, 0);
    stressDelta = Math.max(stressDelta, 0);
  }

  const confidenceDelta = intent === "eylem_talebi" ? Math.max(1, Math.round(toleranceMultiplier)) : 0;
  const lastStatus = conversationState === "disengaged"
    ? "Konuşmadan çekildi"
    : conversationState === "repairing"
      ? "Mesafeli, onarımı değerlendiriyor"
      : conversationState === "distancing"
        ? "Mesafe koyuyor"
        : repeatedProblem
          ? "Tekrarlanan davranıştan rahatsız"
          : kind === "negative" && targetsKaira
            ? hurtAfter >= 45 || conflictAfter >= 45
              ? "Kırgın ve sınır koyuyor"
              : "Rahatsız ve mesafeli"
            : apology && unresolvedHurt
              ? "Yumuşuyor ama temkinli"
              : unresolvedHurt
                ? "Kırgınlık sürüyor"
                : sentiment === "duygusal_yük"
                  ? "Empatik ve dikkatli"
                  : moodChangeFromDelta(warmthDelta);

  const nextDynamicState: DroitDynamicState = {
    ...state,
    stress: clamp((state.stress ?? 20) + stressDelta),
    happiness: clamp((state.happiness ?? 70) + happinessDelta),
    confidence: clamp((state.confidence ?? 70) + confidenceDelta),
    calmness: clamp((state.calmness ?? 70) + calmnessDelta),
    anger: clamp((state.anger ?? 10) + angerDelta),
    reactionMode,
    relationship: {
      ...relationship,
      lastInteractionAt: interactionAt,
      interactionCount: nextInteractionCount,
      familiarityDays,
      warmth: warmthAfter,
      trust: trustAfter,
      positiveEvents: positiveEventsAfter,
      negativeEvents: negativeEventsAfter,
      conflictScore: conflictAfter,
      hurtScore: hurtAfter,
      repairProgress: repairAfter,
      repeatedNegativeCount: repeatCount,
      conversationState,
      repairAttempts,
      ...(disengagedAt ? { disengagedAt } : {}),
      ...(disengageReason ? { disengageReason } : {}),
      ...(lastConflictAt ? { lastConflictAt } : {}),
      ...(lastNegativePattern ? { lastNegativePattern } : {}),
      ...(lastNegativePatternAt ? { lastNegativePatternAt } : {}),
    },
    lastStatus,
    lastEvent: {
      eventTitle: repeatedProblem
        ? `KDM: tekrarlanan ${pattern}`
        : apology
          ? "KDM: özür/telafi"
          : `KDM: ${intent}`,
      reactionText: `Kişilik etkisi x${personalityImpact.toFixed(2)}; affetme x${forgivenessFactor.toFixed(2)}; güven %${trustAfter}; çatışma %${conflictAfter}; kırgınlık %${hurtAfter}; ilişki=${conversationState}; reaction=${reactionMode}.`,
      deltas: [
        { label: "Stres", key: "stress", value: stressDelta },
        { label: "Mutluluk", key: "happiness", value: happinessDelta },
        { label: "Sakinlik", key: "calmness", value: calmnessDelta },
        { label: "Öfke", key: "anger", value: angerDelta },
      ],
    },
  };

  const relationshipBehaviorProfile = applyRelationshipContext(baseBehaviorProfile, nextDynamicState);
  const finalBehaviorProfile = applyIntegratedBehaviorPolicy(relationshipBehaviorProfile, behaviorPolicy);
  const targetNote = rawKind === "negative" ? ` Negatif hedef=${negativeTarget}.` : "";
  const trace: ReasoningTrace = {
    whoSent: {
      userName: "Kullanıcı",
      isNewUser: interactionCount === 0,
      recognitionText: interactionCount === 0 ? "İlk etkileşim." : `${interactionCount} etkileşimlik tanışıklık.`,
    },
    relationship: {
      warmthScore: warmthAfter,
      warmthLabel: warmthAfter >= 70 ? "Sıcak" : warmthAfter >= 40 ? "Dengeli" : "Mesafeli",
      note: `${familiarityDays} gün; güven %${trustAfter}; çatışma %${conflictAfter}; kırgınlık %${hurtAfter}; ilişki=${conversationState}; kişilik etkisi x${personalityImpact.toFixed(2)}.${targetNote}`,
      familiarityDays,
      interactionCount: nextInteractionCount,
      toleranceMultiplier,
      trustScore: trustAfter,
      conflictScore: conflictAfter,
      hurtScore: hurtAfter,
      repairProgress: repairAfter,
      repeatedNegativeCount: repeatCount,
      conversationState,
      repairAttempts,
    },
    currentMood: {
      moodText: lastStatus,
      reactionMode,
      reasonText: conversationState === "disengaged"
        ? "İlişki hard-stop sonrasında disengaged durumda; nötr mesaj veya yakınlaşma bu durumu tek turda silemez."
        : conversationState === "repairing"
          ? "İlişki kontrollü onarım aşamasında; zaman ve tekrarlı samimi telafi gerekiyor."
          : repeatedProblem
            ? `Aynı olumsuz davranış (${pattern}) tekrarlandı; sabır, hassasiyet, öfke ve sadakat tepki ağırlığını belirledi.`
            : apology
              ? `Özür; empati ve sabır kaynaklı x${forgivenessFactor.toFixed(2)} affetme katsayısıyla değerlendirildi.`
              : unresolvedHurt
                ? `Çözülmemiş kırgınlık mevcut; nötr mesajlar bu duyguyu otomatik olarak silmiyor.${targetNote}`
                : `Mesaj ve ilişki geçmişi Kaira'nın kişilik özellikleriyle birlikte değerlendirildi.${targetNote}`,
    },
    messageInterpretation: {
      intent: apology ? "özür_ve_telafi" : repeatedProblem ? "tekrarlanan_olumsuz_davranış" : intent,
      sentiment,
      explanation: `Ortak SemanticEvent kullanıldı: intent=${semanticEvent.intent}, hedef=${semanticEvent.target}, severity=${semanticEvent.severity.toFixed(2)}.${targetNote} KDM kişilik×ilişki katmanı aktif: sabır ${patience}, hassasiyet ${sensitivity}, öfke ${angerTrait}, empati ${empathy}, sadakat ${loyalty}.`,
    },
    decision: {
      chosenTone: finalBehaviorProfile.tone,
      explanation: behaviorPolicy && integratedPriority >= 60
        ? `Açık ${behaviorPolicy.schemaVersion} girdisi KDM profilinde değerlendirildi; kaynak=${behaviorPolicy.source}, öncelik=${integratedDecision?.priority ?? "expression"}, duruş=${integratedDecision?.stance ?? "neutral"}, ton=${finalBehaviorProfile.tone}.`
        : repeatedProblem
          ? "Tekrar etkisi ve kişilik hassasiyeti birlikte uygulanarak tolerans düşürüldü."
          : unresolvedHurt
            ? `Çözülmemiş kırgınlık nedeniyle ${finalBehaviorProfile.tone} tonuna geçildi; playful ton bastırıldı.`
            : `${finalBehaviorProfile.decisionSpeed} karar stili uygulandı.`,
    },
    memoryUpdate: {
      warmthBefore,
      warmthAfter,
      warmthDelta,
      moodChange: lastStatus,
      reason: apology
        ? `Affetme katsayısı x${forgivenessFactor.toFixed(2)} ile telafi işlendi; ilişki durumu=${conversationState}.`
        : rawKind === "negative" && !targetsKaira
          ? `Negatif ifade ${negativeTarget} hedefli olduğu için Kaira-kullanıcı ilişkisine hasar yazılmadı.`
          : kind === "negative"
            ? `Olumsuz SemanticEvent kişilik etkisi x${personalityImpact.toFixed(2)} ve tekrar etkisi x${repeatEscalation.toFixed(2)} ile işlendi; ilişki durumu=${conversationState}.`
            : `KDM ${intent}/${sentiment} etkileşimini ortak SemanticEvent, kişilik, homeostaz ve ilişki geçmişine dönüştürdü; ilişki durumu=${conversationState}.`,
    },
  };

  return { trace, behaviorProfile: finalBehaviorProfile, nextDynamicState };
}

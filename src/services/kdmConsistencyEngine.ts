import {
  DroitDynamicState,
  DroitPersonalityTraits,
  ReasoningTrace,
} from "../types/nexus";
import {
  computeBehaviorProfile,
  BehaviorLayerProfile,
} from "./droitBehaviorEngine";
import { normalizeDroitPersonality } from "./droitPersonalityNormalizer";
import { interpretSemanticEvent, type SemanticEvent } from "./semanticEventEngine";
import type { BehaviorPolicyInput } from "./behaviorPolicyInput";
import { analyzeKdmInteractionCanonical } from "./kdmRelationshipReducerBridge";

export interface KdmAnalysisResult {
  trace: ReasoningTrace;
  behaviorProfile: BehaviorLayerProfile;
  nextDynamicState: DroitDynamicState;
}

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

export function applyIntegratedBehaviorPolicy(
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

export function semanticIntentToKdm(event: SemanticEvent): string {
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

function hasActionableNegativeEvidence(event: SemanticEvent): boolean {
  return Boolean(
    event.redLine ||
    event.insult ||
    event.coercion > 0 ||
    event.manipulation > 0 ||
    event.privacyViolation > 0 ||
    event.intent === "rejection" ||
    event.severity >= 0.1
  );
}

export function semanticSentimentToKdm(event: SemanticEvent): string {
  if (event.emotionalLoad > 0) return "duygusal_yük";
  if (event.valence === "negative" && hasActionableNegativeEvidence(event)) return "negatif";
  if (event.valence === "positive") return "pozitif";
  return "nötr";
}

export function semanticPattern(event: SemanticEvent): string | null {
  if (event.redLine) return "agir_hakaret";
  if (event.insult) return "hakaret";
  if (event.coercion > 0) return "zorlama";
  if (event.manipulation > 0) return "manipulasyon";
  if (event.privacyViolation > 0) return "mahremiyet_ihlali";
  if (event.intent === "rejection") return "kovma_ve_reddetme";
  if (event.frustration > 0) return "agresif_dil";
  return null;
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

/**
 * ADR-0006 PR5: RelationshipReducer is now the only relationship/state authority.
 * The temporary rollout switch and legacy decision body were removed after promotion.
 * Rollback is repository-level `git revert`.
 */
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

  return analyzeKdmInteractionCanonical({
    state,
    semanticEvent,
    normalizedPersonality,
    baseBehaviorProfile,
    behaviorPolicy: behaviorPolicy ?? null,
    applyIntegrated: applyIntegratedBehaviorPolicy,
    semanticPattern,
    semanticIntentToKdm,
    semanticSentimentToKdm,
  });
}
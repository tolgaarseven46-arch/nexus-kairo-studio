/**
 * ADR-0006 wiring: canonical RelationshipReducer bridge.
 *
 * C1b authority rule: RelationshipReducer consumes the ingestion-time
 * SemanticInterpretation@2 directly. The compatibility/appraisal event may
 * contribute deterministic entity/world grounding such as relationshipScope,
 * but nothing in this bridge reparses raw text.
 */
import type { AffectiveReactionMode, DroitDynamicState, DroitPersonalityTraits, ReasoningTrace, RelationshipState } from "../types/nexus";
import type { SemanticInterpretation } from "../types/semanticInterpretation";
import type { BehaviorLayerProfile } from "./droitBehaviorEngine";
import type { BehaviorPolicyInput } from "./behaviorPolicyInput";
import type { SemanticEvent } from "./semanticEventEngine";
import type { SemanticRelationshipScope } from "./languageUnderstandingService";
import { applyRelationshipContext } from "./relationshipBehaviorService";
import { reduceRelationshipTurn, type RelationshipReducerResult, type RelationshipReducerPrev, type RelationshipTurnSignal } from "./relationshipReducer";
import { DEFAULT_RELATIONSHIP_REDUCER_CONFIG } from "./relationshipReducerConfig";
import { isRelationshipNeutralTurn, relationshipSeverityForInterpretation } from "./kairaQuestionOnlyStopRelationshipPolicy";

type GroundedSemanticEvent = SemanticEvent & { relationshipScope?: SemanticRelationshipScope };

export interface KdmCanonicalInput {
  state: DroitDynamicState;
  semanticInterpretation: SemanticInterpretation;
  semanticEvent: GroundedSemanticEvent;
  normalizedPersonality: DroitPersonalityTraits;
  baseBehaviorProfile: BehaviorLayerProfile;
  behaviorPolicy: BehaviorPolicyInput | null;
  applyIntegrated: (profile: BehaviorLayerProfile, behaviorPolicy?: BehaviorPolicyInput | null) => BehaviorLayerProfile;
  semanticIntentToKdm: (event: SemanticEvent) => string;
  semanticSentimentToKdm: (event: SemanticEvent) => string;
}
export interface KdmCanonicalResult { trace: ReasoningTrace; behaviorProfile: BehaviorLayerProfile; nextDynamicState: DroitDynamicState; }

const clamp100 = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
function minutesBetween(fromIso: string | undefined, toIso: string) {
  if (!fromIso) return 0;
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 0;
  return Math.max(0, (to - from) / 60000);
}

/** Stable repeat label derived only from canonical v2 fields. No raw-text parse. */
export function semanticNegativePattern(interp: SemanticInterpretation): string | null {
  const explicitInsultOrMockery =
    interp.primaryIntent === "insult" ||
    interp.secondarySocialActs.includes("insult") ||
    interp.secondarySocialActs.includes("mockery");
  if (interp.primaryIntent === "complaint" && !explicitInsultOrMockery) return null;
  const maxSeverity = Math.max(
    interp.severity.disrespect,
    interp.severity.coercion,
    interp.severity.aggression,
    interp.severity.manipulation,
    interp.severity.privacy,
  );
  if (interp.severity.privacy >= 0.15 || interp.secondarySocialActs.includes("privacy_violation")) return "mahremiyet_ihlali";
  if (interp.severity.manipulation >= 0.15 || interp.secondarySocialActs.includes("manipulation")) return "manipulasyon";
  if (interp.severity.coercion >= 0.15 || interp.secondarySocialActs.includes("coercion")) return "zorlama";
  if (
    interp.primaryIntent === "insult" ||
    interp.secondarySocialActs.includes("insult") ||
    interp.secondarySocialActs.includes("mockery") ||
    interp.severity.disrespect >= 0.15
  ) return maxSeverity >= 0.75 ? "agir_hakaret" : "hakaret";
  if (interp.primaryIntent === "rejection") return "kovma_ve_reddetme";
  if (interp.severity.aggression >= 0.2) return "agresif_dil";
  return null;
}

function buildTurnSignal(
  interp: SemanticInterpretation,
  event: GroundedSemanticEvent,
  negativePattern: string | null,
): RelationshipTurnSignal {
  const thirdParty = event.relationshipScope === "third_party";
  const questionOnlyStopAddressesInterlocutor =
    interp.discourseFacets.stopQuestions === true &&
    interp.discourseFacets.stopTalking === false &&
    interp.stopRequest === false;
  const dyadic =
    !thirdParty &&
    event.relationshipScope !== "event" &&
    (interp.target === "kaira" || questionOnlyStopAddressesInterlocutor);
  return {
    valence: thirdParty ? "neutral" : interp.valence,
    targetsKaira: dyadic,
    severity: relationshipSeverityForInterpretation(interp),
    jokingConfidence: interp.jokingConfidence,
    sincerityConfidence: interp.sincerityConfidence,
    apology: thirdParty ? false : interp.apology,
    repairAttempt: thirdParty ? false : interp.repairAttempt,
    support: thirdParty ? 0 : interp.support,
    compliment: thirdParty ? 0 : interp.compliment,
    affection: thirdParty ? 0 : interp.affection,
    userStop: thirdParty ? false : interp.stopRequest,
    uncertainty: interp.uncertainty.overall,
    negativePattern: thirdParty ? null : negativePattern,
  };
}

function statusLabel(state: RelationshipReducerResult) {
  if (state.hard.disengage || state.conversationState === "disengaged") return "Konuşmadan çekildi";
  if (state.conversationState === "repairing") return "Mesafeli, onarımı değerlendiriyor";
  if (state.conversationState === "distancing") return "Mesafe koyuyor";
  switch (state.reactionMode) {
    case "hurt": return "Kırgın ve temkinli";
    case "irritated": return "Rahatsız ve mesafeli";
    case "withdrawn": return "İçine çekilmiş";
    case "repairing": return "Yumuşuyor ama temkinli";
    default: return state.axes.warmth >= 0.55 ? "Sıcak ve dikkatli" : "Sakin ve kontrollü";
  }
}

export function analyzeKdmInteractionCanonical(input: KdmCanonicalInput): KdmCanonicalResult {
  const { state, semanticInterpretation, semanticEvent, baseBehaviorProfile, behaviorPolicy, applyIntegrated } = input;
  const nowIso = new Date().toISOString();
  const prevRel: RelationshipState = state.relationship ?? {};
  const rawNegativePattern = isRelationshipNeutralTurn(semanticInterpretation) ? null : semanticNegativePattern(semanticInterpretation);
  const negativePattern = semanticEvent.relationshipScope === "third_party" ? null : rawNegativePattern;
  const samePattern = !!negativePattern && prevRel.lastNegativePattern === negativePattern;
  const repeatedProblem = samePattern && (prevRel.repeatedNegativeCount ?? 0) >= 1;
  const kdmIntent = semanticInterpretation.apology
    ? "özür_ve_telafi"
    : repeatedProblem
      ? "tekrarlanan_olumsuz_davranış"
      : input.semanticIntentToKdm(semanticEvent);
  const kdmSentiment = input.semanticSentimentToKdm(semanticEvent);
  const signal = buildTurnSignal(semanticInterpretation, semanticEvent, negativePattern);
  const elapsedMinutesSincePrev = minutesBetween(prevRel.lastInteractionAt, nowIso);

  const prev: RelationshipReducerPrev = {
    scores: {
      warmth: prevRel.warmth ?? prevRel.warmthScore ?? 50,
      trust: prevRel.trust ?? prevRel.trustScore ?? 50,
      conflict: prevRel.conflictScore ?? 0,
      hurt: prevRel.hurtScore ?? 0,
      repairProgress: prevRel.repairProgress ?? 0,
      positiveEvents: prevRel.positiveEvents ?? 0,
      negativeEvents: prevRel.negativeEvents ?? 0,
      repeatedNegativeCount: prevRel.repeatedNegativeCount ?? 0,
    },
    conversationState: prevRel.conversationState ?? "active",
    reactionMode: state.reactionMode ?? "neutral",
    affect: { anger: state.anger ?? 10, stress: state.stress ?? 20, happiness: state.happiness ?? 70, calmness: state.calmness ?? 70 },
    firstSeenAt: prevRel.firstSeenAt,
    lastInteractionAt: prevRel.lastInteractionAt,
    lastConflictAt: prevRel.lastConflictAt,
    lastNegativePattern: prevRel.lastNegativePattern,
    disengagedAt: prevRel.disengagedAt,
    disengageReason: prevRel.disengageReason,
    repairAttempts: prevRel.repairAttempts ?? 0,
    interactionCount: prevRel.interactionCount ?? 0,
    boundarySetByKaira: Boolean(prevRel.disengageReason) || Boolean(prevRel.lastNegativePattern),
  };

  const result = reduceRelationshipTurn({ prev, signal, timing: { elapsedMinutesSincePrev, nowIso }, config: DEFAULT_RELATIONSHIP_REDUCER_CONFIG });
  const prevInjury = Math.max(prev.scores.hurt ?? 0, prev.scores.conflict ?? 0);
  const nextInjury = Math.max(result.scores.hurt, result.scores.conflict);
  const projectedReactionMode: AffectiveReactionMode =
    result.reactionMode === "neutral" &&
    nextInjury >= 4 &&
    prevInjury > nextInjury &&
    (prev.reactionMode === "hurt" || prev.reactionMode === "irritated") &&
    result.recovery.strength < 0.3
      ? prev.reactionMode
      : result.reactionMode;
  const projectedResult: RelationshipReducerResult = projectedReactionMode === result.reactionMode
    ? result
    : { ...result, reactionMode: projectedReactionMode, rationale: [...result.rationale, "residual-reaction-persistence"] };

  const warmthBefore = clamp100(prev.scores.warmth ?? 50);
  const familiarityDaysLegacy = Math.max(
    prevRel.familiarityDays ?? 0,
    Number.isFinite(new Date(prevRel.firstSeenAt ?? nowIso).getTime())
      ? Math.floor((new Date(nowIso).getTime() - new Date(prevRel.firstSeenAt ?? nowIso).getTime()) / 86_400_000)
      : 0,
  );
  const nextRelationship: RelationshipState = {
    ...prevRel,
    firstSeenAt: prevRel.firstSeenAt ?? nowIso,
    lastInteractionAt: nowIso,
    interactionCount: projectedResult.interactionCount,
    familiarityDays: familiarityDaysLegacy,
    warmth: projectedResult.scores.warmth,
    trust: projectedResult.scores.trust,
    positiveEvents: projectedResult.scores.positiveEvents,
    negativeEvents: projectedResult.scores.negativeEvents,
    conflictScore: projectedResult.scores.conflict,
    hurtScore: projectedResult.scores.hurt,
    repairProgress: projectedResult.scores.repairProgress,
    repeatedNegativeCount: projectedResult.scores.repeatedNegativeCount,
    conversationState: projectedResult.conversationState,
    repairAttempts: projectedResult.repairAttempts,
    ...(projectedResult.lastConflictAt ? { lastConflictAt: projectedResult.lastConflictAt } : {}),
    ...(projectedResult.lastNegativePattern ? { lastNegativePattern: projectedResult.lastNegativePattern } : {}),
    ...(projectedResult.disengagedAt ? { disengagedAt: projectedResult.disengagedAt } : { disengagedAt: undefined }),
    ...(projectedResult.disengageReason ? { disengageReason: projectedResult.disengageReason } : { disengageReason: undefined }),
  };
  const reactionMode: AffectiveReactionMode = projectedResult.reactionMode;
  const lastStatus = statusLabel(projectedResult);
  const deltas = [
    { label: "Stres", key: "stress", value: projectedResult.affectDelta.stress },
    { label: "Mutluluk", key: "happiness", value: projectedResult.affectDelta.happiness },
    { label: "Sakinlik", key: "calmness", value: projectedResult.affectDelta.calmness },
    { label: "Öfke", key: "anger", value: projectedResult.affectDelta.anger },
  ];
  const nextDynamicState: DroitDynamicState = {
    ...state,
    stress: clamp100((state.stress ?? 20) + projectedResult.affectDelta.stress),
    happiness: clamp100((state.happiness ?? 70) + projectedResult.affectDelta.happiness),
    calmness: clamp100((state.calmness ?? 70) + projectedResult.affectDelta.calmness),
    anger: clamp100((state.anger ?? 10) + projectedResult.affectDelta.anger),
    confidence: state.confidence ?? 70,
    surprise: state.surprise ?? 10,
    reactionMode,
    relationship: nextRelationship,
    lastStatus,
    lastEvent: {
      eventTitle: `KDM(v2): ${projectedResult.conversationState}/${reactionMode}${projectedResult.hard.disengage ? " [hard]" : ""}`,
      reactionText: `reducer: ${projectedResult.rationale.join("; ")}; axes open=${projectedResult.axes.openness} warm=${projectedResult.axes.warmth} guard=${projectedResult.axes.guardedness}`,
      deltas,
    },
  };
  const relationshipBehaviorProfile = applyRelationshipContext(baseBehaviorProfile, nextDynamicState);
  const finalBehaviorProfile = applyIntegrated(relationshipBehaviorProfile, behaviorPolicy);
  const warmthLabel = projectedResult.scores.warmth >= 70 ? "Sıcak" : projectedResult.scores.warmth >= 40 ? "Dengeli" : "Mesafeli";
  const presentSeverity = Math.max(
    signal.severity.disrespect,
    signal.severity.coercion,
    signal.severity.aggression,
    signal.severity.manipulation,
    signal.severity.privacy,
  );
  const trace: ReasoningTrace = {
    whoSent: {
      userName: "Kullanıcı",
      isNewUser: (prevRel.interactionCount ?? 0) === 0,
      recognitionText: (prevRel.interactionCount ?? 0) === 0 ? "İlk etkileşim." : `${prevRel.interactionCount} etkileşimlik tanışıklık.`,
    },
    relationship: {
      warmthScore: projectedResult.scores.warmth,
      warmthLabel,
      note: `familiarity=${projectedResult.scores.familiarity}; güven %${projectedResult.scores.trust}; çatışma %${projectedResult.scores.conflict}; kırgınlık %${projectedResult.scores.hurt}; onarım %${projectedResult.scores.repairProgress}; ilişki=${projectedResult.conversationState}; hard=${projectedResult.hard.disengage ? projectedResult.hard.reason : "no"}.`,
      familiarityDays: familiarityDaysLegacy,
      interactionCount: projectedResult.interactionCount,
      trustScore: projectedResult.scores.trust,
      conflictScore: projectedResult.scores.conflict,
      hurtScore: projectedResult.scores.hurt,
      repairProgress: projectedResult.scores.repairProgress,
      repeatedNegativeCount: projectedResult.scores.repeatedNegativeCount,
      conversationState: projectedResult.conversationState,
      repairAttempts: projectedResult.repairAttempts,
    },
    currentMood: {
      moodText: lastStatus,
      reactionMode,
      reasonText: projectedResult.hard.disengage
        ? `Birleşik sınır ihlali (${projectedResult.hard.reason}); nötr mesaj veya yakınlaşma bu durumu tek turda silemez.`
        : `Canonical reducer: ${projectedResult.rationale.join("; ")}.`,
    },
    messageInterpretation: {
      intent: kdmIntent,
      sentiment: kdmSentiment,
      explanation: `Canonical SemanticInterpretation@2: primary=${semanticInterpretation.primaryIntent}, hedef=${semanticInterpretation.target}, scope=${semanticEvent.relationshipScope ?? "unknown"}, present-severity=${presentSeverity.toFixed(2)}, joking=${signal.jokingConfidence.toFixed(2)}, uncertainty=${signal.uncertainty.toFixed(2)}.`,
    },
    decision: {
      chosenTone: finalBehaviorProfile.tone,
      explanation: `Canonical KairaResponsePlan öncesi katman: reducer axes open=${projectedResult.axes.openness}/warm=${projectedResult.axes.warmth}/guard=${projectedResult.axes.guardedness}; ton=${finalBehaviorProfile.tone}.`,
    },
    memoryUpdate: {
      warmthBefore,
      warmthAfter: projectedResult.scores.warmth,
      warmthDelta: projectedResult.scores.warmth - warmthBefore,
      moodChange: lastStatus,
      reason: `Canonical reducer ${projectedResult.conversationState}/${reactionMode}; recovery strength=${projectedResult.recovery.strength} [${projectedResult.recovery.rationale.join("+")}].`,
    },
  };
  return { trace, behaviorProfile: finalBehaviorProfile, nextDynamicState };
}

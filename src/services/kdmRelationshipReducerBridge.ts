/**
 * ADR-0006 wiring: the canonical RelationshipReducer as the authoritative
 * relationship engine behind the RELATIONSHIP_REDUCER_V2 flag.
 *
 * `analyzeKdmInteraction` early-returns into `analyzeKdmInteractionCanonical`
 * when the flag is on. This produces the SAME KdmAnalysisResult shape as the
 * legacy path: scores / conversationState / reactionMode / affect come from the
 * reducer, and behaviorProfile + trace are derived from that state through the
 * unchanged applyRelationshipContext / applyIntegratedBehaviorPolicy path.
 *
 * Flag OFF -> this file is never entered; legacy behavior is byte-identical.
 */

import type {
  AffectiveReactionMode,
  DroitDynamicState,
  DroitPersonalityTraits,
  ReasoningTrace,
  RelationshipState,
} from "../types/nexus";
import type { BehaviorLayerProfile } from "./droitBehaviorEngine";
import type { BehaviorPolicyInput } from "./behaviorPolicyInput";
import type { SemanticEvent } from "./semanticEventEngine";
import { applyRelationshipContext } from "./relationshipBehaviorService";
import { interpretationFromLegacyEvent } from "./semanticInterpretationLegacyProjection";
import {
  reduceRelationshipTurn,
  type RelationshipReducerResult,
  type RelationshipReducerPrev,
  type RelationshipTurnSignal,
} from "./relationshipReducer";
import { DEFAULT_RELATIONSHIP_REDUCER_CONFIG } from "./relationshipReducerConfig";

export interface KdmCanonicalInput {
  state: DroitDynamicState;
  semanticEvent: SemanticEvent;
  normalizedPersonality: DroitPersonalityTraits;
  baseBehaviorProfile: BehaviorLayerProfile;
  behaviorPolicy: BehaviorPolicyInput | null;
  applyIntegrated: (
    profile: BehaviorLayerProfile,
    behaviorPolicy?: BehaviorPolicyInput | null,
  ) => BehaviorLayerProfile;
  semanticPattern: (event: SemanticEvent) => string | null;
}

export interface KdmCanonicalResult {
  trace: ReasoningTrace;
  behaviorProfile: BehaviorLayerProfile;
  nextDynamicState: DroitDynamicState;
}

const clamp100 = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

function minutesBetween(fromIso: string | undefined, toIso: string): number {
  if (!fromIso) return 0;
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 0;
  return Math.max(0, (to - from) / 60000);
}

/** Distil the legacy SemanticEvent (via the canonical interpretation shim) into
 *  the reducer's turn signal. */
function buildTurnSignal(
  event: SemanticEvent,
  negativePattern: string | null,
): RelationshipTurnSignal {
  const interp = interpretationFromLegacyEvent(event);
  const targetsKaira = interp.target === "kaira";
  return {
    valence: interp.valence,
    targetsKaira,
    severity: interp.severity,
    jokingConfidence: interp.jokingConfidence,
    sincerityConfidence: interp.sincerityConfidence,
    apology: interp.apology,
    repairAttempt: interp.repairAttempt,
    support: interp.support,
    compliment: interp.compliment,
    affection: interp.affection,
    // Only a genuine "end the conversation" intent — not the noun "konuşma"
    // (STOP_TALKING_RE in the regex engine also matches "bu konuşma güzeldi").
    userStop:
      interp.stopRequest &&
      /(^|\s)(sus|kes\s+(?:artık|şunu)|yeter\s+(?:artık|konuş)|konuşmak\s+istemiyorum|görüşmek\s+istemiyorum|bitir\s+(?:bu|şu)|bırak\s+beni)(\s|$)/iu.test(
        event.raw,
      ),
    uncertainty: interp.uncertainty.overall,
    negativePattern,
  };
}

function statusLabel(state: RelationshipReducerResult): string {
  if (state.hard.disengage || state.conversationState === "disengaged") return "Konuşmadan çekildi";
  if (state.conversationState === "repairing") return "Mesafeli, onarımı değerlendiriyor";
  if (state.conversationState === "distancing") return "Mesafe koyuyor";
  switch (state.reactionMode) {
    case "hurt":
      return "Kırgın ve temkinli";
    case "irritated":
      return "Rahatsız ve mesafeli";
    case "withdrawn":
      return "İçine çekilmiş";
    case "repairing":
      return "Yumuşuyor ama temkinli";
    default:
      return state.axes.warmth >= 0.55 ? "Sıcak ve dikkatli" : "Sakin ve kontrollü";
  }
}

export function analyzeKdmInteractionCanonical(input: KdmCanonicalInput): KdmCanonicalResult {
  const { state, semanticEvent, baseBehaviorProfile, behaviorPolicy, applyIntegrated } = input;
  const nowIso = new Date().toISOString();
  const prevRel: RelationshipState = state.relationship ?? {};
  const negativePattern = input.semanticPattern(semanticEvent);

  const signal = buildTurnSignal(semanticEvent, negativePattern);
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
    affect: {
      anger: state.anger ?? 10,
      stress: state.stress ?? 20,
      happiness: state.happiness ?? 70,
      calmness: state.calmness ?? 70,
    },
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

  const result = reduceRelationshipTurn({
    prev,
    signal,
    timing: { elapsedMinutesSincePrev, nowIso },
    config: DEFAULT_RELATIONSHIP_REDUCER_CONFIG,
  });

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
    interactionCount: result.interactionCount,
    familiarityDays: familiarityDaysLegacy,
    warmth: result.scores.warmth,
    trust: result.scores.trust,
    positiveEvents: result.scores.positiveEvents,
    negativeEvents: result.scores.negativeEvents,
    conflictScore: result.scores.conflict,
    hurtScore: result.scores.hurt,
    repairProgress: result.scores.repairProgress,
    repeatedNegativeCount: result.scores.repeatedNegativeCount,
    conversationState: result.conversationState,
    repairAttempts: result.repairAttempts,
    ...(result.lastConflictAt ? { lastConflictAt: result.lastConflictAt } : {}),
    ...(result.lastNegativePattern ? { lastNegativePattern: result.lastNegativePattern } : {}),
    ...(result.disengagedAt ? { disengagedAt: result.disengagedAt } : { disengagedAt: undefined }),
    ...(result.disengageReason ? { disengageReason: result.disengageReason } : { disengageReason: undefined }),
  };

  const reactionMode: AffectiveReactionMode = result.reactionMode;
  const lastStatus = statusLabel(result);

  const deltas = [
    { label: "Stres", key: "stress", value: result.affectDelta.stress },
    { label: "Mutluluk", key: "happiness", value: result.affectDelta.happiness },
    { label: "Sakinlik", key: "calmness", value: result.affectDelta.calmness },
    { label: "Öfke", key: "anger", value: result.affectDelta.anger },
  ];

  const nextDynamicState: DroitDynamicState = {
    ...state,
    stress: clamp100((state.stress ?? 20) + result.affectDelta.stress),
    happiness: clamp100((state.happiness ?? 70) + result.affectDelta.happiness),
    calmness: clamp100((state.calmness ?? 70) + result.affectDelta.calmness),
    anger: clamp100((state.anger ?? 10) + result.affectDelta.anger),
    confidence: state.confidence ?? 70,
    surprise: state.surprise ?? 10,
    reactionMode,
    relationship: nextRelationship,
    lastStatus,
    lastEvent: {
      eventTitle: `KDM(v2): ${result.conversationState}/${reactionMode}${result.hard.disengage ? " [hard]" : ""}`,
      reactionText: `reducer: ${result.rationale.join("; ")}; axes open=${result.axes.openness} warm=${result.axes.warmth} guard=${result.axes.guardedness}`,
      deltas,
    },
  };

  const relationshipBehaviorProfile = applyRelationshipContext(baseBehaviorProfile, nextDynamicState);
  const finalBehaviorProfile = applyIntegrated(relationshipBehaviorProfile, behaviorPolicy);

  const warmthLabel =
    result.scores.warmth >= 70 ? "Sıcak" : result.scores.warmth >= 40 ? "Dengeli" : "Mesafeli";

  const trace: ReasoningTrace = {
    whoSent: {
      userName: "Kullanıcı",
      isNewUser: (prevRel.interactionCount ?? 0) === 0,
      recognitionText:
        (prevRel.interactionCount ?? 0) === 0
          ? "İlk etkileşim."
          : `${prevRel.interactionCount} etkileşimlik tanışıklık.`,
    },
    relationship: {
      warmthScore: result.scores.warmth,
      warmthLabel,
      note: `familiarity=${result.scores.familiarity}; güven %${result.scores.trust}; çatışma %${result.scores.conflict}; kırgınlık %${result.scores.hurt}; onarım %${result.scores.repairProgress}; ilişki=${result.conversationState}; hard=${result.hard.disengage ? result.hard.reason : "no"}.`,
      familiarityDays: familiarityDaysLegacy,
      interactionCount: result.interactionCount,
      trustScore: result.scores.trust,
      conflictScore: result.scores.conflict,
      hurtScore: result.scores.hurt,
      repairProgress: result.scores.repairProgress,
      repeatedNegativeCount: result.scores.repeatedNegativeCount,
      conversationState: result.conversationState,
      repairAttempts: result.repairAttempts,
    },
    currentMood: {
      moodText: lastStatus,
      reactionMode,
      reasonText: result.hard.disengage
        ? `Birleşik sınır ihlali (${result.hard.reason}); mevcut turda gerçek severity ${result.recovery ? "" : ""}mevcut. Nötr mesaj veya yakınlaşma bu durumu tek turda silemez.`
        : `Canonical reducer: ${result.rationale.join("; ")}.`,
    },
    messageInterpretation: {
      intent: input.semanticPattern(semanticEvent) ?? (semanticEvent.intent as string),
      sentiment:
        signal.valence === "negative" ? "negatif" : signal.valence === "positive" ? "pozitif" : "nötr",
      explanation: `Canonical SemanticInterpretation@2: primary=${interpretationFromLegacyEvent(semanticEvent).primaryIntent}, hedef=${interpretationFromLegacyEvent(semanticEvent).target}, present-severity=${Math.max(
        signal.severity.disrespect,
        signal.severity.coercion,
        signal.severity.aggression,
        signal.severity.manipulation,
        signal.severity.privacy,
      ).toFixed(2)}, joking=${signal.jokingConfidence.toFixed(2)}, uncertainty=${signal.uncertainty.toFixed(2)}.`,
    },
    decision: {
      chosenTone: finalBehaviorProfile.tone,
      explanation: `Canonical KairaResponsePlan öncesi katman: reducer axes open=${result.axes.openness}/warm=${result.axes.warmth}/guard=${result.axes.guardedness}; ton=${finalBehaviorProfile.tone}.`,
    },
    memoryUpdate: {
      warmthBefore,
      warmthAfter: result.scores.warmth,
      warmthDelta: result.scores.warmth - warmthBefore,
      moodChange: lastStatus,
      reason: `Canonical reducer ${result.conversationState}/${reactionMode}; recovery strength=${result.recovery.strength} [${result.recovery.rationale.join("+")}].`,
    },
  };

  return { trace, behaviorProfile: finalBehaviorProfile, nextDynamicState };
}

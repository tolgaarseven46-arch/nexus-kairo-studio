/**
 * Canonical RelationshipReducer (ADR-0006).
 *
 * A single pure function that turns (previous relationship state, this turn's
 * distilled semantic signal, timing) into the next relationship state:
 *   - scores (warmth/trust/conflict/hurt/repairProgress/... + continuous familiarity)
 *   - conversationState (small pure FSM)
 *   - reactionMode
 *   - orthogonal projection axes (openness, warmth, guardedness)  [K2]
 *   - affect delta and a rationale trail
 *
 * Design constraints (frozen, ADR-0006):
 *   - severity is a VECTOR; deltas read components, not a collapsed scalar.
 *   - redline / hard-stop is a CONFIG-DRIVEN combined-signal decision; never a
 *     single lexical hit; joking + uncertainty dampen it.
 *   - recovery = elapsed-time + interaction-based, blended; neither alone is a
 *     full reset (capped by maxSingleTurnRecovery).
 *   - injury asymmetry is DERIVED from severity / repetition / history / repair
 *     quality — no fixed "N turns" constant.
 *   - maturity damping has NO conflict/hurt term (that was the amplifier bug).
 *   - withdrawn/hurt affect deltas are CAPS scaled by this-turn signal, not
 *     floors: a neutral turn while withdrawn produces ~0 extra stress.
 *   - K2: conversationState is ONE input to the axes. Outside a hard-stop reason
 *     it does not zero opennessAxis/warmthAxis; uncertainty softens the collapse.
 */

import type { AffectiveReactionMode, ConversationRelationshipState } from "../types/nexus";
import { normalizeKairaAffectBaseline, type KairaAffectBaseline } from "./kairaAffectBaseline";
import {
  DEFAULT_RELATIONSHIP_REDUCER_CONFIG,
  type RelationshipReducerConfig,
} from "./relationshipReducerConfig";
import { severityLoad, type SeverityVector } from "../types/semanticInterpretation";

export interface RelationshipScores {
  warmth: number;
  trust: number;
  conflict: number;
  hurt: number;
  repairProgress: number;
  positiveEvents: number;
  negativeEvents: number;
  repeatedNegativeCount: number;
  familiarity: number;
}

export interface RelationshipAxes {
  openness: number;
  warmth: number;
  guardedness: number;
}

export interface RelationshipAffect {
  anger: number;
  stress: number;
  happiness: number;
  calmness: number;
}

export interface RelationshipReducerPrev {
  scores: Partial<RelationshipScores>;
  conversationState: ConversationRelationshipState;
  reactionMode: AffectiveReactionMode;
  affect: RelationshipAffect;
  firstSeenAt?: string;
  lastInteractionAt?: string;
  lastConflictAt?: string;
  lastNegativePattern?: string;
  disengagedAt?: string;
  disengageReason?: string;
  repairAttempts?: number;
  interactionCount?: number;
  boundarySetByKaira?: boolean;
}

export interface RelationshipTurnSignal {
  valence: "positive" | "negative" | "neutral";
  targetsKaira: boolean;
  severity: SeverityVector;
  jokingConfidence: number;
  sincerityConfidence: number;
  apology: boolean;
  repairAttempt: boolean;
  /** Canonical contextual repair magnitude, 0..1. Reducer must not derive it again. */
  repairStrength: number;
  support: number;
  compliment: number;
  affection: number;
  userStop: boolean;
  uncertainty: number;
  negativePattern?: string | null;
}

export interface RelationshipReducerTiming {
  elapsedMinutesSincePrev: number;
  nowIso: string;
}

export interface RelationshipReducerInput {
  prev: RelationshipReducerPrev;
  signal: RelationshipTurnSignal;
  timing: RelationshipReducerTiming;
  config?: RelationshipReducerConfig;
  affectBaseline?: Partial<KairaAffectBaseline> | null;
}

export interface RelationshipReducerResult {
  scores: RelationshipScores;
  conversationState: ConversationRelationshipState;
  reactionMode: AffectiveReactionMode;
  axes: RelationshipAxes;
  hard: { disengage: boolean; reason: string | null };
  recovery: {
    applied: boolean;
    timeComponent: number;
    interactionComponent: number;
    strength: number;
    rationale: string[];
  };
  affectDelta: RelationshipAffect;
  interactionCount: number;
  lastConflictAt?: string;
  lastNegativePattern?: string;
  disengagedAt?: string;
  disengageReason?: string;
  repairAttempts: number;
  boundarySetByKaira: boolean;
  rationale: string[];
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const clamp100 = (n: number) => Math.max(0, Math.min(100, n));
const round1 = (n: number) => Math.round(n * 10) / 10;

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function elapsedDays(fromIso: string | undefined, nowIso: string): number {
  if (!fromIso) return 0;
  const from = new Date(fromIso).getTime();
  const now = new Date(nowIso).getTime();
  if (!Number.isFinite(from) || !Number.isFinite(now)) return 0;
  return Math.max(0, (now - from) / 86_400_000);
}

export function computeFamiliarity(
  firstSeenAt: string | undefined,
  nowIso: string,
  interactionCount: number,
  config: RelationshipReducerConfig,
): number {
  const f = config.familiarity;
  const ageDays = elapsedDays(firstSeenAt, nowIso);
  const ageTerm = f.ageWeight * (1 - Math.exp(-ageDays / Math.max(0.001, f.ageScaleDays)));
  const countTerm = f.countWeight * (1 - Math.exp(-Math.max(0, interactionCount) / Math.max(0.001, f.countScale)));
  return clamp01(ageTerm + countTerm);
}

interface RedlineEvaluation {
  disengage: boolean;
  score: number;
  contributors: number;
  presentSeverity: number;
  reason: string | null;
}

function presentSeverityOf(s: SeverityVector): number {
  return Math.max(s.disrespect, s.coercion, s.aggression, s.manipulation, s.privacy);
}

export function evaluateRedline(
  signal: RelationshipTurnSignal,
  prev: RelationshipReducerPrev,
  config: RelationshipReducerConfig,
): RedlineEvaluation {
  const s = signal.severity;
  const presentSeverity = presentSeverityOf(s);

  if (signal.userStop) {
    return { disengage: true, score: 1, contributors: 1, presentSeverity, reason: "user_stop" };
  }

  const rl = config.redline;
  const w = rl.weights;
  const floor = rl.signalFloor;

  if (presentSeverity < rl.minPresentSeverity) {
    return { disengage: false, score: 0, contributors: 0, presentSeverity, reason: null };
  }

  const harmContributors: Array<[string, number]> = [
    ["disrespect", w.disrespect * s.disrespect],
    ["coercion", w.coercion * s.coercion],
    ["aggression", w.aggression * s.aggression],
    ["manipulation", w.manipulation * s.manipulation],
    ["privacy", w.privacy * s.privacy],
  ];
  const contributors = harmContributors.filter(([name, v]) =>
    v >= floor && (name !== "aggression" || s.aggression >= rl.minPresentSeverity)
  ).length;
  const base = harmContributors.reduce((acc, [, v]) => acc + v, 0) + (signal.targetsKaira ? w.targetsKaira : 0);

  const repetitionFactor = clamp01(num(prev.scores.repeatedNegativeCount, 0) / 2);
  const amp = 1 + w.repetition * repetitionFactor + (prev.boundarySetByKaira ? w.priorBoundarySet : 0);

  let score = base * amp;
  score *= 1 - rl.jokingDampen * signal.jokingConfidence * (1 - signal.sincerityConfidence);
  score *= 1 - rl.uncertaintyDampen * signal.uncertainty;

  const disengage =
    presentSeverity >= rl.minPresentSeverity &&
    contributors >= rl.minCombinedSignals &&
    score >= rl.hardStopThreshold;

  return { disengage, score, contributors, presentSeverity, reason: disengage ? "combined_boundary_violation" : null };
}

export function computeRecovery(
  signal: RelationshipTurnSignal,
  timing: RelationshipReducerTiming,
  config: RelationshipReducerConfig,
): { time: number; interaction: number; strength: number; rationale: string[] } {
  const r = config.recovery;
  const time = clamp01(1 - Math.exp(-Math.max(0, timing.elapsedMinutesSincePrev) * r.timeDecayPerMin));
  const calmTurn = signal.valence !== "negative" && severityLoad(signal.severity) < 0.15;
  const positiveTurn = signal.valence === "positive" || signal.support > 0.3 || signal.compliment > 0.3;
  const nonRepetition = !signal.negativePattern;

  let interaction = 0;
  const rationale: string[] = [];
  if (signal.apology && signal.repairStrength > 0) {
    interaction += r.apologyStrength * clamp01(signal.repairStrength);
    rationale.push(`apology:${clamp01(signal.repairStrength).toFixed(2)}`);
  }
  if (calmTurn) { interaction += r.calmTurnStrength; rationale.push("calm-turn"); }
  if (positiveTurn) { interaction += r.positiveTurnStrength; rationale.push("positive-turn"); }
  if (nonRepetition) { interaction += r.nonRepetitionStrength; rationale.push("no-repeat"); }
  interaction = clamp01(interaction);

  let strength = clamp01(r.timeWeight * time + r.interactionWeight * interaction);
  strength = Math.min(strength, r.maxSingleTurnRecovery);
  if (time > 0) rationale.push(`elapsed:${round1(timing.elapsedMinutesSincePrev)}m`);
  return { time, interaction, strength, rationale };
}

function towardBaseline(value: number, baseline: number, step: number): number {
  if (value === baseline) return 0;
  return value > baseline ? -Math.min(step, value - baseline) : Math.min(step, baseline - value);
}

export function reduceRelationshipTurn(input: RelationshipReducerInput): RelationshipReducerResult {
  const config = input.config ?? DEFAULT_RELATIONSHIP_REDUCER_CONFIG;
  const affectBaseline = normalizeKairaAffectBaseline(input.affectBaseline);
  const { prev, signal, timing } = input;
  const rationale: string[] = [];

  const interactionCountBefore = Math.max(0, num(prev.interactionCount, num(prev.scores.positiveEvents, 0) + num(prev.scores.negativeEvents, 0)));
  const interactionCount = interactionCountBefore + 1;
  const familiarity = computeFamiliarity(prev.firstSeenAt, timing.nowIso, interactionCount, config);

  const warmthBefore = clamp100(num(prev.scores.warmth, 50));
  const trustBefore = clamp100(num(prev.scores.trust, 50));
  const conflictBefore = clamp100(num(prev.scores.conflict, 0));
  const hurtBefore = clamp100(num(prev.scores.hurt, 0));
  const repairBefore = clamp100(num(prev.scores.repairProgress, 0));
  const positiveEvents = Math.max(0, num(prev.scores.positiveEvents, 0));
  const negativeEvents = Math.max(0, num(prev.scores.negativeEvents, 0));
  const priorRepeated = Math.max(0, num(prev.scores.repeatedNegativeCount, 0));

  const sevLoad = severityLoad(signal.severity);
  const negativeEvidence =
    signal.severity.disrespect >= 0.15 ||
    signal.severity.coercion >= 0.15 ||
    signal.severity.manipulation >= 0.15 ||
    signal.severity.privacy >= 0.15 ||
    signal.severity.aggression >= 0.2;
  const contextualHarmConfidence = clamp01(
    (1 - config.redline.jokingDampen * signal.jokingConfidence * (1 - signal.sincerityConfidence)) *
      (1 - config.redline.uncertaintyDampen * signal.uncertainty),
  );
  const rawPresentSeverity = presentSeverityOf(signal.severity);
  const contextualPresentSeverity = rawPresentSeverity * contextualHarmConfidence;
  const targetedHarm =
    signal.targetsKaira &&
    (signal.valence === "negative" ? rawPresentSeverity >= 0.15 : contextualPresentSeverity >= 0.15);
  rationale.push(`harm-context:${contextualHarmConfidence.toFixed(2)}`);
  const rawNegative = negativeEvidence && (signal.valence === "negative" || targetedHarm);
  const targetsKaira = rawNegative && signal.targetsKaira;
  const kind: "positive" | "negative" | "neutral" =
    rawNegative && !targetsKaira ? "neutral" : rawNegative ? "negative" : signal.valence === "positive" ? "positive" : "neutral";

  const samePattern = Boolean(signal.negativePattern && signal.negativePattern === prev.lastNegativePattern);
  const repeatedNegativeCount = kind === "negative" ? (samePattern ? priorRepeated + 1 : 1) : priorRepeated;

  const redline = evaluateRedline(
    { ...signal, negativePattern: signal.negativePattern ?? prev.lastNegativePattern },
    { ...prev, scores: { ...prev.scores, repeatedNegativeCount } },
    config,
  );
  rationale.push(`redline:${redline.score.toFixed(2)}/${redline.contributors}${redline.disengage ? "*" : ""}`);

  const recovery = computeRecovery({ ...signal, negativePattern: signal.negativePattern ?? null }, timing, config);
  rationale.push(`recovery:${recovery.strength.toFixed(2)} [${recovery.rationale.join("+")}]`);

  const relationshipQuality01 = clamp01(
    (warmthBefore * 0.35 + trustBefore * 0.4 + (100 - conflictBefore) * 0.15 + (100 - hurtBefore) * 0.1) / 100,
  );
  const maturity = clamp01(
    config.maturityDamping.familiarityWeight * familiarity +
      config.maturityDamping.interactionWeight * Math.min(1, interactionCount / Math.max(1, config.maturityDamping.interactionsForMature)),
  );
  const damping = 1 - config.maturityDamping.maxDamping * maturity * relationshipQuality01;
  rationale.push(`damping:${damping.toFixed(2)}`);

  const inj = config.injury;
  const repAmp = Math.min(inj.repetitionCap, 1 + Math.max(0, repeatedNegativeCount - 1) * inj.repetitionAmplify);
  const severityScale = inj.severityFloor + inj.severityWeight * (kind === "negative" ? Math.max(sevLoad, signal.severity.disrespect) : 0);
  const goodHistoryAbsorb = 1 - inj.goodHistoryAbsorb * relationshipQuality01;
  // Durable injury should remain backward-compatible for ordinary low uncertainty,
  // while genuinely ambiguous semantics damp mutation strongly. A cubic curve keeps
  // the normal 0.0-0.2 range effectively unchanged and only bends hard near 1.0.
  const mutationUncertaintyConfidence = clamp01(
    1 - config.redline.uncertaintyDampen * Math.pow(clamp01(signal.uncertainty), 3),
  );
  const injuryScale = repAmp * severityScale * damping * goodHistoryAbsorb * mutationUncertaintyConfidence;

  let conflict = conflictBefore;
  let hurt = hurtBefore;
  let repairProgress = repairBefore;
  let warmth = warmthBefore;
  let trust = trustBefore;
  let lastConflictAt = prev.lastConflictAt;
  let lastNegativePattern = prev.lastNegativePattern;

  const recoveredConflictDrop = recovery.strength * Math.min(conflictBefore, config.recovery.conflictDecayScale);
  const recoveredHurtDrop = recovery.strength * Math.min(hurtBefore, config.recovery.hurtDecayScale);

  if (kind === "negative") {
    conflict = clamp100(conflict + inj.baseConflict * injuryScale);
    hurt = clamp100(hurt + inj.baseHurt * injuryScale);
    repairProgress = clamp100(repairProgress - inj.baseRepairLoss * injuryScale);
    warmth = clamp100(warmth + (signal.severity.disrespect >= 0.7 ? inj.warmthDeltaInsult : inj.warmthDeltaBase) * damping * repAmp);
    trust = clamp100(trust - 4 * injuryScale);
    lastConflictAt = timing.nowIso;
    lastNegativePattern = signal.negativePattern ?? lastNegativePattern;
  } else {
    conflict = clamp100(conflict - recoveredConflictDrop);
    hurt = clamp100(hurt - recoveredHurtDrop);

    const hardBoundaryToRepair =
      (prev.conversationState === "disengaged" || prev.conversationState === "repairing") &&
      Boolean(prev.disengageReason);
    const injuryToRepair = hardBoundaryToRepair || Math.max(conflictBefore, hurtBefore) >= config.recovery.repairInjuryFloor;
    const explicitRepairAct = Boolean((signal.apology || signal.repairAttempt) && signal.repairStrength > 0);
    const repairStrength = explicitRepairAct ? clamp01(signal.repairStrength) : 0;
    if (!injuryToRepair) {
      repairProgress = Math.max(0, repairProgress - config.recovery.repairDecayNoInjury);
      if (explicitRepairAct) trust = clamp100(trust + 1.5 * repairStrength);
      else if (kind === "positive") trust = clamp100(trust + 1);
    } else if (explicitRepairAct) {
      repairProgress = clamp100(repairProgress + config.recovery.repairGainApology * repairStrength);
      trust = clamp100(trust + 1.5 * repairStrength);
    } else if (prev.conversationState === "disengaged") {
      repairProgress = clamp100(repairProgress);
    } else if (kind === "positive") {
      repairProgress = clamp100(repairProgress + config.recovery.repairGainPositive);
      trust = clamp100(trust + 1);
    } else if (severityLoad(signal.severity) < 0.15) {
      repairProgress = clamp100(repairProgress + config.recovery.repairGainCalm);
    }

    if (kind === "positive" || signal.support > 0.3 || signal.compliment > 0.3) {
      warmth = clamp100(
        warmth + inj.warmthDeltaPositive + (signal.support > 0.3 || signal.compliment > 0.3 ? inj.warmthDeltaSupport : 0),
      );
    } else {
      const wh = config.warmthHomeostasis;
      warmth = clamp100(warmth + Math.sign(wh.baseline - warmth) * Math.min(wh.driftPerCalmTurn, Math.abs(wh.baseline - warmth)));
    }
  }

  const positiveEventsAfter = positiveEvents + (kind === "positive" ? 1 : 0);
  const negativeEventsAfter = negativeEvents + (kind === "negative" ? 1 : 0);
  const injury = Math.max(conflict, hurt);

  const cs = config.conversationState;
  let conversationState: ConversationRelationshipState = prev.conversationState;
  let disengagedAt = prev.disengagedAt;
  let disengageReason = prev.disengageReason;
  let repairAttempts = Math.max(0, num(prev.repairAttempts, 0));
  const repairSignal = (signal.apology || signal.repairAttempt) && signal.repairStrength > 0;

  if (redline.disengage) {
    conversationState = "disengaged";
    disengagedAt = timing.nowIso;
    disengageReason = redline.reason;
    repairAttempts = 0;
    repairProgress = 0;
  } else if (prev.conversationState === "disengaged") {
    if (repairSignal) repairAttempts += 1;
    const enough =
      (repairSignal && repairAttempts >= 1 && repairProgress >= cs.repairingRepairProgress) ||
      repairProgress >= cs.repairingRepairProgress + 10;
    conversationState = enough ? "repairing" : "disengaged";
  } else if (prev.conversationState === "repairing") {
    if (kind === "negative") {
      conversationState = "disengaged";
      disengagedAt = timing.nowIso;
      disengageReason = signal.negativePattern ?? "new_negative_event";
      repairAttempts = 0;
      repairProgress = 0;
    } else {
      if (repairSignal) repairAttempts += 1;
      const reactivate = repairProgress >= cs.activeFromRepairingRepairProgress && injury < cs.activeFromRepairingInjury;
      conversationState = reactivate ? "active" : "repairing";
    }
  } else if (kind === "negative" && targetsKaira) {
    conversationState = conflict >= cs.distancingConflict || hurt >= cs.distancingHurt ? "distancing" : conversationState;
  } else if (prev.conversationState === "distancing" && conflict < cs.activeFromDistancingConflict && hurt < cs.activeFromDistancingHurt) {
    conversationState = "active";
  }

  if (conversationState === "active") {
    disengagedAt = undefined;
    disengageReason = undefined;
    repairAttempts = 0;
  }

  let reactionMode: AffectiveReactionMode = "neutral";
  if (redline.disengage || conversationState === "disengaged") {
    reactionMode = "withdrawn";
  } else if (conversationState === "repairing" || (repairSignal && injury >= 8)) {
    reactionMode = "repairing";
  } else if (kind === "negative" && targetsKaira) {
    const attachment = clamp01((warmth * 0.5 + trust * 0.5) / 100);
    reactionMode =
      injury >= 30 || conversationState === "distancing"
        ? "withdrawn"
        : attachment >= 0.55 && maturity >= 0.3
          ? "hurt"
          : "irritated";
  } else if (injury >= 20 && (prev.reactionMode === "hurt" || prev.reactionMode === "irritated") && recovery.strength < 0.3) {
    reactionMode = prev.reactionMode;
    rationale.push("residual-reaction-persistence");
  } else if (injury >= 24) {
    reactionMode = "hurt";
  }

  const af = config.affect;
  const step = af.towardBaselineStep;
  const affectDelta: RelationshipAffect = {
    anger: towardBaseline(prev.affect.anger, affectBaseline.anger, step),
    stress: towardBaseline(prev.affect.stress, affectBaseline.stress, step),
    happiness: towardBaseline(prev.affect.happiness, affectBaseline.happiness, step),
    calmness: towardBaseline(prev.affect.calmness, affectBaseline.calmness, step),
  };
  const turnMagnitude = kind === "negative" ? Math.max(sevLoad, signal.severity.disrespect) : 0;
  if ((reactionMode === "withdrawn" || reactionMode === "hurt" || reactionMode === "irritated") && turnMagnitude > 0) {
    const cap = reactionMode === "withdrawn"
      ? af.withdrawnMaxStressPerTurn
      : reactionMode === "hurt"
        ? af.hurtMaxStressPerTurn
        : af.irritatedMaxStressPerTurn;
    const scaled = cap * turnMagnitude;
    affectDelta.stress = Math.round(scaled);
    affectDelta.happiness = -Math.round(scaled * 0.75);
    affectDelta.calmness = -Math.round(scaled * 0.5);
    affectDelta.anger = reactionMode === "irritated" ? Math.round(scaled) : Math.round(scaled * 0.35);
  } else if (kind === "positive") {
    affectDelta.stress = -1;
    affectDelta.happiness = 2;
    affectDelta.calmness = 1;
  }

  const ax = config.axes;
  const uncertaintyReliefG = ax.guardedness.uncertaintyRelief * signal.uncertainty * (redline.disengage ? 0 : 1);
  let guardedness = clamp01(
    (conflict / 100) * ax.guardedness.conflict +
      (hurt / 100) * ax.guardedness.hurt +
      (reactionMode === "withdrawn" ? ax.guardedness.withdrawn : reactionMode === "hurt" ? ax.guardedness.hurtMode : reactionMode === "irritated" ? ax.guardedness.irritated : 0) +
      (redline.disengage ? ax.guardedness.hardDisengage : 0),
  );
  guardedness = clamp01(guardedness * (1 - uncertaintyReliefG));

  const warmthAxis = clamp01(
    (warmth / 100) * ax.warmth.warmth +
      (trust / 100) * ax.warmth.trust +
      (repairProgress / 100) * ax.warmth.repair -
      (hurt / 100) * ax.warmth.hurtPenalty,
  );

  const uncertaintyReliefO = ax.openness.uncertaintyRelief * signal.uncertainty * (redline.disengage ? 0 : 1);
  let openness = 1 - guardedness * 0.6;
  if (redline.disengage) openness -= ax.openness.hardDisengagePenalty;
  else if (conversationState === "disengaged") openness -= ax.openness.softDisengagePenalty * (1 - uncertaintyReliefO);
  else if (conversationState === "distancing") openness -= ax.openness.distancingPenalty * (1 - uncertaintyReliefO);
  openness = clamp01(openness);

  const scores: RelationshipScores = {
    warmth: Math.round(warmth),
    trust: Math.round(trust),
    conflict: Math.round(conflict),
    hurt: Math.round(hurt),
    repairProgress: Math.round(repairProgress),
    positiveEvents: positiveEventsAfter,
    negativeEvents: negativeEventsAfter,
    repeatedNegativeCount,
    familiarity: round1(familiarity),
  };

  return {
    scores,
    conversationState,
    reactionMode,
    axes: { openness: round1(openness), warmth: round1(warmthAxis), guardedness: round1(guardedness) },
    hard: { disengage: redline.disengage, reason: redline.reason },
    recovery: {
      applied: recovery.strength > 0 && kind !== "negative",
      timeComponent: round1(recovery.time),
      interactionComponent: round1(recovery.interaction),
      strength: round1(recovery.strength),
      rationale: recovery.rationale,
    },
    affectDelta,
    interactionCount,
    ...(lastConflictAt ? { lastConflictAt } : {}),
    ...(lastNegativePattern ? { lastNegativePattern } : {}),
    ...(disengagedAt ? { disengagedAt } : {}),
    ...(disengageReason ? { disengageReason } : {}),
    repairAttempts,
    boundarySetByKaira: prev.boundarySetByKaira || redline.disengage || (kind === "negative" && targetsKaira),
    rationale,
  };
}
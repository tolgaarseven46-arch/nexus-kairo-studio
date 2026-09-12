import type {
  SocialAppraisalInput,
  SocialAppraisalResult,
} from "../types/socialAppraisal";
import { normalizeDroitPersonality } from "./droitPersonalityNormalizer";
import { applyCommitmentAppraisalEvidence } from "./socialAppraisalCommitmentBetrayal";
import {
  resolveSocialAppraisalG3,
  type SocialAppraisalRelationshipScope,
  type SocialAppraisalResolutionG3,
} from "./socialAppraisalResolution";

export interface SocialAppraisalContextFactors {
  relationalHarm: number;
  relationalRepair: number;
  relationalAffiliation: number;
  affectiveNegative: number;
  affectivePositive: number;
  activation: number;
}

export interface SocialAppraisalResolutionG4 extends SocialAppraisalResolutionG3 {
  /** Bounded modulation only. These factors never reinterpret canonical semantics. */
  contextFactors: SocialAppraisalContextFactors;
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const clampFactor = (value: number): number => Math.max(0.7, Math.min(1.3, value));

const score01 = (value: unknown, fallback = 50): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback / 100;
  return clamp01(value / 100);
};

const relationshipScore01 = (value: unknown, fallback = 50): number =>
  score01(value, fallback);

function relationshipBuffer(input: Readonly<SocialAppraisalInput>): number {
  const relationship = input.relationship;
  const warmth = relationshipScore01(
    relationship.warmthScore ?? relationship.warmth,
  );
  const trust = relationshipScore01(
    relationship.trustScore ?? relationship.trust,
  );
  const tolerance =
    typeof relationship.toleranceMultiplier === "number" &&
    Number.isFinite(relationship.toleranceMultiplier)
      ? Math.max(0.5, Math.min(1.5, relationship.toleranceMultiplier))
      : 1;

  // Established good relationships buffer ambiguous/minor injury, but only within
  // a narrow band. They do not erase canonical harm.
  const quality = (warmth + trust) / 2;
  const toleranceContribution = (tolerance - 1) * 0.2;
  return Math.max(-0.15, Math.min(0.15, (quality - 0.5) * 0.2 + toleranceContribution));
}

function autobiographicalAffectiveFactor(input: Readonly<SocialAppraisalInput>): number {
  const memory = input.memory?.autobiographical;
  if (!memory || memory.episodeCount <= 0) return 1;

  // Shared-history depth may make an already-resolved event matter more to Kaira,
  // but it carries no event direction and cannot create semantic meaning.
  const episodeDepth = clamp01(memory.episodeCount / 8);
  const salientDepth = clamp01(memory.salientEpisodeCount / 4);
  const salience = clamp01((memory.meanSalience + memory.maxSalience) / 2);
  const emotion = clamp01(memory.meanEmotionalIntensity);
  const pressure =
    episodeDepth * 0.03 +
    salientDepth * 0.03 +
    salience * 0.035 +
    emotion * 0.025;
  return clampFactor(1 + Math.min(0.12, pressure));
}

function computeContextFactors(
  input: Readonly<SocialAppraisalInput>,
  base: Readonly<SocialAppraisalResult>,
): SocialAppraisalContextFactors {
  const personality = normalizeDroitPersonality(input.personality);
  const sensitivity = score01(personality.emotionalSensitivity);
  const patience = score01(personality.patience);
  const empathy = score01(personality.empathy);
  const loyalty = score01(personality.loyalty);

  const anger = score01(input.currentState.anger);
  const stress = score01(input.currentState.stress);
  const calmness = score01(input.currentState.calmness);
  const happiness = score01(input.currentState.happiness);

  const buffer = relationshipBuffer(input);
  const negativeStatePressure = ((anger + stress) / 2 - calmness * 0.35) * 0.16;
  const positiveStatePressure = (happiness - 0.5) * 0.1;
  const autobiographicalAffective = autobiographicalAffectiveFactor(input);

  const relationalHarm = clampFactor(
    1 + (sensitivity - 0.5) * 0.2 - (patience - 0.5) * 0.12 - buffer,
  );
  const relationalRepair = clampFactor(
    1 + (empathy - 0.5) * 0.16 + (loyalty - 0.5) * 0.1 + buffer * 0.5,
  );
  const relationalAffiliation = clampFactor(
    1 + (empathy - 0.5) * 0.08 + buffer * 0.45,
  );

  const affectiveNegative = clampFactor(
    (1 + (sensitivity - 0.5) * 0.18 + negativeStatePressure) * autobiographicalAffective,
  );
  const affectivePositive = clampFactor(
    (1 + (empathy - 0.5) * 0.08 + positiveStatePressure) * autobiographicalAffective,
  );
  const activation = clampFactor(
    (1 + ((anger + stress) / 2 - calmness) * 0.16 + (sensitivity - 0.5) * 0.08) *
      autobiographicalAffective,
  );

  // Exact-zero / one-sided projections stay one-sided. A factor is observable but
  // cannot manufacture significance from a zero base magnitude. Typed commitment
  // betrayal is resolved before this stage and therefore counts as an existing
  // appraisal projection, not as a G4 modulation invention.
  return {
    relationalHarm: base.relational.harmEvidence > 0 ? relationalHarm : 1,
    relationalRepair: base.relational.repairEvidence > 0 ? relationalRepair : 1,
    relationalAffiliation:
      base.relational.significance > 0 &&
      base.relational.harmEvidence <= 0 &&
      base.relational.repairEvidence <= 0
        ? relationalAffiliation
        : 1,
    affectiveNegative:
      base.affective.significance > 0 && base.affective.valence === "negative"
        ? affectiveNegative
        : 1,
    affectivePositive:
      base.affective.significance > 0 && base.affective.valence === "positive"
        ? affectivePositive
        : 1,
    activation: base.affective.activation > 0 ? activation : 1,
  };
}

function modulate(
  base: Readonly<SocialAppraisalResult>,
  factors: Readonly<SocialAppraisalContextFactors>,
): SocialAppraisalResult {
  if (base.noMaterialEffect) return base;

  const harmEvidence = clamp01(base.relational.harmEvidence * factors.relationalHarm);
  const repairEvidence = clamp01(base.relational.repairEvidence * factors.relationalRepair);

  let relationalSignificance = base.relational.significance;
  if (base.relational.harmEvidence > 0) {
    relationalSignificance = Math.max(relationalSignificance * factors.relationalHarm, harmEvidence);
  } else if (base.relational.repairEvidence > 0) {
    relationalSignificance = Math.max(relationalSignificance * factors.relationalRepair, repairEvidence);
  } else if (base.relational.significance > 0) {
    relationalSignificance *= factors.relationalAffiliation;
  }

  const affectiveFactor =
    base.affective.valence === "negative"
      ? factors.affectiveNegative
      : base.affective.valence === "positive"
        ? factors.affectivePositive
        : 1;

  const affectiveSignificance = clamp01(base.affective.significance * affectiveFactor);
  const activation = clamp01(base.affective.activation * factors.activation);

  return {
    ...base,
    relational: {
      ...base.relational,
      significance: clamp01(relationalSignificance),
      harmEvidence,
      repairEvidence,
    },
    affective: {
      ...base.affective,
      significance: affectiveSignificance,
      activation,
    },
    noMaterialEffect:
      relationalSignificance <= 0 && affectiveSignificance <= 0,
    reasons: [...base.reasons, "g4_context_modulation:bounded"],
  };
}

/**
 * G4 bounded context modulation.
 *
 * Authority rule:
 * - G3 owns current-turn resolved social meaning and projection direction.
 * - a typed commitment appraisal may combine canonical current-turn attribution
 *   with a bounded projection of prior world-model commitment lifecycle evidence;
 *   it never reparses raw history or mutates world-memory truth.
 * - G4 may only scale existing projection magnitudes from typed personality,
 *   current state, existing relationship context, and bounded typed memory summaries.
 * - autobiographical context may deepen an already-material affective projection,
 *   but cannot alter relational direction/harm/repair or create effect from zero.
 * - typed relationship grounding may resolve an otherwise-unknown target, but
 *   cannot override an explicit self/third-party/event target.
 * - G4 cannot change target/intent/valence or reinterpret raw/canonical semantics.
 */
export function resolveSocialAppraisalG4(
  input: Readonly<SocialAppraisalInput>,
  subjectId: string,
  relationshipScope?: SocialAppraisalRelationshipScope,
): SocialAppraisalResolutionG4 {
  const g3 = resolveSocialAppraisalG3(
    input.semantic,
    subjectId,
    input.dyadicNorm,
    relationshipScope,
  );
  const commitmentAppraisal = applyCommitmentAppraisalEvidence(
    g3.appraisal,
    input.semantic,
    input.memory?.world,
  );

  if (commitmentAppraisal.noMaterialEffect) {
    return {
      ...g3,
      appraisal: commitmentAppraisal,
      contextFactors: {
        relationalHarm: 1,
        relationalRepair: 1,
        relationalAffiliation: 1,
        affectiveNegative: 1,
        affectivePositive: 1,
        activation: 1,
      },
    };
  }

  const contextFactors = computeContextFactors(input, commitmentAppraisal);
  return {
    ...g3,
    appraisal: modulate(commitmentAppraisal, contextFactors),
    contextFactors,
  };
}

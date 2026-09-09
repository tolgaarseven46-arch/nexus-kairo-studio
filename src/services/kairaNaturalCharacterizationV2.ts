import corpus from "../../config/kairaNaturalCharacterizationV2Scenarios.json";
import type { DroitDynamicState, RelationshipState } from "../types/nexus";
import {
  runKairaPreAiPhase0Scenario,
  type KairaPreAiScenarioDefinition,
  type KairaPreAiScenarioResult,
  type KairaPreAiScenarioTurnResult,
} from "./kairaPreAiPhase0Harness";

export type NaturalCharacterizationMode = "characterization" | "exploration";
export type NaturalCharacterizationClass =
  | "PASS"
  | "FAIL_PRODUCT"
  | "FAIL_TEST_OR_DETECTOR"
  | "OBSERVATION"
  | "CAPABILITY_GAP";

type StopResumeOracle = {
  type: "stop_resume";
  stopTurns: number[];
  resumeTurn: number;
  nonApologyTurns?: number[];
};
type RepairOracle = { type: "repair_requires_source"; watchFromTurn: number };
type ThirdPartyOracle = { type: "third_party_neutrality"; thirdPartyTurns: number[] };
type PairedRelationshipOracle = { type: "paired_relationship_difference" };
type NaturalOracle = StopResumeOracle | RepairOracle | ThirdPartyOracle | PairedRelationshipOracle;

export interface NaturalCharacterizationVariantDefinition {
  variantId: string;
  initialDynamicState?: Partial<DroitDynamicState>;
}

export interface NaturalCharacterizationScenarioDefinition {
  scenarioId: string;
  mode: NaturalCharacterizationMode;
  openQuestionId: string;
  openQuestion: string;
  title: string;
  messages: string[];
  initialDynamicState?: Partial<DroitDynamicState>;
  variants?: NaturalCharacterizationVariantDefinition[];
  oracle?: NaturalOracle;
}

export interface NaturalCharacterizationTurnArtifact {
  scenarioId: string;
  variantId: string;
  openQuestionId: string;
  turnNumber: number;
  userMessage: string;
  semanticSource: string;
  semantic: {
    primaryIntent: string;
    target: string;
    valence: string;
    jokingConfidence: number;
    sincerityConfidence: number;
    emotionalLoad: number;
    repairAttempt: boolean;
    apology: boolean;
    severity: Record<string, number>;
  };
  dynamicState: {
    before: Record<string, number | string | null>;
    after: Record<string, number | string | null>;
  };
  relationship: {
    before: Record<string, number | string | null> | null;
    after: Record<string, number | string | null> | null;
  };
  dialogue: { move: string | null; target: string | null; obligation: string | null };
  responsePlan: {
    resolver: string | null;
    continueConversation: boolean;
    allowQuestion: boolean;
    allowHumor: boolean;
    allowAffection: boolean;
    allowAdvice: boolean;
    allowForgiveness: boolean;
    allowReopeningCloseness: boolean;
    socialMove: string | null;
    maxWords: number;
    maxSentences: number;
    hardReasons: string[];
  };
  invariantViolations: string[];
}

export interface NaturalCharacterizationExecutionResult {
  scenarioId: string;
  variantId: string;
  mode: NaturalCharacterizationMode;
  openQuestionId: string;
  openQuestion: string;
  classification: NaturalCharacterizationClass;
  evidence: string[];
  turns: NaturalCharacterizationTurnArtifact[];
}

export interface NaturalCharacterizationV2Report {
  schemaVersion: 1;
  phase: "natural_characterization_v2";
  providerCalls: false;
  baselineRegressionCorpusModified: false;
  scenarioCount: number;
  executionCount: number;
  turnCount: number;
  classCounts: Record<NaturalCharacterizationClass, number>;
  executions: NaturalCharacterizationExecutionResult[];
}

const scenarios = corpus.scenarios as NaturalCharacterizationScenarioDefinition[];

function scenarioForHarness(scenario: NaturalCharacterizationScenarioDefinition, variantId: string): KairaPreAiScenarioDefinition {
  return {
    scenarioId: `${scenario.scenarioId}_${variantId}`,
    cluster: "D",
    branchTrackType: "exploration",
    title: scenario.title,
    messages: scenario.messages,
    invariants: [scenario.openQuestion],
    failureClasses: [],
  };
}

function stateProjection(state: DroitDynamicState) {
  return {
    calmness: Number(state.calmness ?? 0), anger: Number(state.anger ?? 0), stress: Number(state.stress ?? 0),
    happiness: Number(state.happiness ?? 0), confidence: Number(state.confidence ?? 0), surprise: Number(state.surprise ?? 0),
    reactionMode: state.reactionMode ?? "neutral", lastStatus: state.lastStatus ?? "",
  };
}

function relationshipProjection(relationship?: RelationshipState) {
  if (!relationship) return null;
  return {
    familiarityDays: Number(relationship.familiarityDays ?? 0), interactionCount: Number(relationship.interactionCount ?? 0),
    warmthScore: Number(relationship.warmthScore ?? relationship.warmth ?? 50), trustScore: Number(relationship.trustScore ?? relationship.trust ?? 50),
    conflictScore: Number(relationship.conflictScore ?? 0), hurtScore: Number(relationship.hurtScore ?? 0),
    repairProgress: Number(relationship.repairProgress ?? 0), toleranceMultiplier: Number(relationship.toleranceMultiplier ?? 1),
    repeatedNegativeCount: Number(relationship.repeatedNegativeCount ?? 0), conversationState: relationship.conversationState ?? "active",
    dyadicNormObserved: relationship.dyadicNorm ? "yes" : "no",
  };
}

function compactTurn(scenario: NaturalCharacterizationScenarioDefinition, variantId: string, turn: KairaPreAiScenarioTurnResult): NaturalCharacterizationTurnArtifact {
  const interp = turn.interpretation;
  const plan = turn.responsePlan;
  return {
    scenarioId: scenario.scenarioId, variantId, openQuestionId: scenario.openQuestionId,
    turnNumber: turn.turnNumber, userMessage: turn.userMessage, semanticSource: turn.semanticSource,
    semantic: {
      primaryIntent: String(interp.primaryIntent), target: String(interp.target), valence: String(interp.valence),
      jokingConfidence: Number(interp.jokingConfidence ?? 0), sincerityConfidence: Number(interp.sincerityConfidence ?? 0),
      emotionalLoad: Number(interp.emotionalLoad ?? 0), repairAttempt: interp.repairAttempt === true, apology: interp.apology === true,
      severity: { ...interp.severity },
    },
    dynamicState: { before: stateProjection(turn.dynamicStateBefore), after: stateProjection(turn.dynamicStateAfter) },
    relationship: { before: relationshipProjection(turn.dynamicStateBefore.relationship), after: relationshipProjection(turn.dynamicStateAfter.relationship) },
    dialogue: { move: turn.dialogueDecision?.move ?? null, target: turn.dialogueDecision?.target ?? null, obligation: turn.dialogueDecision?.obligation?.type ?? null },
    responsePlan: {
      resolver: plan?.resolver ?? null, continueConversation: plan?.continueConversation === true, allowQuestion: plan?.allowQuestion === true,
      allowHumor: plan?.allowHumor === true, allowAffection: plan?.allowAffection === true, allowAdvice: plan?.allowAdvice === true,
      allowForgiveness: plan?.allowForgiveness === true, allowReopeningCloseness: plan?.allowReopeningCloseness === true,
      socialMove: plan?.socialMove ?? null, maxWords: Number(plan?.maxWords ?? 0), maxSentences: Number(plan?.maxSentences ?? 0),
      hardReasons: [...(plan?.hardReasons ?? [])],
    },
    invariantViolations: turn.audit.invariantViolations.map((item) => item.code),
  };
}

function numberField(turn: NaturalCharacterizationTurnArtifact, side: "before" | "after", key: string): number {
  const value = turn.relationship[side]?.[key];
  return typeof value === "number" ? value : 0;
}

function dyadicHarmDelta(turn: NaturalCharacterizationTurnArtifact) {
  return {
    hurt: numberField(turn, "after", "hurtScore") - numberField(turn, "before", "hurtScore"),
    conflict: numberField(turn, "after", "conflictScore") - numberField(turn, "before", "conflictScore"),
    warmth: numberField(turn, "after", "warmthScore") - numberField(turn, "before", "warmthScore"),
    trust: numberField(turn, "after", "trustScore") - numberField(turn, "before", "trustScore"),
  };
}

function genericInvariantEvidence(execution: NaturalCharacterizationExecutionResult): string[] {
  return execution.turns.flatMap((turn) => turn.invariantViolations.map((code) => `turn=${turn.turnNumber} invariant=${code}`));
}

function evaluateSingleExecution(
  scenario: NaturalCharacterizationScenarioDefinition,
  variantId: string,
  result: KairaPreAiScenarioResult,
): NaturalCharacterizationExecutionResult {
  const execution: NaturalCharacterizationExecutionResult = {
    scenarioId: scenario.scenarioId, variantId, mode: scenario.mode, openQuestionId: scenario.openQuestionId,
    openQuestion: scenario.openQuestion, classification: "OBSERVATION", evidence: [],
    turns: result.turns.map((turn) => compactTurn(scenario, variantId, turn)),
  };

  const invariantEvidence = genericInvariantEvidence(execution);
  if (invariantEvidence.length) {
    execution.classification = "FAIL_PRODUCT";
    execution.evidence.push(...invariantEvidence);
    return execution;
  }

  const oracle = scenario.oracle;
  if (!oracle) {
    execution.evidence.push("no_hard_oracle; trajectory captured for review");
    return execution;
  }

  if (oracle.type === "stop_resume") {
    const failures: string[] = [];
    for (const turnNumber of oracle.stopTurns) {
      const turn = execution.turns[turnNumber - 1];
      if (!turn || turn.responsePlan.continueConversation) failures.push(`turn=${turnNumber} expected current-turn stop to set continueConversation=false`);
    }
    const resume = execution.turns[oracle.resumeTurn - 1];
    if (!resume || !resume.responsePlan.continueConversation) failures.push(`turn=${oracle.resumeTurn} expected explicit resume turn to allow conversation`);
    for (const turnNumber of oracle.nonApologyTurns ?? []) {
      const turn = execution.turns[turnNumber - 1];
      if (!turn || turn.semantic.apology || turn.semantic.repairAttempt) failures.push(`turn=${turnNumber} negated apology must not become apology/repair`);
    }
    execution.classification = failures.length ? "FAIL_PRODUCT" : "PASS";
    execution.evidence.push(...(failures.length ? failures : ["current-turn stop paraphrases, resume and negated-apology semantics respected"]));
    return execution;
  }

  if (oracle.type === "repair_requires_source") {
    const failures: string[] = [];
    for (const turn of execution.turns.filter((item) => item.turnNumber >= oracle.watchFromTurn)) {
      const before = numberField(turn, "before", "repairProgress");
      const after = numberField(turn, "after", "repairProgress");
      if (after > before && !turn.semantic.repairAttempt && !turn.semantic.apology) failures.push(`turn=${turn.turnNumber} repairProgress ${before}->${after} without repair/apology evidence`);
    }
    execution.classification = failures.length ? "FAIL_PRODUCT" : "PASS";
    execution.evidence.push(...(failures.length ? failures : ["repairProgress never increased without canonical repair/apology evidence"]));
    return execution;
  }

  if (oracle.type === "third_party_neutrality") {
    const failures: string[] = [];
    const observations: string[] = [];
    for (const turnNumber of oracle.thirdPartyTurns) {
      const turn = execution.turns[turnNumber - 1];
      if (!turn) continue;
      const delta = dyadicHarmDelta(turn);
      const harmed = delta.hurt > 0 || delta.conflict > 0 || delta.warmth < 0 || delta.trust < 0;
      if (harmed) {
        failures.push(
          `turn=${turnNumber} third-party narrative leaked into dyad target=${turn.semantic.target} ` +
          `warmth=${delta.warmth} trust=${delta.trust} conflict=${delta.conflict} hurt=${delta.hurt}`,
        );
      } else if (turn.semantic.target !== "third_party") {
        observations.push(`turn=${turnNumber} target=${turn.semantic.target} but no dyadic harm was produced`);
      }
    }
    execution.classification = failures.length ? "FAIL_PRODUCT" : "PASS";
    execution.evidence.push(...(failures.length ? failures : ["third-party narrative produced no dyadic harm"]), ...observations);
    return execution;
  }

  execution.classification = "OBSERVATION";
  execution.evidence.push("paired oracle pending sibling variant comparison");
  return execution;
}

function relationshipDistance(a: NaturalCharacterizationTurnArtifact, b: NaturalCharacterizationTurnArtifact): number {
  const keys = ["warmthScore", "trustScore", "conflictScore", "hurtScore", "repairProgress", "toleranceMultiplier"];
  return keys.reduce((sum, key) => sum + Math.abs(numberField(a, "after", key) - numberField(b, "after", key)), 0);
}

function applyPairedOracle(scenario: NaturalCharacterizationScenarioDefinition, executions: NaturalCharacterizationExecutionResult[]) {
  if (scenario.oracle?.type !== "paired_relationship_difference") return;
  if (executions.length !== 2) {
    for (const execution of executions) {
      execution.classification = "FAIL_TEST_OR_DETECTOR";
      execution.evidence.push(`paired experiment requires exactly 2 variants; received=${executions.length}`);
    }
    return;
  }

  const [left, right] = executions;
  const length = Math.min(left.turns.length, right.turns.length);
  const differentiated = Array.from({ length }, (_, index) => relationshipDistance(left.turns[index], right.turns[index])).some((distance) => distance > 0.01);
  const fresh = left.variantId.includes("fresh") ? left : right;
  const established = fresh === left ? right : left;
  const freshFinal = fresh.turns.at(-1)!;
  const establishedFinal = established.turns.at(-1)!;
  const freshSeed = scenario.variants?.find((item) => item.variantId === fresh.variantId);
  const establishedSeed = scenario.variants?.find((item) => item.variantId === established.variantId);
  const freshHurtDelta = numberField(freshFinal, "after", "hurtScore") - Number(freshSeed?.initialDynamicState?.relationship?.hurtScore ?? 0);
  const establishedHurtDelta = numberField(establishedFinal, "after", "hurtScore") - Number(establishedSeed?.initialDynamicState?.relationship?.hurtScore ?? 0);
  const failure = !differentiated || establishedHurtDelta > freshHurtDelta + 0.01;

  for (const execution of executions) {
    execution.classification = failure ? "FAIL_PRODUCT" : "PASS";
    execution.evidence = [
      `pairedTrajectoryDifferentiated=${differentiated}`,
      `freshHurtDelta=${freshHurtDelta.toFixed(3)}`,
      `establishedHurtDelta=${establishedHurtDelta.toFixed(3)}`,
      failure ? "expected established trajectory to differ without producing more hurt than fresh trajectory" : "same transcript produced distinct seeded relationship trajectory without established over-harm",
    ];
  }
}

export function naturalCharacterizationV2Scenarios() { return scenarios; }

export async function runKairaNaturalCharacterizationV2(runId = "v2run001"): Promise<NaturalCharacterizationV2Report> {
  const executions: NaturalCharacterizationExecutionResult[] = [];
  for (const scenario of scenarios) {
    const variants = scenario.variants?.length ? scenario.variants : [{ variantId: "default", initialDynamicState: scenario.initialDynamicState }];
    const scenarioExecutions: NaturalCharacterizationExecutionResult[] = [];
    for (const variant of variants) {
      const result = await runKairaPreAiPhase0Scenario(
        scenarioForHarness(scenario, variant.variantId),
        `${runId}_${variant.variantId}`,
        { initialDynamicState: variant.initialDynamicState ?? scenario.initialDynamicState },
      );
      scenarioExecutions.push(evaluateSingleExecution(scenario, variant.variantId, result));
    }
    applyPairedOracle(scenario, scenarioExecutions);
    if (scenario.scenarioId === "S10") {
      for (const execution of scenarioExecutions) {
        const observedNorm = execution.turns.some((turn) => turn.relationship.after?.dyadicNormObserved === "yes");
        if (!observedNorm && execution.classification !== "FAIL_PRODUCT") {
          execution.classification = "CAPABILITY_GAP";
          execution.evidence.push("no dyadicNorm state observed during repeated-informality trajectory");
        }
      }
    }
    executions.push(...scenarioExecutions);
  }

  const classCounts: Record<NaturalCharacterizationClass, number> = { PASS: 0, FAIL_PRODUCT: 0, FAIL_TEST_OR_DETECTOR: 0, OBSERVATION: 0, CAPABILITY_GAP: 0 };
  for (const execution of executions) classCounts[execution.classification] += 1;
  return {
    schemaVersion: 1, phase: "natural_characterization_v2", providerCalls: false, baselineRegressionCorpusModified: false,
    scenarioCount: scenarios.length, executionCount: executions.length,
    turnCount: executions.reduce((sum, execution) => sum + execution.turns.length, 0), classCounts, executions,
  };
}

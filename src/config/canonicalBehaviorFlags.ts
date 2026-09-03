/**
 * Canonical behavior-authority rollout flags (ADR-0006).
 *
 * Every flag here is TEMPORARY. Each one names its owner, the PR that removes it,
 * and the concrete exit criteria that must be green before it is flipped on in an
 * environment and before it is deleted. No flag may outlive PR5.
 *
 * Default is OFF everywhere: with all flags off the runtime behaves byte-identically
 * to pre-ADR-0006 `main`. Turning a flag on activates the canonical path for that
 * layer only.
 */

export type CanonicalBehaviorFlag =
  | "SEMANTIC_SCHEMA_V2"
  | "RELATIONSHIP_REDUCER_V2"
  | "PLAN_RESOLVER_V2"
  | "CANONICAL_PROMPT_BUILDER"
  | "UNIFIED_GUARD_PASS";

export interface CanonicalBehaviorFlagSpec {
  /** Engineer accountable for flip + removal. */
  owner: string;
  /** PR in which this flag (and its legacy branch) is deleted. */
  removedInPr: "PR5";
  /** Layer this flag gates. */
  layer: string;
  /** Concrete, checkable conditions before flipping ON in an environment. */
  exitCriteria: string[];
}

export const CANONICAL_BEHAVIOR_FLAGS: Record<CanonicalBehaviorFlag, CanonicalBehaviorFlagSpec> = {
  SEMANTIC_SCHEMA_V2: {
    owner: "kaira-behavior-guild",
    removedInPr: "PR5",
    layer: "Canonical SemanticInterpretation@2 production + reconciliation",
    exitCriteria: [
      "semanticInterpretationSchema.test.ts + semanticInterpretationLegacyProjection.test.ts green",
      "reconciler: regex is the safety floor; low-confidence LLM fields are downgraded, not trusted",
      "legacy SemanticEvent projection round-trips and passes isSemanticEvent",
      "full test:contracts + test:beta green with flag OFF and with flag ON (ON diffs triaged as intentional in-PR)",
    ],
  },
  RELATIONSHIP_REDUCER_V2: {
    owner: "kaira-behavior-guild",
    removedInPr: "PR5",
    layer: "RelationshipReducer as authoritative scores / conversationState / reactionMode / axes",
    exitCriteria: [
      "relationshipReducer.test.ts green (severity-vector deltas, combined-signal redline via config, time+interaction recovery, derived asymmetry, maturity damping with no positive-feedback term, no withdrawn floor, continuous familiarity)",
      "relationshipReducerGoldenSession.test.ts green: KNT session knt_test_user_x_new trajectory within agreed bounds",
      "K2: conversationState is NOT the sole determinant — a non-hard 'disengaged' still leaves opennessAxis>0 and lets soft tendencies + uncertainty modulate",
      "with flag OFF: kdmConsistencyEngine.test.ts, kairaStateBehaviorContracts, kairaStateSequenceContracts, kairaConversationStateLockContracts, kairaConversationAuthorityNonMutationContracts byte-identical",
    ],
  },
  PLAN_RESOLVER_V2: {
    owner: "kaira-behavior-guild",
    removedInPr: "PR5",
    layer: "HardConstraintSet ∩ SoftTendencyProfile → KairaResponsePlan as sole behavior contract",
    exitCriteria: [
      "kairaPlanResolver.test.ts green incl. the 'conversationState is not sole determinant' contract",
      "chosenTone / speechIdentity.register / client behaviorPolicy are inputs/projections only — never overrides",
      "intimacy governed by character policy (flirtingAllowed) + soft intimacyInclination, not a raw trust/warmth threshold",
      "kairaResponsePlanFinalAuthorityContracts + kairaResponsePlanIntegrationContracts green",
    ],
  },
  CANONICAL_PROMPT_BUILDER: {
    owner: "kaira-behavior-guild",
    removedInPr: "PR5",
    layer: "Single canonical system-prompt builder from the resolved plan",
    exitCriteria: [
      "kairaSystemPromptBuilder.test.ts green: one behavior block, no duplicated rule strings, deterministic precedence, realizer-lockdown clause present",
      "every plan field represented exactly once in the assembled prompt",
      "prompt-dependent contract tests green",
    ],
  },
  UNIFIED_GUARD_PASS: {
    owner: "kaira-behavior-guild",
    removedInPr: "PR5",
    layer: "Single ordered guard/consistency pass consuming the plan; consistency computed on delivered text",
    exitCriteria: [
      "kairaResponseConstraintPass.test.ts green: world fallback within plan budget, consistency on final text, plan-conformance instead of narrow tone regex",
      "cross-phase grounded memory is qualified, not suppressed; ambiguous/unverified records require a stronger qualifier",
      "worldModelResponseGuard / epistemic / autobiographical contract tests green",
    ],
  },
};

/**
 * PR5 promotion gate — the conditions for retiring the flags and deleting the
 * legacy decision layers. This is deliberately NOT a fixed time window; elapsed
 * time is at most a supporting signal.
 */
export const CANONICAL_PATH_PROMOTION_GATE = {
  timeIsHardGate: false as const,
  timeIsSupportingSignalOnly: true as const,
  requirements: [
    "beta acceptance manifest is fully green on the canonical (flags ON) path",
    "no KNT drift/regression: golden-session trajectories and drift telemetry show no unintended change vs the agreed bounds",
    "real recorded session fixtures replay cleanly on the canonical path",
    "a rollback drill has been executed and verified (flip every flag OFF -> legacy path restored, state readable, no data loss)",
    "canonical vs legacy behavior diff review: no unexplained behavior delta on the shared corpus",
  ],
} as const;

const TRUTHY = new Set(["1", "true", "on", "yes"]);

/**
 * Runtime check. Reads process.env only; safe in browser bundles (returns false
 * when process is undefined). Never throws.
 */
export function isCanonicalBehaviorFlagEnabled(flag: CanonicalBehaviorFlag): boolean {
  try {
    const env = typeof process !== "undefined" ? process.env : undefined;
    const raw = env?.[flag];
    return typeof raw === "string" && TRUTHY.has(raw.trim().toLowerCase());
  } catch {
    return false;
  }
}

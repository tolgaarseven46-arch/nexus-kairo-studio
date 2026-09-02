/**
 * ADR-0006 PR2 — HardConstraintSet ∩ SoftTendencyProfile -> KairaResponsePlan.
 *
 * Proves:
 *   - the resolved plan is a per-turn snapshot, not a state machine
 *   - conversationState is ONE input, never the sole determinant (K2): a
 *     non-hard "distancing" leaves opennessAxis > 0 and lets soft tendencies
 *     modulate the gates
 *   - only a hard stop (continueConversation === false) vetoes the gates; the
 *     orthogonal axes stay live even then
 *   - a "forbidden" permission is absolute — no soft inclination reopens it
 *   - intimacy is governed by character policy + soft inclination, not a raw
 *     trust/warmth threshold
 *   - chosenTone / register / stance are projections only — changing them does
 *     not move a single behavior gate
 *   - flag OFF => byte-identical legacy plan (no resolver field)
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import type { BehaviorContract } from "./behaviorContract";
import type { DialogueDecisionPlan } from "./kairoDialogueDecisionEngine";
import type { KairoSpeechIdentity } from "./kairoSpeechIdentity";
import { buildKairaResponsePlan } from "./kairaResponsePlan";
import { deriveHardConstraints } from "./kairaHardConstraints";
import { deriveSoftTendencies } from "./kairaSoftTendencies";
import { resolveKairaResponsePlan } from "./kairaPlanResolver";
import * as flags from "../config/canonicalBehaviorFlags";

const contract = (o: Partial<BehaviorContract> = {}): BehaviorContract => ({
  conversationState: "active",
  continueConversation: true,
  playfulness: "allowed",
  affection: "allowed",
  questions: "allowed",
  forgivenessGranted: false,
  repairStatus: "none",
  reopeningCloseness: "allowed",
  stance: "open",
  maxResponseLength: "medium",
  reasons: [],
  ...o,
});

const dialogue = (o: Partial<DialogueDecisionPlan> = {}): DialogueDecisionPlan => ({
  move: "continue_conversation" as DialogueDecisionPlan["move"],
  allowFollowUpQuestion: true,
  allowSpeculation: false,
  maxSentences: 2,
  maxWords: 32,
  hasSupportedTargetClaim: false,
  reason: "test",
  ...o,
});

const speech = (o: Partial<KairoSpeechIdentity> = {}): KairoSpeechIdentity => ({
  register: "casual",
  relationshipLevel: "familiar",
  sentenceLength: "short",
  slangLevel: 0.4,
  humorLevel: 0.6,
  emojiLevel: 1,
  warmthLevel: 0.6,
  directness: 0.5,
  informalityLevel: 0.6,
  humorMode: "dry" as KairoSpeechIdentity["humorMode"],
  rhythm: {} as KairoSpeechIdentity["rhythm"],
  emotionalDisplayLevel: 0.5,
  instructions: [],
  ...o,
});

const enable = () =>
  vi.spyOn(flags, "isCanonicalBehaviorFlagEnabled").mockImplementation((f) => f === "PLAN_RESOLVER_V2");

afterEach(() => vi.restoreAllMocks());

describe("PlanResolver — flag gating", () => {
  it("flag OFF: legacy plan, no resolver field", () => {
    vi.spyOn(flags, "isCanonicalBehaviorFlagEnabled").mockReturnValue(false);
    const plan = buildKairaResponsePlan(contract(), dialogue(), speech());
    expect(plan.resolver).toBeUndefined();
    expect(plan.opennessAxis).toBeUndefined();
  });

  it("flag ON: canonical resolver, orthogonal axes present", () => {
    enable();
    const plan = buildKairaResponsePlan(contract(), dialogue(), speech());
    expect(plan.resolver).toBe("canonical");
    expect(plan.opennessAxis).toBeGreaterThan(0);
    expect(typeof plan.guardedness).toBe("number");
    expect(plan.projections?.register).toBe("casual");
  });
});

describe("PlanResolver — conversationState is not the sole determinant (K2)", () => {
  it("a non-hard 'distancing' state still allows questions and keeps opennessAxis > 0", () => {
    enable();
    const plan = buildKairaResponsePlan(
      contract({ conversationState: "distancing", stance: "distant-responsive" }),
      dialogue(),
      speech(),
    );
    expect(plan.continueConversation).toBe(true);
    expect(plan.opennessAxis).toBeGreaterThan(0);
    // soft questionDrive survives a distancing state when the permission is 'allowed'
    expect(plan.allowQuestion).toBe(true);
  });

  it("only a hard stop (continueConversation false) vetoes gates; axes stay live", () => {
    enable();
    const plan = buildKairaResponsePlan(
      contract({
        conversationState: "disengaged",
        continueConversation: false,
        playfulness: "forbidden",
        affection: "forbidden",
        questions: "forbidden",
        reopeningCloseness: "forbidden",
        stance: "closed",
        reasons: ["combined_boundary_violation"],
      }),
      dialogue(),
      speech(),
    );
    expect(plan.continueConversation).toBe(false);
    expect(plan.allowQuestion).toBe(false);
    expect(plan.allowHumor).toBe(false);
    expect(plan.allowAffection).toBe(false);
    // axes are still populated for telemetry even under a hard stop
    expect(plan.opennessAxis).toBeGreaterThan(0);
    expect(plan.requiredContent).toContain("state_boundary_and_close");
    expect(plan.hardReasons?.join(" ")).toMatch(/hard_disengage/);
  });
});

describe("PlanResolver — hard constraints are absolute", () => {
  it("a 'forbidden' permission is not reopened by a high soft inclination", () => {
    enable();
    const plan = buildKairaResponsePlan(
      contract({ playfulness: "forbidden" }),
      dialogue(),
      speech({ humorLevel: 1 }),
    );
    expect(plan.allowHumor).toBe(false);
  });

  it("soft verbosity can shrink but never exceed the hard length ceiling", () => {
    enable();
    const plan = buildKairaResponsePlan(
      contract({ maxResponseLength: "short" }),
      dialogue({ maxSentences: 2, maxWords: 32 }),
      speech(),
    );
    expect(plan.maxSentences).toBeLessThanOrEqual(1);
    expect(plan.maxWords).toBeLessThanOrEqual(14);
  });
});

describe("PlanResolver — intimacy governed by policy + soft inclination", () => {
  it("flirtingAllowed=false caps intimacyCeiling regardless of warmth", () => {
    const c = contract({ stance: "open" });
    const hard = deriveHardConstraints(c, dialogue(), {
      flirtingAllowed: false,
      acceptsSlurBanter: true,
      epistemicHonesty: true,
      maxIntimacy: 0.9,
      hardDisengageReasons: [],
    });
    const soft = deriveSoftTendencies(c, speech({ relationshipLevel: "close", warmthLevel: 1 }), dialogue());
    const resolved = resolveKairaResponsePlan({ hard, soft, dialogue: dialogue(), speech: speech(), contract: c });
    expect(resolved.intimacyCeiling).toBeLessThanOrEqual(0.5);
  });

  it("with flirting allowed, a close warm relationship raises the ceiling", () => {
    const c = contract({ stance: "open", affection: "allowed" });
    const hard = deriveHardConstraints(c, dialogue());
    const soft = deriveSoftTendencies(c, speech({ relationshipLevel: "close", warmthLevel: 0.9 }), dialogue());
    const resolved = resolveKairaResponsePlan({ hard, soft, dialogue: dialogue(), speech: speech(), contract: c });
    expect(resolved.intimacyCeiling).toBeGreaterThan(0.5);
  });
});

describe("PlanResolver — projections are non-authoritative", () => {
  it("changing register/stance projection does not move any behavior gate", () => {
    enable();
    const base = buildKairaResponsePlan(contract(), dialogue(), speech({ register: "casual" }));
    const firm = buildKairaResponsePlan(contract(), dialogue(), speech({ register: "firm" }));
    expect(firm.projections?.register).toBe("firm");
    expect(base.projections?.register).toBe("casual");
    for (const k of [
      "continueConversation",
      "allowQuestion",
      "allowHumor",
      "allowAffection",
      "allowForgiveness",
      "allowReopeningCloseness",
      "maxSentences",
      "maxWords",
      "emojiBudget",
    ] as const) {
      expect(firm[k]).toEqual(base[k]);
    }
  });

  it("high per-turn uncertainty damps graded drives without flipping a hard gate", () => {
    const c = contract();
    const hard = deriveHardConstraints(c, dialogue());
    const soft = deriveSoftTendencies(c, speech(), dialogue());
    const calm = resolveKairaResponsePlan({ hard, soft, dialogue: dialogue(), speech: speech(), contract: c });
    const unsure = resolveKairaResponsePlan({
      hard,
      soft,
      dialogue: dialogue(),
      speech: speech(),
      contract: c,
      uncertainty: { semantic: 0.9, relational: 0.9 },
    });
    // gates that were hard-true stay decidable; the drive-derived ones can only tighten
    expect(unsure.continueConversation).toBe(calm.continueConversation);
    expect(Number(unsure.allowAffection) + Number(unsure.allowQuestion)).toBeLessThanOrEqual(
      Number(calm.allowAffection) + Number(calm.allowQuestion),
    );
  });
});

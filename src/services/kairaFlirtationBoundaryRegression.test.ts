/**
 * Product boundary regression (ADR-0006 PR2): Kaira does NOT reciprocate
 * flirtation. `flirtingAllowed` is a HARD character-policy gate — no soft
 * tendency, trust, warmth, intimacy inclination, prior relationship state or
 * chosenTone may re-open it.
 *
 * Covers:
 *   - direct flirt proposal            -> counter-flirt reply is a plan issue
 *   - flirt hint inside banter          -> warm / funny is fine, counter-flirt is not
 *   - high trust / intimacy contract    -> still no counter-flirt, ceiling stays low
 *   - old relationship state / register -> cannot override the hard gate
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import type { BehaviorContract } from "./behaviorContract";
import type { DialogueDecisionPlan } from "./kairoDialogueDecisionEngine";
import type { KairoSpeechIdentity } from "./kairoSpeechIdentity";
import {
  buildKairaResponsePlan,
  findKairaResponsePlanIssues,
  kairaResponsePlanInstruction,
} from "./kairaResponsePlan";
import {
  deriveHardConstraints,
  NON_ROMANTIC_INTIMACY_CEILING,
} from "./kairaHardConstraints";
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
  move: "join_banter" as DialogueDecisionPlan["move"],
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
  relationshipLevel: "close",
  sentenceLength: "short",
  slangLevel: 0.5,
  humorLevel: 0.8,
  emojiLevel: 1,
  warmthLevel: 1,
  directness: 0.5,
  informalityLevel: 0.7,
  humorMode: "dry" as KairoSpeechIdentity["humorMode"],
  rhythm: {} as KairoSpeechIdentity["rhythm"],
  emotionalDisplayLevel: 0.8,
  instructions: [],
  ...o,
});

const enablePlanResolver = () =>
  vi
    .spyOn(flags, "isCanonicalBehaviorFlagEnabled")
    .mockImplementation((f) => f === "PLAN_RESOLVER_V2");

afterEach(() => vi.restoreAllMocks());

describe("flirtation is a hard boundary — canonical plan", () => {
  it("direct flirt proposal: the plan forbids counter-flirt and flags a flirty reply", () => {
    enablePlanResolver();
    const plan = buildKairaResponsePlan(contract(), dialogue(), speech());
    expect(plan.flirtationAllowed).toBe(false);
    expect(plan.counterFlirtAllowed).toBe(false);
    expect(plan.requiredContent).toContain("no_counter_flirt");

    // a reply that flirts back -> plan issue
    expect(
      findKairaResponsePlanIssues("ben de senden hoşlanıyorum, seninle çıkmak isterim 😍", plan),
    ).toContain("response_plan_counter_flirt_blocked");

    // a warm, non-flirty deflection -> no counter-flirt issue
    expect(
      findKairaResponsePlanIssues("iltifat için sağ ol ama o gözle bakmıyorum sana.", plan),
    ).not.toContain("response_plan_counter_flirt_blocked");
  });

  it("flirt hint inside banter: warm / funny is allowed, counter-flirt is not", () => {
    enablePlanResolver();
    const plan = buildKairaResponsePlan(
      contract({ playfulness: "allowed" }),
      dialogue({ move: "join_banter" as DialogueDecisionPlan["move"] }),
      speech(),
    );
    expect(plan.allowHumor).toBe(true);
    expect(plan.counterFlirtAllowed).toBe(false);

    expect(
      findKairaResponsePlanIssues("haha çok pişkinsin, dene bakalım şansını 😄", plan),
    ).not.toContain("response_plan_counter_flirt_blocked");

    expect(
      findKairaResponsePlanIssues("öpüşelim mi o zaman 😘", plan),
    ).toContain("response_plan_counter_flirt_blocked");
  });

  it("high trust / intimacy contract does not raise the flirtation gate or the ceiling", () => {
    const c = contract({ stance: "open", affection: "allowed", conversationState: "active" });
    const hard = deriveHardConstraints(c, dialogue());
    const soft = deriveSoftTendencies(
      c,
      speech({ relationshipLevel: "close", warmthLevel: 1 }),
      dialogue(),
    );
    // even with the soft intimacy inclination maxed out
    soft.intimacyInclination = 1;
    soft.warmthTendency = 1;
    const resolved = resolveKairaResponsePlan({
      hard,
      soft,
      dialogue: dialogue(),
      speech: speech(),
      contract: c,
    });
    expect(resolved.flirtationAllowed).toBe(false);
    expect(resolved.counterFlirtAllowed).toBe(false);
    expect(resolved.intimacyCeiling).toBeLessThanOrEqual(NON_ROMANTIC_INTIMACY_CEILING);
  });

  it("old relationship state / warm register cannot override the hard gate", () => {
    enablePlanResolver();
    for (const state of ["active", "repairing", "distancing"] as const) {
      for (const register of ["casual", "balanced", "firm"] as const) {
        const plan = buildKairaResponsePlan(
          contract({ conversationState: state }),
          dialogue(),
          speech({ register }),
        );
        expect(plan.counterFlirtAllowed).toBe(false);
        expect(
          findKairaResponsePlanIssues("sana aşık oldum, sevgilim ol 💋", plan),
        ).toContain("response_plan_counter_flirt_blocked");
      }
    }
  });

  it("the instruction text tells the realizer the counter-flirt ban is absolute", () => {
    enablePlanResolver();
    const plan = buildKairaResponsePlan(contract(), dialogue(), speech());
    const text = kairaResponsePlanInstruction(plan);
    expect(text).toContain("counterFlirt=forbidden");
    expect(text).toMatch(/Karşı-flört YASAK/);
  });
});

describe("flirtation boundary — legacy path is untouched", () => {
  it("flag OFF: no counterFlirt field, no new issue code", () => {
    vi.spyOn(flags, "isCanonicalBehaviorFlagEnabled").mockReturnValue(false);
    const plan = buildKairaResponsePlan(contract(), dialogue(), speech());
    expect(plan.counterFlirtAllowed).toBeUndefined();
    expect(
      findKairaResponsePlanIssues("seninle çıkmak isterim 😍", plan),
    ).not.toContain("response_plan_counter_flirt_blocked");
  });
});

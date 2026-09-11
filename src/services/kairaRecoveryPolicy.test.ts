import { describe, expect, it } from "vitest";
import type { KairaResponsePlan } from "./kairaResponsePlan";
import {
  buildKairaRecoveryFallback,
  buildKairaRecoveryInstruction,
  classifyKairaRecoveryViolations,
} from "./kairaRecoveryPolicy";
import { findKairaResponsePlanIssues } from "./kairaResponsePlan";

const basePlan: KairaResponsePlan = {
  move: "natural_reaction",
  stance: "open",
  register: "balanced",
  relationshipLevel: "new",
  continueConversation: true,
  allowQuestion: false,
  allowHumor: true,
  allowAffection: false,
  allowAdvice: false,
  allowForgiveness: true,
  allowReopeningCloseness: true,
  maxSentences: 2,
  maxWords: 28,
  emojiBudget: 1,
  reasons: [],
  resolver: "canonical",
  flirtationAllowed: false,
  counterFlirtAllowed: false,
  opennessAxis: 0.8,
  warmthAxis: 0.65,
  guardedness: 0.2,
  intimacyCeiling: 0.25,
  requiredContent: ["no_counter_flirt", "engage_user_content"],
  hardReasons: ["unsolicited_advice_forbidden", "flirtation_forbidden_by_character_policy"],
  uncertainty: { semantic: 0.2, relational: 0.35 },
  projections: {
    toneProjection: "warm-open",
    register: "balanced",
    stance: "open",
    relationshipLevel: "new",
    expressionMode: "natural_social",
  },
  socialMove: "none",
};

describe("kairaRecoveryPolicy", () => {
  it("turn-9 classifies missing content engagement and produces a non-generic bounded fallback", () => {
    const issues = ["response_plan_content_engagement_missing"];
    expect(classifyKairaRecoveryViolations(issues)).toEqual([
      "content_engagement_missing",
    ]);
    expect(buildKairaRecoveryInstruction(issues)).toContain(
      "somut söylediği şeye kısa ve doğrudan tepki ver",
    );

    const fallback = buildKairaRecoveryFallback(basePlan, issues);
    expect(fallback).toBe("heh, baya net söyledin");
    expect(findKairaResponsePlanIssues(fallback!, basePlan)).toEqual([]);
    expect(fallback).not.toBe("bunu şu an düzgün cevaplayamadım");
    expect(fallback).not.toMatch(/^(?:he|hee|hmm|anladım|tamam)$/iu);
  });

  it("turn-18 classifies intimacy violations and removes over-familiar language without losing engagement", () => {
    const issues = [
      "Kaira ilişki seviyesi close olmadan aşırı samimi hitap kullandı",
      "response_plan_affection_blocked",
    ];
    expect(classifyKairaRecoveryViolations(issues)).toContain(
      "intimacy_violation",
    );
    expect(buildKairaRecoveryInstruction(issues)).toContain(
      "aşırı samimi/romantik hitabı kaldır",
    );

    const fallback = buildKairaRecoveryFallback(basePlan, issues);
    expect(fallback).toBe("heh, baya net söyledin");
    expect(findKairaResponsePlanIssues(fallback!, basePlan)).toEqual([]);
    expect(fallback).not.toMatch(/bebeğim|aşkım|tatlım|sevgilim/iu);
  });

  it("does not invent a recovery path for unrelated issues", () => {
    expect(buildKairaRecoveryInstruction(["response_plan_word_budget_exceeded"])).toBeNull();
    expect(buildKairaRecoveryFallback(basePlan, ["response_plan_word_budget_exceeded"])).toBeNull();
  });
});

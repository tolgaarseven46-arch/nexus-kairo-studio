import { describe, expect, it } from "vitest";
import type { KairaResponsePlan } from "./kairaResponsePlan";
import { findKairaResponsePlanIssues, looksLikeKairaQuestionAct } from "./kairaResponsePlan";
import { removeForbiddenQuestionUnits } from "./kairaDeliveredQuestionConstraint";
import { removeForbiddenAffectionVocatives } from "./kairaDeliveredAffectionConstraint";
import {
  KAIRA_FINAL_DELIVERY_RECOVERY_REPLY,
  resolveKairaFinalDelivery,
} from "./kairaFinalDeliveryGate";
import { interpretationFromRegexFloor } from "./semanticInterpretationLegacyProjection";

const plan = (overrides: Partial<KairaResponsePlan> = {}): KairaResponsePlan => ({
  move: "natural_reaction",
  stance: "open",
  register: "casual",
  relationshipLevel: "new",
  continueConversation: true,
  allowQuestion: false,
  allowHumor: true,
  allowAffection: false,
  allowAdvice: false,
  allowForgiveness: true,
  allowReopeningCloseness: true,
  maxSentences: 2,
  maxWords: 24,
  emojiBudget: 1,
  reasons: [],
  resolver: "canonical",
  requiredContent: ["engage_user_content"],
  ...overrides,
});

function canonicalQuestion(surface: string) {
  return {
    ...interpretationFromRegexFloor(surface),
    primaryIntent: "question" as const,
  };
}

describe("cross-layer composition invariants", () => {
  it("uses canonical generated-reply semantics when the structural question fast-path misses informal Turkish", () => {
    const reply = "aç bi şeyler de ortam değişsin, ne tarz açıyosun şimdi";
    expect(looksLikeKairaQuestionAct(reply)).toBe(false);

    const issues = findKairaResponsePlanIssues(
      reply,
      plan(),
      canonicalQuestion(reply) as any,
    );

    expect(issues).toContain("response_plan_question_blocked");
  });

  it("salvages the allowed reaction clause from the measured Turn 5 shape once canonical semantics proves the mixed reply is a question", () => {
    const reply = "aç bi şeyler de ortam değişsin, ne tarz açıyosun şimdi";
    expect(
      removeForbiddenQuestionUnits(reply, false, canonicalQuestion(reply) as any),
    ).toBe("aç bi şeyler de ortam değişsin");
  });

  it("salvages the allowed reaction clause from a semicolon-separated Turn 6 shape", () => {
    const reply = "ooo tamam, beat giriyor o zaman; eski Türkçe rap mı yeni nesil mi açtın şimdi";
    expect(removeForbiddenQuestionUnits(reply, false)).toBe(
      "ooo tamam, beat giriyor o zaman",
    );
  });

  it("removes only a forbidden affectionate vocative while preserving an allowed coordination question", () => {
    const reply = "oyun olur aşkım, ne oynayalım?";
    expect(removeForbiddenAffectionVocatives(reply, false)).toBe(
      "oyun olur, ne oynayalım?",
    );
    expect(removeForbiddenAffectionVocatives(reply, true)).toBe(reply);
  });

  it("does not mechanically erase proposition-bearing physical affection", () => {
    const reply = "gel sarılalım";
    expect(removeForbiddenAffectionVocatives(reply, false)).toBe(reply);
  });

  it("never persists an empty reply after final rejection while keeping the rejection observable", () => {
    const rejected = resolveKairaFinalDelivery("", {
      accepted: false,
      score: 70,
      issues: ["response_plan_question_blocked"],
    });

    expect(rejected.accepted).toBe(false);
    expect(rejected.recoveryUsed).toBe(true);
    expect(rejected.persistedReply).toBe(KAIRA_FINAL_DELIVERY_RECOVERY_REPLY);
    expect(rejected.persistedReply.trim().length).toBeGreaterThan(0);
    expect(rejected.issues).toEqual(["response_plan_question_blocked"]);
  });

  it("preserves an accepted candidate without invoking recovery", () => {
    const accepted = resolveKairaFinalDelivery("tamamdır", {
      accepted: true,
      score: 100,
      issues: [],
    });

    expect(accepted.accepted).toBe(true);
    expect(accepted.recoveryUsed).toBe(false);
    expect(accepted.persistedReply).toBe("tamamdır");
  });
});

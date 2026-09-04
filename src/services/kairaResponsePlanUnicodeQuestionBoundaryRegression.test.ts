import { describe, expect, it } from "vitest";
import type { KairaResponsePlan } from "./kairaResponsePlan";
import { findKairaResponsePlanIssues } from "./kairaResponsePlan";

const blockedQuestionPlan: KairaResponsePlan = {
  move: "natural_reaction",
  stance: "open",
  register: "balanced",
  relationshipLevel: "new",
  continueConversation: true,
  allowQuestion: false,
  allowHumor: true,
  allowAffection: true,
  allowForgiveness: true,
  allowReopeningCloseness: true,
  maxSentences: 2,
  maxWords: 20,
  emojiBudget: 1,
  reasons: ["unicode-question-boundary-regression"],
};

describe("Kaira response-plan Unicode question boundaries", () => {
  it("does not mistake the mi letters inside Turkish words for a question clitic", () => {
    const issues = findKairaResponsePlanIssues("of yorucu geçmiş belli", blockedQuestionPlan);
    expect(issues).not.toContain("response_plan_question_blocked");
  });

  it("still blocks standalone Turkish question clitics", () => {
    const issues = findKairaResponsePlanIssues("iyi misin", blockedQuestionPlan);
    expect(issues).toContain("response_plan_question_blocked");
  });

  it("recognizes interrogatives ending with a Turkish letter without punctuation", () => {
    const issues = findKairaResponsePlanIssues("kaç kişi geliyor", blockedQuestionPlan);
    expect(issues).toContain("response_plan_question_blocked");
  });
});

import { describe, expect, it } from "vitest";
import {
  buildDialogueDecisionInstruction,
  buildGroundedDialogueFallback,
  findDialogueDecisionIssues,
  planDialogueResponse,
} from "./kairoDialogueDecisionEngine";

const mixedHistory = [
  {
    sender: "user",
    participantName: "Ali",
    text: "Mert yarın müdürle konuşup istifa edecekmiş.",
  },
  {
    sender: "user",
    participantName: "Mert",
    text: "yok lan o ben değildim, Ali maaş zammını konuşacaktı herhalde",
  },
];
const recallQuestion = "neyse Mert yarın ne yapacaktı?";

describe("Kaira dialogue decision engine", () => {
  it("chooses one bounded recall move when the target has no active claim", () => {
    const plan = planDialogueResponse(mixedHistory, recallQuestion, "Ali");
    expect(plan).toMatchObject({
      move: "grounded_recall",
      target: "Mert",
      allowFollowUpQuestion: false,
      allowSpeculation: false,
      maxSentences: 2,
      hasSupportedTargetClaim: false,
    });
    expect(buildDialogueDecisionInstruction(plan)).toContain(
      "Takip sorusu: yasak",
    );
  });

  it("rejects the contradictory question tail from the real debug report", () => {
    const plan = planDialogueResponse(mixedHistory, recallQuestion, "Ali");
    const reply =
      "Elimizde kesin bilgi yok. Mert söylesin: istifa mı, zam mı, yoksa hiçbir şey mi?";
    expect(findDialogueDecisionIssues(reply, plan)).toContain(
      "Diyalog kararı takip sorusunu yasakladığı halde soru eklendi",
    );
  });

  it("builds a grounded fallback without reviving the denied plan", () => {
    const plan = planDialogueResponse(mixedHistory, recallQuestion, "Ali");
    const fallback = buildGroundedDialogueFallback(
      plan,
      mixedHistory,
      recallQuestion,
      "Ali",
    );
    expect(fallback).toBe(
      "Mert için yarına dair net bir plan yok. İstifa iddiasını reddetti.",
    );
    expect(findDialogueDecisionIssues(fallback!, plan)).toEqual([]);
  });

  it("does not force a question after a normal social reaction", () => {
    const plan = planDialogueResponse([], "bugün hava çok sıcak ya", "Ali");
    expect(plan.move).toBe("natural_reaction");
    expect(plan.allowFollowUpQuestion).toBe(false);
  });
});

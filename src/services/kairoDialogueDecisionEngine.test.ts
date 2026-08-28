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

  it("uses a bounded curiosity move for a first emotional opening", () => {
    const plan = planDialogueResponse(
      [],
      "bugün moralim biraz bozuk ya",
      "Ali",
    );

    expect(plan).toMatchObject({
      move: "invite_emotional_context",
      allowFollowUpQuestion: true,
      allowSpeculation: false,
      maxSentences: 1,
      maxWords: 6,
    });
    expect(buildDialogueDecisionInstruction(plan)).toContain(
      "ilişki seviyesini bu turda zorla sergileme",
    );
  });

  it("rejects all three failed real emotional-opening replies", () => {
    const plan = planDialogueResponse(
      [],
      "bugün moralim biraz bozuk ya",
      "Ali",
    );
    const failedReplies = [
      "Hmm canım sıkıldı bak şimdi. Ne oldu, moralini kim kırdı bugün böyle 😕",
      "Off, geçmiş olsun ya. Canını sıkan ne olursa olsun, şu an resmi olarak bugünlük salma hakkın var bence.",
      "off canım üzüldüm bak şimdi. sarılıyormuş gibi düşün beni 🤍",
    ];

    for (const reply of failedReplies) {
      expect(findDialogueDecisionIssues(reply, plan).length).toBeGreaterThan(0);
    }
  });

  it("accepts the agreed minimal emotional-opening target", () => {
    const plan = planDialogueResponse(
      [],
      "bugün moralim biraz bozuk ya",
      "Ali",
    );

    expect(findDialogueDecisionIssues("hmm niye", plan)).toEqual([]);
    expect(
      buildGroundedDialogueFallback(
        plan,
        [],
        "bugün moralim biraz bozuk ya",
        "Ali",
      ),
    ).toBe("hmm niye");
  });

  it("does not override an explicit request for advice", () => {
    const plan = planDialogueResponse(
      [],
      "moralim bozuk ne yapmalıyım",
      "Ali",
    );

    expect(plan.move).not.toBe("invite_emotional_context");
  });
});

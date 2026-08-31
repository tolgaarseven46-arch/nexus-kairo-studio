import { describe, expect, it } from "vitest";
import { interpretSemanticEvent } from "./semanticEventEngine";
import { planDialogueResponse } from "./kairoDialogueDecisionEngine";

const planFor = (message: string, history: any[] = []) => {
  const event = interpretSemanticEvent(message);
  return { event, plan: planDialogueResponse(history, message, "Ali", event) };
};

describe("natural social message matrix", () => {
  it("keeps ordinary self-disclosure as a compact natural reaction", () => {
    for (const message of ["ben öğrenciyim", "bugün iş çok yoğundu"]) {
      const { plan } = planFor(message);
      expect(plan.move).toBe("natural_reaction");
      expect(plan.allowFollowUpQuestion).toBe(false);
      expect(plan.maxSentences).toBeLessThanOrEqual(2);
    }
  });

  it("keeps user-started joking in the short banter lane", () => {
    const { event, plan } = planFor("yine son dakikaya bıraktım hahaha");
    expect(event.intent).toBe("banter");
    expect(plan.move).toBe("join_banter");
    expect(plan.maxSentences).toBe(1);
    expect(plan.maxWords).toBeLessThanOrEqual(7);
  });

  it("keeps low mood in the minimal emotional-opening lane", () => {
    const { event, plan } = planFor("hiç havamda değilim");
    expect(event.intent).toBe("emotional_share");
    expect(plan.move).toBe("invite_emotional_context");
    expect(plan.maxSentences).toBe(1);
    expect(plan.maxWords).toBeLessThanOrEqual(4);
  });

  it("treats a short answer to Kaira's immediate question as continuation, not a new topic", () => {
    const history = [
      { sender: "droit", text: "çay mı kahve mi?", participantName: "Kaira" },
    ];
    const { plan } = planFor("hiçbiri", history);
    expect(plan.move).toBe("follow_previous_answer");
    expect(plan.allowFollowUpQuestion).toBe(false);
  });
});

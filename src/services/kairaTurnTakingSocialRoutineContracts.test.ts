// Canonical social routines are sequence moves; downstream dialogue planning must not collapse them back to generic raw-text reactions.
import { describe, expect, it } from "vitest";
import { interpretSemanticEvent } from "./semanticEventEngine";
import {
  buildGroundedDialogueFallback,
  planDialogueResponse,
} from "./kairoDialogueDecisionEngine";

const routineCases = [
  ["selam", "greeting", "selam"],
  ["teşekkürler", "thanks", "rica ederim"],
  ["aynen", "agreement", "aynen"],
  ["görüşürüz", "goodbye", "görüşürüz"],
  ["iyi geceler", "good_night", "iyi geceler"],
] as const;

describe("canonical turn-taking social routines", () => {
  it.each(routineCases)(
    "preserves %s as a bounded %s adjacency response",
    (message, socialRoutine, fallback) => {
      const event = interpretSemanticEvent(message);
      expect(event.socialRoutine).toBe(socialRoutine);
      const plan = planDialogueResponse([], message, "Ali", event);
      expect(plan).toMatchObject({
        move: "complete_social_routine",
        socialRoutine,
        allowFollowUpQuestion: false,
        allowSpeculation: false,
        maxSentences: 1,
        maxWords: 8,
      });
      expect(buildGroundedDialogueFallback(plan, [], message, "Ali")).toBe(fallback);
    },
  );

  it.each(["naber", "nasılsın kanka", "ne yapıyorsun"])(
    "keeps reciprocal routine question permission: %s",
    (message) => {
      const event = interpretSemanticEvent(message);
      const plan = planDialogueResponse([], message, "Ali", event);
      expect(plan.move).toBe("natural_reaction");
      expect(plan.allowFollowUpQuestion).toBe(true);
    },
  );

  it("keeps a short agreement attached to Kaira's immediate prompt before routine completion", () => {
    const history = [{ sender: "droit", text: "çay mı kahve mi?", participantName: "Kaira" }] as any[];
    const event = interpretSemanticEvent("evet");
    const plan = planDialogueResponse(history, "evet", "Ali", event);
    expect(plan.move).toBe("follow_previous_answer");
  });

  it("consumes the supplied canonical routine instead of inventing a second raw-text meaning", () => {
    const event = { ...interpretSemanticEvent("selam"), raw: "provider-normalized", normalized: "provider-normalized" };
    const plan = planDialogueResponse([], "provider-normalized", "Ali", event);
    expect(plan).toMatchObject({
      move: "complete_social_routine",
      socialRoutine: "greeting",
    });
  });

  it("does not reparse raw text when canonical semantic authority says the reciprocal routine is absent", () => {
    const event = {
      ...interpretSemanticEvent("naber"),
      socialRoutine: "none" as const,
      intent: "general_chat" as const,
    };
    const plan = planDialogueResponse([], "naber", "Ali", event);
    expect(plan.move).toBe("natural_reaction");
    expect(plan.allowFollowUpQuestion).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { realizeKairaFirstEncounterContext } from "./kairaFirstEncounterContextRealizer";

describe("first-encounter room-context driver acceptance", () => {
  it("keeps Kaira as the conversation driver for every owner variant", () => {
    const replies = new Set<string>();

    for (let i = 0; i < 96; i += 1) {
      const result = realizeKairaFirstEncounterContext({
        requestId: `owner-room-scope-${i}`,
        interpretation: {
          primaryIntent: "question",
          secondaryIntents: [],
          sentiment: "neutral",
          confidence: 1,
          entities: [],
          propositions: [],
          evidence: [],
          discourseFacets: {
            socialRoutine: "none",
            platformScopeQuery: "room_setup",
            discourseAct: "question",
          },
        } as any,
        plan: {
          move: "answer_or_clarify",
          relationshipLevel: "new",
          allowQuestion: true,
          allowHumor: true,
        } as any,
        context: { roomName: "deneme", isOwner: true },
      });

      expect(result.handled).toBe(true);
      expect(result.reply).toBeTruthy();
      const reply = String(result.reply);
      replies.add(reply);

      expect(reply).not.toMatch(/sen yön ver|sen karar ver|nasıl bir yer olacağına sen/iu);
      expect(reply).toMatch(/ben/u);
      expect(reply).toMatch(/toparlayayım|kurayım|atayım/iu);
      expect(reply).toMatch(/sohbet|oda|düzen|kural|ortam/iu);
    }

    expect(replies.size).toBeGreaterThanOrEqual(3);
  });
});

import { describe, expect, it } from "vitest";
import { realizeKairaFirstEncounterContext } from "./kairaFirstEncounterContextRealizer";

describe("first-encounter platform-context acceptance", () => {
  it("answers explicit Kaira role questions without pushing onboarding", () => {
    const result = realizeKairaFirstEncounterContext({
      requestId: "role-q",
      interpretation: {
        discourseFacets: {
          socialRoutine: "none",
          platformScopeQuery: "kaira_role",
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
    expect(result.reply).toMatch(/sunucu|yönetim/iu);
    expect(result.reply).toMatch(/yardım|yanındayım|beraber/iu);
    expect(result.reply).not.toMatch(/nasıl bir ortam|ilk adımı ben atayım/iu);
  });

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

      const normalizedReply = reply.toLocaleLowerCase("tr-TR");
      expect(normalizedReply).not.toMatch(/sen yön ver|sen karar ver|nasıl bir yer olacağına sen/u);
      expect(normalizedReply).toMatch(/ben/u);
      expect(normalizedReply).toMatch(/toparlayayım|kurayım|atayım/u);
      expect(normalizedReply).toMatch(/sohbet|oda|düzen|kural|ortam/u);
    }

    expect(replies.size).toBeGreaterThanOrEqual(3);
  });

  it.each([
    ["kaira_role", "natural_reaction"],
    ["room_setup", "natural_reaction"],
  ] as const)(
    "lets typed platform scope own realization even when dialogue move is %s/%s",
    (platformScopeQuery, move) => {
      const result = realizeKairaFirstEncounterContext({
        requestId: `typed-scope-${platformScopeQuery}`,
        interpretation: {
          discourseFacets: {
            socialRoutine: "none",
            platformScopeQuery,
            discourseAct: "question",
          },
        } as any,
        plan: {
          move,
          relationshipLevel: "new",
          allowQuestion: false,
          allowHumor: true,
        } as any,
        context: { roomName: "deneme", isOwner: true },
      });

      expect(result.handled).toBe(true);
      if (platformScopeQuery === "kaira_role") {
        expect(result.reply).toMatch(/sunucu|yönetim/iu);
      } else {
        expect(result.reply).toMatch(/oda|sohbet|ortam/iu);
      }
    },
  );

});

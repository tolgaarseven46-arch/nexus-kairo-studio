import { describe, expect, it } from "vitest";
import { decideKairaWelcome } from "./kairaWelcomeDecision";
import { realizeKairaWelcome } from "./kairaWelcomeRealizer";
import {
  resolveServerLanguageUnderstanding,
  isSafeFirstEncounterNeutralShortFastPath,
} from "./serverLanguageUnderstanding";
import { realizeKairaFirstEncounterRoutine } from "./kairaFirstEncounterRoutineRealizer";
import { buildKairaFirstEncounterInstruction } from "./kairaFirstEncounterContinuity";
import { realizeKairaFirstEncounterSteering } from "./kairaFirstEncounterSteeringRealizer";

const ROOM_SCOPE_PARAPHRASES = [
  "burada ne yapıcaz",
  "burda napıcaz",
  "burada ne yapacağız",
  "peki şimdi burda ne yapıyoruz",
  "iyilik burada ne yapıcaz",
  "bu odada ne yapıyoruz",
  "burayı nasıl kullanıcaz",
];

describe("live first-encounter acceptance RED", () => {
  it("owner welcome proactively explains Kaira's co-building role", () => {
    const decision = decideKairaWelcome({
      eventType: "room.created",
      actorDisplayName: "Tolga",
      roomName: "deneme",
      isOwner: true,
    });

    for (let i = 0; i < 24; i += 1) {
      const result = realizeKairaWelcome({
        eventId: `live-owner-${i}`,
        kairaInstanceId: "kaira_reference_001",
        actorDisplayName: "Tolga",
        roomName: "deneme",
        decision,
      });

      expect(result.text).toMatch(/birlikte|beraber/iu);
      expect(result.text).toMatch(/oda|kural|düzen|ortam|arkadaş|insan/iu);
      expect(result.text).toMatch(/\?/u);
      expect(result.text).not.toMatch(/droit|pipeline|system prompt|yapay zeka/iu);
    }
  });

  it("keeps Kaira as the first-encounter conversation driver", () => {
    const instruction = buildKairaFirstEncounterInstruction({
      roomName: "deneme",
      isOwner: true,
    });
    expect(instruction).toMatch(/sohbetin yönünü Kaira taşısın/iu);
    expect(instruction).toMatch(/doğru soruyu bilmesini bekleme/iu);
    expect(instruction).toMatch(/kısa, kararsız|bilmiyorum/iu);
    expect(instruction).not.toMatch(/kullanıcı yönü kendisi belirleyebilsin/iu);
  });

  it("keeps steering after a zero-context user's naber", () => {
    const result = realizeKairaFirstEncounterRoutine({
      requestId: "live-naber",
      event: { socialRoutine: "how_are_you" } as any,
      plan: {
        move: "natural_reaction",
        relationshipLevel: "new",
        allowQuestion: true,
        allowHumor: true,
      } as any,
    });

    expect(result.handled).toBe(true);
    expect(result.reply).toMatch(/burayı|oda|ortam/iu);
    expect(result.reply).toMatch(/nasıl/iu);
  });

  it("keeps a safe neutral short reply off the semantic provider and lets Kaira steer", async () => {
    let providerCalls = 0;
    const result = await resolveServerLanguageUnderstanding({
      message: "bilmiyom daha",
      preferredProvider: "openrouter",
      preferTrivialSocialFastPath: true,
      firstEncounterContext: { roomName: "deneme", isOwner: true },
      context: {
        userName: "Tolga",
        characterName: "Kaira",
        recentMessages: [
          { role: "assistant", content: "Nasıl bir ortam olsun?" },
        ],
      },
      generateText: async () => {
        providerCalls += 1;
        throw new Error("semantic_provider_should_not_be_needed_for_safe_short_first_encounter");
      },
    });

    expect(providerCalls).toBe(0);
    expect(isSafeFirstEncounterNeutralShortFastPath(
      result,
      { roomName: "deneme", isOwner: true },
    )).toBe(true);

    const realized = realizeKairaFirstEncounterSteering({
      requestId: "live-unsure",
      interpretation: result.interpretation,
      plan: {
        move: "natural_reaction",
        relationshipLevel: "new",
        allowQuestion: true,
        allowHumor: true,
      } as any,
    });

    expect(realized.handled).toBe(true);
    expect(realized.reply).toMatch(/ben|ilk adımı|başlangıcı/iu);
    expect(realized.reply).toMatch(/sohbet|oda|ortam|düzen/iu);
  });

  it.each(ROOM_SCOPE_PARAPHRASES)(
    "classifies room-scope paraphrase canonically without semantic-provider latency: %s",
    async (message) => {
      let providerCalls = 0;
      const result = await resolveServerLanguageUnderstanding({
        message,
        preferredProvider: "openrouter",
        preferTrivialSocialFastPath: true,
        firstEncounterContext: { roomName: "deneme", isOwner: true },
        context: {
          userName: "Tolga",
          characterName: "Kaira",
          recentMessages: [
            { role: "assistant", content: "Hey, ben Kaira. Burayı beraber toparlarız." },
          ],
        },
        generateText: async () => {
          providerCalls += 1;
          throw new Error("semantic_provider_should_not_be_needed_for_room_scope");
        },
      });

      expect(providerCalls).toBe(0);
      expect(result.interpretation.primaryIntent).toBe("question");
      expect(
        (result.interpretation.discourseFacets as any).platformScopeQuery,
      ).toBe("room_setup");
    },
  );
});

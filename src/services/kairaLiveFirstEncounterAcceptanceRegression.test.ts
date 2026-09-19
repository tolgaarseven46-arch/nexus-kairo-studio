import { describe, expect, it } from "vitest";
import { SEMANTIC_INTERPRETATION_SCHEMA_VERSION } from "../types/semanticInterpretation";
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

  it("keeps invited Kaira natural instead of forcing server onboarding", () => {
    const instruction = buildKairaFirstEncounterInstruction({
      roomName: "deneme",
      isOwner: true,
    });
    expect(instruction).toMatch(/casual mesajlara casual cevap ver/iu);
    expect(instruction).toMatch(/sunucu yönetimi konusunu kullanıcı sormadan zorla açma/iu);
    expect(instruction).toMatch(/rolünü kısa ve doğal biçimde açıkla/iu);
  });

  it("keeps every naber steering variant complete within the delivery budget", () => {
    const replies = new Set<string>();
    for (let i = 0; i < 128; i += 1) {
      const result = realizeKairaFirstEncounterRoutine({
        requestId: `live-naber-${i}`,
        event: { socialRoutine: "how_are_you" } as any,
        plan: {
          move: "natural_reaction",
          relationshipLevel: "new",
          allowQuestion: true,
          allowHumor: true,
          maxWords: 8,
        } as any,
      });

      expect(result.handled).toBe(true);
      const reply = String(result.reply ?? "");
      replies.add(reply);
      expect(reply).toMatch(/iyi|iyiyim|fena/iu);
      expect(reply).toMatch(/sen|sende/iu);
      expect(reply).not.toMatch(/burayı|oda|sunucu|nasıl olsun/iu);
      expect(reply.trim().split(/\s+/u).length).toBeLessThanOrEqual(8);
    }
    expect(replies.size).toBe(4);
  });

  it("answers naber as normal small-talk after invitation", () => {
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
    expect(result.reply).toMatch(/iyi|iyiyim|fena/iu);
    expect(result.reply).not.toMatch(/burayı|oda|sunucu|ortam/iu);
  });

  it("uses provider authority for an unknown neutral short reply, then lets Kaira steer locally", async () => {
    let providerCalls = 0;
    const message = "bilmiyom daha";
    const result = await resolveServerLanguageUnderstanding({
      message,
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
        return JSON.stringify({
          schemaVersion: SEMANTIC_INTERPRETATION_SCHEMA_VERSION,
          raw: message,
          normalized: message,
          primaryIntent: "smalltalk",
          secondarySocialActs: [],
          target: "unknown",
          valence: "neutral",
          severity: { disrespect: 0, coercion: 0, manipulation: 0, privacy: 0, aggression: 0 },
          jokingConfidence: 0,
          sincerityConfidence: 0.8,
          affection: 0,
          support: 0,
          compliment: 0,
          emotionalLoad: 0.1,
          apology: false,
          repairAttempt: false,
          stopRequest: false,
          discourseFacets: {
            socialRoutine: "none",
            shortUtteranceShape: true,
            discourseAct: "none",
            repairSignal: "none",
            adviceRequested: false,
            knowledgeQuery: null,
            selfMemoryQuery: null,
            relationalAct: "none",
            relationalIntensity: 0,
            stopQuestions: false,
            stopTalking: false,
          },
          propositions: [{
            id: "p1",
            content: message,
            modality: "statement",
            confidence: 0.9,
            provenance: ["current_turn"],
          }],
          worldMemory: { claims: [], query: null },
          uncertainty: { overall: 0.12, intent: 0.08, target: 0.2, severity: 0.04 },
          evidence: [{ source: "llm", cues: ["neutral_short_reply"], confidence: 0.9 }],
        });
      },
    });

    expect(providerCalls).toBe(1);
    expect(result.semanticSource).toBe("semantic_provider");
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
    expect(realized.reply).toMatch(/acele yok|sorun değil|rahat ol/iu);
    expect(realized.reply).not.toMatch(/ilk adımı|başlangıcı toparlayayım|nasıl bir ortam/iu);
  });


  it.each([
    "sen ne yapıcaksın",
    "kaira sen ne yapıcaksın",
    "sen ne işe yarıyorsun",
    "burda sen ne yapıcaksın",
    "görevin ne",
  ])("classifies Kaira role question canonically: %s", async (message) => {
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
          { role: "assistant", content: "Selam 😄 ben Kaira. Sunucuyu yönetirken yanında olacağım." },
        ],
      },
      generateText: async () => {
        providerCalls += 1;
        throw new Error("semantic_provider_should_not_be_needed_for_kaira_role");
      },
    });

    expect(providerCalls).toBe(0);
    expect(result.interpretation.primaryIntent).toBe("question");
    expect(result.interpretation.target).toBe("kaira");
    expect(result.interpretation.discourseFacets.platformScopeQuery).toBe("kaira_role");
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

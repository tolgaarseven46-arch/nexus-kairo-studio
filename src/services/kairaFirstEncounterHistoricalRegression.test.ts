import { describe, expect, it } from "vitest";
import {
  findDialogueDecisionIssues,
  planDialogueResponse,
  type DialogueDecisionPlan,
} from "./kairoDialogueDecisionEngine";
import { resolveServerLanguageUnderstanding } from "./serverLanguageUnderstanding";
import { decideKairaWelcome } from "./kairaWelcomeDecision";
import { realizeKairaWelcome } from "./kairaWelcomeRealizer";
import { realizeKairaFirstEncounterRoutine } from "./kairaFirstEncounterRoutineRealizer";
import { realizeKairaFirstEncounterContext } from "./kairaFirstEncounterContextRealizer";

const welcomeHistory = [
  {
    sender: "droit" as const,
    text: "Selam, ben Kaira. Burayı birlikte güzel bir ortama çeviririz.",
    participantName: "Kaira",
  },
];

const firstEncounterPlan = (move: "natural_reaction" | "answer_or_clarify") =>
  ({
    move,
    stance: "open",
    register: "casual",
    relationshipLevel: "new",
    continueConversation: true,
    allowQuestion: true,
    allowHumor: true,
    allowAffection: false,
    allowAdvice: false,
    allowForgiveness: false,
    allowReopeningCloseness: false,
    maxSentences: 2,
    maxWords: 24,
    emojiBudget: 1,
    reasons: [],
  }) as any;

describe("first encounter historical RED -> GREEN fixtures", () => {
  it("RED-1: 'naber' uses canonical fast semantics and never degrades to generic acknowledgement", async () => {
    let providerCalls = 0;
    const understanding = await resolveServerLanguageUnderstanding({
      message: "naber",
      preferredProvider: "openrouter",
      generateText: async () => {
        providerCalls += 1;
        throw new Error("provider_should_not_be_called");
      },
      preferTrivialSocialFastPath: true,
      firstEncounterContext: { roomName: "kankalar", isOwner: true },
    });

    const plan = planDialogueResponse(
      welcomeHistory,
      "naber",
      "Tolga",
      understanding.event,
      undefined,
      undefined,
    );
    const realized = realizeKairaFirstEncounterRoutine({
      requestId: "req_naber",
      event: understanding.event,
      plan: firstEncounterPlan(plan.move as any),
    });

    expect(providerCalls).toBe(0);
    expect(understanding.event.socialRoutine).toBe("how_are_you");
    expect(realized.handled).toBe(true);
    expect(realized.reply).toBeTruthy();
    expect(realized.reply).not.toMatch(
      /^(?:he|hee|hmm|anladım|he anladım|tamam)[.!…]*$/iu,
    );
  });

  it("RED-2: room-context question becomes a canonical answer obligation without provider latency", async () => {
    let providerCalls = 0;
    const understanding = await resolveServerLanguageUnderstanding({
      message: "napıyoruz burada",
      preferredProvider: "openrouter",
      generateText: async () => {
        providerCalls += 1;
        throw new Error("provider_should_not_be_called");
      },
      preferTrivialSocialFastPath: true,
      firstEncounterContext: { roomName: "kankalar", isOwner: true },
    });

    const plan = planDialogueResponse(
      welcomeHistory,
      "napıyoruz burada",
      "Tolga",
      understanding.event,
      undefined,
      undefined,
    );
    const realized = realizeKairaFirstEncounterContext({
      requestId: "req_room_context",
      interpretation: understanding.interpretation,
      plan: firstEncounterPlan(plan.move as any),
      context: { roomName: "kankalar", isOwner: true },
    });

    expect(providerCalls).toBe(0);
    expect(plan.move).toBe("answer_or_clarify");
    expect(plan.obligation?.type).toBe("answer_or_clarify");
    expect(realized.handled).toBe(true);
    expect(realized.reply).toMatch(/kankalar|odan|oda/iu);
  });

  it("RED-3: direct-question obligation rejects dressed-up acknowledgement", () => {
    const plan: DialogueDecisionPlan = {
      move: "answer_or_clarify",
      allowFollowUpQuestion: true,
      allowSpeculation: false,
      maxSentences: 2,
      maxWords: 24,
      hasSupportedTargetClaim: false,
      reason: "direct question",
      obligation: {
        type: "answer_or_clarify",
        satisfactionCriteria: {
          forbiddenResponseClasses: ["acknowledgement_only"],
          allowedResolutions: [
            "fulfill_now",
            "clarify",
            "decline_explicit",
            "defer_explicit",
          ],
        },
      },
    };

    expect(findDialogueDecisionIssues("heh, baya net söyledin", plan)).toContain(
      "DialogueDecision obligation karşılanmadı: answer_or_clarify yalnız acknowledgement ile kapatılamaz",
    );
  });

  it("RED-4: room-created welcome variants avoid scripted/customer-support language", () => {
    const decision = decideKairaWelcome({
      eventType: "room.created",
      actorDisplayName: "Oyuncu",
      roomName: "kankalar",
      isOwner: true,
    });

    const seen = new Map<string, string>();
    for (let i = 0; i < 256 && seen.size < 8; i += 1) {
      const realized = realizeKairaWelcome({
        eventId: `historical_welcome_${i}`,
        kairaInstanceId: "kaira_reference_001",
        actorDisplayName: "Oyuncu",
        roomName: "kankalar",
        decision,
      });
      seen.set(realized.variantId, realized.text);
    }

    expect(seen.size).toBe(8);
    for (const text of seen.values()) {
      expect(text).toMatch(/Kaira/u);
      expect(text).not.toMatch(
        /baskı yok|hayırlı olsun demeyeyim|müşteri|asistan|Droit/iu,
      );
      expect(text).not.toMatch(
        /\b(?:Oyuncu|Beta Kullanıcısı|Kullanıcı|Siz)\b/iu,
      );
      expect(text).not.toMatch(
        /^(?:selam|merhaba|hey|hoş geldin)[,!\s]+sen\b/iu,
      );
    }
  });
});

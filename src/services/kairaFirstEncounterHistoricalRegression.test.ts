import { describe, expect, it } from "vitest";
import { interpretSemanticEvent } from "./semanticEventEngine";
import {
  buildGroundedDialogueFallback,
  findDialogueDecisionIssues,
  planDialogueResponse,
  type DialogueDecisionPlan,
} from "./kairoDialogueDecisionEngine";
import { decideKairaWelcome } from "./kairaWelcomeDecision";
import { realizeKairaWelcome } from "./kairaWelcomeRealizer";

const welcomeHistory = [
  {
    sender: "droit" as const,
    text: "Selam, ben Kaira. Burayı birlikte güzel bir ortama çeviririz.",
    participantName: "Kaira",
  },
];

describe("first encounter historical RED fixtures", () => {
  it("RED-1: 'naber' can never degrade to generic acknowledgement", () => {
    const event = interpretSemanticEvent("naber");
    const plan = planDialogueResponse(
      welcomeHistory,
      "naber",
      "Tolga",
      event,
      undefined,
      undefined,
    );
    const fallback = buildGroundedDialogueFallback(
      plan,
      welcomeHistory,
      "naber",
      "Tolga",
    );

    expect(event.socialRoutine).toBe("how_are_you");
    expect(fallback).toBeTruthy();
    expect(fallback).not.toMatch(/^(?:he|hee|hmm|anladım|he anladım|tamam)[.!…]*$/iu);
  });

  it("RED-2: first-encounter room-context question creates answer obligation", () => {
    const event = interpretSemanticEvent("napıyoruz burada");
    const plan = planDialogueResponse(
      welcomeHistory,
      "napıyoruz burada",
      "Tolga",
      event,
      undefined,
      undefined,
    );

    expect(plan.move).toBe("answer_or_clarify");
    expect(plan.obligation?.type).toBe("answer_or_clarify");
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
          allowedResolutions: ["fulfill_now", "clarify", "decline_explicit", "defer_explicit"],
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
      expect(text).not.toMatch(/baskı yok|hayırlı olsun demeyeyim|müşteri|asistan|Droit/iu);
      expect(text).not.toMatch(/(?:Oyuncu|Beta Kullanıcısı|Kullanıcı|Siz)/iu);
    }
  });
});

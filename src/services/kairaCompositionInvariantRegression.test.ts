import { describe, expect, it } from "vitest";
import { interpretationFromRegexFloor } from "./semanticInterpretationLegacyProjection";
import { projectSemanticEvent } from "./semanticInterpretationProjection";
import { isTurkishQuestionAct } from "./kairaQuestionActRecognizer";
import { removeForbiddenQuestionUnits } from "./kairaDeliveredQuestionConstraint";
import {
  KAIRA_FINAL_REJECTION_FALLBACK,
  resolveKairaFinalDelivery,
} from "./kairaFinalDeliveryGate";

describe("cross-layer composition invariants", () => {
  it("suppresses reciprocal routines for explicit non-Kaira targets", () => {
    const base = interpretationFromRegexFloor("test");
    for (const target of ["self", "third_party", "event"] as const) {
      const interpretation = {
        ...base,
        target,
        discourseFacets: {
          ...base.discourseFacets,
          socialRoutine: "what_doing" as const,
        },
      };
      expect(projectSemanticEvent(interpretation).socialRoutine).toBe("none");
    }
  });

  it("suppresses an unknown-target reciprocal routine when canonical first-party state evidence is present", () => {
    const base = interpretationFromRegexFloor("iyi beya çay içiyom");
    const interpretation = {
      ...base,
      target: "unknown",
      discourseFacets: {
        ...base.discourseFacets,
        socialRoutine: "what_doing",
      },
      worldMemory: {
        claims: [
          {
            subjectId: "current_user",
            attributeKey: "current_activity",
            value: "drinking_tea",
            confidence: 0.95,
          },
        ],
        query: null,
      },
    } as any;

    expect(projectSemanticEvent(interpretation).socialRoutine).toBe("none");
  });

  it("preserves a genuinely unresolved reciprocal greeting and a Kaira-targeted routine", () => {
    const base = interpretationFromRegexFloor("naber şimdi");
    const unresolved = {
      ...base,
      target: "unknown" as const,
      discourseFacets: {
        ...base.discourseFacets,
        socialRoutine: "how_are_you" as const,
      },
    };
    expect(projectSemanticEvent(unresolved).socialRoutine).toBe("how_are_you");

    const kairaDirected = {
      ...base,
      target: "kaira" as const,
      discourseFacets: {
        ...base.discourseFacets,
        socialRoutine: "what_doing" as const,
      },
    };
    expect(projectSemanticEvent(kairaDirected).socialRoutine).toBe("what_doing");
  });

  it("recognizes a structural bare-ne second-person question without treating bare-ne as universally interrogative", () => {
    expect(isTurkishQuestionAct("aç bi şeyler de ortam değişsin, ne tarz açıyosun şimdi")).toBe(true);
    expect(isTurkishQuestionAct("ne güzel açmışsın")).toBe(false);
    expect(isTurkishQuestionAct("ne bileyim ya")).toBe(false);
  });

  it("preserves an allowed reaction while removing a forbidden semicolon-separated question unit", () => {
    expect(
      removeForbiddenQuestionUnits(
        "ooo tamam, beat giriyor o zaman; eski Türkçe rap mı yeni nesil mi açtın şimdi",
        false,
      ),
    ).toBe("ooo tamam, beat giriyor o zaman;");
  });

  it("never persists an empty assistant turn when final delivery rejects a candidate", () => {
    const decision = resolveKairaFinalDelivery("yasaklı aday?", {
      accepted: false,
      score: 70,
      issues: ["response_plan_question_blocked"],
    });

    expect(decision.accepted).toBe(false);
    expect(decision.candidateReply).toBe("yasaklı aday?");
    expect(decision.persistedReply).toBe(KAIRA_FINAL_REJECTION_FALLBACK);
    expect(decision.persistedReply.trim().length).toBeGreaterThan(0);
  });
});

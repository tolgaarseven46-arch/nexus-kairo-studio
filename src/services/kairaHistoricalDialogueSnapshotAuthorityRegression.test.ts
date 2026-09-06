import { describe, expect, it } from "vitest";
import { buildDialogueClaimLedger } from "./kairoDialogueChaosEngine";
import { effectivelySupportedClaims } from "./claimProvenance";
import { interpretationFromRegexFloor } from "./semanticInterpretationLegacyProjection";
import type { ConversationTurn } from "./kairoConversationGrounding";

describe("historical dialogue semantic snapshot authority", () => {
  it("does not let raw historical correction regex override a persisted canonical non-correction snapshot", () => {
    const canonicalNoCorrection = interpretationFromRegexFloor("hayır");
    canonicalNoCorrection.discourseFacets = {
      ...canonicalNoCorrection.discourseFacets,
      discourseAct: "none",
      repairSignal: "none",
    };

    const history: ConversationTurn[] = [
      {
        sender: "user",
        participantId: "mert",
        participantName: "Mert",
        text: "Emre yarın istifa edecek.",
      },
      {
        sender: "user",
        participantId: "ali",
        participantName: "Ali",
        text: "hayır",
        semanticInterpretation: canonicalNoCorrection,
        semanticSource: "semantic_provider",
      },
    ];

    const ledger = buildDialogueClaimLedger(history, "tamam", "Tolga");
    const effective = effectivelySupportedClaims(ledger);

    expect(ledger.some((claim) => claim.status === "denial")).toBe(false);
    expect(
      effective.some(
        (claim) =>
          claim.subject === "Emre" &&
          claim.proposition === "Emre yarın istifa edecek.",
      ),
    ).toBe(true);
  });

  it("keeps raw parsing only for historical turns that genuinely lack a canonical snapshot", () => {
    const history: ConversationTurn[] = [
      {
        sender: "user",
        participantId: "mert",
        participantName: "Mert",
        text: "Emre yarın istifa edecek.",
      },
      {
        sender: "user",
        participantId: "ali",
        participantName: "Ali",
        text: "hayır",
      },
    ];

    const ledger = buildDialogueClaimLedger(history, "tamam", "Tolga");
    expect(ledger.some((claim) => claim.status === "denial")).toBe(true);
  });
});

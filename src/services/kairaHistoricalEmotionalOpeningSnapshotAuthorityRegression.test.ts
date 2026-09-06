import { describe, expect, it } from "vitest";
import type { ConversationTurn } from "./kairoConversationGrounding";
import { planDialogueResponse } from "./kairoDialogueDecisionEngine";
import { projectSemanticEventToDialogueAnalysis } from "./kairaDialogueTurnProjection";
import { interpretationFromRegexFloor } from "./semanticInterpretationLegacyProjection";
import { projectSemanticEvent } from "./semanticInterpretationProjection";

describe("historical emotional-opening semantic snapshot authority", () => {
  const currentOpening = () => {
    const interpretation = interpretationFromRegexFloor("üzgünüm");
    interpretation.primaryIntent = "emotional_share";
    interpretation.target = "unknown";
    interpretation.discourseFacets = {
      ...interpretation.discourseFacets,
      socialRoutine: "emotional_opening",
      discourseAct: "none",
      adviceRequested: false,
    };
    const event = projectSemanticEvent(interpretation);
    return { event, analysis: projectSemanticEventToDialogueAnalysis(event) };
  };

  it("does not let raw historical text suppress a first opening when the persisted snapshot says it was not emotional", () => {
    const canonicalNonOpening = interpretationFromRegexFloor("moralim bozuk");
    canonicalNonOpening.primaryIntent = "smalltalk";
    canonicalNonOpening.discourseFacets = {
      ...canonicalNonOpening.discourseFacets,
      socialRoutine: "none",
      discourseAct: "none",
    };

    const history: ConversationTurn[] = [
      {
        sender: "user",
        participantId: "tolga",
        participantName: "Tolga",
        text: "moralim bozuk",
        semanticInterpretation: canonicalNonOpening,
        semanticSource: "semantic_provider",
      },
    ];
    const { event, analysis } = currentOpening();

    const plan = planDialogueResponse(history, "üzgünüm", "Tolga", event, analysis);
    expect(plan.move).toBe("invite_emotional_context");
  });

  it("keeps legacy raw-history compatibility when no semantic snapshot exists", () => {
    const history: ConversationTurn[] = [
      {
        sender: "user",
        participantId: "tolga",
        participantName: "Tolga",
        text: "moralim bozuk",
      },
    ];
    const { event, analysis } = currentOpening();

    const plan = planDialogueResponse(history, "üzgünüm", "Tolga", event, analysis);
    expect(plan.move).not.toBe("invite_emotional_context");
  });
});

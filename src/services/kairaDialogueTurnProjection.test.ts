import { describe, expect, it } from "vitest";
import { interpretSemanticEvent } from "./semanticEventEngine";
import { projectSemanticEventToDialogueAnalysis } from "./kairaDialogueTurnProjection";

describe("canonical current-turn dialogue projection", () => {
  it("derives discourse acts from SemanticEvent", () => {
    const event = interpretSemanticEvent("ne diyon aq");
    const analysis = projectSemanticEventToDialogueAnalysis(event);
    expect(analysis.acts).toContain("confusion_or_challenge");
    expect(analysis.acts).not.toContain("question");
  });

  it("preserves recall as a question-like non-factual turn", () => {
    const event = interpretSemanticEvent("Mert yarın ne yapacaktı?");
    const analysis = projectSemanticEventToDialogueAnalysis(event);
    expect(event.discourseAct).toBe("recall_request");
    expect(analysis.acts).toContain("question");
    expect(analysis.factConfidence).toBeLessThanOrEqual(0.3);
  });

  it("keeps durable-memory candidacy separate from semantic intent", () => {
    const event = interpretSemanticEvent("benim adım Tolga");
    const analysis = projectSemanticEventToDialogueAnalysis(event);
    expect(analysis.memoryScope).toBe("durable_candidate");
  });
});

import { describe, expect, it } from "vitest";
import { recognizeCanonicalDiscourseSignals } from "./semanticDiscourseFacetRecognizer";
import { interpretationFromLegacyEvent } from "./semanticInterpretationLegacyProjection";
import { interpretSemanticEvent } from "./semanticEventEngine";
import { projectSemanticEvent } from "./semanticInterpretationProjection";
import { reduceDiscourseState } from "./discourseStateReducer";
import { EMPTY_DISCOURSE_STATE } from "../types/discourseState";

function canonicalEvent(message: string) {
  const base = interpretationFromLegacyEvent(interpretSemanticEvent(message), message);
  const signals = recognizeCanonicalDiscourseSignals(message);
  return projectSemanticEvent({
    ...base,
    discourseFacets: {
      ...base.discourseFacets,
      ...signals,
    },
  });
}

describe("canonical discourse shape authority", () => {
  it("recognizes short and activity-answer shapes at ingestion", () => {
    expect(recognizeCanonicalDiscourseSignals("evde takılıyorum").shortUtteranceShape).toBe(true);
    expect(recognizeCanonicalDiscourseSignals("evde takılıyorum").activityAnswerShape).toBe(true);
    expect(recognizeCanonicalDiscourseSignals("bugün uzun uzun evde oturup proje üzerinde çalışıyorum").shortUtteranceShape).toBe(false);
  });

  it("lets DiscourseState consume canonical activity-answer evidence", () => {
    const asked = reduceDiscourseState(EMPTY_DISCOURSE_STATE, {
      actor: "kaira",
      reply: "ne yapıyorsun",
    });
    const event = canonicalEvent("evde takılıyorum");
    const answered = reduceDiscourseState(asked, {
      actor: "user",
      message: "yüzey artık reducer tarafından parse edilmemeli",
      event: { ...event, activityAnswerShape: true, shortUtteranceShape: false },
    });
    expect(answered.pendingQuestion?.answered).toBe(true);
  });
});

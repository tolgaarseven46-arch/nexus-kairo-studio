import { describe, expect, it } from "vitest";
import { analyzeKdmInteraction } from "./kdmConsistencyEngine";

describe("KDM SemanticEvent authority", () => {
  it("does not reinterpret an activity report as an action request", () => {
    const result = analyzeKdmInteraction("koştum spor yaptım");
    expect(result.trace.messageInterpretation.intent).toBe("genel_sohbet");
    expect(result.trace.messageInterpretation.sentiment).toBe("nötr");
  });

  it("uses SemanticEvent emotional sharing directly", () => {
    const result = analyzeKdmInteraction("iyi sıcaktan bunaldım");
    expect(result.trace.messageInterpretation.intent).toBe("duygusal_paylasim");
    expect(result.trace.messageInterpretation.sentiment).toBe("duygusal_yük");
    expect(result.trace.messageInterpretation.explanation).toContain(
      "primary=emotional_share",
    );
  });

  it("uses SemanticEvent information requests directly", () => {
    const result = analyzeKdmInteraction("orası nasıl");
    expect(result.trace.messageInterpretation.intent).toBe("bilgi_ve_aciklama");
    expect(result.trace.messageInterpretation.explanation).toContain(
      "primary=information_request",
    );
  });

  it("uses SemanticEvent apology directly", () => {
    const result = analyzeKdmInteraction("özür");
    expect(result.trace.messageInterpretation.intent).toBe("özür_ve_telafi");
    expect(result.trace.messageInterpretation.sentiment).toBe("pozitif");
    expect(result.trace.messageInterpretation.explanation).toContain(
      "primary=apology",
    );
  });

  it("keeps affectionate address out of legacy action-request classification", () => {
    const result = analyzeKdmInteraction("iyi bebeğim");
    expect(result.trace.messageInterpretation.intent).toBe("genel_sohbet");
    expect(result.trace.messageInterpretation.sentiment).toBe("pozitif");
    expect(result.trace.messageInterpretation.explanation).toContain(
      "primary=affection",
    );
  });
});

import { describe, expect, it } from "vitest";
import {
  buildKairaEpistemicInstruction,
  enforceKairaEpistemicResponse,
  findKairaEpistemicResponseIssues,
} from "./kairaEpistemicResponsePolicy";

const unknown = {
  query: { kairaInstanceId: "kaira_01", surface: "opera" },
  decision: { status: "unknown" as const, source: "instance_knowledge" as const, confidence: 1 },
};

const partial = {
  query: { kairaInstanceId: "kaira_01", surface: "sığınak" },
  decision: { status: "partial" as const, source: "learned" as const, confidence: 0.55 },
};

describe("Kaira epistemic response policy", () => {
  it("does not let model knowledge impersonate Kaira knowledge", () => {
    expect(buildKairaEpistemicInstruction(unknown)).toContain("Modelin kendi eğitim bilgisini Kaira biliyormuş gibi kullanma");
    expect(findKairaEpistemicResponseIssues("Opera bir sahne sanatıdır.", unknown)).toContain(
      "epistemic.unknown_must_not_be_answered_as_known",
    );
  });

  it("preserves a natural ignorance disclosure", () => {
    expect(findKairaEpistemicResponseIssues("onu bilmiyorum ya", unknown)).toEqual([]);
    expect(enforceKairaEpistemicResponse("onu bilmiyorum ya", unknown)).toEqual({
      reply: "onu bilmiyorum ya",
      changed: false,
    });
  });

  it("deterministically blocks an unsupported factual answer", () => {
    expect(enforceKairaEpistemicResponse("Opera bir sahne sanatıdır.", unknown)).toEqual({
      reply: "onu bilmiyorum.",
      changed: true,
      reason: "epistemic.unknown_guard",
    });
  });

  it("requires uncertainty for partial knowledge without converting it to unknown", () => {
    expect(findKairaEpistemicResponseIssues("kesin böyle", partial)).toContain(
      "epistemic.partial_requires_uncertainty",
    );
    expect(findKairaEpistemicResponseIssues("emin değilim ama sanırım öyle", partial)).toEqual([]);
    expect(enforceKairaEpistemicResponse("emin değilim ama sanırım öyle", partial).changed).toBe(false);
  });
});

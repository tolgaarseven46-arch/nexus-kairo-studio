import { describe, expect, it } from "vitest";
import {
  hasMorphologyTag,
  morphologyAnalysesAgreeOnTag,
  morphologyTokenIsUnresolved,
  type TurkishMorphTokenEvidence,
} from "../types/turkishLinguisticEvidence";

describe("Turkish linguistic evidence contract", () => {
  it("preserves competing parses instead of collapsing ambiguity", () => {
    const token: TurkishMorphTokenEvidence = {
      surface: "mi",
      analyses: [
        { lemma: "mi", pos: "NOUN", morphemes: ["A3SG", "PNON", "NOM"] },
        { lemma: "mi", pos: "QUES", morphemes: ["QUES", "PRES", "A3SG"] },
      ],
    };
    expect(hasMorphologyTag(token, "QUES")).toBe(true);
    expect(morphologyAnalysesAgreeOnTag(token, "QUES")).toBe(false);
  });

  it("represents zero-parse without manufacturing a best analysis", () => {
    const token: TurkishMorphTokenEvidence = {
      surface: "kimlerle",
      analyses: [],
    };
    expect(morphologyTokenIsUnresolved(token)).toBe(true);
    expect(hasMorphologyTag(token, "QUES")).toBe(false);
  });

  it("allows unanimous NEG evidence to remain explicit", () => {
    const token: TurkishMorphTokenEvidence = {
      surface: "dilemiyorum",
      analyses: [
        { lemma: "dil", pos: "VERB", morphemes: ["ABLE", "NEG", "PROG1", "A1SG"] },
        { lemma: "dile", pos: "VERB", morphemes: ["NEG", "PROG1", "A1SG"] },
      ],
    };
    expect(morphologyAnalysesAgreeOnTag(token, "NEG")).toBe(true);
  });
});

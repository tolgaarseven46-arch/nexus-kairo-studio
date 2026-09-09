import { describe, expect, it } from "vitest";
import type {
  SemanticPrimaryIntent,
  SemanticSocialRoutine,
} from "../types/semanticInterpretation";

/**
 * Phase-6 characterization only.
 *
 * This file intentionally does NOT parse raw Turkish text and is not imported by
 * production runtime. It proves that typed L2/L3 evidence is sufficient to make
 * a few bounded canonical decisions at the L6 seam without creating a second
 * production semantic authority.
 */
type ShadowMorphAnalysis = {
  lemma: string;
  tags: string[];
};

type ShadowTokenEvidence = {
  surface: string;
  analyses: ShadowMorphAnalysis[];
};

type ShadowLexicalEvidence = {
  socialRoutine?: Exclude<SemanticSocialRoutine, "none">;
  concept?: "apology" | "advice";
};

type ShadowSyntaxEvidence = {
  /** A question-particle analysis is scoped to a clause, not merely a homograph. */
  polarQuestionClause?: boolean;
};

type ShadowInput = {
  morphology: ShadowTokenEvidence[];
  lexical?: ShadowLexicalEvidence;
  syntax?: ShadowSyntaxEvidence;
};

type ShadowDecision = {
  primaryIntent: SemanticPrimaryIntent;
  socialRoutine: SemanticSocialRoutine;
  apology: boolean;
  adviceRequested: boolean;
  uncertainty: number;
  provenance: string[];
};

const hasTag = (input: ShadowInput, tag: string) =>
  input.morphology.some((token) =>
    token.analyses.some((analysis) => analysis.tags.includes(tag)),
  );

const allAnalysesAgree = (token: ShadowTokenEvidence, tag: string) =>
  token.analyses.length > 0 && token.analyses.every((analysis) => analysis.tags.includes(tag));

function adjudicateTypedShadow(input: ShadowInput): ShadowDecision {
  const routine = input.lexical?.socialRoutine ?? "none";
  const negated = hasTag(input, "NEG");
  const questionTokens = input.morphology.filter((token) =>
    token.analyses.some((analysis) => analysis.tags.includes("QUES")),
  );
  const unambiguousQuestionParticle = questionTokens.some((token) => allAnalysesAgree(token, "QUES"));
  const clauseQuestion = Boolean(input.syntax?.polarQuestionClause) && questionTokens.length > 0;

  if (routine !== "none") {
    const primaryIntent: SemanticPrimaryIntent = routine === "greeting" ? "greeting" : "smalltalk";
    return {
      primaryIntent,
      socialRoutine: routine,
      apology: false,
      adviceRequested: false,
      uncertainty: 0.1,
      provenance: ["lexical:socialRoutine"],
    };
  }

  if (input.lexical?.concept === "apology") {
    return {
      primaryIntent: negated ? "smalltalk" : "apology",
      socialRoutine: "none",
      apology: !negated,
      adviceRequested: false,
      uncertainty: 0.15,
      provenance: ["lexical:apology", negated ? "morphology:NEG" : "morphology:POS"],
    };
  }

  if (input.lexical?.concept === "advice") {
    return {
      primaryIntent: negated ? "smalltalk" : "information_request",
      socialRoutine: "none",
      apology: false,
      adviceRequested: !negated,
      uncertainty: 0.15,
      provenance: ["lexical:advice", negated ? "morphology:NEG" : "morphology:POS"],
    };
  }

  if (clauseQuestion || unambiguousQuestionParticle) {
    return {
      primaryIntent: "information_request",
      socialRoutine: "none",
      apology: false,
      adviceRequested: false,
      uncertainty: clauseQuestion ? 0.12 : 0.2,
      provenance: ["morphology:QUES", ...(clauseQuestion ? ["syntax:polarQuestionClause"] : [])],
    };
  }

  if (questionTokens.length > 0) {
    return {
      primaryIntent: "other",
      socialRoutine: "none",
      apology: false,
      adviceRequested: false,
      uncertainty: 0.75,
      provenance: ["morphology:QUES_AMBIGUOUS"],
    };
  }

  return {
    primaryIntent: "other",
    socialRoutine: "none",
    apology: false,
    adviceRequested: false,
    uncertainty: 0.6,
    provenance: [],
  };
}

describe("Phase-6 local semantic shadow prototype", () => {
  it.each([
    ["greeting", "greeting", "greeting"],
    ["how_are_you", "smalltalk", "how_are_you"],
    ["what_doing", "smalltalk", "what_doing"],
  ] as const)("maps typed %s routine evidence without raw-text parsing", (routine, intent, expectedRoutine) => {
    const result = adjudicateTypedShadow({
      morphology: [],
      lexical: { socialRoutine: routine },
    });
    expect(result.primaryIntent).toBe(intent);
    expect(result.socialRoutine).toBe(expectedRoutine);
    expect(result.provenance).toContain("lexical:socialRoutine");
  });

  it("uses NEG morphology to block a positive apology reading", () => {
    const result = adjudicateTypedShadow({
      lexical: { concept: "apology" },
      morphology: [{
        surface: "dilemiyorum",
        analyses: [
          { lemma: "dil", tags: ["VERB", "ABLE", "NEG", "PROG1", "A1SG"] },
          { lemma: "dile", tags: ["VERB", "NEG", "PROG1", "A1SG"] },
        ],
      }],
    });
    expect(result.apology).toBe(false);
    expect(result.primaryIntent).not.toBe("apology");
    expect(result.provenance).toContain("morphology:NEG");
  });

  it("preserves affirmative apology when NEG evidence is absent", () => {
    const result = adjudicateTypedShadow({
      lexical: { concept: "apology" },
      morphology: [{
        surface: "dilerim",
        analyses: [{ lemma: "dile", tags: ["VERB", "POS", "AOR", "A1SG"] }],
      }],
    });
    expect(result.apology).toBe(true);
    expect(result.primaryIntent).toBe("apology");
  });

  it("uses a clause-scoped QUES particle as information-request evidence", () => {
    const result = adjudicateTypedShadow({
      morphology: [{
        surface: "mı",
        analyses: [{ lemma: "mi", tags: ["QUES", "PRES", "A3SG"] }],
      }],
      syntax: { polarQuestionClause: true },
    });
    expect(result.primaryIntent).toBe("information_request");
    expect(result.provenance).toEqual(expect.arrayContaining(["morphology:QUES", "syntax:polarQuestionClause"]));
  });

  it("does not force a question from an ambiguous mi homograph without clause evidence", () => {
    const result = adjudicateTypedShadow({
      morphology: [{
        surface: "mi",
        analyses: [
          { lemma: "mi", tags: ["NOUN", "A3SG", "PNON", "NOM"] },
          { lemma: "mi", tags: ["QUES", "PRES", "A3SG"] },
        ],
      }],
    });
    expect(result.primaryIntent).toBe("other");
    expect(result.uncertainty).toBeGreaterThanOrEqual(0.7);
    expect(result.provenance).toContain("morphology:QUES_AMBIGUOUS");
  });
});

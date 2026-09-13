import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const semanticTypes = readFileSync(new URL("../types/semanticInterpretation.ts", import.meta.url), "utf8");

/**
 * Characterization only: these tests intentionally describe the minimum typed
 * contract required before fragmented/compound Discord-style text can safely
 * reach persistent reducers. Production behavior must not be patched until the
 * RED is classified at the owning seam.
 */
describe("text episode + modality characterization", () => {
  it("RED: canonical semantics can represent multiple bounded propositions in one episode", () => {
    expect(semanticTypes).toMatch(/interface\s+SemanticProposition\b/u);
    expect(semanticTypes).toMatch(/propositions\??\s*:\s*SemanticProposition\[\]/u);
  });

  it("RED: every proposition carries typed modality so non-facts cannot become persistent facts", () => {
    expect(semanticTypes).toMatch(/type\s+SemanticModality\s*=\s*[\s\S]*"assertion"[\s\S]*"question"[\s\S]*"hypothetical"[\s\S]*"wish"[\s\S]*"prediction"/u);
    expect(semanticTypes).toMatch(/modality\s*:\s*SemanticModality/u);
  });

  it("RED: proposition contract preserves identity/time/confidence/provenance instead of flattening the episode", () => {
    expect(semanticTypes).toMatch(/interface\s+SemanticProposition[\s\S]*actorId\??\s*:\s*string/u);
    expect(semanticTypes).toMatch(/interface\s+SemanticProposition[\s\S]*temporalAnchor/u);
    expect(semanticTypes).toMatch(/interface\s+SemanticProposition[\s\S]*confidence\s*:\s*number/u);
    expect(semanticTypes).toMatch(/interface\s+SemanticProposition[\s\S]*provenance/u);
  });
});

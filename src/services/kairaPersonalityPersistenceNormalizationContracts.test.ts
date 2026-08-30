import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const service = fs.readFileSync(path.resolve(process.cwd(), "src/services/droitPersonalityService.ts"), "utf8");

describe("personality persistence normalization boundary", () => {
  it("normalizes flat traits before structured Firestore serialization", () => {
    expect(service).toContain("const normalized = normalizeDroitPersonality(traits);");
    expect(service).toContain("Number(normalized.humor ?? 50)");
    expect(service).toContain("normalized.decisionMaking ?? normalized.decisiveness ?? 50");
    expect(service).not.toContain("Number(traits.humor ?? 50)");
    expect(service).not.toContain("traits.decisionMaking ?? normalized.decisiveness");
  });

  it("normalizes mapped Firestore data before returning it to the UI", () => {
    expect(service).toContain("return normalizeDroitPersonality({\n    // DUYGUSAL");
    expect(service).toContain("return normalizeDroitPersonality(fallback);");
  });
});

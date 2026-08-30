import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8");
const service = read("src/services/droitPersonalityService.ts");
const normalizer = read("src/services/droitPersonalityNormalizer.ts");

describe("canonical personality default source", () => {
  it("keeps the neutral 50-profile in the lightweight normalizer module", () => {
    expect(normalizer).toContain("export const NEUTRAL_DROIT_PERSONALITY");
    expect(normalizer).not.toContain("firebase/firestore");
  });

  it("derives persistence defaults from the canonical neutral profile instead of duplicating the trait list", () => {
    expect(service).toMatch(/import \{[^}]*NEUTRAL_DROIT_PERSONALITY[^}]*\} from '\.\/droitPersonalityNormalizer';/);
    expect(service).toContain("DEFAULT_PERSONALITY_TRAITS: DroitPersonalityTraits = { ...NEUTRAL_DROIT_PERSONALITY }");
    expect(service).not.toMatch(/DEFAULT_PERSONALITY_TRAITS: DroitPersonalityTraits = \{\s*\/\/ DUYGUSAL/);
  });
});

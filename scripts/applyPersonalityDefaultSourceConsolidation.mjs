import fs from 'node:fs';

const servicePath = 'src/services/droitPersonalityService.ts';
let service = fs.readFileSync(servicePath, 'utf8');
const importAnchor = "import { db } from '../lib/firebase';\n";
const neutralImport = "import { NEUTRAL_DROIT_PERSONALITY } from './droitPersonalityNormalizer';\n";
if (!service.includes(neutralImport)) {
  if (!service.includes(importAnchor)) throw new Error('firebase import anchor not found');
  service = service.replace(importAnchor, importAnchor + neutralImport);
}
const defaultBlock = /export const DEFAULT_PERSONALITY_TRAITS: DroitPersonalityTraits = \{[\s\S]*?\n\};/;
if (!defaultBlock.test(service) && !service.includes('DEFAULT_PERSONALITY_TRAITS: DroitPersonalityTraits = { ...NEUTRAL_DROIT_PERSONALITY }')) {
  throw new Error('DEFAULT_PERSONALITY_TRAITS block not found');
}
service = service.replace(
  defaultBlock,
  'export const DEFAULT_PERSONALITY_TRAITS: DroitPersonalityTraits = { ...NEUTRAL_DROIT_PERSONALITY };',
);
if (!service.includes('DEFAULT_PERSONALITY_TRAITS: DroitPersonalityTraits = { ...NEUTRAL_DROIT_PERSONALITY }')) {
  throw new Error('personality service default was not consolidated');
}
fs.writeFileSync(servicePath, service);

const contractPath = 'src/services/kairaPersonalityDefaultSourceContracts.test.ts';
const contract = `import { describe, expect, it } from "vitest";\nimport fs from "node:fs";\nimport path from "node:path";\n\nconst read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8");\nconst service = read("src/services/droitPersonalityService.ts");\nconst normalizer = read("src/services/droitPersonalityNormalizer.ts");\n\ndescribe("canonical personality default source", () => {\n  it("keeps the neutral 50-profile in the lightweight normalizer module", () => {\n    expect(normalizer).toContain("export const NEUTRAL_DROIT_PERSONALITY");\n    expect(normalizer).not.toContain("firebase/firestore");\n  });\n\n  it("derives persistence defaults from the canonical neutral profile instead of duplicating the trait list", () => {\n    expect(service).toContain("import { NEUTRAL_DROIT_PERSONALITY } from './droitPersonalityNormalizer';");\n    expect(service).toContain("DEFAULT_PERSONALITY_TRAITS: DroitPersonalityTraits = { ...NEUTRAL_DROIT_PERSONALITY }");\n    expect(service).not.toMatch(/DEFAULT_PERSONALITY_TRAITS: DroitPersonalityTraits = \\{\\s*\\/\\/ DUYGUSAL/);\n  });\n});\n`;
fs.writeFileSync(contractPath, contract);

console.log('Consolidated personality defaults onto the lightweight neutral source');

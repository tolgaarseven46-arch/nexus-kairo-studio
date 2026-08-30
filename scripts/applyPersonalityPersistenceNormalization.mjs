import fs from 'node:fs';

const servicePath = 'src/services/droitPersonalityService.ts';
let service = fs.readFileSync(servicePath, 'utf8');
service = service.replace(
  "import { NEUTRAL_DROIT_PERSONALITY } from './droitPersonalityNormalizer';",
  "import { NEUTRAL_DROIT_PERSONALITY, normalizeDroitPersonality } from './droitPersonalityNormalizer';",
);

service = service.replace(
  `export function traitsToStructuredPersonality(\n  traits: DroitPersonalityTraits\n): StructuredDroitPersonality {\n  return {`,
  `export function traitsToStructuredPersonality(\n  traits: DroitPersonalityTraits\n): StructuredDroitPersonality {\n  const normalized = normalizeDroitPersonality(traits);\n  return {`,
);
service = service.replaceAll('Number(traits.', 'Number(normalized.');
service = service.replaceAll('traits.sensitivity', 'normalized.sensitivity');
service = service.replaceAll('traits.confidence', 'normalized.confidence');
service = service.replaceAll('traits.analytical', 'normalized.analytical');
service = service.replaceAll('traits.decisiveness', 'normalized.decisiveness');
service = service.replaceAll('traits.decisionMaking ?? normalized.decisiveness', 'normalized.decisionMaking ?? normalized.decisiveness');

service = service.replace(
  `  if (!rawPersonality || typeof rawPersonality !== 'object') {\n    return { ...fallback };\n  }`,
  `  if (!rawPersonality || typeof rawPersonality !== 'object') {\n    return normalizeDroitPersonality(fallback);\n  }`,
);
const mappedReturn = `  return {\n    // DUYGUSAL`;
if (!service.includes(mappedReturn) && !service.includes('return normalizeDroitPersonality({\n    // DUYGUSAL')) {
  throw new Error('structured personality mapped return not found');
}
service = service.replace(mappedReturn, `  return normalizeDroitPersonality({\n    // DUYGUSAL`);
const returnEndAnchor = `    initiative:\n      typeof cha.initiative === 'number'\n        ? cha.initiative\n        : (rawPersonality.initiative ?? fallback.initiative),\n  };\n}`;
const normalizedReturnEnd = `    initiative:\n      typeof cha.initiative === 'number'\n        ? cha.initiative\n        : (rawPersonality.initiative ?? fallback.initiative),\n  });\n}`;
if (!service.includes(returnEndAnchor) && !service.includes(normalizedReturnEnd)) {
  throw new Error('structured personality return end not found');
}
service = service.replace(returnEndAnchor, normalizedReturnEnd);

if (!service.includes('const normalized = normalizeDroitPersonality(traits);')) throw new Error('save mapping normalization missing');
if (!service.includes('return normalizeDroitPersonality({\n    // DUYGUSAL')) throw new Error('load mapping normalization missing');
if (service.includes('traits.decisionMaking ?? normalized.decisiveness')) throw new Error('raw decisionMaking bypass remains');
fs.writeFileSync(servicePath, service);

const contractPath = 'src/services/kairaPersonalityPersistenceNormalizationContracts.test.ts';
const contract = `import { describe, expect, it } from "vitest";\nimport fs from "node:fs";\nimport path from "node:path";\n\nconst service = fs.readFileSync(path.resolve(process.cwd(), "src/services/droitPersonalityService.ts"), "utf8");\n\ndescribe("personality persistence normalization boundary", () => {\n  it("normalizes flat traits before structured Firestore serialization", () => {\n    expect(service).toContain("const normalized = normalizeDroitPersonality(traits);");\n    expect(service).toContain("Number(normalized.humor ?? 50)");\n    expect(service).toContain("normalized.decisionMaking ?? normalized.decisiveness ?? 50");\n    expect(service).not.toContain("Number(traits.humor ?? 50)");\n    expect(service).not.toContain("traits.decisionMaking ?? normalized.decisiveness");\n  });\n\n  it("normalizes mapped Firestore data before returning it to the UI", () => {\n    expect(service).toContain("return normalizeDroitPersonality({\\n    // DUYGUSAL");\n    expect(service).toContain("return normalizeDroitPersonality(fallback);");\n  });\n});\n`;
fs.writeFileSync(contractPath, contract);

const defaultSourceContractPath = 'src/services/kairaPersonalityDefaultSourceContracts.test.ts';
let defaultSourceContract = fs.readFileSync(defaultSourceContractPath, 'utf8');
defaultSourceContract = defaultSourceContract.replace(
  'expect(service).toContain("import { NEUTRAL_DROIT_PERSONALITY } from \'./droitPersonalityNormalizer\';");',
  'expect(service).toMatch(/import \\{[^}]*NEUTRAL_DROIT_PERSONALITY[^}]*\\} from \'\\.\\/droitPersonalityNormalizer\';/);',
);
fs.writeFileSync(defaultSourceContractPath, defaultSourceContract);

console.log('Installed personality normalization on Firestore load/save mapping boundaries');

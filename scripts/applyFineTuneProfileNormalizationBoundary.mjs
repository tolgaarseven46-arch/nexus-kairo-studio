import fs from 'node:fs';

const normalizerPath = 'src/services/fineTuneProfileNormalizer.ts';
const normalizer = `export type FineTuneProfile = Record<string, number>;\n\nexport function normalizeFineTuneProfile(raw: unknown): FineTuneProfile {\n  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};\n  const normalized: FineTuneProfile = {};\n  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {\n    if (typeof value !== 'number' || !Number.isFinite(value)) continue;\n    normalized[key] = Math.max(0, Math.min(100, value));\n  }\n  return normalized;\n}\n`;
fs.writeFileSync(normalizerPath, normalizer);

const chatPath = 'src/services/droitChatService.ts';
let chat = fs.readFileSync(chatPath, 'utf8');
if (!chat.includes("from './fineTuneProfileNormalizer'")) {
  chat = chat.replace(
    'import { resolveKairaInstanceContext, type KairaInstanceType } from "./kairaInstanceContext";',
    'import { resolveKairaInstanceContext, type KairaInstanceType } from "./kairaInstanceContext";\nimport { normalizeFineTuneProfile } from "./fineTuneProfileNormalizer";',
  );
}
chat = chat.replace(
  '    const parsed = JSON.parse(raw);\n    return parsed && typeof parsed === "object" ? parsed : {};',
  '    return normalizeFineTuneProfile(JSON.parse(raw));',
);
if (!chat.includes('return normalizeFineTuneProfile(JSON.parse(raw));')) throw new Error('chat fine-tune normalization missing');
fs.writeFileSync(chatPath, chat);

const characterPath = 'src/components/studio/tabs/CharacterTab.tsx';
let character = fs.readFileSync(characterPath, 'utf8');
if (!character.includes("from '../../../services/fineTuneProfileNormalizer'")) {
  character = character.replace(
    "} from '../../../types/nexus';",
    "} from '../../../types/nexus';\nimport { normalizeFineTuneProfile } from '../../../services/fineTuneProfileNormalizer';",
  );
}
character = character.replace(
  '      if (savedFineTune) setFineTune({ ...DEFAULT_PROFILE, ...JSON.parse(savedFineTune) });',
  '      if (savedFineTune) setFineTune({ ...DEFAULT_PROFILE, ...normalizeFineTuneProfile(JSON.parse(savedFineTune)) });',
);
if (!character.includes('normalizeFineTuneProfile(JSON.parse(savedFineTune))')) throw new Error('CharacterTab fine-tune hydration normalization missing');
fs.writeFileSync(characterPath, character);

const testPath = 'src/services/fineTuneProfileNormalizer.test.ts';
const test = `import { describe, expect, it } from 'vitest';\nimport { normalizeFineTuneProfile } from './fineTuneProfileNormalizer';\n\ndescribe('fine-tune profile normalization boundary', () => {\n  it('keeps finite values and clamps them to the 0..100 contract', () => {\n    expect(normalizeFineTuneProfile({ a: 150, b: -20, c: 42.5 })).toEqual({ a: 100, b: 0, c: 42.5 });\n  });\n\n  it('drops non-numeric and non-finite persisted values', () => {\n    expect(normalizeFineTuneProfile({ good: 80, bad: '80', nan: Number.NaN, inf: Number.POSITIVE_INFINITY, nil: null })).toEqual({ good: 80 });\n  });\n\n  it('keeps the persisted legacy deciveness key unchanged for compatibility', () => {\n    expect(normalizeFineTuneProfile({ 'personality.cognition.deciveness': 68 })).toEqual({ 'personality.cognition.deciveness': 68 });\n  });\n});\n`;
fs.writeFileSync(testPath, test);
console.log('Installed shared fine-tune profile normalization boundaries');

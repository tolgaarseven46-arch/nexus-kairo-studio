import fs from 'node:fs';

const normalizerPath = 'src/services/droitPersonalityNormalizer.ts';
let normalizer = fs.readFileSync(normalizerPath, 'utf8');
const oldLoop = `  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === "number" && Number.isFinite(raw)) {
      normalized[key] = raw;
    }
  }
`;
const newLoop = `  const boundedTraitKeys = new Set([
    ...Object.keys(NEUTRAL_DROIT_PERSONALITY),
    "sensitivity",
    "confidence",
    "analytical",
    "decisiveness",
  ]);

  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === "number" && Number.isFinite(raw)) {
      normalized[key] = boundedTraitKeys.has(key)
        ? Math.max(0, Math.min(100, raw))
        : raw;
    }
  }
`;
if (!normalizer.includes(oldLoop) && !normalizer.includes('boundedTraitKeys')) {
  throw new Error('personality normalization loop not found');
}
normalizer = normalizer.replace(oldLoop, newLoop);
if (!normalizer.includes('Math.max(0, Math.min(100, raw))')) {
  throw new Error('0..100 personality clamp was not installed');
}
fs.writeFileSync(normalizerPath, normalizer);

const testPath = 'src/services/droitPersonalityNormalizer.test.ts';
let test = fs.readFileSync(testPath, 'utf8');
const anchor = `  it("preserves additional finite numeric traits used by compatibility layers", () => {
    const normalized = normalizeDroitPersonality({ analytical: 77, trust: 64 });
    expect(normalized.analytical).toBe(77);
    expect(normalized.trust).toBe(64);
  });
`;
const replacement = `  it("clamps canonical and recognized legacy personality traits to the 0..100 slider contract", () => {
    const normalized = normalizeDroitPersonality({
      humor: 150,
      empathy: -20,
      confidence: 130,
      analytical: -5,
      decisiveness: 101,
      sensitivity: -1,
    });
    expect(normalized.humor).toBe(100);
    expect(normalized.empathy).toBe(0);
    expect(normalized.confidence).toBe(100);
    expect(normalized.analytical).toBe(0);
    expect(normalized.decisiveness).toBe(100);
    expect(normalized.sensitivity).toBe(0);
  });

  it("preserves finite numeric compatibility metadata that is not a personality slider", () => {
    const normalized = normalizeDroitPersonality({ analytical: 77, trust: 140 });
    expect(normalized.analytical).toBe(77);
    expect(normalized.trust).toBe(140);
  });
`;
if (!test.includes(anchor) && !test.includes('clamps canonical and recognized legacy personality traits')) {
  throw new Error('personality normalizer compatibility test anchor not found');
}
test = test.replace(anchor, replacement);
fs.writeFileSync(testPath, test);

console.log('Installed 0..100 range normalization for canonical and legacy personality traits');

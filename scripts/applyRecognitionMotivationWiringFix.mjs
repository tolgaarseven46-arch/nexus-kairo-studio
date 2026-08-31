import fs from 'node:fs';

function replace(path, from, to) {
  let source = fs.readFileSync(path, 'utf8');
  if (!source.includes(from)) throw new Error(`missing marker in ${path}`);
  source = source.replace(from, to);
  fs.writeFileSync(path, source);
}

const enginePath = 'src/services/motivationEngine.ts';
replace(
  enginePath,
  '  const approachPressure = clamp01(\n    affiliationDrive * socialOpportunity * 0.34 +\n      achievementDrive * achievementOpportunity * 0.33 +\n      influenceDrive * influenceOpportunity * 0.33,\n  );\n',
  '  const recognitionBias = (n(profile.recognition) - 0.5) * recognitionOpportunity;\n  const approachPressure = clamp01(\n    affiliationDrive * socialOpportunity * 0.34 +\n      achievementDrive * achievementOpportunity * 0.33 +\n      influenceDrive * influenceOpportunity * 0.33 +\n      recognitionBias * 0.18,\n  );\n',
);

const testPath = 'src/services/kairaRecognitionMotivationWiringContracts.test.ts';
fs.writeFileSync(testPath, `import { describe, expect, it } from 'vitest';\nimport { computeMotivationResponse, motivationsFromFineTune } from './motivationEngine';\n\nconst recognitionSituation = {\n  socialOpportunity: 0.2,\n  rejectionRisk: 0.1,\n  recognitionOpportunity: 0.9,\n  autonomyThreat: 0.1,\n  achievementOpportunity: 0.2,\n  influenceOpportunity: 0.2,\n  uncertainty: 0.2,\n  instability: 0.1,\n};\n\ndescribe('recognition motivation downstream wiring', () => {\n  it('maps the CharacterTab recognition key into the stable motivation profile', () => {\n    expect(motivationsFromFineTune({ 'motivation.social.recognition': 87 }).recognition).toBe(87);\n  });\n\n  it('makes recognition need change downstream approach only when recognition is contextually available', () => {\n    const low = computeMotivationResponse({ ...motivationsFromFineTune({}), recognition: 10 }, recognitionSituation);\n    const high = computeMotivationResponse({ ...motivationsFromFineTune({}), recognition: 90 }, recognitionSituation);\n    expect(high.drives.approvalDrive).toBeGreaterThan(low.drives.approvalDrive);\n    expect(high.drives.approachPressure).toBeGreaterThan(low.drives.approachPressure);\n  });\n\n  it('does not let recognition need create meaningful approach pressure without recognition opportunity', () => {\n    const noOpportunity = { ...recognitionSituation, recognitionOpportunity: 0 };\n    const low = computeMotivationResponse({ ...motivationsFromFineTune({}), recognition: 10 }, noOpportunity);\n    const high = computeMotivationResponse({ ...motivationsFromFineTune({}), recognition: 90 }, noOpportunity);\n    expect(high.drives.approachPressure).toBeCloseTo(low.drives.approachPressure, 6);\n  });\n});\n`);

for (const [path, markers] of Object.entries({
  [enginePath]: ['const recognitionBias =', 'recognitionBias * 0.18'],
  [testPath]: ['recognition motivation downstream wiring'],
})) {
  const source = fs.readFileSync(path, 'utf8');
  for (const marker of markers) if (!source.includes(marker)) throw new Error(`missing final marker ${marker} in ${path}`);
}
console.log('Wired recognition motivation into contextual downstream approach pressure');

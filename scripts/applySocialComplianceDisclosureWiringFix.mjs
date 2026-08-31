import fs from 'node:fs';

function replace(path, from, to) {
  let source = fs.readFileSync(path, 'utf8');
  if (!source.includes(from)) throw new Error(`missing marker in ${path}`);
  source = source.replace(from, to);
  fs.writeFileSync(path, source);
}

const integrationPath = 'src/services/behaviorIntegrationEngine.ts';
replace(
  integrationPath,
  '  const directness = clamp01(pt.assertivePressure * 0.35 + s.leadershipPressure * 0.2 + b.boundaryAssertion * 0.3 + valuePressure * 0.15 + (priorDisengaged ? 0.25 : priorRepairing ? 0.12 : 0));\n',
  '  const socialResistanceDirectness = clamp01(s.resistancePressure * clamp01(semanticEvent.coercion));\n  const directness = clamp01(pt.assertivePressure * 0.32 + s.leadershipPressure * 0.18 + socialResistanceDirectness * 0.15 + b.boundaryAssertion * 0.25 + valuePressure * 0.1 + (priorDisengaged ? 0.25 : priorRepairing ? 0.12 : 0));\n',
);
replace(
  integrationPath,
  '      : clamp01(s.affiliationPressure * 0.35 + s.carePressure * 0.3 + approachPressure * 0.2 + b.repairOpenness * 0.15 - distance * 0.55);\n',
  '      : clamp01(s.affiliationPressure * 0.32 + s.carePressure * 0.27 + approachPressure * 0.18 + s.disclosurePressure * 0.08 + b.repairOpenness * 0.15 - distance * 0.55);\n',
);

const testPath = 'src/services/kairaSocialComplianceDisclosureWiringContracts.test.ts';
fs.writeFileSync(testPath, `import { describe, expect, it } from 'vitest';\nimport { computeSocialOrientationResponse, socialOrientationFromFineTune } from './socialOrientationEngine';\nimport { integrateBehaviorLayers } from './behaviorIntegrationEngine';\n\nconst neutralProfile = socialOrientationFromFineTune({});\nconst neutralSituation = { affiliationOpportunity: 0.15, vulnerabilitySignal: 0.05, challengeSignal: 0.1, requestSignal: 0.15, coercionSignal: 0, intimacySignal: 0.05, betrayalSignal: 0.05 };\nconst personality = { humor: 50, authority: 50, empathy: 50, patience: 50, seriousness: 50, communication: 50 } as any;\n\nfunction integrate(social: any, semanticEvent: any) {\n  return integrateBehaviorLayers({\n    personality,\n    dynamicState: { anger: 0, stress: 0, relationship: { hurtScore: 0, conflictScore: 0, conversationState: 'active' } } as any,\n    semanticEvent,\n    personalityTendency: { behaviorSignals: { assertivePressure: 0.3, analysisPressure: 0.3 } } as any,\n    motivation: { drives: { approachPressure: 0.2, withdrawalPressure: 0.1 } } as any,\n    values: { behaviorSignals: { moralObjection: 0, boundaryPressure: 0, autonomyDefense: 0, accountabilityPressure: 0 } } as any,\n    preferences: { behaviorSignals: { engagementDrive: 0.2, depthDrive: 0.2 } } as any,\n    social,\n    boundaries: { hardStop: false, violationPressure: 0, behaviorSignals: { boundaryAssertion: 0, distancePressure: 0, escalationPressure: 0, repairOpenness: 0.2, disengagementPressure: 0 } } as any,\n    expression: { humor: { enabled: false, strength: 0 }, speech: { questionDrive: 0.5, brevity: 0.4 }, inhibition: 0 } as any,\n  });\n}\n\ndescribe('social compliance and disclosure downstream wiring', () => {\n  it('maps both CharacterTab social keys into the stable social profile', () => {\n    const profile = socialOrientationFromFineTune({ 'social.agency.compliance': 83, 'social.trust.disclosure': 77 });\n    expect(profile.compliance).toBe(83);\n    expect(profile.disclosure).toBe(77);\n  });\n\n  it('makes low compliance increase directness only under coercion context', () => {\n    const coercionSituation = { ...neutralSituation, coercionSignal: 0.95 };\n    const low = computeSocialOrientationResponse({ ...neutralProfile, compliance: 10 }, coercionSituation);\n    const high = computeSocialOrientationResponse({ ...neutralProfile, compliance: 90 }, coercionSituation);\n    const lowDecision = integrate(low, { coercion: 1, apology: false, repairAttempt: false, stopTalking: false, stopQuestions: false, intent: 'general' });\n    const highDecision = integrate(high, { coercion: 1, apology: false, repairAttempt: false, stopTalking: false, stopQuestions: false, intent: 'general' });\n    expect(low.behaviorSignals.resistancePressure).toBeGreaterThan(high.behaviorSignals.resistancePressure);\n    expect(lowDecision.decision.directness).toBeGreaterThan(highDecision.decision.directness);\n\n    const lowNeutral = computeSocialOrientationResponse({ ...neutralProfile, compliance: 10 }, neutralSituation);\n    const highNeutral = computeSocialOrientationResponse({ ...neutralProfile, compliance: 90 }, neutralSituation);\n    const lowNeutralDecision = integrate(lowNeutral, { coercion: 0, apology: false, repairAttempt: false, stopTalking: false, stopQuestions: false, intent: 'general' });\n    const highNeutralDecision = integrate(highNeutral, { coercion: 0, apology: false, repairAttempt: false, stopTalking: false, stopQuestions: false, intent: 'general' });\n    expect(lowNeutralDecision.decision.directness).toBeCloseTo(highNeutralDecision.decision.directness, 6);\n  });\n\n  it('makes disclosure willingness change warmth in a safe intimacy context without overriding hard boundaries', () => {\n    const intimacySituation = { ...neutralSituation, affiliationOpportunity: 0.7, intimacySignal: 0.9 };\n    const low = computeSocialOrientationResponse({ ...neutralProfile, disclosure: 10 }, intimacySituation);\n    const high = computeSocialOrientationResponse({ ...neutralProfile, disclosure: 90 }, intimacySituation);\n    const semantic = { coercion: 0, apology: false, repairAttempt: false, stopTalking: false, stopQuestions: false, intent: 'general' };\n    expect(high.behaviorSignals.disclosurePressure).toBeGreaterThan(low.behaviorSignals.disclosurePressure);\n    expect(integrate(high, semantic).decision.warmth).toBeGreaterThan(integrate(low, semantic).decision.warmth);\n  });\n});\n`);

for (const [path, markers] of Object.entries({
  [integrationPath]: ['socialResistanceDirectness', 's.disclosurePressure * 0.08'],
  [testPath]: ['social compliance and disclosure downstream wiring'],
})) {
  const source = fs.readFileSync(path, 'utf8');
  for (const marker of markers) if (!source.includes(marker)) throw new Error(`missing final marker ${marker} in ${path}`);
}
console.log('Wired social compliance and disclosure into contextual downstream behavior');

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
  '  const engagementPressure = clamp01(p.engagementDrive);\n',
  '  const overstimulationPressure = clamp01(p.overstimulationPressure);\n  const engagementPressure = clamp01(p.engagementDrive * (1 - overstimulationPressure * 0.75));\n',
);
replace(
  integrationPath,
  '  const responseLength: IntegratedBehaviorDecision["responseLength"] = disengage || repairingHold || semanticEvent.stopTalking || distance >= 0.6 || e.speech.brevity >= 0.65 ? "short" : pt.analysisPressure >= 0.62 || p.depthDrive >= 0.58 ? "long" : "medium";\n',
  '  const responseLength: IntegratedBehaviorDecision["responseLength"] = disengage || repairingHold || semanticEvent.stopTalking || distance >= 0.6 || e.speech.brevity >= 0.65 || overstimulationPressure >= 0.45 ? "short" : pt.analysisPressure >= 0.62 || p.depthDrive >= 0.58 ? "long" : "medium";\n',
);

const testPath = 'src/services/kairaPreferenceOverstimulationWiringContracts.test.ts';
fs.writeFileSync(testPath, `import { describe, expect, it } from 'vitest';\nimport { computePreferenceResponse, preferencesFromFineTune } from './preferenceEngine';\nimport { integrateBehaviorLayers } from './behaviorIntegrationEngine';\n\nconst personality = { humor: 50, authority: 50, empathy: 50, patience: 50, seriousness: 50, communication: 50 } as any;\nconst intenseSituation = { noveltyOpportunity: 0.08, complexityOpportunity: 0.08, intensityLevel: 0.95, depthOpportunity: 0.08, playOpportunity: 0.08, competitionOpportunity: 0.08, emotionalSeriousness: 0.05 };\nconst calmSituation = { ...intenseSituation, intensityLevel: 0.1 };\n\nfunction integrate(preferences: any) {\n  return integrateBehaviorLayers({\n    personality,\n    dynamicState: { anger: 0, stress: 0, relationship: { hurtScore: 0, conflictScore: 0, conversationState: 'active' } } as any,\n    semanticEvent: { coercion: 0, apology: false, repairAttempt: false, stopTalking: false, stopQuestions: false, intent: 'general' } as any,\n    personalityTendency: { behaviorSignals: { assertivePressure: 0.2, analysisPressure: 0.2 } } as any,\n    motivation: { drives: { approachPressure: 0.2, withdrawalPressure: 0.1 } } as any,\n    values: { behaviorSignals: { moralObjection: 0, boundaryPressure: 0, autonomyDefense: 0, accountabilityPressure: 0 } } as any,\n    preferences,\n    social: { behaviorSignals: { affiliationPressure: 0.3, carePressure: 0.2, leadershipPressure: 0.2, resistancePressure: 0, disclosurePressure: 0.2, socialDistancePressure: 0 } } as any,\n    boundaries: { hardStop: false, violationPressure: 0, behaviorSignals: { boundaryAssertion: 0, distancePressure: 0, escalationPressure: 0, repairOpenness: 0.1, disengagementPressure: 0 } } as any,\n    expression: { humor: { enabled: false, strength: 0 }, speech: { questionDrive: 0.5, brevity: 0.2 }, inhibition: 0 } as any,\n  });\n}\n\ndescribe('preference overstimulation downstream wiring', () => {\n  it('maps the CharacterTab intensity preference key into the stable preference profile', () => {\n    expect(preferencesFromFineTune({ 'preferences.stimulation.intensity': 17 }).intensity).toBe(17);\n  });\n\n  it('makes low preferred intensity reduce final engagement and shorten response under actual high intensity', () => {\n    const low = computePreferenceResponse({ ...preferencesFromFineTune({}), intensity: 10 }, intenseSituation);\n    const high = computePreferenceResponse({ ...preferencesFromFineTune({}), intensity: 90 }, intenseSituation);\n    expect(low.behaviorSignals.overstimulationPressure).toBeGreaterThan(high.behaviorSignals.overstimulationPressure);\n    const lowIntegrated = integrate(low);\n    const highIntegrated = integrate(high);\n    expect(lowIntegrated.pressures.engagement).toBeLessThan(highIntegrated.pressures.engagement);\n    expect(lowIntegrated.decision.responseLength).toBe('short');\n    expect(lowIntegrated.decision.distance).toBeCloseTo(highIntegrated.decision.distance, 6);\n    expect(lowIntegrated.decision.continueConversation).toBe(true);\n  });\n\n  it('does not create overstimulation behavior when incoming intensity is calm', () => {\n    const low = computePreferenceResponse({ ...preferencesFromFineTune({}), intensity: 10 }, calmSituation);\n    const high = computePreferenceResponse({ ...preferencesFromFineTune({}), intensity: 90 }, calmSituation);\n    expect(low.behaviorSignals.overstimulationPressure).toBe(0);\n    expect(high.behaviorSignals.overstimulationPressure).toBe(0);\n    expect(integrate(low).decision.responseLength).toBe(integrate(high).decision.responseLength);\n  });\n});\n`);

for (const [path, markers] of Object.entries({
  [integrationPath]: ['const overstimulationPressure =', 'overstimulationPressure >= 0.45'],
  [testPath]: ['preference overstimulation downstream wiring'],
})) {
  const source = fs.readFileSync(path, 'utf8');
  for (const marker of markers) if (!source.includes(marker)) throw new Error(`missing final marker ${marker} in ${path}`);
}
console.log('Wired preference overstimulation into contextual downstream engagement and response length');

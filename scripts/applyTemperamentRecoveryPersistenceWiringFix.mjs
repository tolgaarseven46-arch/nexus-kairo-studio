import fs from 'node:fs';

function replace(path, from, to) {
  let source = fs.readFileSync(path, 'utf8');
  if (!source.includes(from)) throw new Error(`missing marker in ${path}`);
  source = source.replace(from, to);
  fs.writeFileSync(path, source);
}

const temperamentPath = 'src/services/temperamentEngine.ts';
replace(
  temperamentPath,
  'export const DEFAULT_TEMPERAMENT_PROFILE: TemperamentProfile = {\n  negativeSensitivity: 50,\n  frustrationSensitivity: 50,\n  threatSensitivity: 50,\n  reactivityThreshold: 50,\n  rewardSensitivity: 50,\n  impulseStrength: 50,\n  inhibitoryControl: 50,\n  recoverySpeed: 50,\n  arousalBaseline: 50,\n  noveltySeeking: 50,\n  uncertaintyTolerance: 50,\n  approachDriveBias: 50,\n  attentionPersistence: 50,\n};\n',
  'export const DEFAULT_TEMPERAMENT_PROFILE: TemperamentProfile = {\n  negativeSensitivity: 50,\n  frustrationSensitivity: 50,\n  threatSensitivity: 50,\n  reactivityThreshold: 50,\n  rewardSensitivity: 50,\n  impulseStrength: 50,\n  inhibitoryControl: 50,\n  recoverySpeed: 50,\n  arousalBaseline: 50,\n  noveltySeeking: 50,\n  uncertaintyTolerance: 50,\n  approachDriveBias: 50,\n  attentionPersistence: 50,\n};\n\nexport interface TemperamentRecoverableAffect {\n  anger: number;\n  stress: number;\n}\n\n/**\n * Applies between-turn recovery to already-existing negative activation.\n * recoverySpeed controls how quickly activation resolves; attentionPersistence\n * controls how strongly the prior activation is retained. No elapsed time means\n * no recovery, so these stable traits never rewrite the immediate event reaction.\n */\nexport const recoverTemperamentAffect = (\n  state: TemperamentRecoverableAffect,\n  profile: TemperamentProfile,\n  elapsedMinutes: number,\n): TemperamentRecoverableAffect => {\n  const elapsed = Math.max(0, elapsedMinutes);\n  if (elapsed <= 0) return { anger: clamp100(state.anger), stress: clamp100(state.stress) };\n\n  const recoveryRatePerMinute = 0.002 + n(profile.recoverySpeed) * 0.012;\n  const persistenceResistance = 0.7 + n(profile.attentionPersistence) * 0.6;\n  const decay = clamp01(Math.exp(-(elapsed * recoveryRatePerMinute) / persistenceResistance));\n\n  return {\n    anger: round1(clamp100(state.anger) * decay),\n    stress: round1(clamp100(state.stress) * decay),\n  };\n};\n',
);

const chatPath = 'src/services/droitChatService.ts';
replace(
  chatPath,
  'import { computeTemperamentResponse, temperamentFromFineTune } from "./temperamentEngine";\n',
  'import { computeTemperamentResponse, recoverTemperamentAffect, temperamentFromFineTune } from "./temperamentEngine";\n',
);
replace(
  chatPath,
  '  const temperament = temperamentFromFineTune(fineTune);\n  const event = appraisalEventFromSemantic(semanticEvent);\n  const relationship = dynamicState.relationship;\n',
  '  const temperament = temperamentFromFineTune(fineTune);\n  const event = appraisalEventFromSemantic(semanticEvent);\n  const relationship = dynamicState.relationship;\n  const elapsedSinceInteractionMinutes = minutesBetween(relationship?.lastInteractionAt) ?? 0;\n  const recoveredAffect = recoverTemperamentAffect(\n    { anger: dynamicState.anger, stress: dynamicState.stress },\n    temperament,\n    elapsedSinceInteractionMinutes,\n  );\n  const recoveredState = { ...dynamicState, ...recoveredAffect };\n',
);
replace(
  chatPath,
  '    currentStress: Math.max(0, Math.min(1, dynamicState.stress / 100)),\n    minutesSinceEvent: 0,\n  });\n  const delta = temperamentResponse.stateDelta;\n  return { ...dynamicState, anger: clamp100(dynamicState.anger + delta.anger), stress: clamp100(dynamicState.stress + delta.stress), happiness: clamp100(dynamicState.happiness + delta.happiness), calmness: clamp100(dynamicState.calmness + delta.calmness), confidence: clamp100(dynamicState.confidence + delta.confidence), surprise: clamp100(dynamicState.surprise + delta.surprise) };\n',
  '    currentStress: Math.max(0, Math.min(1, recoveredState.stress / 100)),\n    minutesSinceEvent: 0,\n  });\n  const delta = temperamentResponse.stateDelta;\n  return { ...recoveredState, anger: clamp100(recoveredState.anger + delta.anger), stress: clamp100(recoveredState.stress + delta.stress), happiness: clamp100(recoveredState.happiness + delta.happiness), calmness: clamp100(recoveredState.calmness + delta.calmness), confidence: clamp100(recoveredState.confidence + delta.confidence), surprise: clamp100(recoveredState.surprise + delta.surprise) };\n',
);

const testPath = 'src/services/kairaTemperamentRecoveryPersistenceWiringContracts.test.ts';
fs.writeFileSync(testPath, `import { describe, expect, it } from 'vitest';\nimport { recoverTemperamentAffect, temperamentFromFineTune } from './temperamentEngine';\n\ndescribe('temperament recovery and persistence downstream wiring', () => {\n  it('maps recovery speed and attention persistence CharacterTab keys', () => {\n    const profile = temperamentFromFineTune({\n      'temperament.time.recoverySpeed': 82,\n      'temperament.attention.persistence': 74,\n    });\n    expect(profile.recoverySpeed).toBe(82);\n    expect(profile.attentionPersistence).toBe(74);\n  });\n\n  it('does not alter existing affect when no time has elapsed', () => {\n    const state = { anger: 80, stress: 70 };\n    const low = recoverTemperamentAffect(state, { ...temperamentFromFineTune({}), recoverySpeed: 10, attentionPersistence: 10 }, 0);\n    const high = recoverTemperamentAffect(state, { ...temperamentFromFineTune({}), recoverySpeed: 90, attentionPersistence: 90 }, 0);\n    expect(low).toEqual(state);\n    expect(high).toEqual(state);\n  });\n\n  it('makes higher recovery speed resolve more prior anger and stress after elapsed time', () => {\n    const state = { anger: 80, stress: 70 };\n    const low = recoverTemperamentAffect(state, { ...temperamentFromFineTune({}), recoverySpeed: 10, attentionPersistence: 50 }, 60);\n    const high = recoverTemperamentAffect(state, { ...temperamentFromFineTune({}), recoverySpeed: 90, attentionPersistence: 50 }, 60);\n    expect(high.anger).toBeLessThan(low.anger);\n    expect(high.stress).toBeLessThan(low.stress);\n  });\n\n  it('makes higher attention persistence retain more prior activation at the same recovery speed', () => {\n    const state = { anger: 80, stress: 70 };\n    const low = recoverTemperamentAffect(state, { ...temperamentFromFineTune({}), recoverySpeed: 50, attentionPersistence: 10 }, 60);\n    const high = recoverTemperamentAffect(state, { ...temperamentFromFineTune({}), recoverySpeed: 50, attentionPersistence: 90 }, 60);\n    expect(high.anger).toBeGreaterThan(low.anger);\n    expect(high.stress).toBeGreaterThan(low.stress);\n  });\n\n  it('never creates negative activation from a zero state', () => {\n    const recovered = recoverTemperamentAffect(\n      { anger: 0, stress: 0 },\n      { ...temperamentFromFineTune({}), recoverySpeed: 90, attentionPersistence: 90 },\n      240,\n    );\n    expect(recovered).toEqual({ anger: 0, stress: 0 });\n  });\n});\n`);

for (const [path, markers] of Object.entries({
  [temperamentPath]: ['export const recoverTemperamentAffect', 'persistenceResistance'],
  [chatPath]: ['elapsedSinceInteractionMinutes', 'recoveredState.stress'],
  [testPath]: ['temperament recovery and persistence downstream wiring'],
})) {
  const source = fs.readFileSync(path, 'utf8');
  for (const marker of markers) if (!source.includes(marker)) throw new Error(`missing final marker ${marker} in ${path}`);
}
console.log('Wired temperament recovery speed and attention persistence into between-turn state recovery');

import { describe, expect, it } from 'vitest';
import { computeTemperamentResponse, DEFAULT_TEMPERAMENT_PROFILE, temperamentFromFineTune } from './temperamentEngine';

const event = { negativeLoad: 0.7, frustrationLoad: 0.7, threatLoad: 0.7, rewardLoad: 0.2, noveltyLoad: 0.8, repetitionLoad: 0.3, relationshipSafety: 0.3, currentStress: 0.3 };

describe('temperament CharacterTab runtime wiring', () => {
  it('reads every exploration slider that the panel exposes', () => {
    const profile = temperamentFromFineTune({
      'temperament.exploration.noveltySeeking': 71,
      'temperament.exploration.uncertaintyTolerance': 82,
      'temperament.exploration.approachDrive': 93,
      'temperament.reactivity.threshold': 64,
    });
    expect(profile.noveltySeeking).toBe(71);
    expect(profile.uncertaintyTolerance).toBe(82);
    expect(profile.approachDriveBias).toBe(93);
    expect(profile.reactivityThreshold).toBe(64);
  });

  it('makes a higher reaction threshold reduce activation instead of increasing threat sensitivity', () => {
    const low = computeTemperamentResponse({ ...DEFAULT_TEMPERAMENT_PROFILE, reactivityThreshold: 10 }, event);
    const high = computeTemperamentResponse({ ...DEFAULT_TEMPERAMENT_PROFILE, reactivityThreshold: 90 }, event);
    expect(high.negativeActivation).toBeLessThan(low.negativeActivation);
    expect(high.frustrationActivation).toBeLessThan(low.frustrationActivation);
    expect(high.threatActivation).toBeLessThan(low.threatActivation);
  });

  it('lets uncertainty tolerance and approach drive affect actual approach behavior', () => {
    const lowTolerance = computeTemperamentResponse({ ...DEFAULT_TEMPERAMENT_PROFILE, uncertaintyTolerance: 10 }, event);
    const highTolerance = computeTemperamentResponse({ ...DEFAULT_TEMPERAMENT_PROFILE, uncertaintyTolerance: 90 }, event);
    expect(highTolerance.approachDrive).toBeGreaterThan(lowTolerance.approachDrive);

    const lowDrive = computeTemperamentResponse({ ...DEFAULT_TEMPERAMENT_PROFILE, approachDriveBias: 10 }, event);
    const highDrive = computeTemperamentResponse({ ...DEFAULT_TEMPERAMENT_PROFILE, approachDriveBias: 90 }, event);
    expect(highDrive.approachDrive).toBeGreaterThan(lowDrive.approachDrive);
  });
});

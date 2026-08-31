import { describe, expect, it } from 'vitest';
import { computeTemperamentResponse, temperamentFromFineTune } from './temperamentEngine';

const neutralProfile = temperamentFromFineTune({});
const negativeInput = {
  negativeLoad: 0.85,
  frustrationLoad: 0.85,
  threatLoad: 0.8,
  rewardLoad: 0,
  noveltyLoad: 0.1,
  repetitionLoad: 0.6,
  relationshipSafety: 0.25,
  currentStress: 0.4,
  minutesSinceEvent: 0,
};
const positiveNovelInput = {
  negativeLoad: 0,
  frustrationLoad: 0,
  threatLoad: 0,
  rewardLoad: 0.75,
  noveltyLoad: 0.9,
  repetitionLoad: 0.05,
  relationshipSafety: 0.8,
  currentStress: 0.1,
  minutesSinceEvent: 0,
};
const uncertainOpportunityInput = {
  negativeLoad: 0.05,
  frustrationLoad: 0,
  threatLoad: 0.65,
  rewardLoad: 0.55,
  noveltyLoad: 0.8,
  repetitionLoad: 0.1,
  relationshipSafety: 0.35,
  currentStress: 0.2,
  minutesSinceEvent: 0,
};

describe('temperament live stateDelta coverage', () => {
  it('maps all immediate-response CharacterTab temperament keys', () => {
    const p = temperamentFromFineTune({
      'temperament.sensitivity.negative': 61,
      'temperament.sensitivity.frustration': 62,
      'temperament.sensitivity.threat': 63,
      'temperament.reactivity.threshold': 64,
      'temperament.sensitivity.reward': 65,
      'temperament.control.impulseStrength': 66,
      'temperament.control.inhibitoryControl': 67,
      'temperament.arousal.baseline': 68,
      'temperament.exploration.noveltySeeking': 69,
      'temperament.exploration.uncertaintyTolerance': 70,
      'temperament.exploration.approachDrive': 71,
    });
    expect(p.negativeSensitivity).toBe(61);
    expect(p.frustrationSensitivity).toBe(62);
    expect(p.threatSensitivity).toBe(63);
    expect(p.reactivityThreshold).toBe(64);
    expect(p.rewardSensitivity).toBe(65);
    expect(p.impulseStrength).toBe(66);
    expect(p.inhibitoryControl).toBe(67);
    expect(p.arousalBaseline).toBe(68);
    expect(p.noveltySeeking).toBe(69);
    expect(p.uncertaintyTolerance).toBe(70);
    expect(p.approachDriveBias).toBe(71);
  });

  it('keeps negative sensitivity live in negative activation and stress delta', () => {
    const low = computeTemperamentResponse({ ...neutralProfile, negativeSensitivity: 10 }, negativeInput);
    const high = computeTemperamentResponse({ ...neutralProfile, negativeSensitivity: 90 }, negativeInput);
    expect(high.negativeActivation).toBeGreaterThan(low.negativeActivation);
    expect(high.stateDelta.stress).toBeGreaterThan(low.stateDelta.stress);
  });

  it('keeps frustration sensitivity live in frustration activation and anger delta', () => {
    const low = computeTemperamentResponse({ ...neutralProfile, frustrationSensitivity: 10 }, negativeInput);
    const high = computeTemperamentResponse({ ...neutralProfile, frustrationSensitivity: 90 }, negativeInput);
    expect(high.frustrationActivation).toBeGreaterThan(low.frustrationActivation);
    expect(high.stateDelta.anger).toBeGreaterThan(low.stateDelta.anger);
  });

  it('keeps threat sensitivity live in threat activation and stress delta', () => {
    const low = computeTemperamentResponse({ ...neutralProfile, threatSensitivity: 10 }, negativeInput);
    const high = computeTemperamentResponse({ ...neutralProfile, threatSensitivity: 90 }, negativeInput);
    expect(high.threatActivation).toBeGreaterThan(low.threatActivation);
    expect(high.stateDelta.stress).toBeGreaterThan(low.stateDelta.stress);
  });

  it('keeps reactivity threshold live in immediate negative state deltas', () => {
    const easy = computeTemperamentResponse({ ...neutralProfile, reactivityThreshold: 10 }, negativeInput);
    const hard = computeTemperamentResponse({ ...neutralProfile, reactivityThreshold: 90 }, negativeInput);
    expect(easy.negativeActivation).toBeGreaterThan(hard.negativeActivation);
    expect(easy.stateDelta.anger).toBeGreaterThan(hard.stateDelta.anger);
    expect(easy.stateDelta.stress).toBeGreaterThan(hard.stateDelta.stress);
  });

  it('keeps reward sensitivity live in reward activation and happiness delta', () => {
    const low = computeTemperamentResponse({ ...neutralProfile, rewardSensitivity: 10 }, positiveNovelInput);
    const high = computeTemperamentResponse({ ...neutralProfile, rewardSensitivity: 90 }, positiveNovelInput);
    expect(high.rewardActivation).toBeGreaterThan(low.rewardActivation);
    expect(high.stateDelta.happiness).toBeGreaterThan(low.stateDelta.happiness);
  });

  it('keeps impulse strength live in expressed pressure and anger delta', () => {
    const low = computeTemperamentResponse({ ...neutralProfile, impulseStrength: 10 }, negativeInput);
    const high = computeTemperamentResponse({ ...neutralProfile, impulseStrength: 90 }, negativeInput);
    expect(high.impulsePressure).toBeGreaterThan(low.impulsePressure);
    expect(high.expressedPressure).toBeGreaterThan(low.expressedPressure);
    expect(high.stateDelta.anger).toBeGreaterThan(low.stateDelta.anger);
  });

  it('keeps inhibitory control live in inhibition, expression and calmness delta', () => {
    const low = computeTemperamentResponse({ ...neutralProfile, inhibitoryControl: 10 }, negativeInput);
    const high = computeTemperamentResponse({ ...neutralProfile, inhibitoryControl: 90 }, negativeInput);
    expect(high.inhibitionPressure).toBeGreaterThan(low.inhibitionPressure);
    expect(high.expressedPressure).toBeLessThan(low.expressedPressure);
    expect(high.stateDelta.calmness).toBeGreaterThan(low.stateDelta.calmness);
  });

  it('keeps arousal baseline live in arousal and stress delta', () => {
    const low = computeTemperamentResponse({ ...neutralProfile, arousalBaseline: 10 }, negativeInput);
    const high = computeTemperamentResponse({ ...neutralProfile, arousalBaseline: 90 }, negativeInput);
    expect(high.arousal).toBeGreaterThan(low.arousal);
    expect(high.stateDelta.stress).toBeGreaterThan(low.stateDelta.stress);
    expect(high.stateDelta.calmness).toBeLessThan(low.stateDelta.calmness);
  });

  it('keeps novelty seeking live in approach and surprise deltas', () => {
    const low = computeTemperamentResponse({ ...neutralProfile, noveltySeeking: 10 }, positiveNovelInput);
    const high = computeTemperamentResponse({ ...neutralProfile, noveltySeeking: 90 }, positiveNovelInput);
    expect(high.approachDrive).toBeGreaterThan(low.approachDrive);
    expect(high.stateDelta.happiness).toBeGreaterThan(low.stateDelta.happiness);
    expect(high.stateDelta.surprise).toBeGreaterThan(low.stateDelta.surprise);
  });

  it('keeps uncertainty tolerance live in approach/confidence under uncertain opportunity', () => {
    const low = computeTemperamentResponse({ ...neutralProfile, uncertaintyTolerance: 10 }, uncertainOpportunityInput);
    const high = computeTemperamentResponse({ ...neutralProfile, uncertaintyTolerance: 90 }, uncertainOpportunityInput);
    expect(high.approachDrive).toBeGreaterThan(low.approachDrive);
    expect(high.stateDelta.confidence).toBeGreaterThan(low.stateDelta.confidence);
  });

  it('keeps approach-drive bias live in approach and happiness under novelty', () => {
    const low = computeTemperamentResponse({ ...neutralProfile, approachDriveBias: 10 }, positiveNovelInput);
    const high = computeTemperamentResponse({ ...neutralProfile, approachDriveBias: 90 }, positiveNovelInput);
    expect(high.approachDrive).toBeGreaterThan(low.approachDrive);
    expect(high.stateDelta.happiness).toBeGreaterThan(low.stateDelta.happiness);
    expect(high.stateDelta.confidence).toBeGreaterThan(low.stateDelta.confidence);
  });
});

import { describe, expect, it } from 'vitest';
import {
  computeTemperamentResponse,
  DEFAULT_TEMPERAMENT_PROFILE,
  temperamentFromFineTune,
} from './temperamentEngine';

describe('temperamentEngine', () => {
  it('maps current panel keys without breaking older fine-tune data', () => {
    const profile = temperamentFromFineTune({
      'temperament.reactivity.sensitivity': 80,
      'temperament.regulation.inhibitoryControl': 70,
      'temperament.exploration.noveltySeeking': 90,
    });

    expect(profile.negativeSensitivity).toBe(80);
    expect(profile.inhibitoryControl).toBe(70);
    expect(profile.noveltySeeking).toBe(90);
  });

  it('higher frustration sensitivity creates stronger frustration activation', () => {
    const low = computeTemperamentResponse(
      { ...DEFAULT_TEMPERAMENT_PROFILE, frustrationSensitivity: 10 },
      {
        negativeLoad: 0.5,
        frustrationLoad: 0.8,
        threatLoad: 0,
        rewardLoad: 0,
        noveltyLoad: 0,
        repetitionLoad: 0.5,
        relationshipSafety: 0.5,
        currentStress: 0.3,
      },
    );

    const high = computeTemperamentResponse(
      { ...DEFAULT_TEMPERAMENT_PROFILE, frustrationSensitivity: 90 },
      {
        negativeLoad: 0.5,
        frustrationLoad: 0.8,
        threatLoad: 0,
        rewardLoad: 0,
        noveltyLoad: 0,
        repetitionLoad: 0.5,
        relationshipSafety: 0.5,
        currentStress: 0.3,
      },
    );

    expect(high.frustrationActivation).toBeGreaterThan(low.frustrationActivation);
    expect(high.stateDelta.anger).toBeGreaterThan(low.stateDelta.anger);
  });

  it('higher inhibitory control reduces expressed pressure', () => {
    const lowControl = computeTemperamentResponse(
      { ...DEFAULT_TEMPERAMENT_PROFILE, inhibitoryControl: 10 },
      {
        negativeLoad: 0.9,
        frustrationLoad: 0.9,
        threatLoad: 0.4,
        rewardLoad: 0,
        noveltyLoad: 0,
        repetitionLoad: 0.7,
        relationshipSafety: 0.5,
        currentStress: 0.4,
      },
    );

    const highControl = computeTemperamentResponse(
      { ...DEFAULT_TEMPERAMENT_PROFILE, inhibitoryControl: 90 },
      {
        negativeLoad: 0.9,
        frustrationLoad: 0.9,
        threatLoad: 0.4,
        rewardLoad: 0,
        noveltyLoad: 0,
        repetitionLoad: 0.7,
        relationshipSafety: 0.5,
        currentStress: 0.4,
      },
    );

    expect(highControl.expressedPressure).toBeLessThan(lowControl.expressedPressure);
  });

  it('elapsed time reduces lingering state impact', () => {
    const now = computeTemperamentResponse(DEFAULT_TEMPERAMENT_PROFILE, {
      negativeLoad: 0.8,
      frustrationLoad: 0.8,
      threatLoad: 0.3,
      rewardLoad: 0,
      noveltyLoad: 0,
      repetitionLoad: 0.4,
      relationshipSafety: 0.4,
      currentStress: 0.4,
      minutesSinceEvent: 0,
    });

    const later = computeTemperamentResponse(DEFAULT_TEMPERAMENT_PROFILE, {
      negativeLoad: 0.8,
      frustrationLoad: 0.8,
      threatLoad: 0.3,
      rewardLoad: 0,
      noveltyLoad: 0,
      repetitionLoad: 0.4,
      relationshipSafety: 0.4,
      currentStress: 0.4,
      minutesSinceEvent: 120,
    });

    expect(later.recoveryFactor).toBeLessThan(now.recoveryFactor);
    expect(later.stateDelta.anger).toBeLessThan(now.stateDelta.anger);
  });
});

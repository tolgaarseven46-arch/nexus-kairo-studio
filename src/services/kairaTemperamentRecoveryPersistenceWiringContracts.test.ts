import { describe, expect, it } from 'vitest';
import { recoverTemperamentAffect, temperamentFromFineTune } from './temperamentEngine';

describe('temperament recovery and persistence downstream wiring', () => {
  it('maps recovery speed and attention persistence CharacterTab keys', () => {
    const profile = temperamentFromFineTune({
      'temperament.time.recoverySpeed': 82,
      'temperament.attention.persistence': 74,
    });
    expect(profile.recoverySpeed).toBe(82);
    expect(profile.attentionPersistence).toBe(74);
  });

  it('does not alter existing affect when no time has elapsed', () => {
    const state = { anger: 80, stress: 70 };
    const low = recoverTemperamentAffect(state, { ...temperamentFromFineTune({}), recoverySpeed: 10, attentionPersistence: 10 }, 0);
    const high = recoverTemperamentAffect(state, { ...temperamentFromFineTune({}), recoverySpeed: 90, attentionPersistence: 90 }, 0);
    expect(low).toEqual(state);
    expect(high).toEqual(state);
  });

  it('makes higher recovery speed resolve more prior anger and stress after elapsed time', () => {
    const state = { anger: 80, stress: 70 };
    const low = recoverTemperamentAffect(state, { ...temperamentFromFineTune({}), recoverySpeed: 10, attentionPersistence: 50 }, 60);
    const high = recoverTemperamentAffect(state, { ...temperamentFromFineTune({}), recoverySpeed: 90, attentionPersistence: 50 }, 60);
    expect(high.anger).toBeLessThan(low.anger);
    expect(high.stress).toBeLessThan(low.stress);
  });

  it('makes higher attention persistence retain more prior activation at the same recovery speed', () => {
    const state = { anger: 80, stress: 70 };
    const low = recoverTemperamentAffect(state, { ...temperamentFromFineTune({}), recoverySpeed: 50, attentionPersistence: 10 }, 60);
    const high = recoverTemperamentAffect(state, { ...temperamentFromFineTune({}), recoverySpeed: 50, attentionPersistence: 90 }, 60);
    expect(high.anger).toBeGreaterThan(low.anger);
    expect(high.stress).toBeGreaterThan(low.stress);
  });

  it('never creates negative activation from a zero state', () => {
    const recovered = recoverTemperamentAffect(
      { anger: 0, stress: 0 },
      { ...temperamentFromFineTune({}), recoverySpeed: 90, attentionPersistence: 90 },
      240,
    );
    expect(recovered).toEqual({ anger: 0, stress: 0 });
  });
});

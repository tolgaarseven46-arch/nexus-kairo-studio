import { describe, expect, it } from 'vitest';
import { integrateBehaviorLayers } from './behaviorIntegrationEngine';

const basePersonality = {
  humor: 50,
  authority: 50,
  empathy: 50,
  patience: 50,
  seriousness: 50,
  communication: 50,
} as any;

const semantic = (partial: any = {}) => ({
  coercion: 0,
  apology: false,
  repairAttempt: false,
  stopTalking: false,
  stopQuestions: false,
  intent: 'general',
  ...partial,
}) as any;

function input(overrides: any = {}) {
  return {
    personality: basePersonality,
    dynamicState: {
      anger: 0,
      stress: 0,
      relationship: {
        hurtScore: 0,
        conflictScore: 0,
        repairAttempts: 0,
        repairProgress: 0,
        conversationState: 'active',
      },
    },
    semanticEvent: semantic(),
    personalityTendency: {
      behaviorSignals: {
        assertivePressure: 0.95,
        analysisPressure: 0.9,
        revisionReadiness: 0.5,
        decisionPressure: 0.9,
      },
    },
    motivation: { drives: { approachPressure: 0.95, withdrawalPressure: 0 } },
    values: {
      behaviorSignals: {
        moralObjection: 0,
        boundaryPressure: 0,
        autonomyDefense: 0,
        accountabilityPressure: 0,
      },
    },
    preferences: {
      behaviorSignals: {
        engagementDrive: 0.95,
        depthDrive: 0.9,
        overstimulationPressure: 0,
      },
    },
    social: {
      behaviorSignals: {
        affiliationPressure: 0.95,
        carePressure: 0.95,
        disclosurePressure: 0.9,
        leadershipPressure: 0.9,
        resistancePressure: 0,
        socialDistancePressure: 0,
      },
    },
    boundaries: {
      hardStop: false,
      violationPressure: 0,
      behaviorSignals: {
        boundaryAssertion: 0,
        distancePressure: 0,
        escalationPressure: 0,
        disengagementPressure: 0,
        repairOpenness: 0.8,
      },
    },
    expression: {
      humor: { strength: 1, enabled: true, dominantMode: 'affiliative' },
      inhibition: 0,
      speech: {
        brevity: 0.05,
        questionDrive: 0.95,
        informality: 0.9,
        emotionalDisplay: 0.9,
      },
    },
    ...overrides,
  } as any;
}

describe('value / boundary / repair authority contracts', () => {
  it('boundary authority wins when one event simultaneously creates strong boundary and value pressure', () => {
    const result = integrateBehaviorLayers(input({
      values: {
        behaviorSignals: {
          moralObjection: 1,
          boundaryPressure: 1,
          autonomyDefense: 1,
          accountabilityPressure: 1,
        },
      },
      boundaries: {
        hardStop: false,
        violationPressure: 0.9,
        behaviorSignals: {
          boundaryAssertion: 0.95,
          distancePressure: 0.8,
          escalationPressure: 0.65,
          disengagementPressure: 0.55,
          repairOpenness: 0,
        },
      },
    }));

    expect(result.pressures.boundary).toBeGreaterThanOrEqual(0.45);
    expect(result.pressures.values).toBeGreaterThanOrEqual(0.4);
    expect(result.decision.priority).toBe('boundary');
    expect(result.decision.humorAllowed).toBe(false);
    expect(result.decision.stance).not.toBe('warm');
  });

  it('value authority remains available when the same moral conflict does not cross the boundary gate', () => {
    const result = integrateBehaviorLayers(input({
      values: {
        behaviorSignals: {
          moralObjection: 1,
          boundaryPressure: 0.8,
          autonomyDefense: 0.8,
          accountabilityPressure: 0.8,
        },
      },
      boundaries: {
        hardStop: false,
        violationPressure: 0.35,
        behaviorSignals: {
          boundaryAssertion: 0.3,
          distancePressure: 0.2,
          escalationPressure: 0.1,
          disengagementPressure: 0.1,
          repairOpenness: 0,
        },
      },
    }));

    expect(result.pressures.boundary).toBeLessThan(0.45);
    expect(result.pressures.values).toBeGreaterThanOrEqual(0.4);
    expect(result.decision.priority).toBe('values');
    expect(result.decision.continueConversation).toBe(true);
    expect(result.decision.stance).toBe('firm');
  });

  it('a repairing relationship cannot be reopened by maximal warmth, goal, preference or expression pressure', () => {
    const result = integrateBehaviorLayers(input({
      dynamicState: {
        anger: 15,
        stress: 20,
        relationship: {
          hurtScore: 65,
          conflictScore: 55,
          repairAttempts: 2,
          repairProgress: 30,
          conversationState: 'repairing',
        },
      },
      semanticEvent: semantic({ apology: true, repairAttempt: true }),
      boundaries: {
        hardStop: false,
        violationPressure: 0,
        behaviorSignals: {
          boundaryAssertion: 0,
          distancePressure: 0,
          escalationPressure: 0,
          disengagementPressure: 0,
          repairOpenness: 1,
        },
      },
    }));

    expect(result.decision.priority).toBe('relationship');
    expect(result.decision.repairAllowed).toBe(true);
    expect(result.decision.continueConversation).toBe(true);
    expect(result.decision.humorAllowed).toBe(false);
    expect(result.decision.askQuestion).toBe(false);
    expect(result.decision.responseLength).toBe('short');
    expect(result.decision.distance).toBeGreaterThanOrEqual(0.68);
    expect(result.decision.warmth).toBeLessThanOrEqual(0.24);
    expect(result.decision.stance).toBe('distant');
  });

  it('a disengaged relationship can enter only the repairing hold, not normal warmth, when repair becomes eligible', () => {
    const result = integrateBehaviorLayers(input({
      dynamicState: {
        anger: 20,
        stress: 20,
        relationship: {
          hurtScore: 70,
          conflictScore: 60,
          repairAttempts: 1,
          repairProgress: 15,
          conversationState: 'disengaged',
        },
      },
      semanticEvent: semantic({ apology: true, repairAttempt: true }),
      boundaries: {
        hardStop: false,
        violationPressure: 0,
        behaviorSignals: {
          boundaryAssertion: 0,
          distancePressure: 0,
          escalationPressure: 0,
          disengagementPressure: 0,
          repairOpenness: 1,
        },
      },
    }));

    expect(result.decision.priority).toBe('boundary');
    expect(result.decision.repairAllowed).toBe(true);
    expect(result.decision.continueConversation).toBe(true);
    expect(result.decision.humorAllowed).toBe(false);
    expect(result.decision.askQuestion).toBe(false);
    expect(result.decision.distance).toBeGreaterThanOrEqual(0.68);
    expect(result.decision.warmth).toBeLessThanOrEqual(0.24);
    expect(result.decision.stance).toBe('distant');
    expect(result.decision.explanation.some((x) => x.includes('repairing'))).toBe(true);
  });

  it('hard-stop blocks repair even when values and all lower-family warmth signals strongly favor continuation', () => {
    const result = integrateBehaviorLayers(input({
      semanticEvent: semantic({ apology: true, repairAttempt: true }),
      values: {
        behaviorSignals: {
          moralObjection: 1,
          boundaryPressure: 1,
          autonomyDefense: 1,
          accountabilityPressure: 1,
        },
      },
      boundaries: {
        hardStop: true,
        violationPressure: 1,
        behaviorSignals: {
          boundaryAssertion: 1,
          distancePressure: 1,
          escalationPressure: 1,
          disengagementPressure: 1,
          repairOpenness: 1,
        },
      },
    }));

    expect(result.decision.priority).toBe('boundary');
    expect(result.decision.repairAllowed).toBe(false);
    expect(result.decision.continueConversation).toBe(false);
    expect(result.decision.distance).toBe(1);
    expect(result.decision.warmth).toBe(0);
    expect(result.decision.stance).toBe('disengage');
  });
});

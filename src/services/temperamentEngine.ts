export interface TemperamentProfile {
  negativeSensitivity: number;
  frustrationSensitivity: number;
  threatSensitivity: number;
  reactivityThreshold: number;
  rewardSensitivity: number;
  impulseStrength: number;
  inhibitoryControl: number;
  recoverySpeed: number;
  arousalBaseline: number;
  noveltySeeking: number;
  uncertaintyTolerance: number;
  approachDriveBias: number;
  attentionPersistence: number;
}

export interface TemperamentEventInput {
  negativeLoad: number;
  frustrationLoad: number;
  threatLoad: number;
  rewardLoad: number;
  noveltyLoad: number;
  repetitionLoad: number;
  relationshipSafety: number;
  currentStress: number;
  minutesSinceEvent?: number;
}

export interface TemperamentResponse {
  negativeActivation: number;
  frustrationActivation: number;
  threatActivation: number;
  rewardActivation: number;
  approachDrive: number;
  impulsePressure: number;
  inhibitionPressure: number;
  expressedPressure: number;
  arousal: number;
  persistence: number;
  recoveryFactor: number;
  stateDelta: {
    anger: number;
    stress: number;
    happiness: number;
    calmness: number;
    confidence: number;
    surprise: number;
  };
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const clamp100 = (value: number) => Math.max(0, Math.min(100, value));
const n = (value: number) => clamp01(value / 100);
const round3 = (value: number) => Math.round(value * 1000) / 1000;
const round1 = (value: number) => Math.round(value * 10) / 10;

export const DEFAULT_TEMPERAMENT_PROFILE: TemperamentProfile = {
  negativeSensitivity: 50,
  frustrationSensitivity: 50,
  threatSensitivity: 50,
  reactivityThreshold: 50,
  rewardSensitivity: 50,
  impulseStrength: 50,
  inhibitoryControl: 50,
  recoverySpeed: 50,
  arousalBaseline: 50,
  noveltySeeking: 50,
  uncertaintyTolerance: 50,
  approachDriveBias: 50,
  attentionPersistence: 50,
};

/**
 * Converts the character panel's fine-tune profile into the first real
 * temperament model. Older panel keys are supported as fallbacks so this can
 * be introduced without rewriting the rest of the character system.
 */
export const temperamentFromFineTune = (
  fineTune: Record<string, number> | null | undefined,
): TemperamentProfile => {
  const p = fineTune ?? {};
  const read = (key: string, fallbackKey?: string) =>
    clamp100(p[key] ?? (fallbackKey ? p[fallbackKey] : undefined) ?? 50);

  return {
    negativeSensitivity: read(
      'temperament.sensitivity.negative',
      'temperament.reactivity.sensitivity',
    ),
    frustrationSensitivity: read(
      'temperament.sensitivity.frustration',
      'temperament.reactivity.intensity',
    ),
    threatSensitivity: read('temperament.sensitivity.threat'),
    reactivityThreshold: read('temperament.reactivity.threshold'),
    rewardSensitivity: read('temperament.sensitivity.reward'),
    impulseStrength: read('temperament.control.impulseStrength'),
    inhibitoryControl: read(
      'temperament.control.inhibitoryControl',
      'temperament.regulation.inhibitoryControl',
    ),
    recoverySpeed: read(
      'temperament.time.recoverySpeed',
      'temperament.regulation.recoveryRate',
    ),
    arousalBaseline: read('temperament.arousal.baseline'),
    noveltySeeking: read('temperament.exploration.noveltySeeking'),
    uncertaintyTolerance: read('temperament.exploration.uncertaintyTolerance'),
    approachDriveBias: read('temperament.exploration.approachDrive'),
    attentionPersistence: read(
      'temperament.attention.persistence',
      'temperament.regulation.persistence',
    ),
  };
};

/**
 * Deterministic temperament modulation.
 *
 * Important: profile values are propensities, not emotions. Event appraisal
 * supplies the loads; temperament changes how strongly those loads become
 * internal pressure and how much of that pressure survives inhibition.
 */
export const computeTemperamentResponse = (
  profile: TemperamentProfile,
  input: TemperamentEventInput,
): TemperamentResponse => {
  const negativeLoad = clamp01(input.negativeLoad);
  const frustrationLoad = clamp01(input.frustrationLoad);
  const threatLoad = clamp01(input.threatLoad);
  const rewardLoad = clamp01(input.rewardLoad);
  const noveltyLoad = clamp01(input.noveltyLoad);
  const repetitionLoad = clamp01(input.repetitionLoad);
  const relationshipSafety = clamp01(input.relationshipSafety);
  const currentStress = clamp01(input.currentStress);
  // 50 is neutral/backward-compatible. Higher panel threshold requires more pressure; lower threshold reacts more easily.
  const thresholdFactor = 0.75 + (1 - n(profile.reactivityThreshold)) * 0.5;

  const negativeActivation = clamp01(
    negativeLoad * (0.35 + n(profile.negativeSensitivity) * 0.65) * thresholdFactor,
  );

  const frustrationActivation = clamp01(
    frustrationLoad *
      (0.3 + n(profile.frustrationSensitivity) * 0.7) *
      (0.75 + repetitionLoad * 0.25) *
      thresholdFactor,
  );

  const threatActivation = clamp01(
    threatLoad *
      (0.3 + n(profile.threatSensitivity) * 0.7) *
      (1 - relationshipSafety * 0.2) *
      thresholdFactor,
  );

  const rewardActivation = clamp01(
    rewardLoad * (0.35 + n(profile.rewardSensitivity) * 0.65),
  );

  const noveltyApproach =
    noveltyLoad * n(profile.noveltySeeking) * (0.75 + n(profile.approachDriveBias) * 0.5);
  const uncertaintyAvoidanceFactor = 1.15 - n(profile.uncertaintyTolerance) * 0.3;
  const threatAvoidance =
    threatActivation * (1 - relationshipSafety * 0.25) * uncertaintyAvoidanceFactor;
  const approachDrive = clamp01(rewardActivation * 0.55 + noveltyApproach * 0.45 - threatAvoidance * 0.35);

  const rawNegativePressure = clamp01(
    negativeActivation * 0.32 +
      frustrationActivation * 0.38 +
      threatActivation * 0.3,
  );

  const impulsePressure = clamp01(
    rawNegativePressure * (0.35 + n(profile.impulseStrength) * 0.65) *
      (0.8 + currentStress * 0.2),
  );

  const inhibitionPressure = clamp01(
    n(profile.inhibitoryControl) * (0.55 + relationshipSafety * 0.25 - currentStress * 0.15),
  );

  const expressedPressure = clamp01(impulsePressure * (1 - inhibitionPressure * 0.8));

  const baselineArousal = n(profile.arousalBaseline);
  const arousal = clamp01(
    baselineArousal * 0.35 +
      negativeActivation * 0.2 +
      frustrationActivation * 0.18 +
      threatActivation * 0.17 +
      rewardActivation * 0.1,
  );

  const persistence = clamp01(
    n(profile.attentionPersistence) * 0.55 +
      rawNegativePressure * 0.3 +
      repetitionLoad * 0.15,
  );

  const elapsedMinutes = Math.max(0, input.minutesSinceEvent ?? 0);
  const recoveryRatePerMinute = 0.003 + n(profile.recoverySpeed) * 0.017;
  const recoveryFactor = clamp01(Math.exp(-elapsedMinutes * recoveryRatePerMinute));

  const anger = (frustrationActivation * 8 + expressedPressure * 7 + threatActivation * 3) * recoveryFactor;
  const stress = (threatActivation * 7 + negativeActivation * 4 + arousal * 4) * recoveryFactor;
  const happiness = rewardActivation * 10 + approachDrive * 3 - rawNegativePressure * 4;
  const calmness = inhibitionPressure * 5 - arousal * 6 - expressedPressure * 4;
  const confidence = approachDrive * 3 + inhibitionPressure * 2 - threatActivation * 4;
  const surprise = noveltyLoad * (0.4 + n(profile.noveltySeeking) * 0.3) * 8;

  return {
    negativeActivation: round3(negativeActivation),
    frustrationActivation: round3(frustrationActivation),
    threatActivation: round3(threatActivation),
    rewardActivation: round3(rewardActivation),
    approachDrive: round3(approachDrive),
    impulsePressure: round3(impulsePressure),
    inhibitionPressure: round3(inhibitionPressure),
    expressedPressure: round3(expressedPressure),
    arousal: round3(arousal),
    persistence: round3(persistence),
    recoveryFactor: round3(recoveryFactor),
    stateDelta: {
      anger: round1(anger),
      stress: round1(stress),
      happiness: round1(happiness),
      calmness: round1(calmness),
      confidence: round1(confidence),
      surprise: round1(surprise),
    },
  };
};

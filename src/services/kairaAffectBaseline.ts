export interface KairaAffectBaseline {
  anger: number;
  stress: number;
  happiness: number;
  calmness: number;
}

export const DEFAULT_KAIRA_AFFECT_BASELINE: KairaAffectBaseline = Object.freeze({
  anger: 10,
  stress: 20,
  happiness: 70,
  calmness: 70,
});

export const KAIRA_AFFECT_BASELINE_FINE_TUNE_KEYS = Object.freeze({
  anger: "temperament.affectBaseline.anger",
  stress: "temperament.affectBaseline.stress",
  happiness: "temperament.affectBaseline.happiness",
  calmness: "temperament.affectBaseline.calmness",
} as const);

const clamp100 = (value: unknown, fallback: number) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(100, numeric));
};

/**
 * Canonical normalization seam for Kaira's resting affect target. Missing input
 * preserves the shipped baseline exactly.
 */
export function normalizeKairaAffectBaseline(
  input?: Partial<KairaAffectBaseline> | null,
): KairaAffectBaseline {
  return {
    anger: clamp100(input?.anger, DEFAULT_KAIRA_AFFECT_BASELINE.anger),
    stress: clamp100(input?.stress, DEFAULT_KAIRA_AFFECT_BASELINE.stress),
    happiness: clamp100(input?.happiness, DEFAULT_KAIRA_AFFECT_BASELINE.happiness),
    calmness: clamp100(input?.calmness, DEFAULT_KAIRA_AFFECT_BASELINE.calmness),
  };
}

/**
 * Stable character/fine-tune config owns resting affect. `temperament.arousal.baseline`
 * deliberately remains a distinct event-arousal parameter and is never reused here.
 */
export function kairaAffectBaselineFromFineTune(
  fineTune?: Record<string, number> | null,
): KairaAffectBaseline {
  const profile = fineTune ?? {};
  return normalizeKairaAffectBaseline({
    anger: profile[KAIRA_AFFECT_BASELINE_FINE_TUNE_KEYS.anger],
    stress: profile[KAIRA_AFFECT_BASELINE_FINE_TUNE_KEYS.stress],
    happiness: profile[KAIRA_AFFECT_BASELINE_FINE_TUNE_KEYS.happiness],
    calmness: profile[KAIRA_AFFECT_BASELINE_FINE_TUNE_KEYS.calmness],
  });
}

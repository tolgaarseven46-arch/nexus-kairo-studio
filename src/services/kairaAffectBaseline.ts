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

const clamp100 = (value: unknown, fallback: number) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(100, numeric));
};

/**
 * Canonical normalization seam for the four affect channels currently owned by
 * RelationshipReducer homeostasis. Missing input preserves the shipped neutral
 * baseline exactly; callers may later supply an instance-owned baseline without
 * adding another recovery authority inside the reducer.
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

export type FineTuneProfile = Record<string, number>;

export function normalizeFineTuneProfile(raw: unknown): FineTuneProfile {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const normalized: FineTuneProfile = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    normalized[key] = Math.max(0, Math.min(100, value));
  }
  return normalized;
}

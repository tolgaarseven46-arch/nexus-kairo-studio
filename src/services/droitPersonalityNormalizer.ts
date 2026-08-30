import type { DroitPersonalityTraits } from "../types/nexus";

export const NEUTRAL_DROIT_PERSONALITY: DroitPersonalityTraits = {
  anger: 50,
  patience: 50,
  empathy: 50,
  emotionalSensitivity: 50,
  socialIntelligence: 50,
  selfConfidence: 50,
  humor: 50,
  communication: 50,
  charisma: 50,
  curiosity: 50,
  analyticalThinking: 50,
  creativity: 50,
  decisionMaking: 50,
  attention: 50,
  authority: 50,
  courage: 50,
  seriousness: 50,
  loyalty: 50,
  initiative: 50,
};

export function normalizeDroitPersonality(
  value?: Partial<DroitPersonalityTraits> | null,
): DroitPersonalityTraits {
  const normalized: DroitPersonalityTraits = { ...NEUTRAL_DROIT_PERSONALITY };
  if (!value || typeof value !== "object") return normalized;

  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === "number" && Number.isFinite(raw)) {
      normalized[key] = raw;
    }
  }
  return normalized;
}

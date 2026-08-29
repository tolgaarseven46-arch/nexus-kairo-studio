import type { DroitDynamicState, DroitPersonalityTraits } from "../types/nexus";

export interface ExpressionStyleProfile {
  absurd: number;
  irony: number;
  sarcasm: number;
  dark: number;
  affiliative: number;
  aggressive: number;
  selfDirected: number;
  contextInhibition: number;
  verbosity: number;
  informality: number;
  emotionalDisplay: number;
  questionDrive: number;
}

export interface ExpressionStyleResponse {
  humor: {
    enabled: boolean;
    dominantMode: "absurd" | "irony" | "sarcasm" | "dark" | "affiliative" | "aggressive" | "selfDirected" | null;
    strength: number;
  };
  speech: {
    brevity: number;
    informality: number;
    emotionalDisplay: number;
    questionDrive: number;
  };
  inhibition: number;
  legacyTraits: Partial<DroitPersonalityTraits>;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const clamp100 = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
const n = (v: number) => clamp01(v / 100);

export const expressionStyleFromFineTune = (
  fineTune: Record<string, number> | null | undefined,
): ExpressionStyleProfile => {
  const p = fineTune ?? {};
  const read = (key: string) => clamp100(p[key] ?? 50);
  return {
    absurd: read("expression.humor.absurd"),
    irony: read("expression.humor.irony"),
    sarcasm: read("expression.humor.sarcasm"),
    dark: read("expression.humor.dark"),
    affiliative: read("expression.humor.affiliative"),
    aggressive: read("expression.humor.aggressive"),
    selfDirected: read("expression.humor.selfDirected"),
    contextInhibition: read("expression.humor.contextInhibition"),
    verbosity: read("expression.speech.verbosity"),
    informality: read("expression.speech.informality"),
    emotionalDisplay: read("expression.speech.emotionalDisplay"),
    questionDrive: read("expression.speech.questionDrive"),
  };
};

export const computeExpressionStyle = (
  profile: ExpressionStyleProfile,
  message: string,
  dynamicState?: DroitDynamicState,
): ExpressionStyleResponse => {
  const text = message.toLocaleLowerCase("tr-TR");
  const relationship = dynamicState?.relationship;
  const hurt = clamp01((relationship?.hurtScore ?? 0) / 100);
  const conflict = clamp01((relationship?.conflictScore ?? 0) / 100);
  const warmth = clamp01((relationship?.warmth ?? 50) / 100);
  const stress = clamp01((dynamicState?.stress ?? 0) / 100);
  const anger = clamp01((dynamicState?.anger ?? 0) / 100);

  const seriousContext = /(ölüm|öldü|hastane|acı|korkuyorum|üzgün|ağlıyorum|yardım et|tehdit|özür|barışalım)/.test(text) ? 1 : 0;
  const hostileContext = /(aptal|salak|gerizekalı|orospu|kaşar|sürtük|şerefsiz|siktir|defol|zorundasın|mecbursun)/.test(text) ? 1 : 0;
  const playfulContext = /(şaka|komik|gül|haha|hahaha|lol|dalga|eğlen)/.test(text) ? 1 : 0.25;

  const inhibition = clamp01(
    n(profile.contextInhibition) * 0.45 +
      seriousContext * 0.35 +
      hurt * 0.2 +
      conflict * 0.2 +
      stress * 0.1,
  );

  const contextGate = clamp01(1 - inhibition);
  const candidates = {
    absurd: n(profile.absurd) * playfulContext * contextGate,
    irony: n(profile.irony) * (0.45 + playfulContext * 0.35) * contextGate,
    sarcasm: n(profile.sarcasm) * (0.35 + hostileContext * 0.35) * contextGate * (1 - seriousContext * 0.7),
    dark: n(profile.dark) * playfulContext * contextGate * (1 - seriousContext * 0.85),
    affiliative: n(profile.affiliative) * (0.45 + warmth * 0.45) * contextGate,
    aggressive: n(profile.aggressive) * hostileContext * contextGate * (1 - hurt * 0.4),
    selfDirected: n(profile.selfDirected) * playfulContext * contextGate,
  };

  let dominantMode: ExpressionStyleResponse["humor"]["dominantMode"] = null;
  let strength = 0;
  for (const [key, value] of Object.entries(candidates) as Array<[Exclude<typeof dominantMode, null>, number]>) {
    if (value > strength) {
      dominantMode = key;
      strength = value;
    }
  }
  if (strength < 0.22) dominantMode = null;

  const emotionalSuppression = clamp01(hurt * 0.25 + conflict * 0.2 + anger * 0.15);
  const emotionalDisplay = clamp01(n(profile.emotionalDisplay) * (1 - emotionalSuppression * 0.55));
  const questionDrive = clamp01(n(profile.questionDrive) * (1 - hostileContext * 0.55 - conflict * 0.25));
  const brevity = clamp01(1 - n(profile.verbosity));

  return {
    humor: {
      enabled: dominantMode !== null,
      dominantMode,
      strength: clamp01(strength),
    },
    speech: {
      brevity,
      informality: n(profile.informality),
      emotionalDisplay,
      questionDrive,
    },
    inhibition,
    legacyTraits: {
      // Important: context inhibition is inverse to humor propensity; do not bridge it directly.
      humor: clamp100(strength * 100),
      communication: clamp100(profile.verbosity),
      seriousness: clamp100(45 + inhibition * 40 + seriousContext * 15),
    },
  };
};

export const applyExpressionStyle = (
  base: DroitPersonalityTraits,
  fineTune: Record<string, number> | null | undefined,
  message: string,
  dynamicState?: DroitDynamicState,
): { personality: DroitPersonalityTraits; response: ExpressionStyleResponse } => {
  const profile = expressionStyleFromFineTune(fineTune);
  const response = computeExpressionStyle(profile, message, dynamicState);
  return { personality: { ...base, ...response.legacyTraits }, response };
};

import type { DroitPersonalityTraits } from "../types/nexus";

export interface PersonalityTendencyProfile {
  confidence: number;
  directness: number;
  stubbornness: number;
  analysisDepth: number;
  cognitiveFlexibility: number;
  decisiveness: number;
}

export interface PersonalitySituation {
  conflict: number;
  ambiguity: number;
  emotionalLoad: number;
  decisionDemand: number;
  correctionSignal: number;
}

export interface PersonalityTendencyResponse {
  effective: PersonalityTendencyProfile;
  legacyTraits: Partial<DroitPersonalityTraits>;
  behaviorSignals: {
    assertivePressure: number;
    analysisPressure: number;
    revisionReadiness: number;
    decisionPressure: number;
  };
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const clamp100 = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const n = (value: number) => clamp01(value / 100);

export const DEFAULT_PERSONALITY_TENDENCY_PROFILE: PersonalityTendencyProfile = {
  confidence: 50,
  directness: 50,
  stubbornness: 50,
  analysisDepth: 50,
  cognitiveFlexibility: 50,
  decisiveness: 50,
};

export const personalityTendenciesFromFineTune = (
  fineTune: Record<string, number> | null | undefined,
): PersonalityTendencyProfile => {
  const p = fineTune ?? {};
  const read = (key: string) => clamp100(p[key] ?? 50);

  return {
    confidence: read("personality.assertion.confidence"),
    directness: read("personality.assertion.directness"),
    stubbornness: read("personality.assertion.stubbornness"),
    analysisDepth: read("personality.cognition.analysisDepth"),
    cognitiveFlexibility: read("personality.cognition.flexibility"),
    decisiveness: read("personality.cognition.deciveness"),
  };
};

export const inferPersonalitySituation = (message: string): PersonalitySituation => {
  const text = message.toLocaleLowerCase("tr-TR");
  const conflict = /(aptal|salak|saçma|yanlış|haksız|yeter|sinir|kızgın|defol|siktir|amk|aq\b|tartış|itiraz)/.test(text) ? 0.85 : 0.1;
  const ambiguity = /(emin değilim|bilmiyorum|acaba|belki|olabilir|sence|ne dersin|kararsız)/.test(text) ? 0.8 : 0.2;
  const emotionalLoad = /(üzgün|moralim|kötü hissed|bunaldım|kırıldım|sinirliyim|kızgınım|mutluyum|seviyorum)/.test(text) ? 0.8 : 0.15;
  const decisionDemand = /(hangisi|seç|karar|ne yapayım|yapayım mı|olur mu|hangisini|öner|tercih)/.test(text) ? 0.85 : 0.2;
  const correctionSignal = /(yanlış anladın|öyle değil|hayır|düzelt|demek istediğim|kastettiğim|aksine)/.test(text) ? 0.9 : 0.05;

  return { conflict, ambiguity, emotionalLoad, decisionDemand, correctionSignal };
};

/**
 * Converts stable personality tendencies into runtime tendencies for the current
 * situation. Stable sliders are propensities; context determines how strongly
 * they become behavior on a given turn.
 */
export const computePersonalityTendencyResponse = (
  profile: PersonalityTendencyProfile,
  situation: PersonalitySituation,
): PersonalityTendencyResponse => {
  const conflict = clamp01(situation.conflict);
  const ambiguity = clamp01(situation.ambiguity);
  const emotionalLoad = clamp01(situation.emotionalLoad);
  const decisionDemand = clamp01(situation.decisionDemand);
  const correctionSignal = clamp01(situation.correctionSignal);

  const confidence = clamp100(
    profile.confidence * (0.82 + decisionDemand * 0.12 - ambiguity * 0.08),
  );
  const directness = clamp100(
    profile.directness * (0.72 + conflict * 0.18 + decisionDemand * 0.16 - emotionalLoad * 0.08),
  );
  const stubbornness = clamp100(
    profile.stubbornness * (0.78 + conflict * 0.15 - correctionSignal * n(profile.cognitiveFlexibility) * 0.45),
  );
  const analysisDepth = clamp100(
    profile.analysisDepth * (0.72 + ambiguity * 0.22 + decisionDemand * 0.16 + correctionSignal * 0.12),
  );
  const cognitiveFlexibility = clamp100(
    profile.cognitiveFlexibility * (0.78 + correctionSignal * 0.28 + ambiguity * 0.08 - conflict * n(profile.stubbornness) * 0.1),
  );
  const decisiveness = clamp100(
    profile.decisiveness * (0.75 + decisionDemand * 0.24 - ambiguity * 0.12 + n(confidence) * 0.08),
  );

  const revisionReadiness = clamp01(
    n(cognitiveFlexibility) * 0.65 + correctionSignal * 0.35 - n(stubbornness) * 0.25,
  );
  const assertivePressure = clamp01(n(confidence) * 0.45 + n(directness) * 0.4 + conflict * 0.15);
  const analysisPressure = clamp01(n(analysisDepth) * 0.7 + ambiguity * 0.2 + correctionSignal * 0.1);
  const decisionPressure = clamp01(n(decisiveness) * 0.7 + decisionDemand * 0.3);

  return {
    effective: {
      confidence,
      directness,
      stubbornness,
      analysisDepth,
      cognitiveFlexibility,
      decisiveness,
    },
    legacyTraits: {
      selfConfidence: confidence,
      authority: clamp100(confidence * 0.45 + directness * 0.55),
      analyticalThinking: analysisDepth,
      decisionMaking: decisiveness,
      patience: clamp100(50 + cognitiveFlexibility * 0.25 - stubbornness * 0.15),
      attention: clamp100(analysisDepth * 0.7 + cognitiveFlexibility * 0.3),
    },
    behaviorSignals: {
      assertivePressure,
      analysisPressure,
      revisionReadiness,
      decisionPressure,
    },
  };
};

export const applyPersonalityTendencies = (
  base: DroitPersonalityTraits,
  fineTune: Record<string, number> | null | undefined,
  message: string,
): { personality: DroitPersonalityTraits; response: PersonalityTendencyResponse } => {
  const profile = personalityTendenciesFromFineTune(fineTune);
  const situation = inferPersonalitySituation(message);
  const response = computePersonalityTendencyResponse(profile, situation);

  return {
    personality: {
      ...base,
      ...response.legacyTraits,
    },
    response,
  };
};

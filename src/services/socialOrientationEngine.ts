import type {
  DroitDynamicState,
  DroitPersonalityTraits,
} from "../types/nexus";

export interface SocialOrientationProfile {
  warmth: number;
  empathy: number;
  closenessDrive: number;
  dominance: number;
  initiative: number;
  compliance: number;
  initialTrust: number;
  disclosure: number;
}

export interface SocialSituation {
  affiliationOpportunity: number;
  vulnerabilitySignal: number;
  challengeSignal: number;
  requestSignal: number;
  coercionSignal: number;
  intimacySignal: number;
  betrayalSignal: number;
}

export interface SocialOrientationResponse {
  effective: {
    warmth: number;
    empathy: number;
    closeness: number;
    dominance: number;
    initiative: number;
    compliance: number;
    trustOpenness: number;
    disclosure: number;
  };
  behaviorSignals: {
    affiliationPressure: number;
    carePressure: number;
    leadershipPressure: number;
    resistancePressure: number;
    disclosurePressure: number;
    socialDistancePressure: number;
  };
  legacyTraits: Partial<DroitPersonalityTraits>;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const clamp100 = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const n = (value: number) => clamp01(value / 100);

export const DEFAULT_SOCIAL_ORIENTATION_PROFILE: SocialOrientationProfile = {
  warmth: 50,
  empathy: 50,
  closenessDrive: 50,
  dominance: 50,
  initiative: 50,
  compliance: 50,
  initialTrust: 50,
  disclosure: 50,
};

export const socialOrientationFromFineTune = (
  fineTune: Record<string, number> | null | undefined,
): SocialOrientationProfile => {
  const p = fineTune ?? {};
  const read = (key: string) => clamp100(p[key] ?? 50);
  return {
    warmth: read("social.communion.warmth"),
    empathy: read("social.communion.empathy"),
    closenessDrive: read("social.communion.closenessDrive"),
    dominance: read("social.agency.dominance"),
    initiative: read("social.agency.initiative"),
    compliance: read("social.agency.compliance"),
    initialTrust: read("social.trust.initialTrust"),
    disclosure: read("social.trust.disclosure"),
  };
};

export const inferSocialSituation = (message: string): SocialSituation => {
  const text = message.toLocaleLowerCase("tr-TR");
  const hit = (re: RegExp, high = 0.9, low = 0.05) => (re.test(text) ? high : low);

  return {
    affiliationOpportunity: hit(/(kanka|dostum|beraber|birlikte|sohbet|tanış|arkadaş|özledim|seviyorum)/, 0.85, 0.15),
    vulnerabilitySignal: hit(/(üzgün|kırıldım|moralim bozuk|yalnızım|korkuyorum|bunaldım|canım sıkkın|yardım et)/),
    challengeSignal: hit(/(yanlışsın|haksızsın|saçma|itiraz|katılmıyorum|hayır|olmaz|sen kimsin)/, 0.8, 0.1),
    requestSignal: hit(/(yapar mısın|eder misin|yardım eder misin|lütfen|rica|şunu yap|bunu yap)/, 0.75, 0.15),
    coercionSignal: hit(/(zorundasın|mecbursun|emrediyorum|dediğimi yap|sus|kes|itaat et)/),
    intimacySignal: hit(/(sana güveniyorum|sırrım|özel bir şey|kimseye söyleme|aramızda kalsın|seni seviyorum)/, 0.9, 0.05),
    betrayalSignal: hit(/(ihanet|güvenimi kırdın|beni sattın|arkamdan|yalan söyledin)/),
  };
};

export const computeSocialOrientationResponse = (
  profile: SocialOrientationProfile,
  situation: SocialSituation,
  dynamicState?: DroitDynamicState,
): SocialOrientationResponse => {
  const relationship = dynamicState?.relationship;
  const warmthHistory = n(relationship?.warmth ?? 50);
  const trustHistory = n(relationship?.trust ?? profile.initialTrust);
  const hurt = n(relationship?.hurtScore ?? 0);
  const conflict = n(relationship?.conflictScore ?? 0);
  const familiarity = clamp01((relationship?.interactionCount ?? 0) / 40);

  const affiliation = clamp01(situation.affiliationOpportunity);
  const vulnerability = clamp01(situation.vulnerabilitySignal);
  const challenge = clamp01(situation.challengeSignal);
  const request = clamp01(situation.requestSignal);
  const coercion = clamp01(situation.coercionSignal);
  const intimacy = clamp01(situation.intimacySignal);
  const betrayal = clamp01(situation.betrayalSignal);

  const safety = clamp01(
    trustHistory * 0.5 + warmthHistory * 0.3 + familiarity * 0.2 - hurt * 0.35 - conflict * 0.25 - betrayal * 0.4,
  );

  const warmth = clamp100(
    profile.warmth * (0.72 + affiliation * 0.2 + vulnerability * 0.12 + safety * 0.12 - conflict * 0.2),
  );
  const empathy = clamp100(
    profile.empathy * (0.75 + vulnerability * 0.3 + affiliation * 0.08 - coercion * 0.08),
  );
  const closeness = clamp100(
    profile.closenessDrive * (0.62 + affiliation * 0.2 + intimacy * 0.2 + safety * 0.22 - hurt * 0.25 - betrayal * 0.35),
  );
  const dominance = clamp100(
    profile.dominance * (0.74 + challenge * 0.18 + coercion * 0.24 + request * 0.06),
  );
  const initiative = clamp100(
    profile.initiative * (0.72 + affiliation * 0.12 + vulnerability * 0.12 + request * 0.16),
  );
  const compliance = clamp100(
    profile.compliance * (0.76 + request * 0.16 - coercion * (0.25 + n(profile.dominance) * 0.2) - challenge * 0.08),
  );
  const trustOpenness = clamp100(
    profile.initialTrust * (0.5 + safety * 0.55 - betrayal * 0.45 - hurt * 0.2),
  );
  const disclosure = clamp100(
    profile.disclosure * (0.5 + intimacy * 0.22 + safety * 0.32 + familiarity * 0.12 - conflict * 0.25 - betrayal * 0.35),
  );

  const affiliationPressure = clamp01(n(warmth) * 0.35 + n(closeness) * 0.35 + affiliation * 0.3);
  const carePressure = clamp01(n(empathy) * 0.65 + vulnerability * 0.35);
  const leadershipPressure = clamp01(n(dominance) * 0.55 + n(initiative) * 0.3 + challenge * 0.15);
  const resistancePressure = clamp01(coercion * 0.45 + n(dominance) * 0.25 + (1 - n(compliance)) * 0.3);
  const disclosurePressure = clamp01(n(disclosure) * 0.65 + intimacy * 0.2 + safety * 0.15);
  const socialDistancePressure = clamp01(hurt * 0.35 + conflict * 0.3 + betrayal * 0.35);

  return {
    effective: {
      warmth,
      empathy,
      closeness,
      dominance,
      initiative,
      compliance,
      trustOpenness,
      disclosure,
    },
    behaviorSignals: {
      affiliationPressure,
      carePressure,
      leadershipPressure,
      resistancePressure,
      disclosurePressure,
      socialDistancePressure,
    },
    legacyTraits: {
      empathy,
      authority: dominance,
      initiative,
      selfConfidence: clamp100(45 + dominance * 0.35 + trustOpenness * 0.2),
      patience: clamp100(45 + empathy * 0.25 + warmth * 0.2 - resistancePressure * 20),
      communication: clamp100(35 + warmth * 0.2 + initiative * 0.2 + disclosure * 0.25),
    },
  };
};

export const applySocialOrientation = (
  base: DroitPersonalityTraits,
  fineTune: Record<string, number> | null | undefined,
  message: string,
  dynamicState?: DroitDynamicState,
): { personality: DroitPersonalityTraits; response: SocialOrientationResponse } => {
  const profile = socialOrientationFromFineTune(fineTune);
  const situation = inferSocialSituation(message);
  const response = computeSocialOrientationResponse(profile, situation, dynamicState);

  return {
    personality: { ...base, ...response.legacyTraits },
    response,
  };
};

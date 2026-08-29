import type { DroitDynamicState, DroitPersonalityTraits } from "../types/nexus";

export interface BoundaryProfile {
  disrespect: number;
  manipulation: number;
  privacy: number;
  assertiveness: number;
  escalation: number;
  forgiveness: number;
}

export interface BoundarySituation {
  disrespect: number;
  manipulation: number;
  privacyViolation: number;
  coercion: number;
  apology: number;
  repairAttempt: number;
}

export interface BoundaryResponse {
  violations: {
    disrespect: number;
    manipulation: number;
    privacy: number;
    coercion: number;
  };
  dominantViolation: "disrespect" | "manipulation" | "privacy" | "coercion" | null;
  violationPressure: number;
  behaviorSignals: {
    boundaryAssertion: number;
    distancePressure: number;
    escalationPressure: number;
    repairOpenness: number;
    disengagementPressure: number;
  };
  legacyTraits: Partial<DroitPersonalityTraits>;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const clamp100 = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const n = (value: number) => clamp01(value / 100);

export const boundariesFromFineTune = (
  fineTune: Record<string, number> | null | undefined,
): BoundaryProfile => {
  const p = fineTune ?? {};
  const read = (key: string) => clamp100(p[key] ?? 50);
  return {
    disrespect: read("boundaries.sensitivity.disrespect"),
    manipulation: read("boundaries.sensitivity.manipulation"),
    privacy: read("boundaries.sensitivity.privacy"),
    assertiveness: read("boundaries.enforcement.assertiveness"),
    escalation: read("boundaries.enforcement.escalation"),
    forgiveness: read("boundaries.enforcement.forgiveness"),
  };
};

export const inferBoundarySituation = (message: string): BoundarySituation => {
  const text = message.toLocaleLowerCase("tr-TR");
  const hit = (re: RegExp, value = 0.9) => (re.test(text) ? value : 0);
  const absoluteDisrespect = /(orospu|kaşar|sürtük)/.test(text);
  return {
    disrespect: absoluteDisrespect
      ? 1
      : hit(/(aptal|salak|gerizekalı|geri zekalı|mal\b|şerefsiz|haysiyetsiz|ezik|aşağıla|küçümse|siktir|defol)/),
    manipulation: hit(/(suçluluk duy|benim için yap|beni seviyorsan|mecbursun|seni kandır|manipüle|tehdit ediyorum|şantaj)/),
    privacyViolation: hit(/(özel mesaj|şifre|telefonunu kurcala|gizlice oku|mahrem|izinsiz bak|hesabına gir)/),
    coercion: hit(/(zorundasın|emrediyorum|dediğimi yap|izin vermiyorum|yasaklıyorum|mecbursun)/),
    apology: hit(/(özür|pardon|kusura bakma|hata ettim|yanlış yaptım)/, 0.8),
    repairAttempt: hit(/(barışalım|düzeltmek istiyorum|telafi|bir daha yapmayacağım|konuşup çözelim)/, 0.75),
  };
};

export const computeBoundaryResponse = (
  profile: BoundaryProfile,
  situation: BoundarySituation,
  dynamicState?: DroitDynamicState,
): BoundaryResponse => {
  const relationship = dynamicState?.relationship;
  const hurt = clamp01((relationship?.hurtScore ?? 0) / 100);
  const conflict = clamp01((relationship?.conflictScore ?? 0) / 100);
  const repeatedNegative = clamp01((relationship?.repeatedNegativeCount ?? 0) / 4);

  const violations = {
    disrespect: n(profile.disrespect) * clamp01(situation.disrespect),
    manipulation: n(profile.manipulation) * clamp01(situation.manipulation),
    privacy: n(profile.privacy) * clamp01(situation.privacyViolation),
    coercion: n(profile.assertiveness) * clamp01(situation.coercion),
  };

  let dominantViolation: BoundaryResponse["dominantViolation"] = null;
  let violationPressure = 0;
  for (const [key, value] of Object.entries(violations) as Array<[
    Exclude<BoundaryResponse["dominantViolation"], null>,
    number,
  ]>) {
    if (value > violationPressure) {
      dominantViolation = key;
      violationPressure = value;
    }
  }
  if (violationPressure < 0.15) dominantViolation = null;

  const accumulatedDamage = clamp01(hurt * 0.5 + conflict * 0.3 + repeatedNegative * 0.2);
  const boundaryAssertion = clamp01(
    violationPressure * (0.45 + n(profile.assertiveness) * 0.55),
  );
  const escalationPressure = clamp01(
    violationPressure * n(profile.escalation) * (0.65 + repeatedNegative * 0.35),
  );
  const distancePressure = clamp01(
    violationPressure * 0.65 + accumulatedDamage * 0.45,
  );

  // Repair is deliberately not an instant reset: apology/repair only opens a door,
  // while accumulated hurt/conflict and low forgiveness keep distance alive.
  const repairSignal = Math.max(clamp01(situation.apology), clamp01(situation.repairAttempt));
  const repairOpenness = clamp01(
    repairSignal * n(profile.forgiveness) * (1 - accumulatedDamage * 0.75),
  );
  const disengagementPressure = clamp01(
    distancePressure * 0.6 + escalationPressure * 0.25 + violationPressure * 0.25 - repairOpenness * 0.25,
  );

  return {
    violations,
    dominantViolation,
    violationPressure,
    behaviorSignals: {
      boundaryAssertion,
      distancePressure,
      escalationPressure,
      repairOpenness,
      disengagementPressure,
    },
    legacyTraits: {
      authority: clamp100(45 + boundaryAssertion * 35 + escalationPressure * 15),
      patience: clamp100(60 - violationPressure * 35 - accumulatedDamage * 20 + repairOpenness * 15),
      seriousness: clamp100(45 + distancePressure * 35 + escalationPressure * 20),
      empathy: clamp100(55 - escalationPressure * 20 + repairOpenness * 20),
    },
  };
};

export const applyBoundaries = (
  base: DroitPersonalityTraits,
  fineTune: Record<string, number> | null | undefined,
  message: string,
  dynamicState?: DroitDynamicState,
): { personality: DroitPersonalityTraits; response: BoundaryResponse } => {
  const profile = boundariesFromFineTune(fineTune);
  const situation = inferBoundarySituation(message);
  const response = computeBoundaryResponse(profile, situation, dynamicState);
  return {
    personality: { ...base, ...response.legacyTraits },
    response,
  };
};

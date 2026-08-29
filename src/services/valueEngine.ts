import type { DroitPersonalityTraits } from "../types/nexus";

export interface ValueProfile {
  honesty: number;
  fairness: number;
  loyalty: number;
  compassion: number;
  freedom: number;
  privacy: number;
  respect: number;
  responsibility: number;
}

export interface ValueSituation {
  deception: number;
  unfairness: number;
  betrayal: number;
  harm: number;
  coercion: number;
  privacyViolation: number;
  disrespect: number;
  irresponsibility: number;
}

export interface ValueResponse {
  conflicts: Record<keyof ValueProfile, number>;
  dominantValue: keyof ValueProfile | null;
  dominantConflict: number;
  behaviorSignals: {
    moralObjection: number;
    protectivePressure: number;
    autonomyDefense: number;
    boundaryPressure: number;
    accountabilityPressure: number;
  };
  legacyTraits: Partial<DroitPersonalityTraits>;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const clamp100 = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const n = (value: number) => clamp01(value / 100);

export const DEFAULT_VALUE_PROFILE: ValueProfile = {
  honesty: 50,
  fairness: 50,
  loyalty: 50,
  compassion: 50,
  freedom: 50,
  privacy: 50,
  respect: 50,
  responsibility: 50,
};

export const valuesFromFineTune = (
  fineTune: Record<string, number> | null | undefined,
): ValueProfile => {
  const p = fineTune ?? {};
  const read = (key: string) => clamp100(p[key] ?? 50);
  return {
    honesty: read("values.moral.honesty"),
    fairness: read("values.moral.fairness"),
    loyalty: read("values.moral.loyalty"),
    compassion: read("values.moral.compassion"),
    freedom: read("values.personal.freedom"),
    privacy: read("values.personal.privacy"),
    respect: read("values.personal.respect"),
    responsibility: read("values.personal.responsibility"),
  };
};

export const inferValueSituation = (message: string): ValueSituation => {
  const text = message.toLocaleLowerCase("tr-TR");
  const hit = (re: RegExp, high = 0.9, low = 0.05) => (re.test(text) ? high : low);
  return {
    deception: hit(/(yalan|kandır|sakla bunu|doğruyu söyleme|aldat|numara yap)/),
    unfairness: hit(/(haksız|adaletsiz|torpil|ayrımcılık|çifte standart|hak yedi)/),
    betrayal: hit(/(ihanet|arkadan vur|sattı beni|sözünü boz|güvenimi kır)/),
    harm: hit(/(zarar ver|incit|döv|öldür|ez|acı çektir|zorbalık)/),
    coercion: hit(/(zorundasın|mecbursun|emrediyorum|dediğimi yap|izin vermiyorum|yasaklıyorum)/),
    privacyViolation: hit(/(özel mesaj|şifresini|telefonunu kurcala|gizlice oku|mahrem|izinsiz bak)/),
    disrespect: hit(/(aptal|salak|gerizekalı|mal\b|orospu|kaşar|sürtük|şerefsiz|haysiyetsiz|ezik|aşağıla|küçümse)/),
    irresponsibility: hit(/(sözümü tutmadım|boşver sorumluluğu|işi bıraktım|umrumda değil|yükümlülük)/, 0.75),
  };
};

export const computeValueResponse = (
  profile: ValueProfile,
  situation: ValueSituation,
): ValueResponse => {
  const conflicts = {
    honesty: n(profile.honesty) * clamp01(situation.deception),
    fairness: n(profile.fairness) * clamp01(situation.unfairness),
    loyalty: n(profile.loyalty) * clamp01(situation.betrayal),
    compassion: n(profile.compassion) * clamp01(situation.harm),
    freedom: n(profile.freedom) * clamp01(situation.coercion),
    privacy: n(profile.privacy) * clamp01(situation.privacyViolation),
    respect: n(profile.respect) * clamp01(situation.disrespect),
    responsibility: n(profile.responsibility) * clamp01(situation.irresponsibility),
  } satisfies Record<keyof ValueProfile, number>;

  let dominantValue: keyof ValueProfile | null = null;
  let dominantConflict = 0;
  for (const [key, value] of Object.entries(conflicts) as Array<[keyof ValueProfile, number]>) {
    if (value > dominantConflict) {
      dominantValue = key;
      dominantConflict = value;
    }
  }

  const moralObjection = clamp01(
    conflicts.honesty * 0.2 +
      conflicts.fairness * 0.2 +
      conflicts.loyalty * 0.15 +
      conflicts.compassion * 0.15 +
      conflicts.respect * 0.3,
  );
  const protectivePressure = clamp01(
    conflicts.compassion * 0.55 + conflicts.fairness * 0.25 + conflicts.loyalty * 0.2,
  );
  const autonomyDefense = clamp01(conflicts.freedom * 0.75 + conflicts.privacy * 0.25);
  const boundaryPressure = clamp01(
    conflicts.respect * 0.45 + conflicts.privacy * 0.3 + conflicts.freedom * 0.25,
  );
  const accountabilityPressure = clamp01(
    conflicts.responsibility * 0.5 + conflicts.honesty * 0.25 + conflicts.fairness * 0.25,
  );

  return {
    conflicts,
    dominantValue: dominantConflict >= 0.2 ? dominantValue : null,
    dominantConflict,
    behaviorSignals: {
      moralObjection,
      protectivePressure,
      autonomyDefense,
      boundaryPressure,
      accountabilityPressure,
    },
    legacyTraits: {
      empathy: clamp100(50 + protectivePressure * 35 - moralObjection * 5),
      loyalty: clamp100(profile.loyalty),
      authority: clamp100(50 + boundaryPressure * 25 + accountabilityPressure * 15),
      seriousness: clamp100(45 + dominantConflict * 45),
      patience: clamp100(55 - dominantConflict * 30 + n(profile.compassion) * 10),
    },
  };
};

export const applyValues = (
  base: DroitPersonalityTraits,
  fineTune: Record<string, number> | null | undefined,
  message: string,
): { personality: DroitPersonalityTraits; response: ValueResponse } => {
  const profile = valuesFromFineTune(fineTune);
  const situation = inferValueSituation(message);
  const response = computeValueResponse(profile, situation);
  return {
    personality: { ...base, ...response.legacyTraits },
    response,
  };
};

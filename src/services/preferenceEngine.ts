import type { DroitPersonalityTraits } from "../types/nexus";

export interface PreferenceProfile {
  novelty: number;
  complexity: number;
  intensity: number;
  depth: number;
  playfulness: number;
  competition: number;
}

export interface PreferenceSituation {
  noveltyOpportunity: number;
  complexityOpportunity: number;
  intensityLevel: number;
  depthOpportunity: number;
  playOpportunity: number;
  competitionOpportunity: number;
  emotionalSeriousness: number;
}

export interface PreferenceResponse {
  attraction: Record<keyof PreferenceProfile, number>;
  dominantPreference: keyof PreferenceProfile | null;
  dominantAttraction: number;
  behaviorSignals: {
    engagementDrive: number;
    explorationDrive: number;
    depthDrive: number;
    playDrive: number;
    competitionDrive: number;
    overstimulationPressure: number;
  };
  legacyTraits: Partial<DroitPersonalityTraits>;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const clamp100 = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const n = (value: number) => clamp01(value / 100);

export const DEFAULT_PREFERENCE_PROFILE: PreferenceProfile = {
  novelty: 50,
  complexity: 50,
  intensity: 50,
  depth: 50,
  playfulness: 50,
  competition: 50,
};

export const preferencesFromFineTune = (
  fineTune: Record<string, number> | null | undefined,
): PreferenceProfile => {
  const p = fineTune ?? {};
  const read = (key: string) => clamp100(p[key] ?? 50);
  return {
    novelty: read("preferences.stimulation.novelty"),
    complexity: read("preferences.stimulation.complexity"),
    intensity: read("preferences.stimulation.intensity"),
    depth: read("preferences.interaction.depth"),
    playfulness: read("preferences.interaction.playfulness"),
    competition: read("preferences.interaction.competition"),
  };
};

export const inferPreferenceSituation = (message: string): PreferenceSituation => {
  const text = message.toLocaleLowerCase("tr-TR");
  const hit = (re: RegExp, high = 0.9, low = 0.08) => (re.test(text) ? high : low);

  return {
    noveltyOpportunity: hit(/(yeni|ilk kez|farklı|acayip|garip|keşfet|deneyelim|deneyelim mi|sürpriz|bilmediğin)/),
    complexityOpportunity: hit(/(detaylı|karmaşık|zor|analiz|neden|nasıl çalışıyor|mantığı|katman|teknik|derinlemesine)/),
    intensityLevel: hit(/(çok hızlı|çılgın|aşırı|sert|heyecanlı|yüksek tempo|kaos|gerilim|kapış|meydan oku)/, 0.95, 0.12),
    depthOpportunity: hit(/(ciddi konuş|içimi dökeyim|derin|hayat|neden böyle hissediyorum|sence ben|gerçekten ne düşünüyorsun|samimi konuş)/),
    playOpportunity: hit(/(şaka|espri|dalga geç|eğlen|oyun|komik|güldür|takılalım|geyik)/),
    competitionOpportunity: hit(/(yarış|rekabet|kapış|kim kazanır|meydan oku|vs\b|puan|skor|geçebilir misin|yenebilir misin)/),
    emotionalSeriousness: hit(/(üzgün|kırıldım|moralim bozuk|ağlıyorum|kötü hissediyorum|yas|öldü|ayrıldık|çok ciddiyim|yardım et)/, 0.95, 0.05),
  };
};

/**
 * Preferences are attraction/avoidance biases, not values or moral rules.
 * They change how eagerly Kaira engages with an available interaction style.
 */
export const computePreferenceResponse = (
  profile: PreferenceProfile,
  situation: PreferenceSituation,
): PreferenceResponse => {
  const seriousness = clamp01(situation.emotionalSeriousness);
  const attraction = {
    novelty: n(profile.novelty) * clamp01(situation.noveltyOpportunity),
    complexity: n(profile.complexity) * clamp01(situation.complexityOpportunity),
    intensity: n(profile.intensity) * clamp01(situation.intensityLevel),
    depth: n(profile.depth) * clamp01(situation.depthOpportunity),
    playfulness:
      n(profile.playfulness) * clamp01(situation.playOpportunity) * (1 - seriousness * 0.9),
    competition:
      n(profile.competition) * clamp01(situation.competitionOpportunity) * (1 - seriousness * 0.75),
  } satisfies Record<keyof PreferenceProfile, number>;

  let dominantPreference: keyof PreferenceProfile | null = null;
  let dominantAttraction = 0;
  for (const [key, value] of Object.entries(attraction) as Array<[
    keyof PreferenceProfile,
    number,
  ]>) {
    if (value > dominantAttraction) {
      dominantPreference = key;
      dominantAttraction = value;
    }
  }

  const explorationDrive = clamp01(
    attraction.novelty * 0.65 + attraction.complexity * 0.35,
  );
  const depthDrive = clamp01(
    attraction.depth * 0.7 + attraction.complexity * 0.3,
  );
  const playDrive = clamp01(
    attraction.playfulness * 0.75 + attraction.novelty * 0.25,
  );
  const competitionDrive = clamp01(
    attraction.competition * 0.8 + attraction.intensity * 0.2,
  );
  const engagementDrive = clamp01(
    explorationDrive * 0.25 +
      depthDrive * 0.25 +
      playDrive * 0.2 +
      competitionDrive * 0.15 +
      attraction.intensity * 0.15,
  );

  const incomingIntensity = clamp01(situation.intensityLevel);
  const preferredIntensity = n(profile.intensity);
  const overstimulationPressure = clamp01(
    Math.max(0, incomingIntensity - preferredIntensity) * (0.65 + seriousness * 0.35),
  );

  return {
    attraction,
    dominantPreference: dominantAttraction >= 0.18 ? dominantPreference : null,
    dominantAttraction,
    behaviorSignals: {
      engagementDrive,
      explorationDrive,
      depthDrive,
      playDrive,
      competitionDrive,
      overstimulationPressure,
    },
    legacyTraits: {
      curiosity: clamp100(45 + explorationDrive * 45),
      analyticalThinking: clamp100(45 + depthDrive * 40),
      creativity: clamp100(45 + playDrive * 35 + explorationDrive * 15),
      humor: clamp100(35 + playDrive * 55),
      initiative: clamp100(45 + engagementDrive * 40 + competitionDrive * 10),
      seriousness: clamp100(45 + seriousness * 45 + depthDrive * 10 - playDrive * 20),
      patience: clamp100(55 - overstimulationPressure * 35 + depthDrive * 10),
    },
  };
};

export const applyPreferences = (
  base: DroitPersonalityTraits,
  fineTune: Record<string, number> | null | undefined,
  message: string,
): { personality: DroitPersonalityTraits; response: PreferenceResponse } => {
  const profile = preferencesFromFineTune(fineTune);
  const situation = inferPreferenceSituation(message);
  const response = computePreferenceResponse(profile, situation);
  return {
    personality: { ...base, ...response.legacyTraits },
    response,
  };
};

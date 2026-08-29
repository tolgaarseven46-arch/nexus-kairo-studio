import type { DroitPersonalityTraits } from "../types/nexus";

export interface MotivationProfile {
  connection: number;
  belonging: number;
  recognition: number;
  autonomy: number;
  achievement: number;
  impact: number;
  predictability: number;
  stability: number;
}

export interface MotivationSituation {
  socialOpportunity: number;
  rejectionRisk: number;
  recognitionOpportunity: number;
  autonomyThreat: number;
  achievementOpportunity: number;
  influenceOpportunity: number;
  uncertainty: number;
  instability: number;
}

export interface MotivationResponse {
  effective: MotivationProfile;
  drives: {
    affiliationDrive: number;
    approvalDrive: number;
    autonomyDrive: number;
    achievementDrive: number;
    influenceDrive: number;
    securityDrive: number;
    approachPressure: number;
    withdrawalPressure: number;
  };
  legacyTraits: Partial<DroitPersonalityTraits>;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const clamp100 = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const n = (value: number) => clamp01(value / 100);

export const DEFAULT_MOTIVATION_PROFILE: MotivationProfile = {
  connection: 50,
  belonging: 50,
  recognition: 50,
  autonomy: 50,
  achievement: 50,
  impact: 50,
  predictability: 50,
  stability: 50,
};

export const motivationsFromFineTune = (
  fineTune: Record<string, number> | null | undefined,
): MotivationProfile => {
  const p = fineTune ?? {};
  const read = (key: string) => clamp100(p[key] ?? 50);

  return {
    connection: read("motivation.social.connection"),
    belonging: read("motivation.social.belonging"),
    recognition: read("motivation.social.recognition"),
    autonomy: read("motivation.agency.autonomy"),
    achievement: read("motivation.agency.achievement"),
    impact: read("motivation.agency.impact"),
    predictability: read("motivation.security.predictability"),
    stability: read("motivation.security.stability"),
  };
};

export const inferMotivationSituation = (message: string): MotivationSituation => {
  const text = message.toLocaleLowerCase("tr-TR");

  return {
    socialOpportunity: /(konuşalım|sohbet|beraber|birlikte|arkadaş|kanka|dost|tanış|yanımda|buluş)/.test(text) ? 0.85 : 0.2,
    rejectionRisk: /(istemiyorum|git|uzak dur|konuşma benimle|bırak beni|defol|sevmiyorum|reddet)/.test(text) ? 0.9 : 0.1,
    recognitionOpportunity: /(teşekkür|sağ ol|aferin|başardın|çok iyisin|harika|mükemmel|takdir)/.test(text) ? 0.9 : 0.15,
    autonomyThreat: /(mecbursun|zorundasın|emrediyorum|dediğimi yap|sus|izin vermiyorum|yasak|itaat)/.test(text) ? 0.95 : 0.1,
    achievementOpportunity: /(hedef|başar|çöz|bitir|tamamla|proje|görev|yapabilir miyiz|nasıl yaparız|plan)/.test(text) ? 0.85 : 0.2,
    influenceOpportunity: /(karar ver|sen seç|yönet|öner|ne yapalım|fikrin|lider|yönlendir)/.test(text) ? 0.85 : 0.2,
    uncertainty: /(bilmiyorum|emin değilim|belirsiz|acaba|ne olacak|risk|kararsız|muhtemelen|belki)/.test(text) ? 0.85 : 0.2,
    instability: /(değişti|bozuldu|dağıldı|kriz|kaos|istikrarsız|sürekli değiş|altüst)/.test(text) ? 0.9 : 0.1,
  };
};

/**
 * Stable motivation values are needs/goal priorities, not direct behaviors.
 * The current situation determines which need becomes behaviorally salient.
 */
export const computeMotivationResponse = (
  profile: MotivationProfile,
  situation: MotivationSituation,
): MotivationResponse => {
  const socialOpportunity = clamp01(situation.socialOpportunity);
  const rejectionRisk = clamp01(situation.rejectionRisk);
  const recognitionOpportunity = clamp01(situation.recognitionOpportunity);
  const autonomyThreat = clamp01(situation.autonomyThreat);
  const achievementOpportunity = clamp01(situation.achievementOpportunity);
  const influenceOpportunity = clamp01(situation.influenceOpportunity);
  const uncertainty = clamp01(situation.uncertainty);
  const instability = clamp01(situation.instability);

  const connection = clamp100(profile.connection * (0.72 + socialOpportunity * 0.28 - rejectionRisk * 0.12));
  const belonging = clamp100(profile.belonging * (0.76 + socialOpportunity * 0.18 + rejectionRisk * 0.12));
  const recognition = clamp100(profile.recognition * (0.72 + recognitionOpportunity * 0.3 + achievementOpportunity * 0.08));
  const autonomy = clamp100(profile.autonomy * (0.72 + autonomyThreat * 0.38 + influenceOpportunity * 0.08));
  const achievement = clamp100(profile.achievement * (0.74 + achievementOpportunity * 0.34));
  const impact = clamp100(profile.impact * (0.74 + influenceOpportunity * 0.34));
  const predictability = clamp100(profile.predictability * (0.74 + uncertainty * 0.34));
  const stability = clamp100(profile.stability * (0.76 + instability * 0.32 + uncertainty * 0.08));

  const affiliationDrive = clamp01(n(connection) * 0.55 + n(belonging) * 0.45);
  const approvalDrive = clamp01(n(recognition) * 0.7 + recognitionOpportunity * 0.3);
  const autonomyDrive = clamp01(n(autonomy) * 0.7 + autonomyThreat * 0.3);
  const achievementDrive = clamp01(n(achievement) * 0.7 + achievementOpportunity * 0.3);
  const influenceDrive = clamp01(n(impact) * 0.7 + influenceOpportunity * 0.3);
  const securityDrive = clamp01(n(predictability) * 0.48 + n(stability) * 0.42 + uncertainty * 0.1);

  const approachPressure = clamp01(
    affiliationDrive * socialOpportunity * 0.34 +
      achievementDrive * achievementOpportunity * 0.33 +
      influenceDrive * influenceOpportunity * 0.33,
  );

  const withdrawalPressure = clamp01(
    rejectionRisk * (0.55 + affiliationDrive * 0.2) +
      autonomyThreat * autonomyDrive * 0.35 +
      instability * securityDrive * 0.2,
  );

  return {
    effective: {
      connection,
      belonging,
      recognition,
      autonomy,
      achievement,
      impact,
      predictability,
      stability,
    },
    drives: {
      affiliationDrive,
      approvalDrive,
      autonomyDrive,
      achievementDrive,
      influenceDrive,
      securityDrive,
      approachPressure,
      withdrawalPressure,
    },
    legacyTraits: {
      empathy: clamp100(45 + affiliationDrive * 35 - autonomyDrive * autonomyThreat * 10),
      initiative: clamp100(35 + achievementDrive * 25 + influenceDrive * 30),
      authority: clamp100(35 + influenceDrive * 35 + autonomyDrive * 20),
      curiosity: clamp100(40 + achievementDrive * 20 - securityDrive * uncertainty * 15),
      loyalty: clamp100(35 + affiliationDrive * 35 + n(stability) * 20),
      seriousness: clamp100(35 + securityDrive * 25 + achievementDrive * 20),
    },
  };
};

export const applyMotivations = (
  base: DroitPersonalityTraits,
  fineTune: Record<string, number> | null | undefined,
  message: string,
): { personality: DroitPersonalityTraits; response: MotivationResponse } => {
  const profile = motivationsFromFineTune(fineTune);
  const situation = inferMotivationSituation(message);
  const response = computeMotivationResponse(profile, situation);

  return {
    personality: {
      ...base,
      ...response.legacyTraits,
    },
    response,
  };
};

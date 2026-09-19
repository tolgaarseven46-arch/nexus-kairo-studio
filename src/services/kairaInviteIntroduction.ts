export interface KairaInviteIntroductionDecisionInput {
  actorDisplayName: string;
  isOwner: boolean;
}

export interface KairaInviteIntroductionDecision {
  introduceSelf: true;
  signalServerManagementSupport: true;
  maxSentences: 2;
  maxQuestions: 0;
  relationshipMode: "cold_start";
  memoryAllowed: false;
  prohibitedTerms: readonly string[];
}

export interface KairaInviteIntroductionRealizationInput {
  eventId: string;
  kairaInstanceId: string;
  decision: KairaInviteIntroductionDecision;
}

export interface KairaInviteIntroductionRealization {
  text: string;
  variantId: string;
  realizationVariantSeed: string;
}

export const decideKairaInviteIntroduction = (
  _input: KairaInviteIntroductionDecisionInput,
): KairaInviteIntroductionDecision => ({
  introduceSelf: true,
  signalServerManagementSupport: true,
  maxSentences: 2,
  maxQuestions: 0,
  relationshipMode: "cold_start",
  memoryAllowed: false,
  prohibitedTerms: ["Droit", "capability", "pipeline", "system prompt", "yapay zeka"],
});

const VARIANTS = [
  "Selam 😄 ben Kaira. Sunucuyu yönetirken yanında olacağım.",
  "Selam 😄 Kaira ben. Sunucuyu yönetirken işlerini beraber toparlarız.",
  "Hey 😄 ben Kaira. Sunucuyu yönetirken sana destek olacağım.",
] as const;

const fnv1a = (value: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export function realizeKairaInviteIntroduction(
  input: KairaInviteIntroductionRealizationInput,
): KairaInviteIntroductionRealization {
  const seed = `${input.eventId}:${input.kairaInstanceId}:invite_introduction`;
  const index = fnv1a(seed) % VARIANTS.length;
  const text = VARIANTS[index];

  for (const term of input.decision.prohibitedTerms) {
    if (text.toLocaleLowerCase("tr-TR").includes(term.toLocaleLowerCase("tr-TR"))) {
      throw new Error(`invite_introduction_prohibited_term:${term}`);
    }
  }

  return {
    text,
    variantId: `kaira_invited_v${index + 1}`,
    realizationVariantSeed: seed,
  };
}

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

const CANONICAL_INVITE_INTRO =
  "Selam 😄 ben Kaira. Sunucuyu yönetirken yanında olacağım." as const;

export function realizeKairaInviteIntroduction(
  input: KairaInviteIntroductionRealizationInput,
): KairaInviteIntroductionRealization {
  const seed = `${input.eventId}:${input.kairaInstanceId}:invite_introduction`;
  const text = CANONICAL_INVITE_INTRO;

  for (const term of input.decision.prohibitedTerms) {
    if (text.toLocaleLowerCase("tr-TR").includes(term.toLocaleLowerCase("tr-TR"))) {
      throw new Error(`invite_introduction_prohibited_term:${term}`);
    }
  }

  return {
    text,
    variantId: "kaira_invited_v1",
    realizationVariantSeed: seed,
  };
}

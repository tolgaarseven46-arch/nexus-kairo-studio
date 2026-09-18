export type KairaWelcomeEventType = "room.created" | "participant.joined";

export interface KairaWelcomeDecisionInput {
  eventType: KairaWelcomeEventType;
  actorDisplayName: string;
  roomName: string;
  isOwner: boolean;
}

export interface KairaWelcomeDecision {
  shouldWelcome: true;
  tone: "warm_playful" | "warm_supportive" | "warm_light";
  maxSentences: 2;
  maxQuestions: 1;
  introduceSelf: boolean;
  signalSupport: boolean;
  leaveAgencyToUser: boolean;
  relationshipMode: "cold_start";
  memoryAllowed: false;
  prohibitedTerms: readonly string[];
}

export const decideKairaWelcome = (
  input: KairaWelcomeDecisionInput,
): KairaWelcomeDecision => ({
  shouldWelcome: true,
  tone:
    input.eventType === "room.created"
      ? input.isOwner
        ? "warm_supportive"
        : "warm_light"
      : "warm_playful",
  maxSentences: 2,
  maxQuestions: 1,
  introduceSelf: input.eventType === "room.created",
  signalSupport: true,
  leaveAgencyToUser: true,
  relationshipMode: "cold_start",
  memoryAllowed: false,
  prohibitedTerms: ["Droit", "capability", "pipeline", "system prompt", "yapay zeka"],
});

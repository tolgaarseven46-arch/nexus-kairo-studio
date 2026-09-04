import { describe, expect, it } from "vitest";
import { analyzeDialogueTurn, buildDialogueClaimLedger } from "./kairoDialogueChaosEngine";
import { isClaimEffectivelySupported } from "./claimProvenance";
import { planDialogueResponse, buildGroundedDialogueFallback } from "./kairoDialogueDecisionEngine";
import type { ConversationTurn } from "./kairoConversationGrounding";
import type { SemanticEvent } from "./semanticEventEngine";

const semantic = (overrides: Record<string, unknown> = {}) => ({
  schemaVersion: "semantic-interpretation@2",
  raw: "",
  normalized: "",
  primaryIntent: "other",
  secondarySocialActs: [],
  target: "unknown",
  valence: "neutral",
  severity: { disrespect: 0, coercion: 0, manipulation: 0, privacy: 0, aggression: 0 },
  jokingConfidence: 0,
  sincerityConfidence: 0.9,
  affection: 0,
  support: 0,
  compliment: 0,
  emotionalLoad: 0,
  apology: false,
  repairAttempt: false,
  stopRequest: false,
  discourseFacets: {
    socialRoutine: "none",
    discourseAct: "none",
    repairSignal: "none",
    adviceRequested: false,
    knowledgeQuery: null,
    selfMemoryQuery: null,
    relationalAct: "none",
    relationalIntensity: 0,
    stopQuestions: false,
    stopTalking: false,
  },
  uncertainty: { overall: 0.1, intent: 0.1, target: 0.1, severity: 0.1 },
  evidence: [],
  ...overrides,
}) as any;

const recallEvent: SemanticEvent = {
  raw: "Emre yarın ne yapacak?",
  normalized: "Emre yarın ne yapacak?",
  intent: "question",
  socialRoutine: "none",
  discourseAct: "recall_request",
  repairSignal: "none",
  adviceRequested: false,
  knowledgeQuery: null,
  valence: "neutral",
  target: "third_party",
  relationalAct: "none",
  relationalIntensity: 0,
  severity: 0,
  insult: false,
  redLine: false,
  disrespect: 0,
  coercion: 0,
  manipulation: 0,
  privacyViolation: 0,
  apology: false,
  repairAttempt: false,
  stopQuestions: false,
  stopTalking: false,
  frustration: 0,
  emotionalLoad: 0,
  affection: 0,
  support: 0,
  compliment: 0,
};

describe("S6 immutable Claim provenance regression", () => {
  const history: ConversationTurn[] = [
    {
      sender: "user",
      text: "Emre yarın işi bırakacakmış.",
      participantId: "mert",
      participantName: "Mert",
      semanticInterpretation: semantic({
        raw: "Emre yarın işi bırakacakmış.",
        normalized: "Emre yarın işi bırakacakmış.",
        target: "third_party",
      }),
    },
    { sender: "droit", text: "öyle mi", replyToParticipantName: "Mert" },
    {
      sender: "user",
      text: "yok öyle bir şey, ben kafadan attım.",
      participantId: "ali",
      participantName: "Ali",
      semanticInterpretation: semantic({
        raw: "yok öyle bir şey, ben kafadan attım.",
        normalized: "yok öyle bir şey, ben kafadan attım.",
        discourseFacets: {
          ...semantic().discourseFacets,
          discourseAct: "correction",
        },
      }),
    },
    { sender: "droit", text: "he doğru", replyToParticipantName: "Ali" },
  ];

  it("keeps source distinct from subject and appends an opposing denial", () => {
    const ledger = buildDialogueClaimLedger(
      history,
      "Emre yarın ne yapacak?",
      "Mert",
      analyzeDialogueTurn("Emre yarın ne yapacak?"),
    );
    const asserted = ledger.find((claim) => claim.source === "Mert" && claim.subject === "Emre");
    const denial = ledger.find((claim) => claim.source === "Ali" && claim.status === "denial");

    expect(asserted).toBeTruthy();
    expect(asserted?.status).toBe("asserted");
    expect(denial?.subject).toBe("Emre");
    expect(denial?.opposesClaimId).toBe(asserted?.id);
    expect(isClaimEffectivelySupported(asserted!, ledger)).toBe(false);
  });

  it("does not revive the opposed resignation claim during recall", () => {
    const analysis = analyzeDialogueTurn("Emre yarın ne yapacak?");
    const plan = planDialogueResponse(
      history,
      "Emre yarın ne yapacak?",
      "Mert",
      recallEvent,
      analysis,
    );
    expect(plan.move).toBe("grounded_recall");
    expect(plan.target).toBe("Emre");
    expect(plan.hasSupportedTargetClaim).toBe(false);
    const fallback = buildGroundedDialogueFallback(
      plan,
      history,
      "Emre yarın ne yapacak?",
      "Mert",
      analysis,
    );
    expect(fallback).not.toMatch(/Emre.*(?:işi bırakacak|istifa edecek)/i);
  });
});

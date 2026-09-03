import { describe, expect, it } from "vitest";
import { deriveDiscourseState } from "./discourseStateReducer";
import type { SemanticEvent } from "./semanticEventEngine";

const semantic = (
  raw: string,
  input: Partial<SemanticEvent> & Pick<SemanticEvent, "intent">,
): SemanticEvent => ({
  raw,
  normalized: raw.toLocaleLowerCase("tr-TR"),
  intent: input.intent,
  socialRoutine: "none",
  discourseAct: "none",
  repairSignal: "none",
  adviceRequested: false,
  knowledgeQuery: null,
  valence: "neutral",
  target: "unknown",
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
  ...input,
});

const turns: Array<{
  text: string;
  event: SemanticEvent;
  reply: string;
  expectedAct: string;
}> = [
  {
    text: "naber",
    event: semantic("naber", { intent: "greeting", socialRoutine: "greeting" }),
    reply: "iyiyim sen",
    expectedAct: "greeting",
  },
  {
    text: "iyilik ne var ne yok",
    event: semantic("iyilik ne var ne yok", { intent: "greeting", socialRoutine: "greeting" }),
    reply: "aynı valla, akıyor günler",
    expectedAct: "greeting",
  },
  {
    text: "neyi gönderiyeyim kanka",
    event: semantic("neyi gönderiyeyim kanka", { intent: "general_chat" }),
    reply: "valla bi şey istemedim ama madem teklif var kahve yolla az 😄",
    expectedAct: "statement",
  },
  {
    text: "haha vereyim afiyet olsun şeker",
    event: semantic("haha vereyim afiyet olsun şeker", { intent: "banter", target: "kaira" }),
    reply: "hahah iyiymiş",
    expectedAct: "banter",
  },
  {
    text: "istermisin bebeğim",
    event: semantic("istermisin bebeğim", { intent: "banter", target: "kaira" }),
    reply: "hahah iyiymiş",
    expectedAct: "banter",
  },
  {
    text: "soru sordum",
    event: semantic("soru sordum", { intent: "general_chat" }),
    reply: "he anladım",
    expectedAct: "statement",
  },
  {
    // Deliberately important: the old historical regex path did not reliably
    // treat this surface form as a question. The persisted ingestion-time event wins.
    text: "neyi anladın",
    event: semantic("neyi anladın", { intent: "question", target: "kaira" }),
    reply: "biraz karışık anlattım",
    expectedAct: "question",
  },
  {
    text: "kafamı karıştırdın kankam",
    event: semantic("kafamı karıştırdın kankam", {
      intent: "complaint",
      discourseAct: "confusion_or_challenge",
      target: "kaira",
      severity: 0.36,
    }),
    reply: "soru netti, cevabı salladım",
    expectedAct: "complaint",
  },
];

describe("canonical semantic history golden session", () => {
  it("replays the measured 8-turn semantic trajectory from immutable snapshots", () => {
    const history: Array<{
      sender: string;
      text: string;
      semanticEvent?: SemanticEvent;
    }> = [];

    turns.forEach((turn, index) => {
      history.push({ sender: "user", text: turn.text, semanticEvent: turn.event });
      const stateAfterUser = deriveDiscourseState(history);
      expect(stateAfterUser.lastUserAct, `turn ${index + 1}: ${turn.text}`).toBe(turn.expectedAct);

      history.push({ sender: "droit", text: turn.reply });
      const stateAfterReply = deriveDiscourseState(history);
      expect(stateAfterReply.turnIndex).toBe((index + 1) * 2);
    });
  });

  it("does not fabricate a semantic reading for historical text without a snapshot", () => {
    const state = deriveDiscourseState([
      { sender: "user", text: "neyi anladın" },
      { sender: "droit", text: "biraz karışık anlattım" },
    ]);

    expect(state.lastUserAct).toBeNull();
    expect(state.turnIndex).toBe(1);
  });
});

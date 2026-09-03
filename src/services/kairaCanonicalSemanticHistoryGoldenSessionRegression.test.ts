import { describe, expect, it } from "vitest";
import { deriveDiscourseState } from "./discourseStateReducer";
import { interpretationFromRegexFloor } from "./semanticInterpretationLegacyProjection";
import type {
  SemanticDiscourseAct,
  SemanticInterpretation,
  SemanticPrimaryIntent,
  SemanticSocialRoutine,
  SemanticTarget,
} from "../types/semanticInterpretation";

const semantic = (
  raw: string,
  input: {
    primaryIntent: SemanticPrimaryIntent;
    socialRoutine?: SemanticSocialRoutine;
    discourseAct?: SemanticDiscourseAct;
    target?: SemanticTarget;
    disrespect?: number;
    aggression?: number;
  },
): SemanticInterpretation => {
  const base = interpretationFromRegexFloor(raw);
  return {
    ...base,
    primaryIntent: input.primaryIntent,
    target: input.target ?? base.target,
    severity: {
      ...base.severity,
      disrespect: input.disrespect ?? base.severity.disrespect,
      aggression: input.aggression ?? base.severity.aggression,
    },
    discourseFacets: {
      ...base.discourseFacets,
      socialRoutine: input.socialRoutine ?? "none",
      discourseAct: input.discourseAct ?? "none",
      repairSignal: "none",
    },
  };
};

const turns: Array<{
  text: string;
  interpretation: SemanticInterpretation;
  reply: string;
  expectedAct: string;
}> = [
  {
    text: "naber",
    interpretation: semantic("naber", { primaryIntent: "greeting", socialRoutine: "greeting" }),
    reply: "iyiyim sen",
    expectedAct: "greeting",
  },
  {
    text: "iyilik ne var ne yok",
    interpretation: semantic("iyilik ne var ne yok", { primaryIntent: "greeting", socialRoutine: "greeting" }),
    reply: "aynı valla, akıyor günler",
    expectedAct: "greeting",
  },
  {
    text: "neyi gönderiyeyim kanka",
    interpretation: semantic("neyi gönderiyeyim kanka", { primaryIntent: "smalltalk" }),
    reply: "valla bi şey istemedim ama madem teklif var kahve yolla az 😄",
    expectedAct: "statement",
  },
  {
    text: "haha vereyim afiyet olsun şeker",
    interpretation: semantic("haha vereyim afiyet olsun şeker", { primaryIntent: "banter", target: "kaira" }),
    reply: "hahah iyiymiş",
    expectedAct: "banter",
  },
  {
    text: "istermisin bebeğim",
    interpretation: semantic("istermisin bebeğim", { primaryIntent: "banter", target: "kaira" }),
    reply: "hahah iyiymiş",
    expectedAct: "banter",
  },
  {
    text: "soru sordum",
    interpretation: semantic("soru sordum", { primaryIntent: "smalltalk" }),
    reply: "he anladım",
    expectedAct: "statement",
  },
  {
    // Important authority case: historical raw text is not reinterpreted.
    text: "neyi anladın",
    interpretation: semantic("neyi anladın", { primaryIntent: "question", target: "kaira" }),
    reply: "biraz karışık anlattım",
    expectedAct: "question",
  },
  {
    text: "kafamı karıştırdın kankam",
    interpretation: semantic("kafamı karıştırdın kankam", {
      primaryIntent: "complaint",
      discourseAct: "confusion_or_challenge",
      target: "kaira",
      disrespect: 0.2,
      aggression: 0.28,
    }),
    reply: "soru netti, cevabı salladım",
    expectedAct: "complaint",
  },
];

describe("canonical semantic history golden session", () => {
  it("replays the measured 8-turn semantic trajectory from immutable v2 snapshots", () => {
    const history: Array<{
      sender: string;
      text: string;
      semanticInterpretation?: SemanticInterpretation;
    }> = [];

    turns.forEach((turn, index) => {
      history.push({ sender: "user", text: turn.text, semanticInterpretation: turn.interpretation });
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

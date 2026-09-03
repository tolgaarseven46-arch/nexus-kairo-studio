import { afterEach, describe, expect, it } from "vitest";
import { isCanonicalBehaviorFlagEnabled } from "../config/canonicalBehaviorFlags";
import { deriveDiscourseState } from "./discourseStateReducer";
import { interpretSemanticEvent } from "./semanticEventEngine";
import {
  findKairaResponsePlanIssues,
  type KairaResponsePlan,
} from "./kairaResponsePlan";
import {
  buildKairaActivityPermissionChatPrompt,
  composeKairaActivityPermissionChatReply,
} from "./kairaActivityPermissionChatRuntime";

const CANONICAL_FLAGS = [
  "RELATIONSHIP_REDUCER_V2",
  "PLAN_RESOLVER_V2",
  "CANONICAL_PROMPT_BUILDER",
] as const;

const focusedPlan = (overrides: Partial<KairaResponsePlan> = {}): KairaResponsePlan => ({
  move: "repair_or_rephrase",
  stance: "open",
  register: "balanced",
  relationshipLevel: "new",
  continueConversation: true,
  allowQuestion: false,
  allowHumor: false,
  allowAffection: false,
  allowForgiveness: false,
  allowReopeningCloseness: false,
  maxSentences: 1,
  maxWords: 12,
  emojiBudget: 0,
  reasons: ["runtime-proof"],
  ...overrides,
});

describe("Kaira cross-layer runtime behavior proofs", () => {
  const envBefore = new Map<string, string | undefined>();

  afterEach(() => {
    for (const flag of CANONICAL_FLAGS) {
      const before = envBefore.get(flag);
      if (before === undefined) delete process.env[flag];
      else process.env[flag] = before;
    }
    envBefore.clear();
  });

  it("proves canonical promotion and rollback are explicit rather than silently changing library defaults", () => {
    for (const flag of CANONICAL_FLAGS) {
      envBefore.set(flag, process.env[flag]);
      delete process.env[flag];
      expect(isCanonicalBehaviorFlagEnabled(flag)).toBe(false);
      process.env[flag] = "on";
      expect(isCanonicalBehaviorFlagEnabled(flag)).toBe(true);
      process.env[flag] = "off";
      expect(isCanonicalBehaviorFlagEnabled(flag)).toBe(false);
    }
  });

  it.each([
    "iyi dedim ya amk",
    "iyiyim be, az önce söyledim zaten",
    "iyi işte kanka daha demin cevap verdim",
    "iyiyim, kaç kere söyleyeyim artık",
  ])("keeps answer-with-friction attached to Kaira's pending how-are-you question: %s", (message) => {
    const history = [
      { sender: "user", text: "naber" },
      { sender: "droit", text: "iyi valla sen nasılsın" },
    ];
    const event = interpretSemanticEvent(message);
    const state = deriveDiscourseState(history, { message, event });

    expect(state.pendingQuestion?.asker).toBe("kaira");
    expect(state.previousTurnDependency?.on).toBe("kaira_question");
    expect(["answer", "answer_with_friction", "correction"]).toContain(
      state.previousTurnDependency?.responseKind,
    );
  });

  it.each([
    "nasılsın sen bugün",
    "sen bugün nasılsın",
    "iyi misin bugün",
    "ne yapıyorsun şimdi",
  ])("blocks question-like acts even when the model omits a question mark: %s", (reply) => {
    expect(findKairaResponsePlanIssues(reply, focusedPlan())).toContain(
      "response_plan_question_blocked",
    );
  });

  it.each([
    "Mert bana nasılsın diye sordu",
    "Mert bana iyi misin diye sordu",
  ])("does not over-block reported question content: %s", (reply) => {
    expect(findKairaResponsePlanIssues(reply, focusedPlan())).not.toContain(
      "response_plan_question_blocked",
    );
  });

  it("characterizes the activity permission side-channel as delivered text that can violate a no-question plan", () => {
    const prompt = buildKairaActivityPermissionChatPrompt({
      requestId: "req-1",
      activityId: "archive_exploration",
      activityType: "archive exploration",
    });
    const delivered = composeKairaActivityPermissionChatReply({
      reply: "iyi valla",
      resolution: { status: "none" },
      prompt,
    });

    const issues = findKairaResponsePlanIssues(delivered, focusedPlan({ move: "follow_previous_answer" }));
    expect(issues).toContain("response_plan_question_blocked");
  });

  it("detects self-repeat by social act rather than exact reply text", () => {
    const history = [
      { sender: "user", text: "naber" },
      { sender: "droit", text: "iyiyim, sen nasılsın" },
      { sender: "user", text: "iyi" },
      { sender: "droit", text: "bende iyi, senden naber" },
    ];
    const state = deriveDiscourseState(history);
    expect(state.selfRepeat?.act).toBe("how_are_you");
    expect(state.selfRepeat?.count).toBeGreaterThanOrEqual(2);
  });
});

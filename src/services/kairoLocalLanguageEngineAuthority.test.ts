/**
 * Local renderer authority (ADR-0006 foundation repair, task §2 + §7E).
 *
 * The local engine is a RENDERER, not a second brain:
 *   - it never re-classifies the message (no interpretSemanticEvent, no
 *     normalizer-canonical intent invention)
 *   - it renders only when the dialogue decision chose a trivial move
 *   - a saturated routine (per DiscourseState) is NOT rendered
 *   - it never opens a closed ResponsePlan gate
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { tryLocalKairoReply } from "./kairoLocalLanguageEngine";
import { interpretSemanticEvent } from "./semanticEventEngine";
import { interpretationFromLegacyEvent } from "./semanticInterpretationLegacyProjection";
import { deriveDiscourseState } from "./discourseStateReducer";
import type { ConversationTurn } from "./kairoConversationGrounding";
import type { DroitDynamicState, ReasoningTrace } from "../types/nexus";

const state = {
  calmness: 70,
  anger: 10,
  stress: 20,
  happiness: 70,
  reactionMode: "neutral",
  relationship: { warmth: 60, trust: 60, hurtScore: 0, conflictScore: 0, familiarityDays: 5, interactionCount: 10 },
} as unknown as DroitDynamicState;
const trace = { decision: { chosenTone: "casual" } } as ReasoningTrace;
const personality = { humor: 60 } as never;

function ingestionHistory(history: Array<{ sender: string; text: string }>): ConversationTurn[] {
  return history.map((turn) => turn.sender === "user"
    ? { ...turn, sender: "user", semanticInterpretation: interpretationFromLegacyEvent(interpretSemanticEvent(turn.text), turn.text) } as ConversationTurn
    : { ...turn, sender: "droit" } as ConversationTurn);
}

function run(message: string, move: string | undefined, opts: { history?: Array<{ sender: string; text: string }>; plan?: unknown } = {}) {
  const event = interpretSemanticEvent(message);
  const discourse = deriveDiscourseState(ingestionHistory(opts.history ?? []), { message, event });
  return tryLocalKairoReply(
    message,
    personality,
    state,
    trace,
    "ydm-authority",
    move as never,
    (opts.plan ?? { continueConversation: true, allowQuestion: true, allowHumor: true, relationshipLevel: "familiar" }) as never,
    event,
    false,
    discourse,
  );
}

describe("local renderer does not re-classify or invent intent", () => {
  const engine = readFileSync(new URL("./kairoLocalLanguageEngine.ts", import.meta.url), "utf8");

  it("the source never calls interpretSemanticEvent (imports the type only)", () => {
    expect(engine).not.toMatch(/\binterpretSemanticEvent\s*\(/u);
    expect(engine).toMatch(/import type \{ SemanticEvent \}/u);
  });

  it("the source has no canonical-normalizer intent fallback", () => {
    expect(engine).not.toContain("canUseCanonicalRoutineFallback");
    expect(engine).not.toContain("localIntentFromSemanticEvent");
  });

  it("with no dialogue move and no event routine, it defers to the pipeline", () => {
    const r = run("iyi dedim ya", undefined);
    expect(r.handled).toBe(false);
    expect(r.source).toBe("ai");
  });
});

describe("renders only trivial moves the dialogue decision chose", () => {
  it("renders a first greeting under complete_social_routine", () => {
    const r = run("selam", "complete_social_routine");
    expect(r.handled).toBe(true);
    expect(r.intent).toBe("greeting");
    expect(r.source).toBe("local_language");
  });

  it("does NOT render under a non-trivial move (follow_previous_answer -> pipeline)", () => {
    const r = run("selam", "follow_previous_answer");
    expect(r.handled).toBe(false);
  });

  it("does NOT render when a previous-turn dependency is active", () => {
    const history = [
      { sender: "user", text: "naber" },
      { sender: "droit", text: "iyi valla sen nasılsın" },
    ];
    // "iyi dedim ya" depends on Kaira's prior question
    const r = run("iyi dedim ya", "natural_reaction", { history });
    expect(r.handled).toBe(false);
  });
});

describe("respects DiscourseState routine saturation", () => {
  it("a saturated greeting is not rendered locally", () => {
    const history = [
      { sender: "user", text: "selam" },
      { sender: "droit", text: "selam" },
    ];
    const r = run("selam", "complete_social_routine", { history });
    expect(r.handled).toBe(false);
  });

  it("a saturated how_are_you is not rendered locally", () => {
    const history = [
      { sender: "user", text: "naber" },
      { sender: "droit", text: "iyi valla sen nasılsın" },
      { sender: "user", text: "nasılsın" },
      { sender: "droit", text: "iyiyim ya" },
    ];
    const r = run("naber", "natural_reaction", { history });
    expect(r.handled).toBe(false);
  });
});

describe("never opens a closed ResponsePlan gate", () => {
  it("continueConversation=false -> defers", () => {
    const r = run("selam", "complete_social_routine", {
      plan: { continueConversation: false, allowQuestion: false, allowHumor: false, relationshipLevel: "familiar" },
    });
    expect(r.handled).toBe(false);
  });

  it("allowQuestion=false -> a rendered how_are_you carries no question", () => {
    const r = run("naber", "natural_reaction", {
      plan: { continueConversation: true, allowQuestion: false, allowHumor: true, relationshipLevel: "familiar" },
    });
    expect(r.handled).toBe(true);
    expect(r.reply ?? "").not.toContain("?");
  });
});
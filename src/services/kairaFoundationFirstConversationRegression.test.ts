/**
 * First real 8-turn conversation — foundation-repair regression
 * (ADR-0006, task §4 + §7A/B/C). Runs on the CANONICAL path
 * (vitest.canonical.config.ts turns RELATIONSHIP_REDUCER_V2 / PLAN_RESOLVER_V2 /
 * CANONICAL_PROMPT_BUILDER on).
 *
 * This replays the real stage sequence the server uses:
 *   interpretSemanticEvent -> deriveDiscourseState -> planDialogueResponse
 *   -> analyzeKdmInteraction -> buildBehaviorContract -> computeKairoSpeechIdentity
 *   -> buildKairaResponsePlan -> tryLocalKairoReply (renderer selection)
 *
 * LLM turns are stubbed deterministically; assertions check the BEHAVIOR CLASS
 * and STATE CHAIN, never exact wording.
 */

import { describe, expect, it } from "vitest";
import { interpretSemanticEvent } from "./semanticEventEngine";
import { deriveDiscourseState } from "./discourseStateReducer";
import {
  buildDiscourseObservationalInstruction,
} from "./discourseStateReducer";
import { planDialogueResponse } from "./kairoDialogueDecisionEngine";
import { analyzeKdmInteraction } from "./kdmConsistencyEngine";
import { buildBehaviorContract } from "./behaviorContract";
import { computeKairoSpeechIdentity } from "./kairoSpeechIdentity";
import { buildKairaResponsePlan } from "./kairaResponsePlan";
import { tryLocalKairoReply } from "./kairoLocalLanguageEngine";
import { DEFAULT_PERSONALITY_TRAITS } from "./droitPersonalityService";
import type { ConversationTurn } from "./kairoConversationGrounding";
import type { DroitDynamicState } from "../types/nexus";

interface TurnTrace {
  msg: string;
  route: "local" | "llm";
  move: string;
  allowQuestion: boolean;
  routineGreeting: number;
  routineHowAreYou: number;
  dependency: string | null;
  selfRepeat: string | null;
  discourseInstruction: string;
  reply: string;
  localIntent?: string;
}

function stubLlmReply(move: string): string {
  switch (move) {
    case "follow_previous_answer":
      return "he iyi dedin ya pardon, dalmışım";
    case "acknowledge_correction":
      return "tamam anladım, düzeltiyorum";
    case "repair_or_rephrase":
      return "şey demek istedim yani";
    case "natural_reaction":
      return "he ya sohbete dönelim, ne var ne yok";
    default:
      return "hmm evet";
  }
}

function runConversation(messages: string[]): TurnTrace[] {
  const history: ConversationTurn[] = [];
  let state: DroitDynamicState | undefined;
  const traces: TurnTrace[] = [];

  for (const msg of messages) {
    const event = interpretSemanticEvent(msg);
    const discourse = deriveDiscourseState(history, { message: msg, event });
    const dialogue = planDialogueResponse(history, msg, "Mert", event, undefined, discourse);
    const kdm = analyzeKdmInteraction(msg, DEFAULT_PERSONALITY_TRAITS, state, event);
    state = kdm.nextDynamicState;
    const contract = buildBehaviorContract(kdm.nextDynamicState, kdm.trace, event);
    const speech = computeKairoSpeechIdentity(DEFAULT_PERSONALITY_TRAITS, kdm.nextDynamicState, kdm.trace);
    const plan = buildKairaResponsePlan(contract, dialogue, speech);
    const local = tryLocalKairoReply(
      msg,
      DEFAULT_PERSONALITY_TRAITS,
      kdm.nextDynamicState,
      kdm.trace,
      "foundation-first-conversation",
      dialogue.move,
      plan,
      event,
      false,
      discourse,
    );

    const route: "local" | "llm" = local.handled && local.reply ? "local" : "llm";
    const reply = route === "local" ? String(local.reply) : stubLlmReply(dialogue.move);

    traces.push({
      msg,
      route,
      move: dialogue.move,
      allowQuestion: plan.allowQuestion,
      routineGreeting: discourse.routines.greeting.count,
      routineHowAreYou: discourse.routines.howAreYou.count,
      dependency: discourse.previousTurnDependency
        ? `${discourse.previousTurnDependency.on}:${discourse.previousTurnDependency.responseKind}`
        : null,
      selfRepeat: discourse.selfRepeat ? discourse.selfRepeat.act : null,
      discourseInstruction: buildDiscourseObservationalInstruction(discourse),
      reply,
      localIntent: local.intent,
    });

    history.push({ sender: "user", text: msg, participantName: "Mert", semanticEvent: event } as ConversationTurn);
    history.push({ sender: "droit", text: reply, participantName: "Kaira" } as ConversationTurn);
  }
  return traces;
}

const CONVERSATION = [
  "naber", // 1
  "naber", // 2
  "iyi be kanka nasıl olsun", // 3
  "iyi dedim ya", // 4
  "merhaba kanka", // 5
  "selam", // 6
  "ee başka bişey konuşmayacakmıydık", // 7
  "sen sürekli merhaba diyorsun", // 8
];

describe("first real 8-turn conversation — architectural behavior chain", () => {
  const t = runConversation(CONVERSATION);

  it("turn 1 'naber' -> local trivial how-are-you render", () => {
    expect(t[0].route).toBe("local");
    expect(t[0].localIntent).toBe("how_are_you");
  });

  it("turn 2 'naber' again -> how_are_you routine is saturated -> NOT a blind local re-render", () => {
    expect(t[1].routineHowAreYou).toBeGreaterThanOrEqual(2);
    expect(t[1].route).toBe("llm"); // saturated routine -> main pipeline
    expect(t[1].discourseInstruction).toMatch(/nasılsın/i);
  });

  it("turn 3 'iyi be kanka nasıl olsun' -> Kaira does not get to re-ask 'sen nasılsın'", () => {
    expect(t[2].routineHowAreYou).toBeGreaterThanOrEqual(2); // still saturated
    // either the plan forbids a follow-up question, or the discourse block tells
    // the realizer the routine is done — at minimum it is NOT a fresh local re-ask
    expect(t[2].route).toBe("llm");
    expect(t[2].discourseInstruction).toMatch(/zaten yapıldı|tekrar/i);
  });

  it("turn 4 'iyi dedim ya' -> recognized as answer-with-friction to Kaira's prior turn, NOT a greeting", () => {
    expect(t[3].dependency).toMatch(/answer_with_friction$/);
    expect(t[3].move).toBe("follow_previous_answer");
    expect(t[3].route).toBe("llm");
    // the rendered/stub reply is not a bare greeting
    expect(t[3].reply.toLowerCase()).not.toMatch(/^\s*(merhaba|selam)\b/);
  });

  it("turn 5 'merhaba kanka' -> first greeting of the conversation, local render is fine", () => {
    expect(t[4].routineGreeting).toBe(1);
    expect(t[4].dependency).toBeNull();
    expect(t[4].route).toBe("local");
    expect(t[4].localIntent).toBe("greeting");
  });

  it("turn 6 'selam' -> greeting saturated -> does NOT re-enter a blind greeting loop", () => {
    expect(t[5].routineGreeting).toBeGreaterThanOrEqual(2);
    expect(t[5].route).toBe("llm");
    expect(t[5].move).not.toBe("complete_social_routine");
    expect(t[5].discourseInstruction).toMatch(/selamlaşma/i);
    expect(t[5].discourseInstruction).toMatch(/zaten yapıldı/i);
  });

  it("turn 7 -> conversation-aware, greeting saturation still visible to the realizer", () => {
    expect(t[6].route).toBe("llm");
    expect(t[6].discourseInstruction).toMatch(/selamlaşma/i);
  });

  it("turn 8 'sen sürekli merhaba diyorsun' -> conversation-aware, not a blind YDM ack", () => {
    expect(t[7].route).toBe("llm");
    // the discourse block is available so the realizer can acknowledge / correct
    expect(t[7].discourseInstruction).toContain("DISCOURSE DURUMU");
  });

  it("THE LOOP IS BROKEN: across 8 turns Kaira greets at most twice (broken transcript did ~5)", () => {
    const greetingReplies = t.filter((x) => /^\s*(selam|merhaba|hey|heyy)\b/i.test(x.reply));
    expect(greetingReplies.length).toBeLessThanOrEqual(2);
  });

  it("greeting/how_are_you routines are only rendered locally on their FIRST occurrence", () => {
    // turn 1 how_are_you -> local; turn 2 (repeat) -> not local
    expect(t[0].route).toBe("local");
    expect(t[1].route).toBe("llm");
    // turn 5 first greeting -> local; turn 6 (repeat) -> not local
    expect(t[4].route).toBe("local");
    expect(t[5].route).toBe("llm");
  });
});
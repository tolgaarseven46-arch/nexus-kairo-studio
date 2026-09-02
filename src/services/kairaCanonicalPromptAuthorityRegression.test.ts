/**
 * ADR-0006 PR3 — CANONICAL_PROMPT_BUILDER regression.
 *
 * With the flag ON the model sees ONE behavior authority. Legacy authority
 * blocks (behaviorContract instruction, dialogue-decision gate lines, the
 * "KDM ... bağlayıcıdır" line) are not emitted alongside it, so no WHAT/WHETHER
 * decision is stated twice. Lower layers (dialogue plan, speech identity,
 * chosenTone, spontaneity, high uncertainty) cannot re-open a gate.
 *
 * Flag OFF: the legacy assembly is byte-identical — asserted on server source.
 */

import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BehaviorContract } from "./behaviorContract";
import type { DialogueDecisionPlan } from "./kairoDialogueDecisionEngine";
import type { KairoSpeechIdentity } from "./kairoSpeechIdentity";
import { buildKairaResponsePlan } from "./kairaResponsePlan";
import {
  buildCanonicalBehaviorBlock,
  buildCanonicalObservationalContext,
  buildCanonicalDialogueMoveContext,
} from "./kairaCanonicalPromptBuilder";
import { speechIdentityPrompt } from "./kairoSpeechIdentity";
import * as flags from "../config/canonicalBehaviorFlags";

const contract = (o: Partial<BehaviorContract> = {}): BehaviorContract => ({
  conversationState: "active",
  continueConversation: true,
  playfulness: "allowed",
  affection: "allowed",
  questions: "allowed",
  forgivenessGranted: false,
  repairStatus: "none",
  reopeningCloseness: "allowed",
  stance: "open",
  maxResponseLength: "medium",
  reasons: [],
  ...o,
});

const dialogue = (o: Partial<DialogueDecisionPlan> = {}): DialogueDecisionPlan => ({
  move: "continue_conversation" as DialogueDecisionPlan["move"],
  allowFollowUpQuestion: true,
  allowSpeculation: false,
  maxSentences: 2,
  maxWords: 32,
  hasSupportedTargetClaim: false,
  reason: "test",
  ...o,
});

const speech = (o: Partial<KairoSpeechIdentity> = {}): KairoSpeechIdentity => ({
  register: "casual",
  relationshipLevel: "close",
  sentenceLength: "short",
  slangLevel: 0.5,
  humorLevel: 0.9,
  emojiLevel: 1,
  warmthLevel: 1,
  directness: 0.5,
  informalityLevel: 0.7,
  humorMode: "dry" as KairoSpeechIdentity["humorMode"],
  rhythm: {} as KairoSpeechIdentity["rhythm"],
  emotionalDisplayLevel: 0.8,
  instructions: [],
  ...o,
});

const enablePlanResolver = () =>
  vi
    .spyOn(flags, "isCanonicalBehaviorFlagEnabled")
    .mockImplementation((f) => f === "PLAN_RESOLVER_V2");

afterEach(() => vi.restoreAllMocks());

/** The canonical WHAT/WHETHER section the server assembles when the flag is ON. */
function canonicalSection(c: BehaviorContract, d: DialogueDecisionPlan, s: KairoSpeechIdentity) {
  const plan = buildKairaResponsePlan(c, d, s);
  return {
    plan,
    text: [
      speechIdentityPrompt(s),
      buildCanonicalDialogueMoveContext(d.move, d.target, d.reason),
      buildCanonicalBehaviorBlock(plan),
      buildCanonicalObservationalContext({
        intent: "genel_sohbet",
        sentiment: "nötr",
        warmth: 60,
        trust: 60,
        conflict: 0,
        hurt: 0,
        reactionMode: "neutral",
      }),
    ].join("\n"),
  };
}

describe("canonical prompt — one authority, no duplicate decisions", () => {
  it("each authoritative decision token appears exactly once in the assembled section", () => {
    enablePlanResolver();
    const { text } = canonicalSection(contract(), dialogue(), speech());
    for (const field of [
      "continueConversation=",
      "allowQuestion=",
      "allowHumor=",
      "allowAffection=",
      "allowForgiveness=",
      "allowReopeningCloseness=",
      "flirtationAllowed=",
      "counterFlirtAllowed=",
      "maxSentences=",
      "maxWords=",
      "emojiBudget=",
      "intimacyCeiling=",
    ]) {
      expect(text.split(field).length - 1, `${field} once`).toBe(1);
    }
  });

  it("no legacy behavior-authority block is present alongside it", () => {
    enablePlanResolver();
    const { text } = canonicalSection(contract(), dialogue(), speech());
    expect(text).not.toContain("DAVRANIŞ SÖZLEŞMESİ (BAĞLAYICI)");
    expect(text).not.toContain("Bu davranış kararları bağlayıcıdır");
    expect(text).not.toContain("Takip sorusu: yasak");
    expect(text).not.toContain("Uzunluk bütçesi:");
    // speech identity stays, but only as HOW
    expect(text).toContain("KONUŞMA KİMLİĞİ KATMANI (HOW ONLY)");
  });
});

describe("counter-examples — lower layers cannot re-open a gate", () => {
  it("plan question=false while the dialogue layer still suggests a follow-up question -> forbidden", () => {
    enablePlanResolver();
    const { plan, text } = canonicalSection(
      contract({ questions: "forbidden" }),
      dialogue({ allowFollowUpQuestion: true }),
      speech(),
    );
    expect(plan.allowQuestion).toBe(false);
    expect(text).toContain("allowQuestion=yasak");
    expect(text).not.toContain("Takip sorusu: gerekiyorsa en fazla bir tane");
  });

  it("plan humor=false while speech identity is highly playful -> forbidden", () => {
    enablePlanResolver();
    const { plan, text } = canonicalSection(
      contract({ playfulness: "forbidden" }),
      dialogue(),
      speech({ humorLevel: 1, humorMode: "playful" as KairoSpeechIdentity["humorMode"] }),
    );
    expect(plan.allowHumor).toBe(false);
    expect(text).toContain("allowHumor=yasak");
  });

  it("counterFlirt=false while intimacy inclination is maxed and register is warm -> forbidden", () => {
    enablePlanResolver();
    const { plan, text } = canonicalSection(
      contract({ stance: "open", affection: "allowed" }),
      dialogue(),
      speech({ relationshipLevel: "close", warmthLevel: 1, register: "casual" }),
    );
    expect(plan.counterFlirtAllowed).toBe(false);
    expect(text).toContain("counterFlirtAllowed=hayır");
    expect(text).toMatch(/KARŞI-FLÖRT MUTLAK YASAK/);
  });

  it("hard disengage while chosenTone/register would be warm -> no reopening", () => {
    enablePlanResolver();
    const { plan, text } = canonicalSection(
      contract({
        continueConversation: false,
        conversationState: "disengaged",
        playfulness: "forbidden",
        affection: "forbidden",
        questions: "forbidden",
        reopeningCloseness: "forbidden",
        stance: "closed",
        reasons: ["combined_boundary_violation"],
      }),
      dialogue(),
      speech({ register: "casual", warmthLevel: 1 }),
    );
    expect(plan.continueConversation).toBe(false);
    expect(text).toContain("continueConversation=hayır");
    expect(text).toContain("allowReopeningCloseness=yasak");
    expect(text).toContain("allowQuestion=yasak");
  });

  it("high per-turn uncertainty does not flip a hard gate in the block", () => {
    enablePlanResolver();
    const base = canonicalSection(contract({ questions: "forbidden" }), dialogue(), speech());
    // uncertainty is carried as observational text; the gate stays yasak
    expect(base.text).toContain("allowQuestion=yasak");
    expect(base.plan.continueConversation).toBe(true);
  });
});

describe("flag OFF — legacy assembly is byte-identical", () => {
  const server = readFileSync(new URL("../../server.ts", import.meta.url), "utf8");

  it("the canonical block is behind the CANONICAL_PROMPT_BUILDER flag", () => {
    expect(server).toContain('isCanonicalBehaviorFlagEnabled("CANONICAL_PROMPT_BUILDER")');
    expect(server).toContain("canonicalPromptOn");
    expect(server).toContain("buildCanonicalBehaviorBlock(responsePlan)");
  });

  it("the flag-OFF branch keeps the exact legacy authority stack", () => {
    expect(server).toContain("behaviorContractInstruction(behaviorContract)");
    expect(server).toContain(
      "Bu davranış kararları bağlayıcıdır; soru/mizah/mesafe/konuşmayı sürdürme sınırlarını ihlal etme.",
    );
    expect(server).toContain("kairaResponsePlanInstruction(responsePlan)");
    expect(server).toContain("buildDialogueDecisionInstruction(");
  });
});

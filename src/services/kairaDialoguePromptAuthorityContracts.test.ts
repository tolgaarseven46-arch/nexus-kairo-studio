import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { buildDialogueDecisionInstruction, type DialogueDecisionPlan } from "./kairoDialogueDecisionEngine";

const emotionalPlan: DialogueDecisionPlan = {
  move: "invite_emotional_context",
  allowFollowUpQuestion: true,
  allowSpeculation: false,
  maxSentences: 1,
  maxWords: 4,
  hasSupportedTargetClaim: false,
  reason: "İlk duygusal açılışta kısa merak tepkisi üret.",
};

describe("dialogue prompt final ResponsePlan authority", () => {
  it("renders final question prohibition instead of the lower dialogue-plan permission", () => {
    const instruction = buildDialogueDecisionInstruction(
      emotionalPlan,
      false,
      1,
      4,
    );

    expect(instruction).toContain("Takip sorusu: yasak");
    expect(instruction).toContain("soru sorma; yalnızca tek kısa kabul tepkisi üret");
    expect(instruction).not.toContain("gerekiyorsa en fazla bir tane");
  });

  it("renders final response-plan budgets instead of lower-layer budgets", () => {
    const plan: DialogueDecisionPlan = {
      ...emotionalPlan,
      move: "answer_or_clarify",
      maxSentences: 3,
      maxWords: 80,
      reason: "Alt katman daha uzun cevap isteyebilir.",
    };

    const instruction = buildDialogueDecisionInstruction(plan, false, 1, 12);

    expect(instruction).toContain("Takip sorusu: yasak");
    expect(instruction).toContain("en fazla 1 kısa cümle");
    expect(instruction).toContain("en fazla 12 kelime");
    expect(instruction).not.toContain("en fazla 3 kısa cümle");
    expect(instruction).not.toContain("en fazla 80 kelime");
  });

  it("server keeps legacy dialogue authority on flag OFF and canonical context on flag ON", async () => {
    const source = await readFile("server.ts", "utf8");

    expect(source).toContain('isCanonicalBehaviorFlagEnabled("CANONICAL_PROMPT_BUILDER")');
    expect(source).toContain("dialogueDecisionInstruction = canonicalPromptOn");
    expect(source).toContain("buildCanonicalDialogueMoveContext(");
    expect(source).toContain("buildDialogueDecisionInstruction(");
    expect(source).toContain("responsePlan.allowQuestion");
    expect(source).toContain("responsePlan.maxSentences");
    expect(source).toContain("responsePlan.maxWords");
    expect(source.indexOf("responsePlan = buildKairaResponsePlan")).toBeLessThan(
      source.indexOf("dialogueDecisionInstruction = canonicalPromptOn"),
    );
  });

  it("relationship directive is legacy-only while canonical mode uses observational relationship context", async () => {
    const source = await readFile("server.ts", "utf8");

    expect(source).toContain("const relationshipInstruction = behaviorProfile.relationshipInstruction");
    expect(source).toContain("İLİŞKİ DAVRANIŞI: ${behaviorProfile.relationshipInstruction}");
    expect(source).toContain("buildCanonicalObservationalContext({");
    expect(source).toContain(
      'canonicalPromptOn ? `${responsePlanInstruction}\\n${canonicalObservationalContext}` : `${relationshipInstruction}',
    );
  });
});

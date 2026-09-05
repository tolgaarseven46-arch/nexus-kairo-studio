import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildBehaviorContract } from "./behaviorContract";
import { deriveHardConstraints } from "./kairaHardConstraints";
import {
  findKairaResponsePlanIssues,
  looksLikeKairaAdviceAct,
  type KairaResponsePlan,
} from "./kairaResponsePlan";
import type { DialogueDecisionPlan } from "./kairoDialogueDecisionEngine";

const activeState = {
  relationship: {
    conversationState: "active",
    hurtScore: 0,
    conflictScore: 0,
    repairProgress: 0,
    repairAttempts: 0,
  },
} as any;

const ordinaryDialogue = {
  move: "natural_reaction",
  allowFollowUpQuestion: false,
  allowSpeculation: false,
  maxSentences: 2,
  hasSupportedTargetClaim: false,
  reason: "ordinary social statement",
} as DialogueDecisionPlan;

const plan = (allowAdvice: boolean) => ({
  allowQuestion: false,
  allowAdvice,
  allowHumor: true,
  allowAffection: true,
  allowForgiveness: true,
  allowReopeningCloseness: true,
  counterFlirtAllowed: false,
  socialMove: "none",
  maxSentences: 2,
  maxWords: 32,
  emojiBudget: 1,
} as KairaResponsePlan);

describe("Kaira unsolicited-advice canonical plan authority", () => {
  it("keeps ordinary social statements advice-forbidden", () => {
    const contract = buildBehaviorContract(activeState, null, {
      stopTalking: false,
      stopQuestions: false,
      adviceRequested: false,
    });
    const hard = deriveHardConstraints(contract, ordinaryDialogue);

    expect(contract.advice).toBe("forbidden");
    expect(hard.adviceAllowed).toBe(false);
  });

  it("opens advice only when the semantic event explicitly requests it", () => {
    const contract = buildBehaviorContract(activeState, null, {
      stopTalking: false,
      stopQuestions: false,
      adviceRequested: true,
    });
    const hard = deriveHardConstraints(contract, ordinaryDialogue);

    expect(contract.advice).toBe("allowed");
    expect(hard.adviceAllowed).toBe(true);
  });

  it("recognizes clear Turkish advice surfaces structurally", () => {
    for (const reply of ["erken yat biraz", "biraz dinlen", "bence gitmelisin"]) {
      expect(looksLikeKairaAdviceAct(reply)).toBe(true);
    }
    for (const reply of ["of erkenmiş", "yarın erken kalkıyorsun yani", "hee anladım"]) {
      expect(looksLikeKairaAdviceAct(reply)).toBe(false);
    }
  });

  it("rejects a clear advice act when the canonical plan forbids advice", () => {
    expect(findKairaResponsePlanIssues("erken yat biraz", plan(false))).toContain(
      "response_plan_unsolicited_advice_blocked",
    );
    expect(findKairaResponsePlanIssues("of erkenmiş", plan(false))).not.toContain(
      "response_plan_unsolicited_advice_blocked",
    );
  });

  it("does not block the same advice surface when advice is explicitly allowed", () => {
    expect(findKairaResponsePlanIssues("erken yat biraz", plan(true))).not.toContain(
      "response_plan_unsolicited_advice_blocked",
    );
  });

  it("locks the existing semantic signal through the canonical WHAT/final-delivery chain", () => {
    const contract = readFileSync(new URL("./behaviorContract.ts", import.meta.url), "utf8");
    const hard = readFileSync(new URL("./kairaHardConstraints.ts", import.meta.url), "utf8");
    const resolver = readFileSync(new URL("./kairaPlanResolver.ts", import.meta.url), "utf8");
    const prompt = readFileSync(new URL("./kairaCanonicalPromptBuilder.ts", import.meta.url), "utf8");
    const responsePlan = readFileSync(new URL("./kairaResponsePlan.ts", import.meta.url), "utf8");

    expect(contract).toContain('"stopTalking" | "stopQuestions" | "adviceRequested"');
    expect(contract).toContain('advice: adviceRequested ? "allowed" : "forbidden"');
    expect(hard).toContain('contract.advice === "allowed"');
    expect(resolver).toContain("hard.adviceAllowed === true");
    expect(prompt).toContain("allowAdvice=${allowed(adviceAllowed)}");
    expect(responsePlan).toContain("response_plan_unsolicited_advice_blocked");
  });
});

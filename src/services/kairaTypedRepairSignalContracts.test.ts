import { describe, expect, it } from "vitest";
import { interpretSemanticEvent } from "./semanticEventEngine";
import { canonicalizeSemanticEvent } from "./semanticEventCanonicalizer";
import {
  buildGroundedDialogueFallback,
  planDialogueResponse,
} from "./kairoDialogueDecisionEngine";

// Repair subtype ownership stays at the canonical semantic boundary; dialogue only consumes it.
describe("typed conversational repair signal contracts", () => {
  it.each([
    ["nasıl yani", "clarification_request"],
    ["bi şey anlamadım", "clarification_request"],
    ["ne alaka", "relevance_challenge"],
    ["ne diyon aq", "relevance_challenge"],
  ] as const)("owns the repair subtype at the semantic boundary: %s", (message, expected) => {
    const event = interpretSemanticEvent(message);
    expect(event.discourseAct).toBe("confusion_or_challenge");
    expect(event.repairSignal).toBe(expected);
  });

  it("fills an omitted provider repair subtype only at canonicalization", () => {
    const deterministic = interpretSemanticEvent("nasıl yani");
    const providerEvent = { ...deterministic, repairSignal: undefined };
    const result = canonicalizeSemanticEvent("nasıl yani", providerEvent);
    expect(result.repairSignal).toBe("clarification_request");
  });

  it.each([
    ["nasıl yani", "clarification_request", "biraz karışık anlattım"],
    ["ne alaka", "relevance_challenge", "he alakasız oldu"],
  ] as const)("preserves typed repair through dialogue planning: %s", (message, repairSignal, fallback) => {
    const history = [{ sender: "droit", text: "önceki Kaira mesajı" }] as any[];
    const event = interpretSemanticEvent(message);
    const plan = planDialogueResponse(history, message, "Mert", event);
    expect(plan).toMatchObject({
      move: "repair_or_rephrase",
      repairSignal,
      allowFollowUpQuestion: false,
    });
    expect(buildGroundedDialogueFallback(plan, history, message, "Mert")).toBe(fallback);
  });

  it("does not create a repair sequence without an adjacent Kaira turn", () => {
    const event = interpretSemanticEvent("nasıl yani");
    expect(planDialogueResponse([], "nasıl yani", "Mert", event).move).not.toBe("repair_or_rephrase");
  });
});
import { describe, expect, it } from "vitest";
import { findKairaAmbiguityPreservationIssues } from "./kairaAmbiguityPreservation";

const plan = (preserve = true) => ({
  move: "natural_reaction", stance: "open", register: "balanced", relationshipLevel: "new",
  continueConversation: true, allowQuestion: false, allowHumor: true, allowAffection: false,
  allowForgiveness: true, allowReopeningCloseness: true, maxSentences: 2, maxWords: 28, emojiBudget: 1,
  reasons: [], requiredContent: preserve ? ["preserve_ambiguity"] : [],
}) as any;

describe("Kaira ambiguity-preservation validator", () => {
  it.each(["hmm", "he anladım", "anladım", "tam anlamadım"])("accepts ambiguity-preserving reply: %s", (reply) => {
    expect(findKairaAmbiguityPreservationIssues(reply, plan())).toEqual([]);
  });

  it.each([
    "hahayt aniden sert döndün",
    "hahahah tamam sustum 😄",
    "hoş değil o laf ama 🤨",
    "bi an ne diyeceğini merak ettim... peki, sustum 😄",
  ])("rejects a fabricated interpretation from the production trace: %s", (reply) => {
    expect(findKairaAmbiguityPreservationIssues(reply, plan())).toContain("response_plan_ambiguity_not_preserved");
  });

  it("does nothing when the canonical plan did not require ambiguity preservation", () => {
    expect(findKairaAmbiguityPreservationIssues("sert döndün", plan(false))).toEqual([]);
  });
});

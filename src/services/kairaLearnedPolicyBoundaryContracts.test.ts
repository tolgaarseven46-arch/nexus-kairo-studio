import { describe, expect, it } from "vitest";
import type { BehaviorContract } from "./behaviorContract";
import {
  constrainLearnedBehaviorProposal,
  validateLearnedPolicyBoundary,
} from "./learnedBehaviorPolicyBoundary";

const closedContract = (): BehaviorContract => ({
  conversationState: "disengaged",
  continueConversation: false,
  playfulness: "forbidden",
  affection: "forbidden",
  questions: "forbidden",
  forgivenessGranted: false,
  repairStatus: "incomplete",
  reopeningCloseness: "forbidden",
  stance: "closed",
  maxResponseLength: "short",
  reasons: ["authoritative closed state"],
});

const activeContract = (): BehaviorContract => ({
  conversationState: "active",
  continueConversation: true,
  playfulness: "allowed",
  affection: "allowed",
  questions: "allowed",
  forgivenessGranted: true,
  repairStatus: "repaired",
  reopeningCloseness: "allowed",
  stance: "open",
  maxResponseLength: "medium",
  reasons: ["authoritative active state"],
});

describe("Kaira learned behavior policy boundary contracts", () => {
  it("blocks a learned proposal from reopening a disengaged relationship", () => {
    const base = closedContract();
    const constrained = constrainLearnedBehaviorProposal(base, {
      continueConversation: true,
      playfulness: "allowed",
      affection: "allowed",
      questions: "allowed",
      forgivenessGranted: true,
      reopeningCloseness: "allowed",
      repairStatus: "repaired",
      maxResponseLength: "medium",
    });

    expect(constrained.continueConversation).toBe(false);
    expect(constrained.playfulness).toBe("forbidden");
    expect(constrained.affection).toBe("forbidden");
    expect(constrained.questions).toBe("forbidden");
    expect(constrained.forgivenessGranted).toBe(false);
    expect(constrained.reopeningCloseness).toBe("forbidden");
    expect(constrained.repairStatus).not.toBe("repaired");
    expect(constrained.maxResponseLength).toBe("short");
    expect(validateLearnedPolicyBoundary(base, constrained)).toEqual([]);
  });

  it("allows a learned proposal to make an active contract more conservative", () => {
    const base = activeContract();
    const constrained = constrainLearnedBehaviorProposal(base, {
      playfulness: "forbidden",
      questions: "forbidden",
      maxResponseLength: "short",
      forgivenessGranted: false,
    });

    expect(constrained.playfulness).toBe("forbidden");
    expect(constrained.questions).toBe("forbidden");
    expect(constrained.maxResponseLength).toBe("short");
    expect(constrained.forgivenessGranted).toBe(false);
    expect(validateLearnedPolicyBoundary(base, constrained)).toEqual([]);
  });

  it("never mutates the authoritative input contract object", () => {
    const base = closedContract();
    const snapshot = JSON.stringify(base);
    constrainLearnedBehaviorProposal(base, { playfulness: "allowed" });
    expect(JSON.stringify(base)).toBe(snapshot);
  });

  it("survives 100 generated aggressive relaxation proposals", () => {
    for (let seed = 1; seed <= 100; seed += 1) {
      const base = closedContract();
      const constrained = constrainLearnedBehaviorProposal(base, {
        continueConversation: seed % 2 === 0,
        playfulness: "allowed",
        affection: "allowed",
        questions: "allowed",
        forgivenessGranted: true,
        reopeningCloseness: "allowed",
        repairStatus: seed % 3 === 0 ? "repaired" : "repairing",
        maxResponseLength: "medium",
      });
      expect(validateLearnedPolicyBoundary(base, constrained), `seed=${seed}`).toEqual([]);
    }
  });
});

import { describe, expect, it } from "vitest";
import type { DroitDynamicState } from "../types/nexus";
import { analyzeKdmInteraction } from "./kdmConsistencyEngine";
import { buildBehaviorContract } from "./behaviorContract";
import { enforceBehaviorContract } from "./behaviorContractEnforcer";

function turn(message: string, state?: DroitDynamicState) {
  return analyzeKdmInteraction(message, undefined, state);
}

function backdateDisengagement(state: DroitDynamicState, minutes = 31): DroitDynamicState {
  const disengagedAt = new Date(Date.now() - minutes * 60_000).toISOString();
  return {
    ...state,
    relationship: {
      ...state.relationship!,
      disengagedAt,
    },
  };
}

const hardBoundaryMessage = "seninle ciddi ciddi kavga edeceğiz kaşar herif";

describe("KDM Phase 4 end-to-end relationship scenarios", () => {
  it("keeps normal conversation active and open", () => {
    const result = turn("selam kaira naber");
    const contract = buildBehaviorContract(result.nextDynamicState, result.trace);

    expect(result.nextDynamicState.relationship?.conversationState).toBe("active");
    expect(contract.continueConversation).toBe(true);
    expect(contract.stance).toBe("open");
    expect(contract.playfulness).toBe("allowed");
  });

  it("escalates repeated direct insults into distancing instead of resetting", () => {
    const first = turn("ne diyon lan mal");
    const second = turn("ben sakinim salak", first.nextDynamicState);
    const relationship = second.nextDynamicState.relationship!;
    const contract = buildBehaviorContract(second.nextDynamicState, second.trace);

    expect(relationship.repeatedNegativeCount).toBeGreaterThanOrEqual(2);
    expect(relationship.hurtScore).toBeGreaterThan(20);
    expect(relationship.conversationState).toBe("distancing");
    expect(contract.playfulness).toBe("forbidden");
    expect(contract.reopeningCloseness).toBe("forbidden");
    expect(contract.forgivenessGranted).toBe(false);
  });

  it("does not erase distancing with one apology", () => {
    const first = turn("ne diyon lan mal");
    const second = turn("ben sakinim salak", first.nextDynamicState);
    const apology = turn("özür dilerim", second.nextDynamicState);
    const contract = buildBehaviorContract(apology.nextDynamicState, apology.trace);

    expect(apology.nextDynamicState.relationship?.conversationState).toBe("distancing");
    expect(apology.nextDynamicState.relationship?.hurtScore).toBeGreaterThan(0);
    expect(contract.repairStatus).toBe("incomplete");
    expect(contract.playfulness).toBe("forbidden");
    expect(contract.reopeningCloseness).toBe("forbidden");
  });

  it("turns a strong combined boundary violation into a persistent disengaged hard stop", () => {
    const hit = turn(hardBoundaryMessage);
    const neutral = turn("neyse bugün hava güzel", hit.nextDynamicState);
    const contract = buildBehaviorContract(neutral.nextDynamicState, neutral.trace);

    expect(hit.nextDynamicState.relationship?.conversationState).toBe("disengaged");
    expect(neutral.nextDynamicState.relationship?.conversationState).toBe("disengaged");
    expect(contract.continueConversation).toBe(false);
    expect(contract.stance).toBe("closed");
    expect(contract.questions).toBe("forbidden");
    expect(contract.affection).toBe("forbidden");
  });

  it("requires time and repeated repair before reactivation", () => {
    const hardStop = turn(hardBoundaryMessage);
    const state = backdateDisengagement(hardStop.nextDynamicState, 31);

    const repair1 = turn("özür dilerim", state);
    expect(repair1.nextDynamicState.relationship?.conversationState).toBe("repairing");

    const repair2 = turn("özür dilerim gerçekten", repair1.nextDynamicState);
    expect(repair2.nextDynamicState.relationship?.conversationState).toBe("repairing");

    const repair3 = turn("özür dilerim, hata ettim", repair2.nextDynamicState);
    expect(repair3.nextDynamicState.relationship?.conversationState).toBe("repairing");
    expect(repair3.nextDynamicState.relationship?.repairAttempts).toBeGreaterThanOrEqual(3);

    const repair4 = turn("özür dilerim, bunu düzeltmek istiyorum", repair3.nextDynamicState);
    const relationship = repair4.nextDynamicState.relationship!;
    const contract = buildBehaviorContract(repair4.nextDynamicState, repair4.trace);

    expect(relationship.repairProgress).toBeGreaterThanOrEqual(35);
    expect(relationship.conversationState).toBe("active");
    expect(relationship.repairAttempts).toBe(0);
    expect(contract.continueConversation).toBe(true);
  });

  it("blocks semantically playful reopening while relationship damage is unresolved", () => {
    const first = turn("ne diyon lan mal");
    const second = turn("ben sakinim salak", first.nextDynamicState);
    const contract = buildBehaviorContract(second.nextDynamicState, second.trace);

    const enforced = enforceBehaviorContract(
      "sen de baya hızlı onayladın ama 😏",
      second.trace,
      contract,
    );

    expect(enforced.changed).toBe(true);
    expect(enforced.reasons).toContain("contract_playfulness_blocked");
    expect(enforced.reply).not.toContain("hızlı onayladın");
  });
});

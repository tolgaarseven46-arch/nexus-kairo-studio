import { describe, expect, it } from "vitest";
import type { BehaviorContract } from "./behaviorContract";
import type { DialogueDecisionPlan } from "./kairoDialogueDecisionEngine";
import type { KairoSpeechIdentity } from "./kairoSpeechIdentity";
import { buildKairaResponsePlan } from "./kairaResponsePlan";

const contract = (o: Partial<BehaviorContract> = {}): BehaviorContract => ({ conversationState:"active", continueConversation:true, playfulness:"allowed", affection:"allowed", questions:"allowed", forgivenessGranted:false, repairStatus:"none", reopeningCloseness:"allowed", stance:"open", maxResponseLength:"medium", reasons:[], ...o });
const dialogue = (o: Partial<DialogueDecisionPlan> = {}): DialogueDecisionPlan => ({ move:"natural_reaction", allowFollowUpQuestion:true, allowSpeculation:false, maxSentences:2, maxWords:32, hasSupportedTargetClaim:false, reason:"test", ...o });
const speech = (o: Partial<KairoSpeechIdentity> = {}): KairoSpeechIdentity => ({ register:"casual", relationshipLevel:"familiar", sentenceLength:"short", slangLevel:.4, humorLevel:.6, emojiLevel:1, warmthLevel:.6, directness:.5, informalityLevel:.6, humorMode:"irony", rhythm:{} as KairoSpeechIdentity["rhythm"], emotionalDisplayLevel:.5, instructions:[], ...o });

describe("PlanResolver canonical-only authority", () => {
  it("always emits the canonical resolver and orthogonal axes", () => { const plan = buildKairaResponsePlan(contract(), dialogue(), speech()); expect(plan.resolver).toBe("canonical"); expect(plan.opennessAxis).toBeGreaterThan(0); expect(typeof plan.guardedness).toBe("number"); });
  it("a soft distancing state does not become a hard stop", () => { const plan = buildKairaResponsePlan(contract({ conversationState:"distancing", stance:"distant-responsive" }), dialogue(), speech()); expect(plan.continueConversation).toBe(true); expect(plan.opennessAxis).toBeGreaterThan(0); });
  it("hard stop vetoes social gates but keeps telemetry axes", () => { const plan = buildKairaResponsePlan(contract({ conversationState:"disengaged", continueConversation:false, playfulness:"forbidden", affection:"forbidden", questions:"forbidden", reopeningCloseness:"forbidden", stance:"closed", reasons:["combined_boundary_violation"] }), dialogue(), speech()); expect(plan.continueConversation).toBe(false); expect(plan.allowQuestion).toBe(false); expect(plan.allowHumor).toBe(false); expect(plan.allowAffection).toBe(false); expect(plan.opennessAxis).toBeGreaterThan(0); expect(plan.requiredContent).toContain("state_boundary_and_close"); });
  it("a forbidden permission cannot be reopened by HOW", () => { expect(buildKairaResponsePlan(contract({ playfulness:"forbidden" }), dialogue(), speech({ humorLevel:1 })).allowHumor).toBe(false); });
  it("short hard ceiling is respected", () => { const plan = buildKairaResponsePlan(contract({ maxResponseLength:"short" }), dialogue({ maxWords:32 }), speech()); expect(plan.maxSentences).toBeLessThanOrEqual(1); expect(plan.maxWords).toBeLessThanOrEqual(14); });
  it("shipped policy never enables counter-flirt", () => { const plan = buildKairaResponsePlan(contract(), dialogue(), speech({ relationshipLevel:"close", warmthLevel:1 })); expect(plan.flirtationAllowed).toBe(false); expect(plan.counterFlirtAllowed).toBe(false); });
});

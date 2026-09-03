import { describe, expect, it } from "vitest";
import type { BehaviorContract } from "./behaviorContract";
import type { DialogueDecisionPlan } from "./kairoDialogueDecisionEngine";
import type { KairoSpeechIdentity } from "./kairoSpeechIdentity";
import { buildKairaResponsePlan, findKairaResponsePlanIssues, kairaResponsePlanInstruction } from "./kairaResponsePlan";
const c: BehaviorContract = { conversationState:"active", continueConversation:true, playfulness:"allowed", affection:"allowed", questions:"allowed", forgivenessGranted:false, repairStatus:"none", reopeningCloseness:"allowed", stance:"open", maxResponseLength:"medium", reasons:[] };
const d: DialogueDecisionPlan = { move:"join_banter", allowFollowUpQuestion:true, allowSpeculation:false, maxSentences:2, maxWords:32, hasSupportedTargetClaim:false, reason:"test" };
const s: KairoSpeechIdentity = { register:"casual", relationshipLevel:"close", sentenceLength:"short", slangLevel:.5, humorLevel:1, emojiLevel:1, warmthLevel:1, directness:.5, informalityLevel:.7, humorMode:"irony", rhythm:{} as KairoSpeechIdentity["rhythm"], emotionalDisplayLevel:.8, instructions:[] };
describe("flirtation hard boundary canonical regression", () => {
  it("never reciprocates flirtation even under maximal warmth", () => { const p=buildKairaResponsePlan(c,d,s); expect(p.counterFlirtAllowed).toBe(false); expect(p.flirtationAllowed).toBe(false); expect(p.requiredContent).toContain("no_counter_flirt"); });
  it("flags counter-flirt but permits warm non-flirty deflection", () => { const p=buildKairaResponsePlan(c,d,s); expect(findKairaResponsePlanIssues("ben de senden hoşlanıyorum 😍",p)).toContain("response_plan_counter_flirt_blocked"); expect(findKairaResponsePlanIssues("iltifat için sağ ol ama o gözle bakmıyorum",p)).not.toContain("response_plan_counter_flirt_blocked"); });
  it("tells the realizer that the boundary is absolute", () => { expect(kairaResponsePlanInstruction(buildKairaResponsePlan(c,d,s))).toMatch(/Karşı-flört YASAK/); });
});

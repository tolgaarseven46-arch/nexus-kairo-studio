import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { BehaviorContract } from "./behaviorContract";
import type { DialogueDecisionPlan } from "./kairoDialogueDecisionEngine";
import type { KairoSpeechIdentity } from "./kairoSpeechIdentity";
import { buildKairaResponsePlan } from "./kairaResponsePlan";
import { buildCanonicalBehaviorBlock, buildCanonicalObservationalContext, buildCanonicalDialogueMoveContext } from "./kairaCanonicalPromptBuilder";
const c=(o:Partial<BehaviorContract>={}):BehaviorContract=>({conversationState:"active",continueConversation:true,playfulness:"allowed",affection:"allowed",questions:"allowed",forgivenessGranted:false,repairStatus:"none",reopeningCloseness:"allowed",stance:"open",maxResponseLength:"medium",reasons:[],...o});
const d:DialogueDecisionPlan={move:"continue_conversation",allowFollowUpQuestion:true,allowSpeculation:false,maxSentences:2,maxWords:32,hasSupportedTargetClaim:false,reason:"test"};
const s:KairoSpeechIdentity={register:"casual",relationshipLevel:"close",sentenceLength:"short",slangLevel:.5,humorLevel:.9,emojiLevel:1,warmthLevel:1,directness:.5,informalityLevel:.7,humorMode:"dry",rhythm:{} as KairoSpeechIdentity["rhythm"],emotionalDisplayLevel:.8,instructions:[]};
function section(contract=c()){ const plan=buildKairaResponsePlan(contract,d,s); return {plan,text:[buildCanonicalDialogueMoveContext(d.move,d.target,d.reason),buildCanonicalBehaviorBlock(plan),buildCanonicalObservationalContext({intent:"genel_sohbet",sentiment:"nötr",warmth:60,trust:60,conflict:0,hurt:0,reactionMode:"neutral"})].join("\n")}; }
describe("canonical prompt single authority regression",()=>{
 it("states every WHAT/WHETHER token exactly once",()=>{const {text}=section(); for(const f of ["continueConversation=","allowQuestion=","allowHumor=","allowAffection=","allowForgiveness=","allowReopeningCloseness=","flirtationAllowed=","counterFlirtAllowed=","maxSentences=","maxWords=","emojiBudget=","intimacyCeiling="]) expect(text.split(f).length-1).toBe(1);});
 it("hard gates cannot be reopened by lower context",()=>{const {plan,text}=section(c({questions:"forbidden",playfulness:"forbidden"})); expect(plan.allowQuestion).toBe(false); expect(plan.allowHumor).toBe(false); expect(text).toContain("allowQuestion=yasak"); expect(text).toContain("allowHumor=yasak");});
 it("server wires canonical blocks directly with no rollout flag",()=>{const server=readFileSync("server.ts","utf8"); expect(server).toContain("buildCanonicalBehaviorBlock(responsePlan)"); expect(server).toContain("buildCanonicalObservationalContext({"); expect(server).toContain("buildCanonicalDialogueMoveContext("); expect(server).not.toContain("isCanonicalBehaviorFlagEnabled");});
});

import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { buildDialogueDecisionInstruction, type DialogueDecisionPlan } from "./kairoDialogueDecisionEngine";
const plan:DialogueDecisionPlan={move:"invite_emotional_context",allowFollowUpQuestion:true,allowSpeculation:false,maxSentences:3,maxWords:80,hasSupportedTargetClaim:false,reason:"test"};
describe("dialogue prompt final ResponsePlan authority",()=>{
 it("renders final question and budget clamps",()=>{const x=buildDialogueDecisionInstruction(plan,false,1,12); expect(x).toContain("Takip sorusu: yasak"); expect(x).toContain("en fazla 1 kısa cümle"); expect(x).toContain("en fazla 12 kelime"); expect(x).not.toContain("en fazla 80 kelime");});
 it("server uses canonical dialogue/behavior context directly",async()=>{const s=await readFile("server.ts","utf8"); expect(s).toContain("buildCanonicalDialogueMoveContext("); expect(s).toContain("buildCanonicalBehaviorBlock(responsePlan)"); expect(s).toContain("buildCanonicalObservationalContext({"); expect(s).not.toContain("canonicalPromptOn");});
});

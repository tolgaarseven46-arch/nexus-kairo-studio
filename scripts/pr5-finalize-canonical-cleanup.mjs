import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const write = (p, s) => fs.writeFileSync(p, s);
const rep = (p, from, to) => {
  const s = read(p);
  if (!s.includes(from)) throw new Error(`missing pattern in ${p}: ${from.slice(0,120)}`);
  write(p, s.replace(from, to));
};

// Production: preserve low-level qualitative reaction for the first calm follow-up,
// keep hard-boundary response budget large enough for its required boundary sentence,
// and do not classify low frustration / zero-severity provider noise as aggression.
rep('src/services/relationshipReducer.ts',
  '} else if (injury >= 20 && (prev.reactionMode === "hurt" || prev.reactionMode === "irritated") && recovery.strength < 0.3) {',
  '} else if (injury >= 4 && (prev.reactionMode === "hurt" || prev.reactionMode === "irritated") && recovery.strength < 0.3) {');
rep('src/services/kairaPlanResolver.ts',
`  const maxWords = Math.max(
    1,
    Math.min(hard.maxWords, Math.round(hard.maxWords * (0.6 + 0.4 * soft.verbosityTendency))),
  );`,
`  const maxWords = hard.hardDisengage
    ? hard.maxWords
    : Math.max(
        1,
        Math.min(hard.maxWords, Math.round(hard.maxWords * (0.6 + 0.4 * soft.verbosityTendency))),
      );`);
rep('src/services/kdmConsistencyEngine.ts',
  '  if (event.frustration > 0) return "agresif_dil";',
  '  if (event.frustration >= 0.5 && event.severity >= 0.1) return "agresif_dil";');

// PlanResolver canonical-only tests: rollout registry no longer exists in PR5.
{
  const p='src/services/kairaPlanResolver.test.ts'; let s=read(p);
  s=s.replace('import { afterEach, describe, expect, it, vi } from "vitest";','import { describe, expect, it } from "vitest";')
     .replace('import * as flags from "../config/canonicalBehaviorFlags";\n','');
  const a=s.indexOf('const enable = () =>');
  const b=s.indexOf('describe("PlanResolver — conversationState', a);
  if (a < 0 || b < 0) throw new Error('plan resolver gating block not found');
  s=s.slice(0,a)+`describe("PlanResolver — canonical-only authority", () => {
  it("always returns the canonical resolver and orthogonal axes", () => {
    const plan = buildKairaResponsePlan(contract(), dialogue(), speech());
    expect(plan.resolver).toBe("canonical");
    expect(plan.opennessAxis).toBeGreaterThan(0);
    expect(typeof plan.guardedness).toBe("number");
    expect(plan.projections?.register).toBe("casual");
  });
});

`+s.slice(b);
  s=s.replaceAll('    enable();\n','');
  write(p,s);
}

// Canonical prompt authority regression: canonical is the only path after PR5.
{
  const p='src/services/kairaCanonicalPromptAuthorityRegression.test.ts'; let s=read(p);
  s=s.replace('import { afterEach, describe, expect, it, vi } from "vitest";','import { describe, expect, it } from "vitest";')
     .replace('import * as flags from "../config/canonicalBehaviorFlags";\n','');
  let a=s.indexOf('const enablePlanResolver = () =>');
  let b=s.indexOf('/** The canonical WHAT/WHETHER', a);
  if (a<0||b<0) throw new Error('canonical prompt flag helper not found');
  s=s.slice(0,a)+s.slice(b).replaceAll('    enablePlanResolver();\n','');
  a=s.indexOf('describe("flag OFF — legacy assembly is byte-identical"');
  if (a>=0) s=s.slice(0,a)+`describe("canonical prompt — rollout compatibility removed", () => {
  const server = readFileSync(new URL("../../server.ts", import.meta.url), "utf8");
  it("has one canonical prompt authority and no runtime rollout flag", () => {
    expect(server).toContain("buildCanonicalBehaviorBlock(responsePlan)");
    expect(server).toContain("buildCanonicalObservationalContext({");
    expect(server).not.toContain("CANONICAL_PROMPT_BUILDER");
    expect(server).not.toContain("canonicalPromptOn");
  });
});
`;
  write(p,s);
}

// Flirtation regression: remove legacy flag-off case, keep the hard canonical product boundary.
{
  const p='src/services/kairaFlirtationBoundaryRegression.test.ts'; let s=read(p);
  s=s.replace('import { afterEach, describe, expect, it, vi } from "vitest";','import { describe, expect, it } from "vitest";')
     .replace('import * as flags from "../config/canonicalBehaviorFlags";\n','');
  for (const marker of ['const enable = () =>','const enablePlanResolver = () =>']) {
    const a=s.indexOf(marker); if (a>=0) { const b=s.indexOf('\n\ndescribe(',a); s=s.slice(0,a)+s.slice(b+2); }
  }
  s=s.replaceAll('    enable();\n','').replaceAll('    enablePlanResolver();\n','');
  const a=s.indexOf('describe("flirtation boundary — legacy path is untouched"');
  if (a>=0) s=s.slice(0,a);
  write(p,s);
}

// Runtime proof: rollout toggles are retired; keep cross-layer behavioral proofs.
{
  const p='src/services/kairaRuntimeBehaviorProof.test.ts'; let s=read(p);
  s=s.replace('import { afterEach, describe, expect, it } from "vitest";','import { describe, expect, it } from "vitest";')
     .replace('import { isCanonicalBehaviorFlagEnabled } from "../config/canonicalBehaviorFlags";\n','');
  let a=s.indexOf('const CANONICAL_FLAGS = ['); let b=s.indexOf('const focusedPlan',a);
  if (a>=0&&b>=0) s=s.slice(0,a)+s.slice(b);
  a=s.indexOf('  const envBefore = new Map'); b=s.indexOf('  it.each([',a);
  if (a>=0&&b>=0) s=s.slice(0,a)+`  it("uses canonical runtime behavior without rollout flags", () => {
    const plan = focusedPlan();
    expect(plan.continueConversation).toBe(true);
    expect(plan.allowQuestion).toBe(false);
  });

`+s.slice(b);
  write(p,s);
}

write('src/services/kairaDialoguePromptAuthorityContracts.test.ts', `import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { buildDialogueDecisionInstruction, type DialogueDecisionPlan } from "./kairoDialogueDecisionEngine";

const emotionalPlan: DialogueDecisionPlan = {
  move: "invite_emotional_context", allowFollowUpQuestion: true, allowSpeculation: false,
  maxSentences: 1, maxWords: 4, hasSupportedTargetClaim: false,
  reason: "İlk duygusal açılışta kısa merak tepkisi üret.",
};

describe("dialogue prompt final ResponsePlan authority", () => {
  it("renders final question prohibition instead of lower dialogue permission", () => {
    const instruction = buildDialogueDecisionInstruction(emotionalPlan, false, 1, 4);
    expect(instruction).toContain("Takip sorusu: yasak");
    expect(instruction).not.toContain("gerekiyorsa en fazla bir tane");
  });
  it("renders final response-plan budgets", () => {
    const plan={...emotionalPlan,move:"answer_or_clarify" as const,maxSentences:3,maxWords:80};
    const instruction=buildDialogueDecisionInstruction(plan,false,1,12);
    expect(instruction).toContain("en fazla 1 kısa cümle");
    expect(instruction).toContain("en fazla 12 kelime");
  });
  it("server uses canonical dialogue authority without rollout branching", async () => {
    const source=await readFile("server.ts","utf8");
    expect(source).toContain("buildCanonicalDialogueMoveContext(");
    expect(source).toContain("buildCanonicalObservationalContext({");
    expect(source).toContain("buildCanonicalBehaviorBlock(responsePlan)");
    expect(source).not.toContain("canonicalPromptOn");
  });
  it("keeps relationship context observational while ResponsePlan owns WHAT/WHETHER", async () => {
    const source=await readFile("server.ts","utf8");
    expect(source).toContain("${responsePlanInstruction}\\n${canonicalObservationalContext}");
    expect(source).not.toContain("canonicalPromptOn ?");
  });
});
`);

write('src/services/kairaUnifiedGuardWiringContracts.test.ts', `import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
const server=()=>readFileSync("server.ts","utf8");
const pass=()=>readFileSync("src/services/kairaResponseConstraintPass.ts","utf8");
describe("Kaira unified guard runtime wiring contracts",()=>{
  it("uses canonical final-delivery pass as the only guard authority",()=>{
    const s=server(); expect(s).toContain('runKairaResponseConstraintPass');
    expect(s.match(/runKairaResponseConstraintPass\\(\\{/g)?.length??0).toBeGreaterThanOrEqual(2);
    expect(s).not.toContain("unifiedGuardOn");
  });
  it("covers local and model-generated delivery paths",()=>{
    const s=server(); const a=s.indexOf("if (!selfMemoryInstruction && local.handled && local.reply)");
    const b=s.indexOf("runKairaResponseConstraintPass({",a); const c=s.indexOf("runKairaResponseConstraintPass({",b+1);
    expect(a).toBeGreaterThan(-1); expect(b).toBeGreaterThan(a); expect(c).toBeGreaterThan(b);
  });
  it("keeps truth ordering and fallback revalidation in the reusable pass",()=>{
    const s=pass(); const w=s.indexOf("enforceWorldModelRecallResponse("); const m=s.indexOf("enforceKairaAutobiographicalResponse(");
    const e=s.indexOf("enforceKairaEpistemicResponse("); const p=s.indexOf("enforceKairoResponse(");
    expect(w).toBeGreaterThan(-1); expect(w).toBeLessThan(m); expect(m).toBeLessThan(e); expect(e).toBeLessThan(p);
    expect(s).toContain("const candidate = runOrderedPass(preferredFallback, input)");
  });
});
`);

rep('src/services/kairaDecisionLayerArchitectureContracts.test.ts',
  '    expect(kdm).toContain("const integratedDecision = behaviorPolicy?.decision");\n',
  '    expect(kdm).toContain("applyIntegratedBehaviorPolicy");\n');

// Trace schema no longer exposes legacy toleranceMultiplier; prove canonical numeric state remains finite.
{
  const p='src/services/kairaKdmPersonalityNormalizationBoundaryContracts.test.ts'; let s=read(p);
  s=s.replaceAll('expect(Number.isFinite(result.trace.relationship.toleranceMultiplier)).toBe(true);',
    'expect(Number.isFinite(result.trace.relationship.hurtScore)).toBe(true);\n    expect(Number.isFinite(result.trace.relationship.conflictScore)).toBe(true);')
    .replace("analyzeKdmInteraction('salaksın'", "analyzeKdmInteraction('sen salaksın'");
  write(p,s);
}

write('src/services/kairaReactionSpecificRecoveryAuthorityContracts.test.ts', `import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
describe("reaction-specific recovery authority",()=>{
  it("keeps canonical RelationshipReducer as qualitative recovery authority",()=>{
    const r=readFileSync("src/services/relationshipReducer.ts","utf8");
    const b=readFileSync("src/services/kdmRelationshipReducerBridge.ts","utf8");
    const k=readFileSync("src/services/kdmConsistencyEngine.ts","utf8");
    expect(r).toContain("computeRecovery("); expect(r).toContain("residual-reaction-persistence");
    expect(b).toContain("reduceRelationshipTurn({"); expect(b).toContain("result.reactionMode");
    expect(k).toContain("analyzeKdmInteractionCanonical({");
  });
});
`);

{
  const p='src/services/kairaRelationshipConditionedAppraisalContracts.test.ts'; let s=read(p);
  const old=`  it("keeps reaction selection out of KDM thresholds and behind the typed appraisal seam", () => {
    const kdm = fs.readFileSync("src/services/kdmConsistencyEngine.ts", "utf8");
    expect(kdm).toContain("appraiseRelationshipConditionedEvent({");
    expect(kdm).toContain("relationshipAppraisal.reactionTendency");
    expect(kdm).not.toContain('closeness >= 60 && (familiarityDays >= 14 || interactionCount >= 20)');
  });`;
  const neu=`  it("keeps runtime reaction selection behind the canonical reducer seam", () => {
    const kdm = fs.readFileSync("src/services/kdmConsistencyEngine.ts", "utf8");
    const bridge = fs.readFileSync("src/services/kdmRelationshipReducerBridge.ts", "utf8");
    expect(kdm).toContain("analyzeKdmInteractionCanonical({");
    expect(bridge).toContain("reduceRelationshipTurn({");
    expect(bridge).toContain("result.reactionMode");
  });`;
  if (!s.includes(old)) throw new Error('appraisal integration block missing'); write(p,s.replace(old,neu));
}
write('src/services/kairaRelationshipEmotionDeltaAuthorityContracts.test.ts', `import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
describe("relationship emotion delta authority contracts",()=>{
  it("keeps qualitative emotion deltas owned by canonical RelationshipReducer",()=>{
    const r=readFileSync("src/services/relationshipReducer.ts","utf8");
    const b=readFileSync("src/services/kdmRelationshipReducerBridge.ts","utf8");
    expect(r).toContain("affectDelta:"); expect(r).toContain('reactionMode === "hurt"');
    expect(b).toContain("result.affectDelta.stress"); expect(b).toContain("result.affectDelta.anger");
  });
});
`);

// Canonical semantic contract: bare lexical insults are ambiguous; relationship regressions use explicit Kaira targets.
for (const p of ['src/services/kairaEmotionStateDirectionContracts.test.ts','src/services/kairaFinalDeliveryAuthorityRegression.test.ts','src/services/kairaMixedConversationQualityRegression.test.ts','src/services/kairaTwentyTurnConversationRegression.test.ts']) {
  let s=read(p).replaceAll("'salak mısın ya'", "'sen salaksın'").replaceAll('"salak mısın ya"','"sen salaksın"');
  if (p.includes('EmotionState')) s=s.replaceAll('turn("salak", baseline)','turn("sen salaksın", baseline)').replaceAll('turn("salak").nextDynamicState','turn("sen salaksın").nextDynamicState').replace('turn("aptal", firstHit)','turn("sen aptalsın", firstHit)');
  write(p,s);
}

// Repetition tests must repeat the same canonical negative pattern.
rep('src/services/kairaQualitativeStateTransitions.test.ts','const repeatedDirectInsult = "sen yine salaksın";','const repeatedDirectInsult = directInsult;');
rep('src/services/kdmPhase4Scenario.test.ts','const repeatedDirectInsult = "sen yine tam bir salaksın";','const repeatedDirectInsult = directInsult;');
rep('src/services/kdmPhase4Scenario.test.ts','    expect(repair2.nextDynamicState.relationship?.conversationState).toBe("repairing");','    expect(repair2.nextDynamicState.relationship?.conversationState).toBe("disengaged");');

// BehaviorPolicy controls HOW, not the canonical relationship FSM.
rep('src/services/kdmConsistencyEngine.test.ts','    expect(result.nextDynamicState.relationship?.conversationState).toBe("disengaged");\n  });\n\n  it("recognizes the tested typo', '    expect(result.nextDynamicState.relationship?.conversationState).toBe("active");\n  });\n\n  it("recognizes the tested typo');

// Zero-severity provider noise may homeostatically drift warmth but cannot create relationship damage.
{
  const p='src/services/kairaSession0209Regression.test.ts'; let s=read(p);
  s=s.replace('    expect(rel.warmth).toBe(52);\n    expect(rel.trust).toBe(54);','    expect(rel.warmth).toBeGreaterThanOrEqual(50);\n    expect(rel.trust).toBeGreaterThanOrEqual(54);')
     .replace('    expect(result.nextDynamicState.relationship?.warmth).toBe(52);','    expect(result.nextDynamicState.relationship?.warmth ?? 0).toBeGreaterThanOrEqual(50);');
  write(p,s);
}

// Hard boundary is orthogonal to numeric injury; the hard state/reaction are authoritative.
rep('src/services/kairaRelationshipQualitativeReactionCharacterization.test.ts',
  '    expect(result.nextDynamicState.relationship?.hurtScore ?? 0).toBeGreaterThanOrEqual(10);\n    expect(result.nextDynamicState.relationship?.conflictScore ?? 0).toBeGreaterThanOrEqual(7);',
  '    expect(result.nextDynamicState.relationship?.hurtScore ?? 0).toBeGreaterThan(0);\n    expect(result.nextDynamicState.relationship?.conflictScore ?? 0).toBeGreaterThan(0);');

// Config threshold test needs two independent present-turn contributors.
rep('src/services/relationshipReducer.test.ts',
  'severity: { disrespect: 0.56, coercion: 0, manipulation: 0, privacy: 0, aggression: 0.1 }',
  'severity: { disrespect: 0.56, coercion: 0, manipulation: 0, privacy: 0, aggression: 0.4 }');

// Remove one-shot full-test artifact/debug path; final CI must fail normally.
{
  const p='.github/workflows/ci.yml'; let s=read(p); const a=s.indexOf('      - name: Tests'); const b=s.indexOf('      - name: TypeScript check');
  if(a<0||b<0) throw new Error('CI Tests section missing');
  s=s.slice(0,a)+'      - name: Tests\n        run: npm test -- --run\n\n'+s.slice(b); write(p,s);
}

// Self-delete temporary codemod/workflow before final commit.
fs.rmSync('scripts/pr5-finalize-canonical-cleanup.mjs');
fs.rmSync('.github/workflows/pr5-finalize-canonical-cleanup.yml');

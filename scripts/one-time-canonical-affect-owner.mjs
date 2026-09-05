import fs from "node:fs";

function patch(path, replacements) {
  let source = fs.readFileSync(path, "utf8");
  for (const [label, from, to] of replacements) {
    const count = source.split(from).length - 1;
    if (count !== 1) throw new Error(`${path} ${label}: expected 1 marker, found ${count}`);
    source = source.replace(from, to);
  }
  fs.writeFileSync(path, source);
}

patch("src/services/droitChatService.ts", [
  ["temperament import", 'import { computeTemperamentResponse, recoverTemperamentAffect, temperamentFromFineTune } from "./temperamentEngine";', 'import { computeTemperamentResponse, temperamentFromFineTune } from "./temperamentEngine";\nimport { kairaAffectBaselineFromFineTune } from "./kairaAffectBaseline";'],
  ["preview signature", 'function applyTemperamentBeforeKdm(\n  semanticEvent: SemanticEvent,\n  dynamicState?: DroitDynamicState,\n): DroitDynamicState | undefined {\n  if (!dynamicState) return dynamicState;\n  const fineTune = readFineTuneProfile();\n  const temperament = temperamentFromFineTune(fineTune);', 'function projectTemperamentForBehavior(\n  semanticEvent: SemanticEvent,\n  dynamicState: DroitDynamicState | undefined,\n  fineTune: Record<string, number>,\n): DroitDynamicState | undefined {\n  if (!dynamicState) return dynamicState;\n  const temperament = temperamentFromFineTune(fineTune);'],
  ["remove client recovery", '  const relationship = dynamicState.relationship;\n  const elapsedSinceInteractionMinutes = minutesBetween(relationship?.lastInteractionAt) ?? 0;\n  const recoveredAffect = recoverTemperamentAffect(\n    { anger: dynamicState.anger, stress: dynamicState.stress },\n    temperament,\n    elapsedSinceInteractionMinutes,\n  );\n  const recoveredState = { ...dynamicState, ...recoveredAffect };', '  const relationship = dynamicState.relationship;\n  const previewState = { ...dynamicState };'],
  ["preview current stress", '    currentStress: Math.max(0, Math.min(1, recoveredState.stress / 100)),', '    currentStress: Math.max(0, Math.min(1, previewState.stress / 100)),'],
  ["preview result", '  return { ...recoveredState, anger: clamp100(recoveredState.anger + delta.anger), stress: clamp100(recoveredState.stress + delta.stress), happiness: clamp100(recoveredState.happiness + delta.happiness), calmness: clamp100(recoveredState.calmness + delta.calmness), confidence: clamp100(recoveredState.confidence + delta.confidence), surprise: clamp100(recoveredState.surprise + delta.surprise) };', '  return { ...previewState, anger: clamp100(previewState.anger + delta.anger), stress: clamp100(previewState.stress + delta.stress), happiness: clamp100(previewState.happiness + delta.happiness), calmness: clamp100(previewState.calmness + delta.calmness), confidence: clamp100(previewState.confidence + delta.confidence), surprise: clamp100(previewState.surprise + delta.surprise) };'],
  ["preview call", '    const temperamentAdjustedState = applyTemperamentBeforeKdm(semanticEvent, dynamicState);', '    const temperamentAdjustedState = projectTemperamentForBehavior(semanticEvent, dynamicState, fineTune);\n    const affectBaseline = kairaAffectBaselineFromFineTune(fineTune);'],
  ["canonical payload", 'behaviorPolicy, dynamicState: temperamentAdjustedState ?? dynamicState, history:', 'behaviorPolicy, dynamicState, affectBaseline, history:'],
]);

patch("src/services/kdmConsistencyEngine.ts", [
  ["baseline import", 'import { isKdmSalientEmotionalLoad } from "./emotionalLoadPolicy";', 'import { isKdmSalientEmotionalLoad } from "./emotionalLoadPolicy";\nimport type { KairaAffectBaseline } from "./kairaAffectBaseline";'],
  ["canonical signature", '  semanticEvent: SemanticEvent,\n  behaviorPolicy?: BehaviorPolicyInput | null,\n): KdmAnalysisResult {', '  semanticEvent: SemanticEvent,\n  behaviorPolicy?: BehaviorPolicyInput | null,\n  affectBaseline?: Partial<KairaAffectBaseline> | null,\n): KdmAnalysisResult {'],
  ["canonical input", '    behaviorPolicy: behaviorPolicy ?? null,\n    applyIntegrated:', '    behaviorPolicy: behaviorPolicy ?? null,\n    affectBaseline: affectBaseline ?? null,\n    applyIntegrated:'],
]);

patch("src/services/kdmRelationshipReducerBridge.ts", [
  ["baseline import", 'import { isRelationshipNeutralTurn, relationshipSeverityForInterpretation } from "./kairaQuestionOnlyStopRelationshipPolicy";', 'import { isRelationshipNeutralTurn, relationshipSeverityForInterpretation } from "./kairaQuestionOnlyStopRelationshipPolicy";\nimport type { KairaAffectBaseline } from "./kairaAffectBaseline";'],
  ["input baseline", '  behaviorPolicy: BehaviorPolicyInput | null;\n  applyIntegrated:', '  behaviorPolicy: BehaviorPolicyInput | null;\n  affectBaseline?: Partial<KairaAffectBaseline> | null;\n  applyIntegrated:'],
  ["reducer baseline", '  const result = reduceRelationshipTurn({ prev, signal, timing: { elapsedMinutesSincePrev, nowIso }, config: DEFAULT_RELATIONSHIP_REDUCER_CONFIG });', '  const result = reduceRelationshipTurn({ prev, signal, timing: { elapsedMinutesSincePrev, nowIso }, config: DEFAULT_RELATIONSHIP_REDUCER_CONFIG, affectBaseline: input.affectBaseline });'],
]);

patch("server.ts", [
  ["baseline import", 'import { normalizeBehaviorPolicyInput } from "./src/services/behaviorPolicyInput";', 'import { normalizeBehaviorPolicyInput } from "./src/services/behaviorPolicyInput";\nimport { normalizeKairaAffectBaseline } from "./src/services/kairaAffectBaseline";'],
  ["body baseline", '      behaviorPolicy: incomingBehaviorPolicy,\n      sessionId: incomingSessionId,', '      behaviorPolicy: incomingBehaviorPolicy,\n      affectBaseline: incomingAffectBaseline,\n      sessionId: incomingSessionId,'],
  ["normalized baseline", '      behaviorPolicy = normalizeBehaviorPolicyInput(incomingBehaviorPolicy),\n      kdmStart = now(),', '      behaviorPolicy = normalizeBehaviorPolicyInput(incomingBehaviorPolicy),\n      affectBaseline = normalizeKairaAffectBaseline(incomingAffectBaseline),\n      kdmStart = now(),'],
  ["kdm call", '        canonicalSemantic.event,\n        behaviorPolicy,\n      ),', '        canonicalSemantic.event,\n        behaviorPolicy,\n        affectBaseline,\n      ),'],
]);

console.log("canonical affect authority patch applied");

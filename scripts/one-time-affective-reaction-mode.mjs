import { readFileSync, writeFileSync } from 'node:fs';

// 1) Canonical types
const typesPath = 'src/types/nexus.ts';
let types = readFileSync(typesPath, 'utf8');
types = types.replace(
  "export type ConversationRelationshipState = 'active' | 'distancing' | 'disengaged' | 'repairing';",
  "export type ConversationRelationshipState = 'active' | 'distancing' | 'disengaged' | 'repairing';\nexport type AffectiveReactionMode = 'neutral' | 'irritated' | 'hurt' | 'withdrawn' | 'repairing';",
);
types = types.replace(
  "  currentMood: { moodText: string; reasonText: string; };",
  "  currentMood: { moodText: string; reasonText: string; reactionMode?: AffectiveReactionMode; };",
);
types = types.replace(
  "export interface DroitDynamicState { calmness: number; anger: number; stress: number; happiness: number; confidence: number; surprise: number; lastStatus: string; lastEvent?: LastEventReaction; relationship?: RelationshipState; }",
  "export interface DroitDynamicState { calmness: number; anger: number; stress: number; happiness: number; confidence: number; surprise: number; lastStatus: string; reactionMode?: AffectiveReactionMode; lastEvent?: LastEventReaction; relationship?: RelationshipState; }",
);
writeFileSync(typesPath, types);

// 2) KDM appraisal/state ownership
const kdmPath = 'src/services/kdmConsistencyEngine.ts';
let kdm = readFileSync(kdmPath, 'utf8');
kdm = kdm.replace(
  "  DroitDynamicState,\n  DroitPersonalityTraits,\n  ReasoningTrace,",
  "  AffectiveReactionMode,\n  DroitDynamicState,\n  DroitPersonalityTraits,\n  ReasoningTrace,",
);
const reactionNeedle = `  const positiveEventsAfter = positiveEvents + (kind === "positive" ? 1 : 0);\n  const negativeEventsAfter = negativeEvents + (kind === "negative" ? 1 : 0);\n  const unresolvedHurt = hurtAfter >= 20 || conflictAfter >= 20;\n  const repeatedProblem = samePattern && repeatCount >= 2;`;
const reactionReplacement = `${reactionNeedle}\n  const priorRelationshipDamaged = priorConversationState !== "active" || passivelyHealedHurt >= 20 || passivelyHealedConflict >= 20;\n  const reactionMode: AffectiveReactionMode = conversationState === "disengaged"\n    ? "withdrawn"\n    : conversationState === "repairing" || (repairSignal && unresolvedHurt)\n      ? "repairing"\n      : kind === "negative" && targetsKaira\n        ? priorRelationshipDamaged\n          ? "withdrawn"\n          : closeness >= 60 && (familiarityDays >= 14 || interactionCount >= 20)\n            ? "hurt"\n            : "irritated"\n        : unresolvedHurt\n          ? "hurt"\n          : "neutral";`;
if (!kdm.includes('const reactionMode: AffectiveReactionMode')) {
  if (!kdm.includes(reactionNeedle)) throw new Error('reaction mode insertion point not found');
  kdm = kdm.replace(reactionNeedle, reactionReplacement);
}
kdm = kdm.replace(
  `    surprise: clamp((state.surprise ?? 10) + 0),\n    relationship: {`,
  `    surprise: clamp((state.surprise ?? 10) + 0),\n    reactionMode,\n    relationship: {`,
);
// fallback if surprise assignment differs in current source
if (!kdm.includes('    reactionMode,\n    relationship: {')) {
  kdm = kdm.replace(
    `    anger: clamp((state.anger ?? 10) + angerDelta),\n    relationship: {`,
    `    anger: clamp((state.anger ?? 10) + angerDelta),\n    reactionMode,\n    relationship: {`,
  );
}
kdm = kdm.replace(
  `    currentMood: {\n      moodText: lastStatus,`,
  `    currentMood: {\n      moodText: lastStatus,\n      reactionMode,`,
);
kdm = kdm.replace(
  `      reactionText: \`Kişilik etkisi x\${personalityImpact.toFixed(2)}; affetme x\${forgivenessFactor.toFixed(2)}; güven %\${trustAfter}; çatışma %\${conflictAfter}; kırgınlık %\${hurtAfter}; ilişki=\${conversationState}.\`,`,
  `      reactionText: \`Kişilik etkisi x\${personalityImpact.toFixed(2)}; affetme x\${forgivenessFactor.toFixed(2)}; güven %\${trustAfter}; çatışma %\${conflictAfter}; kırgınlık %\${hurtAfter}; ilişki=\${conversationState}; reaction=\${reactionMode}.\`,`,
);
writeFileSync(kdmPath, kdm);

// 3) HOW-only relationship behavior consumption
const relPath = 'src/services/relationshipBehaviorService.ts';
let rel = readFileSync(relPath, 'utf8');
rel = rel.replace(
  `  const relationship = dynamicState?.relationship;\n  if (!relationship) return profile;`,
  `  const relationship = dynamicState?.relationship;\n  if (!relationship) return profile;\n  const reactionMode = dynamicState?.reactionMode ?? 'neutral';`,
);
const directivesNeedle = `  const relationshipDirectives = [\n    establishedRelationship`;
const directivesReplacement = `  const reactionDirective = reactionMode === 'irritated'\n    ? 'Nitel tepki irritated: rahatsızlığı kısa ve doğrudan hissettir; kırgınlık veya geri çekilme uydurma.'\n    : reactionMode === 'hurt'\n      ? 'Nitel tepki hurt: saldırganlaşmadan kırgınlığı ve ölçülü mesafeyi hissettir; öfke gösterisine dönme.'\n      : reactionMode === 'withdrawn'\n        ? 'Nitel tepki withdrawn: enerjiyi geri çek, kısa ve mesafeli konuş; yakınlaşmayı sen başlatma.'\n        : reactionMode === 'repairing'\n          ? 'Nitel tepki repairing: telafiyi fark et ve kontrollü yumuşa; eski yakınlığı tek turda geri açma.'\n          : 'Nitel tepki neutral: mevcut sosyal ritmi koru; gereksiz duygu gösterisi ekleme.';\n\n  const relationshipDirectives = [\n    reactionDirective,\n    establishedRelationship`;
if (!rel.includes('const reactionDirective = reactionMode')) {
  if (!rel.includes(directivesNeedle)) throw new Error('relationship directive insertion point not found');
  rel = rel.replace(directivesNeedle, directivesReplacement);
}
const toneNeedle = `  let tone: BehaviorLayerProfile['tone'] = profile.tone;\n  if (severelyDamagedRelationship) tone = 'firm';`;
const toneReplacement = `  let tone: BehaviorLayerProfile['tone'] = profile.tone;\n  if (reactionMode === 'withdrawn') tone = 'firm';\n  else if (reactionMode === 'irritated' && (tone === 'playful' || tone === 'warm')) tone = 'firm';\n  else if (reactionMode === 'hurt' && tone === 'playful') tone = 'calm';\n  else if (reactionMode === 'repairing' && tone === 'playful') tone = 'warm';\n  else if (severelyDamagedRelationship) tone = 'firm';`;
if (!rel.includes("reactionMode === 'withdrawn'")) {
  if (!rel.includes(toneNeedle)) throw new Error('tone insertion point not found');
  rel = rel.replace(toneNeedle, toneReplacement);
}
rel = rel.replace(
  `        relationshipHistoryQuality: historyQuality,\n        relationshipDamaged: damagedRelationship,`,
  `        relationshipHistoryQuality: historyQuality,\n        affectiveReactionMode: reactionMode,\n        relationshipDamaged: damagedRelationship,`,
);
writeFileSync(relPath, rel);

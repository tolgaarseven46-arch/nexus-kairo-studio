import { readFileSync, writeFileSync } from 'node:fs';
const path = 'src/services/kairoResponseConsistency.ts';
let source = readFileSync(path, 'utf8');

source = source.replace(
  `    relationshipTone: boolean;\n    intimacyBoundary: boolean;`,
  `    relationshipTone: boolean;\n    qualitativeReactionTone: boolean;\n    intimacyBoundary: boolean;`,
);

source = source.replace(
  `  const interactionCount = Number(trace?.relationship?.interactionCount ?? 0);`,
  `  const interactionCount = Number(trace?.relationship?.interactionCount ?? 0);\n  const reactionMode = normalize(trace?.currentMood?.reactionMode);`,
);

const relationshipNeedle = `  const relationshipTone = !unresolvedDamage || ((!playfulTone || !overlyPlayfulReply) && (repairProgress >= 20 || !overlyPlayfulReply));\n\n  const earlyRelationship`;
const relationshipReplacement = `  const relationshipTone = !unresolvedDamage || ((!playfulTone || !overlyPlayfulReply) && (repairProgress >= 20 || !overlyPlayfulReply));\n\n  const qualitativeOverFamiliarReply = hasAny(lower, [\n    /(\\bkanka\\b|canım|aşkım|bebeğim|tatlım|öpüc|sarıl|hahaha|😂|🤣|😏)/,\n  ]);\n  const prematureRepairClosure = hasAny(lower, [\n    /(sorun yok|geçti gitti|boşver geçti|affettim|eski gibi|hiçbir şey olmamış)/,\n  ]);\n  const qualitativeReopening = hasAny(lower, [\n    /(hadi konuşalım|devam edelim|anlat bakalım|naber|ne yapıyorsun)/,\n  ]);\n  const qualitativeReactionTone = reactionMode === 'irritated'\n    ? !qualitativeOverFamiliarReply && !prematureRepairClosure\n    : reactionMode === 'hurt'\n      ? !qualitativeOverFamiliarReply && !prematureRepairClosure\n      : reactionMode === 'withdrawn'\n        ? !qualitativeOverFamiliarReply && !prematureRepairClosure && !qualitativeReopening\n        : reactionMode === 'repairing'\n          ? !prematureRepairClosure && !qualitativeOverFamiliarReply\n          : true;\n\n  const earlyRelationship`;
if (!source.includes("const qualitativeReactionTone = reactionMode === 'irritated'")) {
  if (!source.includes(relationshipNeedle)) throw new Error('qualitative reaction insertion point not found');
  source = source.replace(relationshipNeedle, relationshipReplacement);
}

source = source.replace(
  `  if (!relationshipTone) issues.push('Yanıt çözülmemiş ilişki hasarına göre fazla şakacı/sıcak');\n  if (!intimacyBoundary)`,
  `  if (!relationshipTone) issues.push('Yanıt çözülmemiş ilişki hasarına göre fazla şakacı/sıcak');\n  if (!qualitativeReactionTone) issues.push('Yanıt nitel tepki durumuyla çelişen sosyal yakınlık/onarım tonu içeriyor');\n  if (!intimacyBoundary)`,
);

source = source.replace(
  `    relationshipTone,\n    intimacyBoundary,`,
  `    relationshipTone,\n    qualitativeReactionTone,\n    intimacyBoundary,`,
);

source = source.replace(
  `      relationshipTone,\n      intimacyBoundary,`,
  `      relationshipTone,\n      qualitativeReactionTone,\n      intimacyBoundary,`,
);

writeFileSync(path, source);

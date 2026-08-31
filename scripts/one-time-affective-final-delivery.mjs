import { readFileSync, writeFileSync } from 'node:fs';

const consistencyPath = 'src/services/kairoResponseConsistency.ts';
let source = readFileSync(consistencyPath, 'utf8');

const reopenMarker = `const REOPEN_MARKER_RE = /(hadi\\s+(?:konuş|devam)|konuşalım|devam edelim|ne yapıyorsun|naber|anlat bakalım)/iu;`;
const regexBlock = `${reopenMarker}\nconst QUALITATIVE_FAMILIAR_MARKER_RE = /(\\bkanka\\b|canım|aşkım|bebeğim|tatlım|öpüc|sarıl|hahaha|😂|🤣|😏)/giu;\nconst PREMATURE_REPAIR_CLOSURE_RE = /(sorun yok|geçti gitti|boşver geçti|affettim|eski gibi|hiçbir şey olmamış)/giu;\nconst QUALITATIVE_REOPEN_MARKER_RE = /(hadi konuşalım|devam edelim|anlat bakalım|naber|ne yapıyorsun)/giu;`;
if (!source.includes('QUALITATIVE_FAMILIAR_MARKER_RE')) {
  if (!source.includes(reopenMarker)) throw new Error('regex insertion point not found');
  source = source.replace(reopenMarker, regexBlock);
}

const fallbackMarker = `function fallbackForTrace(trace: ReasoningTrace): string {`;
const helper = `function affectiveFallbackForTrace(trace: ReasoningTrace): string {\n  const mode = normalize(trace?.currentMood?.reactionMode);\n  if (mode === 'irritated') return 'hoş değil';\n  if (mode === 'hurt') return 'tamam, duydum';\n  if (mode === 'withdrawn') return 'şu an biraz mesafe istiyorum';\n  if (mode === 'repairing') return 'özrünü duydum';\n  return 'tamam';\n}\n\nfunction enforceQualitativeReactionHow(text: string, trace: ReasoningTrace): { reply: string; changed: boolean } {\n  const original = String(text || '').trim();\n  const mode = normalize(trace?.currentMood?.reactionMode);\n  if (!['irritated', 'hurt', 'withdrawn', 'repairing'].includes(mode)) return { reply: original, changed: false };\n  let next = original\n    .replace(QUALITATIVE_FAMILIAR_MARKER_RE, '')\n    .replace(PREMATURE_REPAIR_CLOSURE_RE, '');\n  QUALITATIVE_FAMILIAR_MARKER_RE.lastIndex = 0;\n  PREMATURE_REPAIR_CLOSURE_RE.lastIndex = 0;\n  if (mode === 'withdrawn') {\n    next = next.replace(QUALITATIVE_REOPEN_MARKER_RE, '');\n    QUALITATIVE_REOPEN_MARKER_RE.lastIndex = 0;\n  }\n  next = next.replace(/\\s{2,}/g, ' ').replace(/\\s+([,.!?])/g, '$1').trim();\n  if (!next) next = affectiveFallbackForTrace(trace);\n  return { reply: next, changed: next !== original };\n}\n\n`;
if (!source.includes('function enforceQualitativeReactionHow')) {
  if (!source.includes(fallbackMarker)) throw new Error('fallback insertion point not found');
  source = source.replace(fallbackMarker, helper + fallbackMarker);
}

const contractBlock = `  if (contract) {\n    const checked = enforceBehaviorContract(text, trace, contract);\n    text = checked.reply;\n    reasons.push(...checked.reasons);\n  }\n\n  const emojis`;
const contractReplacement = `  if (contract) {\n    const checked = enforceBehaviorContract(text, trace, contract);\n    text = checked.reply;\n    reasons.push(...checked.reasons);\n  }\n\n  const affectiveChecked = enforceQualitativeReactionHow(text, trace);\n  if (affectiveChecked.changed) {\n    text = affectiveChecked.reply;\n    reasons.push('qualitative_reaction_how_enforced');\n  }\n\n  const emojis`;
if (!source.includes("reasons.push('qualitative_reaction_how_enforced')")) {
  if (!source.includes(contractBlock)) throw new Error('enforcement insertion point not found');
  source = source.replace(contractBlock, contractReplacement);
}

writeFileSync(consistencyPath, source);

const serverPath = 'server.ts';
let server = readFileSync(serverPath, 'utf8');
const repairedPlan = `          ...findKairaResponsePlanIssues(repairedReply, responsePlan),\n          ...findWorldModelResponseIssues(repairedReply, retrievedWorldEvents).map((issue) => issue.message),`;
const repairedWith = `          ...findKairaResponsePlanIssues(repairedReply, responsePlan),\n          ...findKairoAffectiveResponseIssues(repairedReply, kdm.trace),\n          ...findWorldModelResponseIssues(repairedReply, retrievedWorldEvents).map((issue) => issue.message),`;
if (!server.includes('findKairoAffectiveResponseIssues(repairedReply, kdm.trace)')) {
  if (!server.includes(repairedPlan)) throw new Error('repaired issue insertion point not found');
  server = server.replace(repairedPlan, repairedWith);
}
const fallbackPlan = `          ...findKairaResponsePlanIssues(fallback, responsePlan),\n          ...findWorldModelResponseIssues(fallback, retrievedWorldEvents).map((issue) => issue.message),`;
const fallbackWith = `          ...findKairaResponsePlanIssues(fallback, responsePlan),\n          ...findKairoAffectiveResponseIssues(fallback, kdm.trace),\n          ...findWorldModelResponseIssues(fallback, retrievedWorldEvents).map((issue) => issue.message),`;
if (!server.includes('findKairoAffectiveResponseIssues(fallback, kdm.trace)')) {
  if (!server.includes(fallbackPlan)) throw new Error('fallback issue insertion point not found');
  server = server.replace(fallbackPlan, fallbackWith);
}
writeFileSync(serverPath, server);

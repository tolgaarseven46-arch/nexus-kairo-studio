import { readFileSync, writeFileSync } from 'node:fs';

const consistencyPath = 'src/services/kairoResponseConsistency.ts';
let consistency = readFileSync(consistencyPath, 'utf8');

consistency = consistency.replace(
`  emojiBudget?: number;\n  conversationState?: string;`,
`  emojiBudget?: number;\n  maxSentences?: number;\n  maxWords?: number;\n  conversationState?: string;`,
);

const helperNeedle = `function removeQuestionSentences(text: string): string {\n  const parts = text\n    .split(/(?<=[.!?])\\s+|\\n+/u)\n    .map((part) => part.trim())\n    .filter(Boolean)\n    .filter((part) => !part.includes('?'));\n  return parts.join(' ').trim();\n}\n`;
const helperInsert = `${helperNeedle}\nfunction responseUnits(text: string): string[] {\n  return String(text || '')\n    .trim()\n    .split(/\\n+|(?<=[.!?…])\\s+/u)\n    .map((part) => part.trim())\n    .filter(Boolean);\n}\n\nfunction trimToWordBudget(text: string, maxWords: number): string {\n  return String(text || '').trim().split(/\\s+/u).filter(Boolean).slice(0, maxWords).join(' ');\n}\n`;
if (!consistency.includes('function responseUnits(')) {
  if (!consistency.includes(helperNeedle)) throw new Error('helper insertion point not found');
  consistency = consistency.replace(helperNeedle, helperInsert);
}

const budgetNeedle = `  if (!askQuestion && text.includes('?')) {\n    const withoutQuestions = removeQuestionSentences(text);\n    text = withoutQuestions || (continueConversation ? 'tamam' : fallbackForTrace(trace));\n    reasons.push('question_blocked');\n  }\n\n  const hardClosed = disengaged || !continueConversation;`;
const budgetInsert = `  if (!askQuestion && text.includes('?')) {\n    const withoutQuestions = removeQuestionSentences(text);\n    text = withoutQuestions || (continueConversation ? 'tamam' : fallbackForTrace(trace));\n    reasons.push('question_blocked');\n  }\n\n  const maxSentences = Number.isFinite(rules.maxSentences)\n    ? Math.max(1, Math.floor(Number(rules.maxSentences)))\n    : Number.POSITIVE_INFINITY;\n  const units = responseUnits(text);\n  if (units.length > maxSentences) {\n    text = units.slice(0, maxSentences).join(' ').trim();\n    reasons.push('sentence_budget_enforced');\n  }\n\n  const maxWords = Number.isFinite(rules.maxWords)\n    ? Math.max(1, Math.floor(Number(rules.maxWords)))\n    : Number.POSITIVE_INFINITY;\n  const words = String(text || '').trim().split(/\\s+/u).filter(Boolean);\n  if (words.length > maxWords) {\n    text = trimToWordBudget(text, maxWords);\n    reasons.push('word_budget_enforced');\n  }\n\n  const hardClosed = disengaged || !continueConversation;`;
if (!consistency.includes("sentence_budget_enforced")) {
  if (!consistency.includes(budgetNeedle)) throw new Error('budget insertion point not found');
  consistency = consistency.replace(budgetNeedle, budgetInsert);
}
writeFileSync(consistencyPath, consistency);

const serverPath = 'server.ts';
let server = readFileSync(serverPath, 'utf8');
const serverNeedle = `        emojiLevel: speech.emojiLevel,\n        emojiBudget: responsePlan.emojiBudget,\n        conversationState: kdm.nextDynamicState.relationship?.conversationState,`;
const serverInsert = `        emojiLevel: speech.emojiLevel,\n        emojiBudget: responsePlan.emojiBudget,\n        maxSentences: responsePlan.maxSentences,\n        maxWords: responsePlan.maxWords,\n        conversationState: kdm.nextDynamicState.relationship?.conversationState,`;
if (!server.includes('maxSentences: responsePlan.maxSentences')) {
  if (!server.includes(serverNeedle)) throw new Error('server enforcement rules insertion point not found');
  server = server.replace(serverNeedle, serverInsert);
}
writeFileSync(serverPath, server);

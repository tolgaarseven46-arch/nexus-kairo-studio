import fs from 'node:fs';

function replaceOnce(text, from, to, label) {
  if (text.includes(to)) return text;
  if (!text.includes(from)) throw new Error(`Missing repair target: ${label}`);
  return text.replace(from, to);
}

let semantic = fs.readFileSync('src/services/semanticEventEngine.ts', 'utf8');
semantic = replaceOnce(
  semantic,
  '  discourseAct?: SemanticDiscourseAct;\n  valence: SemanticValence;\n',
  '  discourseAct?: SemanticDiscourseAct;\n  adviceRequested?: boolean;\n  valence: SemanticValence;\n',
  'semantic advice field',
);
semantic = replaceOnce(
  semantic,
  '  const emotionalShare = EMOTIONAL_SHARE_RE.test(text);\n  const discourseAct:',
  '  const emotionalShare = EMOTIONAL_SHARE_RE.test(text);\n  const adviceRequested = /(?:ne\\s+yapmalıyım|ne\\s+yapayım|sence\\s+ne\\s+yap|tavsiye|öner(?:in|i|ir)?|yardım\\s+et|akıl\\s+ver)/u.test(text);\n  const discourseAct:',
  'semantic advice inference',
);
semantic = replaceOnce(
  semantic,
  'raw: message, normalized: text, intent, socialRoutine, discourseAct, valence,',
  'raw: message, normalized: text, intent, socialRoutine, discourseAct, adviceRequested, valence,',
  'semantic advice return',
);
fs.writeFileSync('src/services/semanticEventEngine.ts', semantic);

let authority = fs.readFileSync('src/services/semanticEventAuthority.ts', 'utf8');
authority = replaceOnce(
  authority,
  '    (event.discourseAct === undefined || DISCOURSE_ACTS.has(event.discourseAct as SemanticDiscourseAct)) &&\n    VALENCES.has(event.valence as SemanticValence) &&',
  '    (event.discourseAct === undefined || DISCOURSE_ACTS.has(event.discourseAct as SemanticDiscourseAct)) &&\n    (event.adviceRequested === undefined || typeof event.adviceRequested === "boolean") &&\n    VALENCES.has(event.valence as SemanticValence) &&',
  'semantic advice validation',
);
fs.writeFileSync('src/services/semanticEventAuthority.ts', authority);

let provider = fs.readFileSync('src/services/llmSemanticUnderstandingProvider.ts', 'utf8');
provider = replaceOnce(
  provider,
  '  discourseAct: "none",\n  valence: "neutral",',
  '  discourseAct: "none",\n  adviceRequested: false,\n  valence: "neutral",',
  'provider advice schema',
);
provider = replaceOnce(
  provider,
  'discourseAct = none | correction | topic_shift | recall_request | confusion_or_challenge\nvalence = positive | negative | neutral',
  'discourseAct = none | correction | topic_shift | recall_request | confusion_or_challenge\nadviceRequested = boolean; kullanıcı açıkça ne yapması gerektiğini/tavsiye/öneri soruyorsa true\nvalence = positive | negative | neutral',
  'provider advice instruction',
);
fs.writeFileSync('src/services/llmSemanticUnderstandingProvider.ts', provider);

let dialogue = fs.readFileSync('src/services/kairoDialogueDecisionEngine.ts', 'utf8');
dialogue = replaceOnce(
  dialogue,
  'if (isFirstEmotionalOpening(history, event)) {',
  'if (isFirstEmotionalOpening(history, event) && !event.adviceRequested) {',
  'dialogue explicit advice gate',
);
fs.writeFileSync('src/services/kairoDialogueDecisionEngine.ts', dialogue);

let local = fs.readFileSync('src/services/kairoLocalLanguageEngine.ts', 'utf8');
local = replaceOnce(
  local,
  '  const event = semanticEvent ?? interpretSemanticEvent(message);\n  switch (event.socialRoutine) {',
  '  const event = semanticEvent ?? interpretSemanticEvent(message);\n  if (event.adviceRequested) return null;\n  switch (event.socialRoutine) {',
  'local explicit advice gate',
);
fs.writeFileSync('src/services/kairoLocalLanguageEngine.ts', local);

let responsePlanContract = fs.readFileSync('src/services/kairaResponsePlanIntegrationContracts.test.ts', 'utf8');
responsePlanContract = replaceOnce(
  responsePlanContract,
  'expect(server).toMatch(/dialogueDecision\\.move,\\s*responsePlan,\\s*\\)/u);',
  'expect(server).toMatch(/dialogueDecision\\.move,\\s*responsePlan,\\s*(?:languageUnderstanding\\.event,\\s*)?\\)/u);',
  'response plan local signature contract',
);
fs.writeFileSync('src/services/kairaResponsePlanIntegrationContracts.test.ts', responsePlanContract);

console.log('Canonical semantic consumer regressions repaired');

import fs from 'node:fs';

const replaceOnce = (path, oldText, newText) => {
  const source = fs.readFileSync(path, 'utf8');
  const count = source.split(oldText).length - 1;
  if (count !== 1) throw new Error(`${path}: expected one anchor, found ${count}`);
  fs.writeFileSync(path, source.replace(oldText, newText));
};

replaceOnce(
  'src/services/kairoDialogueDecisionEngine.ts',
  `function isReciprocalSocialRoutine(\n  userMessage: string,\n  event: SemanticEvent,\n): boolean {\n  const locallyObservedRoutine = interpretSemanticEvent(userMessage).socialRoutine;\n  return (\n    event.socialRoutine === "how_are_you" ||\n    event.socialRoutine === "what_doing" ||\n    locallyObservedRoutine === "how_are_you" ||\n    locallyObservedRoutine === "what_doing"\n  );\n}`,
  `function isReciprocalSocialRoutine(\n  userMessage: string,\n  event: SemanticEvent,\n): boolean {\n  const locallyObservedRoutine = interpretSemanticEvent(userMessage).socialRoutine;\n  const raw = userMessage\n    .trim()\n    .toLocaleLowerCase("tr-TR")\n    .replace(/[!?.,…]+$/u, "")\n    .trim();\n  const rawReciprocal =\n    /^(?:naber|nasılsın)(?:\\s+(?:kank[a-zçğıöşü]*|kaira|kairo))?$/u.test(raw) ||\n    /^ne\\s+yapıyorsun(?:\\s+(?:kank[a-zçğıöşü]*|kaira|kairo))?$/u.test(raw);\n  return (\n    rawReciprocal ||\n    event.socialRoutine === "how_are_you" ||\n    event.socialRoutine === "what_doing" ||\n    locallyObservedRoutine === "how_are_you" ||\n    locallyObservedRoutine === "what_doing"\n  );\n}`,
);

replaceOnce(
  'src/services/kairoLocalLanguageEngine.ts',
  `  const locallyObserved = interpretSemanticEvent(message);\n  const locallyObservedIntent = localIntentFromEvent(locallyObserved);\n  if (locallyObservedIntent === "how_are_you" || locallyObservedIntent === "what_doing") {\n    return locallyObservedIntent;\n  }`,
  `  const locallyObserved = interpretSemanticEvent(message);\n  const locallyObservedIntent = localIntentFromEvent(locallyObserved);\n  const raw = message\n    .trim()\n    .toLocaleLowerCase("tr-TR")\n    .replace(/[!?.,…]+$/u, "")\n    .trim();\n  if (/^(?:naber|nasılsın)(?:\\s+(?:kank[a-zçğıöşü]*|kaira|kairo))?$/u.test(raw)) {\n    return "how_are_you";\n  }\n  if (/^ne\\s+yapıyorsun(?:\\s+(?:kank[a-zçğıöşü]*|kaira|kairo))?$/u.test(raw)) {\n    return "what_doing";\n  }\n  if (locallyObservedIntent === "how_are_you" || locallyObservedIntent === "what_doing") {\n    return locallyObservedIntent;\n  }`,
);

console.log('reciprocal vocative fix applied');

import { readFileSync, writeFileSync } from 'node:fs';

const serverPath = 'server.ts';
let server = readFileSync(serverPath, 'utf8');

server = server.replace(
`  hydrateLanguageMemory,\n  languageMemorySummary,\n  learnLanguageReply,\n} from "./src/services/kairoLanguageMemory";`,
`  hydrateLanguageMemory,\n  languageMemorySummary,\n  languageStyleMemoryInstruction,\n  languageStyleMemorySignal,\n  learnLanguageReply,\n} from "./src/services/kairoLanguageMemory";`,
);

server = server.replace(
`    const memoryMs = Math.round(now() - memoryStart),\n      requestState = normalizeDynamicState(dynamicState),`,
`    const memoryMs = Math.round(now() - memoryStart),\n      languageStyleMemory = languageStyleMemorySignal(stateUserId),\n      requestState = normalizeDynamicState(dynamicState),`,
);

server = server.replace(
`    const system = \`Sen \${character.name || "KAIRO"} adlı Droit'sun. \${speechIdentityPrompt(speech)}\\n\${socialStyle}`, 
`    const system = \`Sen \${character.name || "KAIRO"} adlı Droit'sun. \${speechIdentityPrompt(speech)}\\n\${languageStyleMemoryInstruction(stateUserId)}\\n\${socialStyle}`,
);

server = server.replace(
`          providerUsed: "local_language",\n          controlledSpontaneity:`,
`          providerUsed: "local_language",\n          languageStyleMemory,\n          controlledSpontaneity:`,
);
server = server.replace(
`        providerUsed: activeAiProviderUsed,\n        controlledSpontaneity:`,
`        providerUsed: activeAiProviderUsed,\n        languageStyleMemory,\n        controlledSpontaneity:`,
);
server = server.replace(
`            providerUsed: "local_language",\n            controlledSpontaneity:`,
`            providerUsed: "local_language",\n            languageStyleMemory,\n            controlledSpontaneity:`,
);
server = server.replace(
`          providerUsed: activeAiProviderUsed,\n          controlledSpontaneity:`,
`          providerUsed: activeAiProviderUsed,\n          languageStyleMemory,\n          controlledSpontaneity:`,
);

for (const needle of [
  'languageStyleMemoryInstruction,',
  'languageStyleMemory = languageStyleMemorySignal(stateUserId)',
  '${languageStyleMemoryInstruction(stateUserId)}',
  'providerUsed: activeAiProviderUsed,\n        languageStyleMemory,',
  'providerUsed: "local_language",\n          languageStyleMemory,',
]) {
  if (!server.includes(needle)) throw new Error(`server wiring missing: ${needle}`);
}
writeFileSync(serverPath, server);

const persistencePath = 'src/services/kdmPersistenceService.ts';
let persistence = readFileSync(persistencePath, 'utf8');
persistence = persistence.replace(
  'providerUsed?: string; controlledSpontaneity?: unknown;',
  'providerUsed?: string; languageStyleMemory?: unknown; controlledSpontaneity?: unknown;',
);
persistence = persistence.replace(
  '    timings?: Record<string, number>;\n    controlledSpontaneity?: unknown;',
  '    timings?: Record<string, number>;\n    languageStyleMemory?: unknown;\n    controlledSpontaneity?: unknown;',
);
if ((persistence.match(/languageStyleMemory\?: unknown/g) || []).length < 2) throw new Error('persistence metadata type wiring missing');
writeFileSync(persistencePath, persistence);

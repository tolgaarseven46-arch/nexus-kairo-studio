import { readFileSync, writeFileSync } from 'node:fs';

const path = 'server.ts';
let source = readFileSync(path, 'utf8');
source = source.replace(
  `import {\n  hydrateLanguageMemory,\n  languageMemorySummary,\n} from "./src/services/kairoLanguageMemory";`,
  `import {\n  hydrateLanguageMemory,\n  languageMemorySummary,\n  learnLanguageReply,\n} from "./src/services/kairoLanguageMemory";`,
);

if (!source.includes('learnLanguageReply(stateUserId, reply)')) {
  const aiMarker = '    const aiMs = Math.round(now() - aiStart);';
  const aiIndex = source.indexOf(aiMarker);
  if (aiIndex < 0) throw new Error('AI final marker not found');
  const consistencyIndex = source.indexOf('    const consistency = {', aiIndex);
  if (consistencyIndex < 0) throw new Error('AI consistency block not found');
  const blockEnd = source.indexOf('    };', consistencyIndex);
  if (blockEnd < 0) throw new Error('AI consistency block end not found');
  const insertion = blockEnd + '    };'.length;
  source = source.slice(0, insertion) + `\n    if (kairaPolicy.persistentUserMemory && consistency.accepted) {\n      learnLanguageReply(stateUserId, reply);\n    }` + source.slice(insertion);
}

writeFileSync(path, source);

import { readFileSync, writeFileSync } from 'node:fs';
const path = 'src/components/studio/tabs/TestLabTab.tsx';
let source = readFileSync(path, 'utf8');
source = source.replace(
  `  DroitPersonalityTraits,\n  DroitDynamicState,`,
  `  AffectiveReactionMode,\n  DroitPersonalityTraits,\n  DroitDynamicState,`,
);
source = source.replaceAll('reactionMode?: string;', 'reactionMode?: AffectiveReactionMode;');
writeFileSync(path, source);

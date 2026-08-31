import { readFileSync, writeFileSync } from 'node:fs';

const path = 'src/services/relationshipBehaviorService.ts';
let source = readFileSync(path, 'utf8');
const needle = `  let tone: BehaviorLayerProfile['tone'] = profile.tone;\n  if (severelyDamagedRelationship) tone = 'firm';\n  else if (damagedRelationship && (profile.tone === 'playful' || profile.tone === 'warm')) tone = 'calm';\n  else if (healingRelationship && profile.tone === 'playful') tone = 'warm';\n  else if (friendlyRelationship && profile.tone === 'formal') tone = 'confident';`;
const replacement = `  let tone: BehaviorLayerProfile['tone'] = profile.tone;\n  if (severelyDamagedRelationship || reactionMode === 'withdrawn') tone = 'firm';\n  else if (reactionMode === 'irritated' && (profile.tone === 'playful' || profile.tone === 'warm')) tone = 'firm';\n  else if (damagedRelationship && (profile.tone === 'playful' || profile.tone === 'warm')) tone = 'calm';\n  else if (reactionMode === 'hurt' && profile.tone === 'playful') tone = 'calm';\n  else if (reactionMode === 'repairing' && profile.tone === 'playful') tone = 'warm';\n  else if (healingRelationship && profile.tone === 'playful') tone = 'warm';\n  else if (friendlyRelationship && profile.tone === 'formal') tone = 'confident';`;
if (!source.includes("severelyDamagedRelationship || reactionMode === 'withdrawn'")) {
  if (!source.includes(needle)) throw new Error('tone block not found');
  source = source.replace(needle, replacement);
}
writeFileSync(path, source);

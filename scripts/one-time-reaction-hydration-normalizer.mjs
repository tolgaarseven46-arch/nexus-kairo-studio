import { readFileSync, writeFileSync } from 'node:fs';

const path = 'src/services/kdmPersistenceService.ts';
let source = readFileSync(path, 'utf8');

const stateNeedle = `lastStatus: typeof source.lastStatus === 'string' && source.lastStatus.trim() ? source.lastStatus : DEFAULT_DYNAMIC_STATE.lastStatus,\n    ...(source.lastEvent ? { lastEvent: source.lastEvent } : {}),`;
const stateReplacement = `lastStatus: typeof source.lastStatus === 'string' && source.lastStatus.trim() ? source.lastStatus : DEFAULT_DYNAMIC_STATE.lastStatus,\n    ...(source.reactionMode === 'neutral' || source.reactionMode === 'irritated' || source.reactionMode === 'hurt' || source.reactionMode === 'withdrawn' || source.reactionMode === 'repairing' ? { reactionMode: source.reactionMode } : {}),\n    ...(source.lastEvent ? { lastEvent: source.lastEvent } : {}),`;
if (!source.includes("source.reactionMode === 'irritated'")) {
  if (!source.includes(stateNeedle)) throw new Error('dynamic-state reaction insertion point not found');
  source = source.replace(stateNeedle, stateReplacement);
}

const relationshipNeedle = `repairProgress: numberOrDefault(relationship.repairProgress, 0), repeatedNegativeCount: numberOrDefault(relationship.repeatedNegativeCount, 0),\n      ...(typeof relationship.lastConflictAt === 'string' ? { lastConflictAt: relationship.lastConflictAt } : {}),`;
const relationshipReplacement = `repairProgress: numberOrDefault(relationship.repairProgress, 0), repeatedNegativeCount: numberOrDefault(relationship.repeatedNegativeCount, 0),\n      ...(relationship.conversationState === 'active' || relationship.conversationState === 'distancing' || relationship.conversationState === 'disengaged' || relationship.conversationState === 'repairing' ? { conversationState: relationship.conversationState } : {}),\n      ...(typeof relationship.disengagedAt === 'string' ? { disengagedAt: relationship.disengagedAt } : {}),\n      ...(typeof relationship.disengageReason === 'string' ? { disengageReason: relationship.disengageReason } : {}),\n      ...(typeof relationship.repairAttempts === 'number' && Number.isFinite(relationship.repairAttempts) ? { repairAttempts: Math.max(0, relationship.repairAttempts) } : {}),\n      ...(typeof relationship.lastConflictAt === 'string' ? { lastConflictAt: relationship.lastConflictAt } : {}),`;
if (!source.includes("relationship.conversationState === 'disengaged'")) {
  if (!source.includes(relationshipNeedle)) throw new Error('relationship lifecycle insertion point not found');
  source = source.replace(relationshipNeedle, relationshipReplacement);
}

writeFileSync(path, source);

export const FAST_RECENT_MEMORY_LIMIT = 6;
export const DEEP_RECALL_MEMORY_LIMIT = 40;

/**
 * Persistent-memory depth is a retrieval concern, not a semantic authority.
 * Normal turns stay on the small cached window; only the canonical grounded
 * recall move is allowed to scan a deeper persisted archive.
 */
export function persistentMemoryFetchLimitForDialogueMove(move: string): number {
  return move === 'grounded_recall'
    ? DEEP_RECALL_MEMORY_LIMIT
    : FAST_RECENT_MEMORY_LIMIT;
}

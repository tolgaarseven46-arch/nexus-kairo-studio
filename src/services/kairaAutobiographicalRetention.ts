import type { KairaAutobiographicalMemory } from "./kairaIdentityContracts";

export const MAX_LIVED_AUTOBIOGRAPHICAL_MEMORIES = 192;
export const RECENT_LIVED_MEMORY_RESERVE = 32;

const timestamp = (memory: KairaAutobiographicalMemory) => {
  const value = Date.parse(memory.occurredAt || "");
  return Number.isFinite(value) ? value : 0;
};

/**
 * Bounds only lived autobiography. Inherited identity memories are canonical
 * seed material and are never evicted by runtime churn.
 *
 * The newest reserve protects continuity while the remaining capacity keeps
 * the most salient older episodes. This avoids both blind FIFO forgetting and
 * permanent retention of every ordinary interaction.
 */
export function retainKairaAutobiographicalMemories(
  memories: KairaAutobiographicalMemory[],
  maxLived = MAX_LIVED_AUTOBIOGRAPHICAL_MEMORIES,
  recentReserve = RECENT_LIVED_MEMORY_RESERVE,
): KairaAutobiographicalMemory[] {
  const inherited = memories.filter((memory) => memory.origin !== "lived");
  const lived = memories.filter((memory) => memory.origin === "lived");
  const safeMax = Math.max(1, Math.round(maxLived));
  if (lived.length <= safeMax) return [...memories];

  const safeRecentReserve = Math.max(0, Math.min(safeMax, Math.round(recentReserve)));
  const newest = [...lived]
    .sort((a, b) => timestamp(b) - timestamp(a) || b.id.localeCompare(a.id))
    .slice(0, safeRecentReserve);
  const newestIds = new Set(newest.map((memory) => memory.id));

  const salientCapacity = safeMax - newest.length;
  const salientOlder = lived
    .filter((memory) => !newestIds.has(memory.id))
    .sort(
      (a, b) =>
        Number(b.salience || 0) - Number(a.salience || 0) ||
        timestamp(b) - timestamp(a) ||
        b.id.localeCompare(a.id),
    )
    .slice(0, salientCapacity);

  const retainedIds = new Set([...newest, ...salientOlder].map((memory) => memory.id));
  return memories.filter(
    (memory) => memory.origin !== "lived" || retainedIds.has(memory.id),
  );
}

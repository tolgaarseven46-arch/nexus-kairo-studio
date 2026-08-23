import { loadKdmState, loadRecentKdmMemory } from './kdmPersistenceService';

export async function loadKairoBrainSnapshot() {
  const [dynamicState, memory] = await Promise.all([
    loadKdmState().catch(() => null),
    loadRecentKdmMemory(8).catch(() => []),
  ]);
  return {
    dynamicState,
    memory,
    memoryCount: memory.length,
    updatedAt: new Date().toISOString(),
  };
}

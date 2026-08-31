from pathlib import Path

memory_path = Path('src/services/kairoLanguageMemory.ts')
memory = memory_path.read_text()
old_summary = '''export function languageMemorySummary(userId: string) {
  const profile = getLanguageMemory(userId);
  return {
    interactionCount: profile.interactionCount,
    persistent: hydrated.has(userId),
    favoriteWords: Object.entries(profile.wordWeights)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, weight]) => ({ word, weight: Number(weight.toFixed(2)) })),
    recentReplies: profile.recentReplies.slice(0, 5),
  };
}
'''
new_summary = '''export function languageMemorySummary(userId: string, useLearnedMemory = true) {
  const profile = useLearnedMemory ? getLanguageMemory(userId) : createProfile();
  return {
    interactionCount: profile.interactionCount,
    persistent: useLearnedMemory && hydrated.has(userId),
    favoriteWords: Object.entries(profile.wordWeights)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, weight]) => ({ word, weight: Number(weight.toFixed(2)) })),
    recentReplies: useLearnedMemory ? profile.recentReplies.slice(0, 5) : [],
  };
}
'''
if memory.count(old_summary) != 1:
    raise SystemExit('expected languageMemorySummary block not found exactly once')
memory_path.write_text(memory.replace(old_summary, new_summary, 1))

server_path = Path('server.ts')
server = server_path.read_text()
old_route = '''app.get("/api/kaira/language-memory", async (q, r) => {
  const userId = typeof q.query.userId === "string" ? q.query.userId : "test_user_x";
  const kairaInstanceId = typeof q.query.kairaInstanceId === "string" ? q.query.kairaInstanceId : undefined;
  const instance = resolveKairaInstanceContext({ instanceId: kairaInstanceId });
  const scopedUserId = stateOwnerScope(userId, instance.instanceId);
  await hydrateLanguageMemory(scopedUserId);
  r.json({ ok: true, userId, kairaInstanceId: instance.instanceId, ...languageMemorySummary(scopedUserId) });
});'''
new_route = '''app.get("/api/kaira/language-memory", async (q, r) => {
  const userId = typeof q.query.userId === "string" ? q.query.userId : "test_user_x";
  const kairaInstanceId = typeof q.query.kairaInstanceId === "string" ? q.query.kairaInstanceId : undefined;
  const instance = resolveKairaInstanceContext({ instanceId: kairaInstanceId });
  const policy = instancePolicy(instance.instanceType);
  const scopedUserId = stateOwnerScope(userId, instance.instanceId);
  if (policy.persistentUserMemory) await hydrateLanguageMemory(scopedUserId);
  r.json({
    ok: true,
    userId,
    kairaInstanceId: instance.instanceId,
    ...languageMemorySummary(scopedUserId, policy.persistentUserMemory),
  });
});'''
if server.count(old_route) != 1:
    raise SystemExit('expected language-memory debug route not found exactly once')
server_path.write_text(server.replace(old_route, new_route, 1))

const fs = require('fs');

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, content) { fs.writeFileSync(path, content); }
function replaceOnce(path, needle, replacement) {
  const source = read(path);
  if (!source.includes(needle)) throw new Error(`Target not found in ${path}: ${needle.slice(0, 160)}`);
  write(path, source.replace(needle, replacement));
}

// 1) Epistemic domain owns an explicit fail-closed decision for profile read outages.
replaceOnce(
  'src/services/kairaEpistemicGate.ts',
  '  source: "legacy_allow_all" | "species_canon" | "instance_knowledge" | "learned";',
  '  source: "legacy_allow_all" | "species_canon" | "instance_knowledge" | "learned" | "knowledge_profile_unavailable";',
);
replaceOnce(
  'src/services/kairaEpistemicGate.ts',
  'export function canKairaInterpretAsKnown(\n',
  'export function unavailableKairaKnowledgeDecision(): KairaEpistemicDecision {\n  return {\n    status: "unknown",\n    source: "knowledge_profile_unavailable",\n    confidence: 1,\n  };\n}\n\nexport function canKairaInterpretAsKnown(\n',
);

// 2) Persistence boundary returns a typed load state instead of forcing callers to collapse read failure into absence.
const storePath = 'src/services/kairaKnowledgeProfileStore.ts';
let store = read(storePath);
if (!store.includes('export type KairaKnowledgeProfileLoadResult')) {
  store += `\nexport type KairaKnowledgeProfileLoadResult =\n  | { status: "loaded"; profile: KairaKnowledgeProfile }\n  | { status: "missing"; profile: null }\n  | { status: "unavailable"; profile: null };\n\nexport async function loadKairaKnowledgeProfileResult(\n  kairaInstanceId: string,\n): Promise<KairaKnowledgeProfileLoadResult> {\n  try {\n    const profile = await loadKairaKnowledgeProfile(kairaInstanceId);\n    return profile\n      ? { status: "loaded", profile }\n      : { status: "missing", profile: null };\n  } catch {\n    return { status: "unavailable", profile: null };\n  }\n}\n`;
  write(storePath, store);
}

// 3) Runtime distinguishes profile absence from infrastructure failure and fails closed only for the latter.
replaceOnce(
  'server.ts',
  'import { loadKairaKnowledgeProfile } from "./src/services/kairaKnowledgeProfileStore";',
  'import { loadKairaKnowledgeProfileResult } from "./src/services/kairaKnowledgeProfileStore";',
);
replaceOnce(
  'server.ts',
  'import { evaluateKairaKnowledge } from "./src/services/kairaEpistemicGate";',
  'import { evaluateKairaKnowledge, unavailableKairaKnowledgeDecision } from "./src/services/kairaEpistemicGate";',
);
replaceOnce(
  'server.ts',
  `    const knowledgeProfile =\n      knowledgeQuery && kairaPolicy.persistentIdentity\n        ? await loadKairaKnowledgeProfile(kairaInstance.instanceId).catch(() => null)\n        : null;\n    const epistemicAccess = knowledgeQuery\n      ? {\n          query: {\n            kairaInstanceId: kairaInstance.instanceId,\n            ...(knowledgeQuery.conceptId ? { conceptId: knowledgeQuery.conceptId } : {}),\n            surface: knowledgeQuery.surface,\n          },\n          decision: evaluateKairaKnowledge(\n            {\n              kairaInstanceId: kairaInstance.instanceId,\n              ...(knowledgeQuery.conceptId ? { conceptId: knowledgeQuery.conceptId } : {}),\n              surface: knowledgeQuery.surface,\n            },\n            knowledgeProfile,\n          ),\n        }\n      : null;`,
  `    const knowledgeProfileLoad =\n      knowledgeQuery && kairaPolicy.persistentIdentity\n        ? await loadKairaKnowledgeProfileResult(kairaInstance.instanceId)\n        : null;\n    const knowledgeProfile =\n      knowledgeProfileLoad?.status === "loaded" ? knowledgeProfileLoad.profile : null;\n    const epistemicAccess = knowledgeQuery\n      ? {\n          query: {\n            kairaInstanceId: kairaInstance.instanceId,\n            ...(knowledgeQuery.conceptId ? { conceptId: knowledgeQuery.conceptId } : {}),\n            surface: knowledgeQuery.surface,\n          },\n          decision:\n            knowledgeProfileLoad?.status === "unavailable"\n              ? unavailableKairaKnowledgeDecision()\n              : evaluateKairaKnowledge(\n                  {\n                    kairaInstanceId: kairaInstance.instanceId,\n                    ...(knowledgeQuery.conceptId ? { conceptId: knowledgeQuery.conceptId } : {}),\n                    surface: knowledgeQuery.surface,\n                  },\n                  knowledgeProfile,\n                ),\n        }\n      : null;`,
);

// 4) Runtime contract locks the typed loader, fail-closed outage handling and final authority ordering.
const runtimeTestPath = 'src/services/kairaEpistemicRuntimeContracts.test.ts';
let runtimeTest = read(runtimeTestPath);
runtimeTest = runtimeTest.replace(
  "expect(server).toContain('loadKairaKnowledgeProfile(kairaInstance.instanceId)');",
  "expect(server).toContain('loadKairaKnowledgeProfileResult(kairaInstance.instanceId)');",
);
const runtimeNeedle = '  it("does not read Firestore knowledge profiles for ordinary non-knowledge turns", () => {';
if (!runtimeTest.includes('fails closed when the instance knowledge profile cannot be read')) {
  if (!runtimeTest.includes(runtimeNeedle)) throw new Error('Runtime contract insertion point not found');
  runtimeTest = runtimeTest.replace(
    runtimeNeedle,
    `  it("fails closed when the instance knowledge profile cannot be read", () => {\n    const server = readFileSync("server.ts", "utf8");\n    expect(server).toContain('await loadKairaKnowledgeProfileResult(kairaInstance.instanceId)');\n    expect(server).toContain('knowledgeProfileLoad?.status === "unavailable"');\n    expect(server).toContain('unavailableKairaKnowledgeDecision()');\n    expect(server).not.toContain('loadKairaKnowledgeProfile(kairaInstance.instanceId).catch(() => null)');\n  });\n\n${runtimeNeedle}`,
  );
}
write(runtimeTestPath, runtimeTest);

// 5) Store regression proves typed distinction between a genuinely missing profile and a read outage.
const storeTestPath = 'src/services/kairaKnowledgeProfileStore.test.ts';
let storeTest = read(storeTestPath);
storeTest = storeTest.replace(
  '  loadKairaKnowledgeProfile,\n  saveKairaKnowledgeProfile,',
  '  loadKairaKnowledgeProfile,\n  loadKairaKnowledgeProfileResult,\n  saveKairaKnowledgeProfile,',
);
if (!storeTest.includes('distinguishes a missing profile from an unavailable profile store')) {
  const closing = storeTest.lastIndexOf('\n});\n');
  if (closing < 0) throw new Error('Store contract describe closing not found');
  const test = `\n  it("distinguishes a missing profile from an unavailable profile store", async () => {\n    firestore.getDoc.mockResolvedValueOnce({ exists: () => false });\n    await expect(loadKairaKnowledgeProfileResult("kaira_individual_01")).resolves.toEqual({\n      status: "missing",\n      profile: null,\n    });\n\n    firestore.getDoc.mockRejectedValueOnce(new Error("firestore unavailable"));\n    await expect(loadKairaKnowledgeProfileResult("kaira_individual_01")).resolves.toEqual({\n      status: "unavailable",\n      profile: null,\n    });\n  });\n`;
  storeTest = storeTest.slice(0, closing) + test + storeTest.slice(closing);
}
write(storeTestPath, storeTest);

const fs = require('fs');

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, content) { fs.writeFileSync(path, content); }
function replaceOnce(path, needle, replacement) {
  const source = read(path);
  if (!source.includes(needle)) throw new Error(`Target not found in ${path}: ${needle.slice(0, 120)}`);
  write(path, source.replace(needle, replacement));
}

// 1) Canonical SemanticEvent owns explicit knowledge-query targeting.
replaceOnce(
  'src/services/semanticEventEngine.ts',
  `export type SemanticRepairSignal =\n  | "none"\n  | "clarification_request"\n  | "relevance_challenge";\nexport type SemanticIntent =`,
  `export type SemanticRepairSignal =\n  | "none"\n  | "clarification_request"\n  | "relevance_challenge";\nexport interface SemanticKnowledgeQuery {\n  surface: string;\n  conceptId?: string;\n  confidence: number;\n}\nexport type SemanticIntent =`,
);
replaceOnce(
  'src/services/semanticEventEngine.ts',
  `  adviceRequested?: boolean;\n  valence: SemanticValence;`,
  `  adviceRequested?: boolean;\n  knowledgeQuery?: SemanticKnowledgeQuery | null;\n  valence: SemanticValence;`,
);

// 2) Trust boundary validates optional provider knowledge query; fallback may omit it.
replaceOnce(
  'src/services/semanticEventAuthority.ts',
  `const finite01 = (value: unknown) =>\n  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;`,
  `const finite01 = (value: unknown) =>\n  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;\n\nconst validKnowledgeQuery = (value: unknown) => {\n  if (value === undefined || value === null) return true;\n  if (!value || typeof value !== "object") return false;\n  const query = value as Record<string, unknown>;\n  return (\n    typeof query.surface === "string" &&\n    query.surface.trim().length > 0 &&\n    query.surface.trim().length <= 96 &&\n    (query.conceptId === undefined ||\n      (typeof query.conceptId === "string" && query.conceptId.trim().length > 0 && query.conceptId.trim().length <= 96)) &&\n    finite01(query.confidence)\n  );\n};`,
);
replaceOnce(
  'src/services/semanticEventAuthority.ts',
  `    (event.adviceRequested === undefined || typeof event.adviceRequested === "boolean") &&\n    VALENCES.has(event.valence as SemanticValence) &&`,
  `    (event.adviceRequested === undefined || typeof event.adviceRequested === "boolean") &&\n    validKnowledgeQuery(event.knowledgeQuery) &&\n    VALENCES.has(event.valence as SemanticValence) &&`,
);

// 3) Canonicalizer is the only place that normalizes the provider query.
replaceOnce(
  'src/services/semanticEventCanonicalizer.ts',
  `  const socialRoutine =\n    deterministicReciprocal &&\n    (providerRoutine === "none" || providerRoutine === "greeting")\n      ? deterministicRoutine\n      : event.socialRoutine ?? deterministicRoutine;\n\n  return {`,
  `  const socialRoutine =\n    deterministicReciprocal &&\n    (providerRoutine === "none" || providerRoutine === "greeting")\n      ? deterministicRoutine\n      : event.socialRoutine ?? deterministicRoutine;\n  const knowledgeQuery = event.knowledgeQuery\n    ? {\n        surface: event.knowledgeQuery.surface.trim().replace(/\\s+/g, " ").slice(0, 96),\n        ...(event.knowledgeQuery.conceptId\n          ? { conceptId: event.knowledgeQuery.conceptId.trim().replace(/\\s+/g, " ").slice(0, 96) }\n          : {}),\n        confidence: Math.max(0, Math.min(1, event.knowledgeQuery.confidence)),\n      }\n    : null;\n\n  return {`,
);
replaceOnce(
  'src/services/semanticEventCanonicalizer.ts',
  `    adviceRequested: event.adviceRequested ?? fallback.adviceRequested ?? false,\n  };`,
  `    adviceRequested: event.adviceRequested ?? fallback.adviceRequested ?? false,\n    knowledgeQuery,\n  };`,
);

// 4) Structured LLM parser may identify the queried concept, but never answer it.
replaceOnce(
  'src/services/llmSemanticUnderstandingProvider.ts',
  `  adviceRequested: false,\n  valence: "neutral",`,
  `  adviceRequested: false,\n  knowledgeQuery: null,\n  valence: "neutral",`,
);
replaceOnce(
  'src/services/llmSemanticUnderstandingProvider.ts',
  `adviceRequested = boolean; kullanıcı açıkça ne yapması gerektiğini/tavsiye/öneri soruyorsa true\nvalence = positive | negative | neutral`,
  `adviceRequested = boolean; kullanıcı açıkça ne yapması gerektiğini/tavsiye/öneri soruyorsa true\nknowledgeQuery = null veya {"surface":"kavram","confidence":0-1}; yalnız kullanıcı belirli bir kavram/konu hakkında bilgi, açıklama veya "biliyor musun" türü bilgi erişimi soruyorsa doldur. surface yalnız sorgulanan kısa kavram/konu olsun; cevabı, tanımı veya tahmini buraya yazma. Emin değilsen null bırak.\nvalence = positive | negative | neutral`,
);

// 5) Observability payload types expose the read-only epistemic decision.
replaceOnce(
  'src/services/kdmPersistenceService.ts',
  `worldMemoryGuard?: unknown; responsePlan?: unknown; createdAt?: string; }`,
  `worldMemoryGuard?: unknown; epistemicAccess?: unknown; responsePlan?: unknown; createdAt?: string; }`,
);
replaceOnce(
  'src/services/kdmPersistenceService.ts',
  `    worldMemoryGuard?: unknown;\n    responsePlan?: unknown;`,
  `    worldMemoryGuard?: unknown;\n    epistemicAccess?: unknown;\n    responsePlan?: unknown;`,
);

// 6) Client exposes server epistemic observability without owning the decision.
replaceOnce(
  'src/services/droitChatService.ts',
  `  worldMemoryGuard?: unknown;\n  responsePlan?: unknown;`,
  `  worldMemoryGuard?: unknown;\n  epistemicAccess?: unknown;\n  responsePlan?: unknown;`,
);
replaceOnce(
  'src/services/droitChatService.ts',
  `worldMemoryGuard: data.kdm?.worldMemoryGuard, responsePlan: data.kdm?.responsePlan,`,
  `worldMemoryGuard: data.kdm?.worldMemoryGuard, epistemicAccess: data.kdm?.epistemicAccess, responsePlan: data.kdm?.responsePlan,`,
);

// 7) Server wires instance-owned profile -> gate -> prompt/guard/observability.
replaceOnce(
  'server.ts',
  `import { buildKairaRuntimeIdentityInstruction } from "./src/services/kairaRuntimeIdentity";`,
  `import { buildKairaRuntimeIdentityInstruction } from "./src/services/kairaRuntimeIdentity";\nimport { loadKairaKnowledgeProfile } from "./src/services/kairaKnowledgeProfileStore";\nimport { evaluateKairaKnowledge } from "./src/services/kairaEpistemicGate";\nimport {\n  buildKairaEpistemicInstruction,\n  enforceKairaEpistemicResponse,\n} from "./src/services/kairaEpistemicResponsePolicy";`,
);
replaceOnce(
  'server.ts',
  `    const canonicalSemantic = {\n      event: languageUnderstanding.event,\n      source: languageUnderstanding.semanticSource,\n    };\n    const dialogueAnalysis =`,
  `    const canonicalSemantic = {\n      event: languageUnderstanding.event,\n      source: languageUnderstanding.semanticSource,\n    };\n    const knowledgeQuery =\n      canonicalSemantic.event.knowledgeQuery && canonicalSemantic.event.knowledgeQuery.confidence >= 0.72\n        ? canonicalSemantic.event.knowledgeQuery\n        : null;\n    const knowledgeProfile =\n      knowledgeQuery && kairaPolicy.persistentIdentity\n        ? await loadKairaKnowledgeProfile(kairaInstance.instanceId).catch(() => null)\n        : null;\n    const epistemicAccess = knowledgeQuery\n      ? {\n          query: {\n            kairaInstanceId: kairaInstance.instanceId,\n            ...(knowledgeQuery.conceptId ? { conceptId: knowledgeQuery.conceptId } : {}),\n            surface: knowledgeQuery.surface,\n          },\n          decision: evaluateKairaKnowledge(\n            {\n              kairaInstanceId: kairaInstance.instanceId,\n              ...(knowledgeQuery.conceptId ? { conceptId: knowledgeQuery.conceptId } : {}),\n              surface: knowledgeQuery.surface,\n            },\n            knowledgeProfile,\n          ),\n        }\n      : null;\n    const epistemicInstruction = buildKairaEpistemicInstruction(epistemicAccess);\n    const dialogueAnalysis =`,
);
replaceOnce(
  'server.ts',
  `${'${worldReasoningPolicyInstruction}'}\\n${'${dialogueInstruction}'}`,
  `${'${worldReasoningPolicyInstruction}'}\\n${'${epistemicInstruction}'}\\n${'${dialogueInstruction}'}`,
);

// Local path: epistemic truth guard is below world truth but above social behavior authority.
replaceOnce(
  'server.ts',
  `      const worldMemoryGuard = enforceWorldModelRecallResponse(local.reply, retrievedWorldEvents),\n        baseEnforced = enforceKairoResponse(worldMemoryGuard.reply, kdm.trace, enforcementRules),`,
  `      const worldMemoryGuard = enforceWorldModelRecallResponse(local.reply, retrievedWorldEvents),\n        epistemicGuard = enforceKairaEpistemicResponse(worldMemoryGuard.reply, epistemicAccess),\n        baseEnforced = enforceKairoResponse(epistemicGuard.reply, kdm.trace, enforcementRules),`,
);
replaceOnce(
  'server.ts',
  `          changed: worldMemoryGuard.changed || baseEnforced.changed || contractEnforced.changed,\n          reasons: [\n            ...baseEnforced.reasons,\n            ...contractEnforced.reasons,\n            ...(worldMemoryGuard.reason ? [worldMemoryGuard.reason] : []),`,
  `          changed: worldMemoryGuard.changed || epistemicGuard.changed || baseEnforced.changed || contractEnforced.changed,\n          reasons: [\n            ...baseEnforced.reasons,\n            ...contractEnforced.reasons,\n            ...(worldMemoryGuard.reason ? [worldMemoryGuard.reason] : []),\n            ...(epistemicGuard.reason ? [epistemicGuard.reason] : []),`,
);

// AI path: deterministic epistemic guard runs after world-memory truth guard and before behavior enforcement.
replaceOnce(
  'server.ts',
  `    const baseEnforced = enforceKairoResponse(reply, kdm.trace, enforcementRules);\n    const contractEnforced = enforceBehaviorContract(baseEnforced.reply, kdm.trace, behaviorContract);`,
  `    const epistemicGuard = enforceKairaEpistemicResponse(reply, epistemicAccess);\n    reply = epistemicGuard.reply;\n    const baseEnforced = enforceKairoResponse(reply, kdm.trace, enforcementRules);\n    const contractEnforced = enforceBehaviorContract(baseEnforced.reply, kdm.trace, behaviorContract);`,
);
replaceOnce(
  'server.ts',
  `      changed: worldMemoryGuard.changed || baseEnforced.changed || contractEnforced.changed,\n      reasons: [\n        ...baseEnforced.reasons,\n        ...contractEnforced.reasons,\n        ...(worldMemoryGuard.reason ? [worldMemoryGuard.reason] : []),`,
  `      changed: worldMemoryGuard.changed || epistemicGuard.changed || baseEnforced.changed || contractEnforced.changed,\n      reasons: [\n        ...baseEnforced.reasons,\n        ...contractEnforced.reasons,\n        ...(worldMemoryGuard.reason ? [worldMemoryGuard.reason] : []),\n        ...(epistemicGuard.reason ? [epistemicGuard.reason] : []),`,
);

// Observability: add to both KNT paths, test metadata paths and response payloads.
let server = read('server.ts');
server = server.replaceAll(
  `          worldMemoryGuard,\n          responsePlan,`,
  `          worldMemoryGuard,\n          epistemicAccess,\n          responsePlan,`,
);
server = server.replaceAll(
  `        worldMemoryGuard,\n        responsePlan,`,
  `        worldMemoryGuard,\n        epistemicAccess,\n        responsePlan,`,
);
server = server.replaceAll(
  `worldStateAppraisal, worldReasoningPolicy, worldMemoryGuard, behaviorContract`,
  `worldStateAppraisal, worldReasoningPolicy, worldMemoryGuard, epistemicAccess, behaviorContract`,
);
write('server.ts', server);

// 8) Contract-level runtime regression.
write('src/services/kairaEpistemicRuntimeContracts.test.ts', `import { describe, expect, it } from "vitest";\nimport { readFileSync } from "node:fs";\nimport { createLlmSemanticUnderstandingProvider } from "./llmSemanticUnderstandingProvider";\nimport { understandTurkishMessage } from "./languageUnderstandingService";\n\ndescribe("Kaira epistemic runtime contracts", () => {\n  it("lets the canonical semantic provider identify a knowledge query without answering it", async () => {\n    const semanticProvider = createLlmSemanticUnderstandingProvider({\n      generate: async () => JSON.stringify({\n        raw: "opera nedir", normalized: "opera nedir", intent: "information_request", socialRoutine: "none", discourseAct: "none", repairSignal: "none", adviceRequested: false,\n        knowledgeQuery: { surface: "opera", confidence: 0.96 }, valence: "neutral", target: "unknown", relationalAct: "none", relationalIntensity: 0, severity: 0, insult: false, redLine: false, disrespect: 0, coercion: 0, manipulation: 0, privacyViolation: 0, apology: false, repairAttempt: false, stopQuestions: false, stopTalking: false, frustration: 0, emotionalLoad: 0, affection: 0, support: 0, compliment: 0,\n      }),\n    });\n    const result = await understandTurkishMessage("opera nedir", { semanticProvider });\n    expect(result.event.knowledgeQuery).toEqual({ surface: "opera", confidence: 0.96 });\n  });\n\n  it("does not invent a knowledge query in deterministic fallback", async () => {\n    const result = await understandTurkishMessage("naber kaira");\n    expect(result.event.knowledgeQuery ?? null).toBeNull();\n  });\n\n  it("wires instance-owned knowledge through the epistemic gate before behavior enforcement", () => {\n    const server = readFileSync("server.ts", "utf8");\n    expect(server).toContain('loadKairaKnowledgeProfile(kairaInstance.instanceId)');\n    expect(server).toContain('evaluateKairaKnowledge(');\n    expect(server).toContain('buildKairaEpistemicInstruction(epistemicAccess)');\n    expect(server).toContain('enforceKairaEpistemicResponse(worldMemoryGuard.reply, epistemicAccess)');\n    expect(server.indexOf('const epistemicGuard = enforceKairaEpistemicResponse(reply, epistemicAccess)')).toBeLessThan(server.indexOf('const baseEnforced = enforceKairoResponse(reply, kdm.trace, enforcementRules)'));\n    expect(server).toContain('epistemicAccess, behaviorContract');\n  });\n\n  it("does not read Firestore knowledge profiles for ordinary non-knowledge turns", () => {\n    const server = readFileSync("server.ts", "utf8");\n    expect(server).toMatch(/knowledgeQuery && kairaPolicy\\.persistentIdentity[\\s\\S]*loadKairaKnowledgeProfile/);\n  });\n});\n`);

// 9) Keep focused architecture suite aware of the new runtime contract.
const packagePath = 'package.json';
const pkg = JSON.parse(read(packagePath));
for (const test of [
  'src/services/kairaEpistemicGateContracts.test.ts',
  'src/services/kairaEpistemicRuntimeContracts.test.ts',
]) {
  if (!pkg.scripts['test:contracts'].includes(test)) pkg.scripts['test:contracts'] += ` ${test}`;
}
write(packagePath, JSON.stringify(pkg, null, 2) + '\n');

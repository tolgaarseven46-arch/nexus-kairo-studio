import fs from "node:fs";

const serverPath = "server.ts";
const persistencePath = "src/services/kdmPersistenceService.ts";
let server = fs.readFileSync(serverPath, "utf8");
let persistence = fs.readFileSync(persistencePath, "utf8");

const metadataTypeAnchor = "    worldEvent?: unknown;\n  };\n}";
const metadataTypePatched = "    worldEvent?: unknown;\n    retrievedWorldEvents?: unknown;\n  };\n}";
if (!persistence.includes(metadataTypePatched)) {
  if (!persistence.includes(metadataTypeAnchor)) throw new Error("metadata worldEvent type anchor not found");
  persistence = persistence.replace(metadataTypeAnchor, metadataTypePatched);
}

if (!persistence.includes("retrievedWorldEvents: payload.metadata?.retrievedWorldEvents")) {
  const anchor = "      worldEvent: payload.metadata?.worldEvent,\n";
  if (!persistence.includes(anchor)) throw new Error("turn metadata worldEvent anchor not found");
  persistence = persistence.replace(anchor, `${anchor}      retrievedWorldEvents: payload.metadata?.retrievedWorldEvents,\n`);
}

const auditValue = "retrievedWorldEvents: retrievedWorldEvents.map((item) => ({ id: item.observation.id, score: item.score, reasons: item.reasons, kind: item.observation.kind, status: item.observation.status, event: item.observation.event })),";

// Local/YDM save path.
if (!server.includes(`            ${auditValue}`)) {
  server = server.replaceAll(
    "            worldEvent: languageUnderstanding.worldEvent,\n            timings:",
    `            worldEvent: languageUnderstanding.worldEvent,\n            ${auditValue}\n            timings:`,
  );
}

// AI (OpenRouter/Gemini) saveTestSessionTurn path. This was the missing audit path.
const aiMetadataAnchor = `        metadata: {\n          providerUsed: activeAiProviderUsed,\n          speechIdentity: speech,\n          entityResolution: languageUnderstanding.entityResolution,\n          timings:`;
const aiMetadataPatched = `        metadata: {\n          providerUsed: activeAiProviderUsed,\n          speechIdentity: speech,\n          entityResolution: languageUnderstanding.entityResolution,\n          worldEvent: languageUnderstanding.worldEvent,\n          ${auditValue}\n          timings:`;
if (!server.includes(aiMetadataPatched)) {
  if (!server.includes(aiMetadataAnchor)) throw new Error("AI test-turn metadata anchor not found");
  server = server.replace(aiMetadataAnchor, aiMetadataPatched);
}

// Also expose retrieval in the normal AI response debug payload.
const aiResponseAnchor = "entityResolution: languageUnderstanding.entityResolution, worldEvent: languageUnderstanding.worldEvent, behaviorContract";
const aiResponsePatched = "entityResolution: languageUnderstanding.entityResolution, worldEvent: languageUnderstanding.worldEvent, retrievedWorldEvents: retrievedWorldEvents.map((item) => ({ id: item.observation.id, score: item.score, reasons: item.reasons, kind: item.observation.kind, status: item.observation.status, event: item.observation.event })), behaviorContract";
if (!server.includes(aiResponsePatched)) {
  if (!server.includes(aiResponseAnchor)) throw new Error("AI response worldEvent anchor not found");
  server = server.replace(aiResponseAnchor, aiResponsePatched);
}

fs.writeFileSync(serverPath, server);
fs.writeFileSync(persistencePath, persistence);
console.log("world event retrieval audit connected to local and AI KNT metadata");

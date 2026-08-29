import fs from "node:fs";

const serverPath = "server.ts";
const persistencePath = "src/services/kdmPersistenceService.ts";
let server = fs.readFileSync(serverPath, "utf8");
let persistence = fs.readFileSync(persistencePath, "utf8");

if (!persistence.includes("retrievedWorldEvents?: unknown")) {
  const anchor = "    worldEvent?: unknown;\n";
  if (!persistence.includes(anchor)) throw new Error("metadata worldEvent anchor not found");
  persistence = persistence.replace(anchor, `${anchor}    retrievedWorldEvents?: unknown;\n`);
}

if (!persistence.includes("retrievedWorldEvents: payload.metadata?.retrievedWorldEvents")) {
  const anchor = "      worldEvent: payload.metadata?.worldEvent,\n";
  if (!persistence.includes(anchor)) throw new Error("turn metadata worldEvent anchor not found");
  persistence = persistence.replace(anchor, `${anchor}      retrievedWorldEvents: payload.metadata?.retrievedWorldEvents,\n`);
}

const auditValue = "retrievedWorldEvents: retrievedWorldEvents.map((item) => ({ id: item.observation.id, score: item.score, reasons: item.reasons, kind: item.observation.kind, status: item.observation.status, event: item.observation.event })),";
if (!server.includes(auditValue)) {
  server = server.replaceAll(
    "            worldEvent: languageUnderstanding.worldEvent,\n            timings:",
    `            worldEvent: languageUnderstanding.worldEvent,\n            ${auditValue}\n            timings:`,
  );
}

fs.writeFileSync(serverPath, server);
fs.writeFileSync(persistencePath, persistence);
console.log("world event retrieval audit connected to KNT metadata");

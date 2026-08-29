import fs from "node:fs";

const persistencePath = "src/services/kdmPersistenceService.ts";
let persistence = fs.readFileSync(persistencePath, "utf8");

if (!persistence.includes("entityResolution?: unknown;")) {
  const anchor = `    speechIdentity?: unknown;\n  };\n}`;
  const replacement = `    speechIdentity?: unknown;\n    entityResolution?: unknown;\n  };\n}`;
  if (!persistence.includes(anchor)) throw new Error("SaveTestSessionTurnPayload metadata anchor not found");
  persistence = persistence.replace(anchor, replacement);
}

if (!persistence.includes("entityResolution: payload.metadata?.entityResolution")) {
  const anchor = `      speechIdentity: payload.metadata?.speechIdentity,\n    },`;
  const replacement = `      speechIdentity: payload.metadata?.speechIdentity,\n      entityResolution: payload.metadata?.entityResolution,\n    },`;
  if (!persistence.includes(anchor)) throw new Error("turnRecord metadata anchor not found");
  persistence = persistence.replace(anchor, replacement);
}

fs.writeFileSync(persistencePath, persistence);

const serverPath = "server.ts";
let server = fs.readFileSync(serverPath, "utf8");

// Add entityResolution to both local-language and AI test-session metadata blocks.
server = server.replaceAll(
  `            speechIdentity: speech,\n            timings:`,
  `            speechIdentity: speech,\n            entityResolution: languageUnderstanding.entityResolution,\n            timings:`,
);
server = server.replaceAll(
  `          speechIdentity: speech,\n          timings:`,
  `          speechIdentity: speech,\n          entityResolution: languageUnderstanding.entityResolution,\n          timings:`,
);

fs.writeFileSync(serverPath, server);
console.log("entity resolution persistence connected to KNT test sessions");

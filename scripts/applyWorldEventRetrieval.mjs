import fs from "node:fs";

const path = "server.ts";
let source = fs.readFileSync(path, "utf8");

if (!source.includes('from "./src/services/worldEventRetrieval"')) {
  const anchor = 'import { saveWorldEventObservation } from "./src/services/worldModelEventStore";\n';
  const replacement = 'import { saveWorldEventObservation, loadRecentWorldEventObservations } from "./src/services/worldModelEventStore";\nimport { buildWorldEventMemoryInstruction, rankWorldEventObservations, shouldRetrieveWorldEvents } from "./src/services/worldEventRetrieval";\n';
  if (!source.includes(anchor)) throw new Error("world model store import anchor not found");
  source = source.replace(anchor, replacement);
}

if (!source.includes("const retrievedWorldEvents = shouldRetrieveWorldEvents")) {
  const anchor = "    const cleanHistory = sanitizeKairoChatHistory(history);\n";
  const insert = `${anchor}    const retrievedWorldEvents = shouldRetrieveWorldEvents(userMessage)\n      ? rankWorldEventObservations(\n          userMessage,\n          await loadRecentWorldEventObservations(userId, 30).catch(() => []),\n          5,\n        )\n      : [];\n    const worldEventMemoryInstruction = buildWorldEventMemoryInstruction(retrievedWorldEvents);\n`;
  if (!source.includes(anchor)) throw new Error("cleanHistory anchor not found");
  source = source.replace(anchor, insert);
}

if (!source.includes("${worldEventMemoryInstruction}\\n${dialogueInstruction}")) {
  const withWorldEvent = "${worldEventInstruction}\\n${dialogueInstruction}";
  const withoutWorldEvent = "${entityGroundingInstruction}\\n${dialogueInstruction}";
  if (source.includes(withWorldEvent)) {
    source = source.replace(withWorldEvent, "${worldEventInstruction}\\n${worldEventMemoryInstruction}\\n${dialogueInstruction}");
  } else if (source.includes(withoutWorldEvent)) {
    source = source.replace(withoutWorldEvent, "${entityGroundingInstruction}\\n${worldEventMemoryInstruction}\\n${dialogueInstruction}");
  } else {
    throw new Error("system prompt world memory anchor not found");
  }
}

source = source.replace(
  "worldEvent: languageUnderstanding.worldEvent, behaviorContract",
  "worldEvent: languageUnderstanding.worldEvent, retrievedWorldEvents: retrievedWorldEvents.map((item) => ({ id: item.observation.id, score: item.score, kind: item.observation.kind, status: item.observation.status, event: item.observation.event })), behaviorContract",
);

fs.writeFileSync(path, source);
console.log("world event retrieval connected to response generation");

import fs from "node:fs";

const path = "server.ts";
let source = fs.readFileSync(path, "utf8");

const importLine = 'import { saveWorldEventObservation } from "./src/services/worldModelEventStore";\n';
if (!source.includes(importLine.trim())) {
  const anchor = 'import { recordKdmMetric } from "./src/services/kdmMetricsService";\n';
  if (!source.includes(anchor)) throw new Error("world event store import anchor not found");
  source = source.replace(anchor, `${anchor}${importLine}`);
}

const saveBlock = `        saveWorldEventObservation({\n          userId,\n          sessionId,\n          speakerName: userName,\n          event: languageUnderstanding.worldEvent,\n        }),\n`;

if (!source.includes("saveWorldEventObservation({")) {
  const localAnchor = `      await Promise.allSettled([\n        saveKdmInteraction({`;
  if (!source.includes(localAnchor)) throw new Error("local persistence anchor not found");
  source = source.replace(localAnchor, `      await Promise.allSettled([\n${saveBlock}        saveKdmInteraction({`);

  const aiAnchor = `    await Promise.allSettled([\n      saveKdmInteraction({`;
  if (!source.includes(aiAnchor)) throw new Error("ai persistence anchor not found");
  source = source.replace(aiAnchor, `    await Promise.allSettled([\n${saveBlock.replace(/^ {8}/gm, "      ")}      saveKdmInteraction({`);
}

fs.writeFileSync(path, source);
console.log("world model event store connected to chat persistence");

import fs from "node:fs";

const path = "server.ts";
let text = fs.readFileSync(path, "utf8");

const metadataNeedle = '            retrievedWorldEvents: retrievedWorldEvents.map((item) => ({ id: item.observation.id, score: item.score, reasons: item.reasons, kind: item.observation.kind, status: item.observation.status, event: item.observation.event })),\n            timings:';
const metadataReplacement = '            retrievedWorldEvents: retrievedWorldEvents.map((item) => ({ id: item.observation.id, score: item.score, reasons: item.reasons, kind: item.observation.kind, status: item.observation.status, event: item.observation.event })),\n            worldStateAppraisal,\n            worldReasoningPolicy,\n            timings:';

const metadataCount = text.split(metadataNeedle).length - 1;
if (metadataCount !== 2) {
  throw new Error(`Expected 2 session metadata seams, found ${metadataCount}`);
}
text = text.split(metadataNeedle).join(metadataReplacement);

const kdmNeedle = 'retrievedWorldEvents: retrievedWorldEvents.map((item) => ({ id: item.observation.id, score: item.score, kind: item.observation.kind, status: item.observation.status, event: item.observation.event })), behaviorContract,';
const kdmReplacement = 'retrievedWorldEvents: retrievedWorldEvents.map((item) => ({ id: item.observation.id, score: item.score, kind: item.observation.kind, status: item.observation.status, event: item.observation.event })), worldStateAppraisal, worldReasoningPolicy, behaviorContract,';

const kdmCount = text.split(kdmNeedle).length - 1;
if (kdmCount !== 2) {
  throw new Error(`Expected 2 response KDM seams, found ${kdmCount}`);
}
text = text.split(kdmNeedle).join(kdmReplacement);

fs.writeFileSync(path, text);
console.log("world reasoning appraisal/policy diagnostics exposed on both local and AI paths");

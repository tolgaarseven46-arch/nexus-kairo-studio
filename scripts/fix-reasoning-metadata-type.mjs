import fs from "node:fs";

const path = "src/services/kdmPersistenceService.ts";
let text = fs.readFileSync(path, "utf8");
const before = "    worldEvent?: unknown;\n    retrievedWorldEvents?: unknown;\n";
const after = "    worldEvent?: unknown;\n    retrievedWorldEvents?: unknown;\n    worldStateAppraisal?: unknown;\n    worldReasoningPolicy?: unknown;\n";
const count = text.split(before).length - 1;
if (count !== 1) throw new Error(`Expected one metadata contract seam, found ${count}`);
text = text.replace(before, after);
fs.writeFileSync(path, text);
console.log("reasoning metadata type contract extended");

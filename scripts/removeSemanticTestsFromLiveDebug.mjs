import fs from "node:fs";

const path = "src/components/studio/tabs/MindMapTab.tsx";
let source = fs.readFileSync(path, "utf8");

source = source.replace(/\n  const semanticQuickTests = \[[\s\S]*?\n  };\n\n  const activeParticipant =/, "\n\n  const activeParticipant =");

source = source.replace(/\n            <div className="mb-2\.5 rounded-lg border border-violet-500\/25 bg-violet-500\/5 p-2\.5">[\s\S]*?\n            <div className="flex gap-2">/, '\n            <div className="flex gap-2">');

fs.writeFileSync(path, source);
console.log("removed semantic quick tests from live TEST & DEBUG screen");

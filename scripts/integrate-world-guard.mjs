import fs from "node:fs";

const path = "server.ts";
let text = fs.readFileSync(path, "utf8");

function replaceOnce(label, before, after) {
  const count = text.split(before).length - 1;
  if (count !== 1) {
    throw new Error(`${label}: expected exactly one match, found ${count}`);
  }
  text = text.replace(before, after);
}

replaceOnce(
  "world guard import",
  'import { buildWorldEventMemoryInstruction, rankWorldEventObservations, shouldRetrieveWorldEvents } from "./src/services/worldEventRetrieval";\n',
  'import { buildWorldEventMemoryInstruction, rankWorldEventObservations, shouldRetrieveWorldEvents } from "./src/services/worldEventRetrieval";\nimport { enforceWorldModelRecallResponse, findWorldModelResponseIssues } from "./src/services/worldModelResponseGuard";\n',
);

replaceOnce(
  "initial grounding issues",
  `      ...findDialogueDecisionIssues(\n        reply,\n        dialogueDecision,\n        dialogueOutputStyle,\n      ),\n    ];`,
  `      ...findDialogueDecisionIssues(\n        reply,\n        dialogueDecision,\n        dialogueOutputStyle,\n      ),\n      ...findWorldModelResponseIssues(reply, retrievedWorldEvents).map((issue) => issue.message),\n    ];`,
);

replaceOnce(
  "repaired grounding issues",
  `          ...findDialogueDecisionIssues(\n            repairedReply,\n            dialogueDecision,\n            dialogueOutputStyle,\n          ),\n        ];`,
  `          ...findDialogueDecisionIssues(\n            repairedReply,\n            dialogueDecision,\n            dialogueOutputStyle,\n          ),\n          ...findWorldModelResponseIssues(repairedReply, retrievedWorldEvents).map((issue) => issue.message),\n        ];`,
);

replaceOnce(
  "fallback grounding issues",
  `          ...findDialogueDecisionIssues(\n            fallback,\n            dialogueDecision,\n            dialogueOutputStyle,\n          ),\n        ];`,
  `          ...findDialogueDecisionIssues(\n            fallback,\n            dialogueDecision,\n            dialogueOutputStyle,\n          ),\n          ...findWorldModelResponseIssues(fallback, retrievedWorldEvents).map((issue) => issue.message),\n        ];`,
);

replaceOnce(
  "final deterministic guard",
  `    const baseEnforced = enforceKairoResponse(reply, kdm.trace, enforcementRules);\n    const contractEnforced = enforceBehaviorContract(baseEnforced.reply, kdm.trace, behaviorContract);\n    const enforced = { reply: contractEnforced.reply, changed: baseEnforced.changed || contractEnforced.changed, reasons: [...baseEnforced.reasons, ...contractEnforced.reasons] };`,
  `    const worldMemoryGuard = enforceWorldModelRecallResponse(reply, retrievedWorldEvents);\n    if (worldMemoryGuard.changed) {\n      reply = worldMemoryGuard.reply;\n      groundingIssues = [\n        ...findKairoGroundingIssues(reply, cleanHistory, userMessage),\n        ...findDialogueAttributionIssues(reply, cleanHistory, userMessage, userName),\n        ...findDialogueDecisionIssues(reply, dialogueDecision, dialogueOutputStyle),\n        ...findWorldModelResponseIssues(reply, retrievedWorldEvents).map((issue) => issue.message),\n      ];\n    }\n    const baseEnforced = enforceKairoResponse(reply, kdm.trace, enforcementRules);\n    const contractEnforced = enforceBehaviorContract(baseEnforced.reply, kdm.trace, behaviorContract);\n    const enforced = {\n      reply: contractEnforced.reply,\n      changed: worldMemoryGuard.changed || baseEnforced.changed || contractEnforced.changed,\n      reasons: [\n        ...baseEnforced.reasons,\n        ...contractEnforced.reasons,\n        ...(worldMemoryGuard.reason ? [worldMemoryGuard.reason] : []),\n      ],\n    };`,
);

fs.writeFileSync(path, text);
console.log("world-model response guard integrated into server.ts");

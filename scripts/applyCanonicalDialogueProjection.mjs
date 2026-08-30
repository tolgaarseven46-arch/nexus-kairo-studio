import fs from 'node:fs';

function once(text, from, to, label) {
  if (text.includes(to)) return text;
  if (!text.includes(from)) throw new Error(`Missing patch target: ${label}`);
  return text.replace(from, to);
}

let chaos = fs.readFileSync('src/services/kairoDialogueChaosEngine.ts', 'utf8');
chaos = once(
  chaos,
  'export function buildDialogueClaimLedger(\n  history: ConversationTurn[],\n  userMessage: string,\n  userName: string,\n): DialogueClaim[] {\n  const userTurns = history\n    .filter((turn) => turn.sender === "user")\n    .map((turn) => ({\n      speaker: turn.participantName || "Kullanıcı",\n      text: String(turn.text || ""),\n    }));\n  const turns = [...userTurns, { speaker: userName, text: userMessage }];',
  'export function buildDialogueClaimLedger(\n  history: ConversationTurn[],\n  userMessage: string,\n  userName: string,\n  currentAnalysis?: DialogueTurnAnalysis,\n): DialogueClaim[] {\n  const userTurns: Array<{ speaker: string; text: string; analysis?: DialogueTurnAnalysis }> = history\n    .filter((turn) => turn.sender === "user")\n    .map((turn) => ({\n      speaker: turn.participantName || "Kullanıcı",\n      text: String(turn.text || ""),\n    }));\n  const turns = [...userTurns, { speaker: userName, text: userMessage, analysis: currentAnalysis }];',
  'claim ledger current analysis signature',
);
chaos = once(
  chaos,
  '  for (const turn of turns) {\n    const analysis = analyzeDialogueTurn(turn.text);',
  '  for (const turn of turns) {\n    const analysis = turn.analysis ?? analyzeDialogueTurn(turn.text);',
  'claim ledger current projection use',
);
chaos = once(
  chaos,
  'export function findDialogueAttributionIssues(\n  reply: string,\n  history: ConversationTurn[],\n  userMessage: string,\n  userName: string,\n): string[] {\n  const ledger = buildDialogueClaimLedger(history, userMessage, userName);',
  'export function findDialogueAttributionIssues(\n  reply: string,\n  history: ConversationTurn[],\n  userMessage: string,\n  userName: string,\n  currentAnalysis?: DialogueTurnAnalysis,\n): string[] {\n  const ledger = buildDialogueClaimLedger(history, userMessage, userName, currentAnalysis);',
  'attribution current projection',
);
chaos = once(
  chaos,
  'export function buildDialogueBoardInstruction(\n  history: ConversationTurn[],\n  userMessage: string,\n  userName: string,\n): string {',
  'export function buildDialogueBoardInstruction(\n  history: ConversationTurn[],\n  userMessage: string,\n  userName: string,\n  currentAnalysis?: DialogueTurnAnalysis,\n): string {',
  'dialogue board current projection signature',
);
chaos = once(
  chaos,
  '  const current = {\n    speaker: userName,\n    text: userMessage,\n    analysis: analyzeDialogueTurn(userMessage),\n  };',
  '  const current = {\n    speaker: userName,\n    text: userMessage,\n    analysis: currentAnalysis ?? analyzeDialogueTurn(userMessage),\n  };',
  'dialogue board current projection use',
);
chaos = once(
  chaos,
  '  const claimLedger = buildDialogueClaimLedger(history, userMessage, userName);',
  '  const claimLedger = buildDialogueClaimLedger(history, userMessage, userName, current.analysis);',
  'dialogue board claim projection',
);
fs.writeFileSync('src/services/kairoDialogueChaosEngine.ts', chaos);

let decision = fs.readFileSync('src/services/kairoDialogueDecisionEngine.ts', 'utf8');
decision = once(
  decision,
  'import { interpretSemanticEvent, type SemanticEvent } from "./semanticEventEngine";\n',
  'import { interpretSemanticEvent, type SemanticEvent } from "./semanticEventEngine";\nimport { projectSemanticEventToDialogueAnalysis } from "./kairaDialogueTurnProjection";\nimport type { DialogueTurnAnalysis } from "./kairoDialogueChaosEngine";\n',
  'decision projection imports',
);
decision = once(
  decision,
  '  userName: string,\n  semanticEvent?: SemanticEvent,\n): DialogueDecisionPlan {\n  const event = semanticEvent ?? interpretSemanticEvent(userMessage);\n  const target = recallTarget(history, userMessage, userName);\n  const claims = buildDialogueClaimLedger(history, userMessage, userName);',
  '  userName: string,\n  semanticEvent?: SemanticEvent,\n  currentAnalysis?: DialogueTurnAnalysis,\n): DialogueDecisionPlan {\n  const event = semanticEvent ?? interpretSemanticEvent(userMessage);\n  const dialogueAnalysis = currentAnalysis ?? projectSemanticEventToDialogueAnalysis(event);\n  const target = recallTarget(history, userMessage, userName);\n  const claims = buildDialogueClaimLedger(history, userMessage, userName, dialogueAnalysis);',
  'decision current projection input',
);
decision = once(
  decision,
  'export function buildGroundedDialogueFallback(\n  plan: DialogueDecisionPlan,\n  history: ConversationTurn[],\n  userMessage: string,\n  userName: string,\n): string | null {',
  'export function buildGroundedDialogueFallback(\n  plan: DialogueDecisionPlan,\n  history: ConversationTurn[],\n  userMessage: string,\n  userName: string,\n  currentAnalysis?: DialogueTurnAnalysis,\n): string | null {',
  'fallback current projection signature',
);
decision = once(
  decision,
  '  const claims = buildDialogueClaimLedger(history, userMessage, userName);\n  const supported = supportedClaimsFor(claims, plan.target).at(-1);',
  '  const claims = buildDialogueClaimLedger(history, userMessage, userName, currentAnalysis);\n  const supported = supportedClaimsFor(claims, plan.target).at(-1);',
  'fallback current projection use',
);
fs.writeFileSync('src/services/kairoDialogueDecisionEngine.ts', decision);

let server = fs.readFileSync('server.ts', 'utf8');
server = once(
  server,
  'import {\n  analyzeDialogueTurn,\n  buildDialogueBoardInstruction,\n  findDialogueAttributionIssues,\n} from "./src/services/kairoDialogueChaosEngine";\n',
  'import {\n  buildDialogueBoardInstruction,\n  findDialogueAttributionIssues,\n} from "./src/services/kairoDialogueChaosEngine";\nimport { projectSemanticEventToDialogueAnalysis } from "./src/services/kairaDialogueTurnProjection";\n',
  'server dialogue projection import',
);
server = once(
  server,
  '    const dialogueAnalysis = analyzeDialogueTurn(userMessage);\n    const dialogueInstruction = buildDialogueBoardInstruction(\n      cleanHistory,\n      userMessage,\n      userName,\n    );\n    const dialogueDecision = planDialogueResponse(\n      cleanHistory,\n      userMessage,\n      userName,\n      languageUnderstanding.event,\n    );',
  '    const dialogueAnalysis = projectSemanticEventToDialogueAnalysis(languageUnderstanding.event);\n    const dialogueInstruction = buildDialogueBoardInstruction(\n      cleanHistory,\n      userMessage,\n      userName,\n      dialogueAnalysis,\n    );\n    const dialogueDecision = planDialogueResponse(\n      cleanHistory,\n      userMessage,\n      userName,\n      languageUnderstanding.event,\n      dialogueAnalysis,\n    );',
  'server canonical current dialogue projection',
);
server = server.replaceAll(
  '        userMessage,\n        userName,\n      ),',
  '        userMessage,\n        userName,\n        dialogueAnalysis,\n      ),',
);
server = once(
  server,
  '        userMessage,\n        userName,\n      );\n      if (fallback) {',
  '        userMessage,\n        userName,\n        dialogueAnalysis,\n      );\n      if (fallback) {',
  'grounded fallback current projection',
);
server = once(
  server,
  '...findDialogueAttributionIssues(reply, cleanHistory, userMessage, userName),',
  '...findDialogueAttributionIssues(reply, cleanHistory, userMessage, userName, dialogueAnalysis),',
  'world guard attribution projection',
);
fs.writeFileSync('server.ts', server);

console.log('Canonical current-turn dialogue projection applied');

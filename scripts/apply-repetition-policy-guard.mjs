import fs from "node:fs";

const path = "src/services/kairoDialogueDecisionEngine.ts";
let source = fs.readFileSync(path, "utf8");

function replaceOnce(from, to, label) {
  if (!source.includes(from)) throw new Error(`missing marker: ${label}`);
  source = source.replace(from, to);
}

replaceOnce(
  'import type { DiscourseState } from "../types/discourseState";',
  'import type { DiscourseSocialAct, DiscourseState } from "../types/discourseState";\nimport { classifyKairaReplyAct } from "./discourseSocialAct";',
  "discourse imports",
);

replaceOnce(
  '  repairSignal?: SemanticRepairSignal;\n  allowFollowUpQuestion: boolean;',
  '  repairSignal?: SemanticRepairSignal;\n  /** Observed Kaira social act that must not be emitted again on this turn. */\n  repeatGuard?: { act: DiscourseSocialAct; count: number };\n  allowFollowUpQuestion: boolean;',
  "plan repeat guard field",
);

replaceOnce(
  'export function planDialogueResponse(\n',
  'function planDialogueResponseBase(\n',
  "base planner rename",
);

const wrapperMarker = '\nexport function buildDialogueDecisionInstruction(\n';
const wrapper = `
function applyRepetitionPolicy(
  plan: DialogueDecisionPlan,
  discourse?: DiscourseState,
): DialogueDecisionPlan {
  const repeated = discourse?.selfRepeat;
  // Farewell is intentionally exempt: if the user is ending the conversation,
  // completing the farewell remains the correct social obligation even when
  // Kaira has recently said goodbye more than once.
  if (!repeated || repeated.act === "farewell") return plan;
  return {
    ...plan,
    repeatGuard: { act: repeated.act, count: repeated.count },
    reason:
      \`${'${plan.reason}'} Kaira son turlarda "${'${repeated.act}'}" sosyal işini ${'${repeated.count}'} kez yaptı; bu tur aynı sosyal işi tekrar üretme. Mevcut semantik hareketi koru, yalnız tekrar eden yüzeyi değiştir.\`,
  };
}

export function planDialogueResponse(
  history: ConversationTurn[],
  userMessage: string,
  userName: string,
  semanticEvent?: SemanticEvent,
  currentAnalysis?: DialogueTurnAnalysis,
  discourse?: DiscourseState,
): DialogueDecisionPlan {
  const event = semanticEvent ?? interpretSemanticEvent(userMessage);
  const basePlan = planDialogueResponseBase(
    history,
    userMessage,
    userName,
    event,
    currentAnalysis,
    discourse,
  );
  return applyRepetitionPolicy(basePlan, discourse);
}
`;
replaceOnce(wrapperMarker, `${wrapper}${wrapperMarker}`, "planner wrapper insertion");

replaceOnce(
  '- Kelime bütçesi: ${effectiveMaxWords ? `en fazla ${effectiveMaxWords} kelime` : "özel sınır yok"}\n- Gerekçe: ${effectiveReason}',
  '- Kelime bütçesi: ${effectiveMaxWords ? `en fazla ${effectiveMaxWords} kelime` : "özel sınır yok"}\n- Tekrar koruması: ${plan.repeatGuard ? `"${plan.repeatGuard.act}" sosyal işini yeniden üretme` : "yok"}\n- Gerekçe: ${effectiveReason}',
  "instruction repeat line",
);

replaceOnce(
  '  const effectiveMaxWords = style?.maxWords ?? plan.maxWords;\n  if (emojiCount > emojiBudget) {',
  '  const effectiveMaxWords = style?.maxWords ?? plan.maxWords;\n  if (plan.repeatGuard && classifyKairaReplyAct(reply) === plan.repeatGuard.act) {\n    issues.push(`Kaira son turlarda tekrarladığı "${plan.repeatGuard.act}" sosyal işini yeniden üretti`);\n  }\n  if (emojiCount > emojiBudget) {',
  "validator repeat guard",
);

replaceOnce(
  '    if (plan.socialRoutine === "greeting") return "selam";\n    if (plan.socialRoutine === "thanks") return "rica ederim";\n    if (plan.socialRoutine === "agreement") return "aynen";',
  '    if (plan.socialRoutine === "greeting")\n      return plan.repeatGuard?.act === "greeting" ? "burdayım" : "selam";\n    if (plan.socialRoutine === "thanks") return "rica ederim";\n    if (plan.socialRoutine === "agreement")\n      return plan.repeatGuard?.act === "agreement_ack" ? "devam edelim" : "aynen";',
  "social fallback repeat guard",
);

replaceOnce(
  '  if (plan.move === "natural_reaction") return "he anladım";',
  '  if (plan.move === "natural_reaction")\n    return plan.repeatGuard?.act === "agreement_ack" ? "devam edelim" : "he anladım";',
  "natural fallback repeat guard",
);

fs.writeFileSync(path, source);
console.log("repetition policy guard applied");

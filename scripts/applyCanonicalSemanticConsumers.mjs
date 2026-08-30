import fs from 'node:fs';

function once(text, from, to, label) {
  if (text.includes(to)) return text;
  if (!text.includes(from)) throw new Error(`Missing patch target: ${label}`);
  return text.replace(from, to);
}

// 1) Enrich the canonical SemanticEvent with consumer-facing semantic facets.
let semantic = fs.readFileSync('src/services/semanticEventEngine.ts', 'utf8');
semantic = once(
  semantic,
  'export type SemanticValence = "positive" | "negative" | "neutral";\nexport type SemanticTarget = "kaira" | "third_party" | "event" | "unknown";\n',
  'export type SemanticValence = "positive" | "negative" | "neutral";\nexport type SemanticTarget = "kaira" | "third_party" | "event" | "unknown";\nexport type SemanticSocialRoutine =\n  | "none"\n  | "greeting"\n  | "how_are_you"\n  | "what_doing"\n  | "thanks"\n  | "agreement"\n  | "goodbye"\n  | "good_night"\n  | "emotional_opening";\nexport type SemanticDiscourseAct =\n  | "none"\n  | "correction"\n  | "topic_shift"\n  | "recall_request"\n  | "confusion_or_challenge";\n',
  'semantic facet types',
);
semantic = once(
  semantic,
  '  intent: SemanticIntent;\n  valence: SemanticValence;\n',
  '  intent: SemanticIntent;\n  socialRoutine?: SemanticSocialRoutine;\n  discourseAct?: SemanticDiscourseAct;\n  valence: SemanticValence;\n',
  'semantic facet fields',
);
semantic = once(
  semantic,
  'const RECALL_QUESTION_RE = /(?:^|\\s)(?:neydi|ne yapacaktı)(?:\\s|$|[?.!,])|ne\\s+yapmayı\\s+düşünüyordu|hatırlıyor\\s+musun|hatırladın\\s+mı/u;\n',
  'const RECALL_QUESTION_RE = /(?:^|\\s)(?:neydi|ne yapacaktı)(?:\\s|$|[?.!,])|ne\\s+yapmayı\\s+düşünüyordu|hatırlıyor\\s+musun|hatırladın\\s+mı|az önce ne dedi|ne demişti|ne söylemişti|kim söylemişti/u;\nconst CORRECTION_RE = /(?:^|\\s)(?:yok|hayır|yanlış|değil|değildi|ben değildim|o ben değildim|onu demedim|öyle demedim|demek istemedim|düzelteyim|düzeltiyorum)(?:\\s|$|[?.!,])/u;\nconst TOPIC_SHIFT_RE = /(?:^|\\s)(?:bu arada|neyse|konu dışı|şey diyeceğim|şey dicem|onu boşver|geç onu)(?:\\s|$|[?.!,])/u;\n\nfunction inferSocialRoutine(text: string, intent: SemanticIntent): SemanticSocialRoutine {\n  if (/^(?:selam|merhaba|hey|heyy)(?:\\s+(?:kaira|kairo|kanka|aga|lan))?[.!?…]*$/u.test(text)) return "greeting";\n  if (/^(?:naber|nabr|nber|nasılsın)(?:\\s+(?:kaira|kairo|kanka|aga|lan))?[.!?…]*$/u.test(text)) return "how_are_you";\n  if (/^(?:ne yapıyorsun|napıyorsun|napıyon|napion|napiyon)(?:\\s+(?:kaira|kairo|kanka|aga|lan))?[.!?…]*$/u.test(text)) return "what_doing";\n  if (/^(?:sağol|sağ ol|teşekkürler|teşekkür ederim|eyvallah|thx)[.!?…]*$/u.test(text)) return "thanks";\n  if (/^(?:aynen|evet|he|hıhı|tamam|ok|okey)[.!?…]*$/u.test(text)) return "agreement";\n  if (/^(?:görüşürüz|bb|bay bay|hoşça kal)[.!?…]*$/u.test(text)) return "goodbye";\n  if (/^(?:iyi geceler|ig)[.!?…]*$/u.test(text)) return "good_night";\n  if (intent === "emotional_share") return "emotional_opening";\n  return "none";\n}\n',
  'semantic discourse constants and social routine inference',
);
semantic = once(
  semantic,
  '  const emotionalShare = EMOTIONAL_SHARE_RE.test(text);\n',
  '  const emotionalShare = EMOTIONAL_SHARE_RE.test(text);\n  const discourseAct: SemanticDiscourseAct = RECALL_QUESTION_RE.test(text)\n    ? "recall_request"\n    : confusion\n      ? "confusion_or_challenge"\n      : CORRECTION_RE.test(text)\n        ? "correction"\n        : TOPIC_SHIFT_RE.test(text)\n          ? "topic_shift"\n          : "none";\n',
  'semantic discourse act inference',
);
semantic = once(
  semantic,
  '  const valence: SemanticValence =\n',
  '  const socialRoutine = inferSocialRoutine(text, intent);\n\n  const valence: SemanticValence =\n',
  'semantic social routine inference',
);
semantic = once(
  semantic,
  '    raw: message, normalized: text, intent, valence, target, relationalAct, relationalIntensity, severity,\n',
  '    raw: message, normalized: text, intent, socialRoutine, discourseAct, valence, target, relationalAct, relationalIntensity, severity,\n',
  'semantic facet return',
);
fs.writeFileSync('src/services/semanticEventEngine.ts', semantic);

// 2) Accept and validate optional semantic facets at the authority boundary.
let authority = fs.readFileSync('src/services/semanticEventAuthority.ts', 'utf8');
authority = once(
  authority,
  '  type SemanticEvent,\n  type SemanticIntent,\n  type SemanticTarget,\n  type SemanticValence,\n',
  '  type SemanticEvent,\n  type SemanticIntent,\n  type SemanticTarget,\n  type SemanticValence,\n  type SemanticSocialRoutine,\n  type SemanticDiscourseAct,\n',
  'semantic authority type imports',
);
authority = once(
  authority,
  'const VALENCES = new Set<SemanticValence>(["positive", "negative", "neutral"]);\n',
  'const SOCIAL_ROUTINES = new Set<SemanticSocialRoutine>(["none", "greeting", "how_are_you", "what_doing", "thanks", "agreement", "goodbye", "good_night", "emotional_opening"]);\nconst DISCOURSE_ACTS = new Set<SemanticDiscourseAct>(["none", "correction", "topic_shift", "recall_request", "confusion_or_challenge"]);\nconst VALENCES = new Set<SemanticValence>(["positive", "negative", "neutral"]);\n',
  'semantic authority facet sets',
);
authority = once(
  authority,
  '    INTENTS.has(event.intent as SemanticIntent) &&\n    VALENCES.has(event.valence as SemanticValence) &&\n',
  '    INTENTS.has(event.intent as SemanticIntent) &&\n    (event.socialRoutine === undefined || SOCIAL_ROUTINES.has(event.socialRoutine as SemanticSocialRoutine)) &&\n    (event.discourseAct === undefined || DISCOURSE_ACTS.has(event.discourseAct as SemanticDiscourseAct)) &&\n    VALENCES.has(event.valence as SemanticValence) &&\n',
  'semantic authority facet validation',
);
fs.writeFileSync('src/services/semanticEventAuthority.ts', authority);

// 3) Teach the structured semantic provider to emit the same facets.
let provider = fs.readFileSync('src/services/llmSemanticUnderstandingProvider.ts', 'utf8');
provider = once(
  provider,
  '  intent: "general_chat",\n  valence: "neutral",\n',
  '  intent: "general_chat",\n  socialRoutine: "none",\n  discourseAct: "none",\n  valence: "neutral",\n',
  'semantic provider schema facets',
);
provider = once(
  provider,
  'intent = greeting | question | information_request | emotional_share | affection | banter | insult | rejection | apology | repair | complaint | command | support | compliment | general_chat\nvalence = positive | negative | neutral\n',
  'intent = greeting | question | information_request | emotional_share | affection | banter | insult | rejection | apology | repair | complaint | command | support | compliment | general_chat\nsocialRoutine = none | greeting | how_are_you | what_doing | thanks | agreement | goodbye | good_night | emotional_opening\ndiscourseAct = none | correction | topic_shift | recall_request | confusion_or_challenge\nvalence = positive | negative | neutral\n',
  'semantic provider facet enums',
);
fs.writeFileSync('src/services/llmSemanticUnderstandingProvider.ts', provider);

// 4) Dialogue planner consumes SemanticEvent instead of re-parsing the current turn.
let dialogue = fs.readFileSync('src/services/kairoDialogueDecisionEngine.ts', 'utf8');
dialogue = once(
  dialogue,
  'import {\n  analyzeDialogueTurn,\n  buildDialogueClaimLedger,\n  type DialogueClaim,\n} from "./kairoDialogueChaosEngine";\nimport { isLocalEmotionalOpening } from "./kairoEmotionalLanguage";\n',
  'import {\n  buildDialogueClaimLedger,\n  type DialogueClaim,\n} from "./kairoDialogueChaosEngine";\nimport { interpretSemanticEvent, type SemanticEvent } from "./semanticEventEngine";\n',
  'dialogue semantic import',
);
dialogue = dialogue.replace(/const RECALL_RE =\n  \/\(ne yapacaktı[\s\S]*?\)\/i;\n/u, '');
dialogue = once(
  dialogue,
  'function isFirstEmotionalOpening(\n  history: ConversationTurn[],\n  userMessage: string,\n): boolean {\n  if (!isLocalEmotionalOpening(userMessage)) return false;\n  return !history\n    .filter((turn) => turn.sender === "user")\n    .slice(-4)\n    .some((turn) => isLocalEmotionalOpening(String(turn.text || "")));\n}\n',
  'function isFirstEmotionalOpening(\n  history: ConversationTurn[],\n  event: SemanticEvent,\n): boolean {\n  const currentIsOpening = event.socialRoutine === "emotional_opening" || event.intent === "emotional_share";\n  if (!currentIsOpening) return false;\n  return !history\n    .filter((turn) => turn.sender === "user")\n    .slice(-4)\n    .some((turn) => {\n      const previous = interpretSemanticEvent(String(turn.text || ""));\n      return previous.socialRoutine === "emotional_opening" || previous.intent === "emotional_share";\n    });\n}\n',
  'dialogue emotional semantic consumer',
);
dialogue = once(
  dialogue,
  'export function planDialogueResponse(\n  history: ConversationTurn[],\n  userMessage: string,\n  userName: string,\n): DialogueDecisionPlan {\n  const analysis = analyzeDialogueTurn(userMessage);\n',
  'export function planDialogueResponse(\n  history: ConversationTurn[],\n  userMessage: string,\n  userName: string,\n  semanticEvent?: SemanticEvent,\n): DialogueDecisionPlan {\n  const event = semanticEvent ?? interpretSemanticEvent(userMessage);\n',
  'dialogue planner semantic signature',
);
dialogue = dialogue.replace('if (analysis.acts.includes("confusion_or_challenge")) {', 'if (event.discourseAct === "confusion_or_challenge") {');
dialogue = dialogue.replace('if (RECALL_RE.test(userMessage)) {', 'if (event.discourseAct === "recall_request") {');
dialogue = dialogue.replace('if (isFirstEmotionalOpening(history, userMessage)) {', 'if (isFirstEmotionalOpening(history, event)) {');
dialogue = dialogue.replace('if (analysis.acts.includes("correction")) {', 'if (event.discourseAct === "correction") {');
dialogue = dialogue.replace('if (analysis.acts.includes("topic_shift")) {', 'if (event.discourseAct === "topic_shift") {');
dialogue = dialogue.replace('if (analysis.acts.includes("banter")) {', 'if (event.intent === "banter") {');
dialogue = dialogue.replace('if (analysis.acts.includes("question")) {', 'if (event.intent === "question" || event.intent === "information_request") {');
fs.writeFileSync('src/services/kairoDialogueDecisionEngine.ts', dialogue);

// 5) Local language engine maps the canonical semantic event to a narrow verbalizer routine.
let local = fs.readFileSync('src/services/kairoLocalLanguageEngine.ts', 'utf8');
local = once(
  local,
  'import { classifyLocalEmotionalIntent } from "./kairoEmotionalLanguage";\n',
  'import { interpretSemanticEvent, type SemanticEvent } from "./semanticEventEngine";\n',
  'local semantic import',
);
const detectStart = local.indexOf('function detectIntent(');
const runtimeFlagStart = local.indexOf('const runtimeFlag', detectStart);
if (detectStart < 0 || runtimeFlagStart < 0) throw new Error('Missing local detectIntent block');
local = local.slice(0, detectStart) + `function localIntentFromSemanticEvent(\n  message: string,\n  semanticEvent?: SemanticEvent,\n): LocalIntent | null {\n  const event = semanticEvent ?? interpretSemanticEvent(message);\n  switch (event.socialRoutine) {\n    case "greeting": return "greeting";\n    case "how_are_you": return "how_are_you";\n    case "what_doing": return "what_doing";\n    case "thanks": return "thanks";\n    case "agreement": return "agreement";\n    case "goodbye": return "goodbye";\n    case "good_night": return "good_night";\n    case "emotional_opening": return "emotional_opening";\n    default:\n      return event.intent === "emotional_share"\n        ? "emotional_opening"\n        : event.intent === "greeting"\n          ? "greeting"\n          : null;\n  }\n}\n\n` + local.slice(runtimeFlagStart);
local = once(
  local,
  '  dialogueMove?: DialogueMove,\n  responsePlan?: KairaResponsePlan,\n): LocalLanguageResult {\n  const normalization = normalizeKairoLanguageInput(message);\n  const intent = detectIntent(message, dialogueMove);\n',
  '  dialogueMove?: DialogueMove,\n  responsePlan?: KairaResponsePlan,\n  semanticEvent?: SemanticEvent,\n): LocalLanguageResult {\n  const normalization = normalizeKairoLanguageInput(message);\n  const intent = localIntentFromSemanticEvent(message, semanticEvent);\n',
  'local semantic signature',
);
fs.writeFileSync('src/services/kairoLocalLanguageEngine.ts', local);

// 6) The chat trust boundary passes one canonical event to both consumers.
let server = fs.readFileSync('server.ts', 'utf8');
server = once(
  server,
  '    const dialogueDecision = planDialogueResponse(\n      cleanHistory,\n      userMessage,\n      userName,\n    );',
  '    const dialogueDecision = planDialogueResponse(\n      cleanHistory,\n      userMessage,\n      userName,\n      languageUnderstanding.event,\n    );',
  'server dialogue canonical event',
);
server = once(
  server,
  '        dialogueDecision.move,\n        responsePlan,\n      ),',
  '        dialogueDecision.move,\n        responsePlan,\n        languageUnderstanding.event,\n      ),',
  'server local canonical event',
);
fs.writeFileSync('server.ts', server);

console.log('Canonical SemanticEvent consumers applied');

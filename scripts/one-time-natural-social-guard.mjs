import { readFileSync, writeFileSync } from 'node:fs';

const path = 'src/services/kairoDialogueDecisionEngine.ts';
let source = readFileSync(path, 'utf8');

const constantsNeedle = `const CANNED_BANTER_RE =\n  /\\b(speedrun|full kaos|plot twist|achievement|level atla\\w*|npc|boss fight|main character|challenge accepted)\\b/i;\n`;
const constantsInsert = `${constantsNeedle}const ASSISTANT_MENU_RE =\n  /\\b(istersen (?:yardımcı olabilirim|birlikte|şöyle yapabiliriz)|yardımcı olabilirim|başka bir konuda yardımcı|nasıl yardımcı olabilirim|şöyle yapalım|istersen anlat)\\b/i;\nconst ARTIFICIAL_PERSONA_RE =\n  /\\b(cpu|işlemci|log(?:lar|larım)?|veri merkezi|sunucu(?:lar|larım)?|algoritma(?:m)?|kod(?:lar|larım)?|ram)\\b/i;\nconst SOCIAL_ONLY_MOVES = new Set<DialogueDecisionPlan["move"]>([\n  "natural_reaction",\n  "join_banter",\n  "follow_previous_answer",\n  "invite_emotional_context",\n  "acknowledge_correction",\n  "repair_or_rephrase",\n]);\n`;
if (!source.includes('const ASSISTANT_MENU_RE')) {
  if (!source.includes(constantsNeedle)) throw new Error('constants insertion point not found');
  source = source.replace(constantsNeedle, constantsInsert);
}

const checksNeedle = `  if (\n    CANNED_BANTER_RE.test(reply) &&\n    !CANNED_BANTER_RE.test(style?.userMessage || "")\n  ) {\n    issues.push(\n      "Kullanıcının başlatmadığı hazır internet esprisi veya oyun metaforu eklendi",\n    );\n  }\n`;
const checksInsert = `${checksNeedle}  if (SOCIAL_ONLY_MOVES.has(plan.move) && ASSISTANT_MENU_RE.test(reply)) {\n    issues.push("Sosyal sohbet hamlesi robotik yardımcı/menü kalıbına döndü");\n  }\n  if (\n    SOCIAL_ONLY_MOVES.has(plan.move) &&\n    ARTIFICIAL_PERSONA_RE.test(reply) &&\n    !ARTIFICIAL_PERSONA_RE.test(style?.userMessage || "")\n  ) {\n    issues.push("Kullanıcının açmadığı yapay persona/altyapı gösterisi eklendi");\n  }\n`;
if (!source.includes('robotik yardımcı/menü kalıbına')) {
  if (!source.includes(checksNeedle)) throw new Error('validator insertion point not found');
  source = source.replace(checksNeedle, checksInsert);
}
writeFileSync(path, source);

writeFileSync('src/services/kairaNaturalSocialConsistencyContracts.test.ts', `import { describe, expect, it } from "vitest";\nimport { findDialogueDecisionIssues, type DialogueDecisionPlan } from "./kairoDialogueDecisionEngine";\n\nconst socialPlan: DialogueDecisionPlan = {\n  move: "natural_reaction",\n  allowFollowUpQuestion: false,\n  allowSpeculation: false,\n  maxSentences: 2,\n  maxWords: 32,\n  hasSupportedTargetClaim: false,\n  reason: "natural social reaction",\n};\n\nconst questionPlan: DialogueDecisionPlan = {\n  ...socialPlan,\n  move: "answer_or_clarify",\n  allowFollowUpQuestion: true,\n};\n\ndescribe("natural social response consistency", () => {\n  it("rejects robotic assistant-menu language during ordinary social reactions", () => {\n    expect(\n      findDialogueDecisionIssues("İstersen yardımcı olabilirim.", socialPlan, { userMessage: "bugün iş çok yoğundu" }),\n    ).toContain("Sosyal sohbet hamlesi robotik yardımcı/menü kalıbına döndü");\n  });\n\n  it("does not globally ban helper wording when the user is actually asking for help", () => {\n    expect(\n      findDialogueDecisionIssues("İstersen birlikte bakalım.", questionPlan, { userMessage: "bunu çözmeme yardım eder misin?" }),\n    ).not.toContain("Sosyal sohbet hamlesi robotik yardımcı/menü kalıbına döndü");\n  });\n\n  it("rejects unsolicited artificial-persona exposition in social chat", () => {\n    expect(\n      findDialogueDecisionIssues("CPU'm bugün biraz yandı hahah", socialPlan, { userMessage: "çok yoruldum bugün" }),\n    ).toContain("Kullanıcının açmadığı yapay persona/altyapı gösterisi eklendi");\n  });\n\n  it("allows infrastructure/persona vocabulary when the user explicitly opened that topic", () => {\n    const issues = findDialogueDecisionIssues("CPU tarafı normal şu an", socialPlan, { userMessage: "CPU'n nasıl çalışıyor?" });\n    expect(issues).not.toContain("Kullanıcının açmadığı yapay persona/altyapı gösterisi eklendi");\n  });\n});\n`);

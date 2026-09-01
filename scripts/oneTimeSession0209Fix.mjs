import fs from 'node:fs';

const replaceOnce = (path, oldText, newText) => {
  const source = fs.readFileSync(path, 'utf8');
  const count = source.split(oldText).length - 1;
  if (count !== 1) throw new Error(`${path}: expected one anchor, found ${count}`);
  fs.writeFileSync(path, source.replace(oldText, newText));
};

replaceOnce(
  'src/services/kdmConsistencyEngine.ts',
  `function semanticSentimentToKdm(event: SemanticEvent): string {\n  if (event.emotionalLoad > 0) return "duygusal_yük";\n  if (event.valence === "negative") return "negatif";\n  if (event.valence === "positive") return "pozitif";\n  return "nötr";\n}`,
  `function hasActionableNegativeEvidence(event: SemanticEvent): boolean {\n  return Boolean(\n    event.redLine ||\n    event.insult ||\n    event.coercion > 0 ||\n    event.manipulation > 0 ||\n    event.privacyViolation > 0 ||\n    event.intent === "rejection" ||\n    event.severity >= 0.1\n  );\n}\n\nfunction semanticSentimentToKdm(event: SemanticEvent): string {\n  if (event.emotionalLoad > 0) return "duygusal_yük";\n  if (event.valence === "negative" && hasActionableNegativeEvidence(event)) return "negatif";\n  if (event.valence === "positive") return "pozitif";\n  return "nötr";\n}`,
);

replaceOnce(
  'src/services/kdmConsistencyEngine.ts',
  `  const rawKind: EventKind = semanticEvent.valence === "positive" ? "positive" : semanticEvent.valence === "negative" ? "negative" : "neutral";\n  const negativeTarget: NegativeTarget | null = rawKind === "negative" ? semanticNegativeTarget(semanticEvent) : null;`,
  `  const rawKind: EventKind = semanticEvent.valence === "positive"\n    ? "positive"\n    : semanticEvent.valence === "negative" && hasActionableNegativeEvidence(semanticEvent)\n      ? "negative"\n      : "neutral";\n  const negativeTarget: NegativeTarget | null = rawKind === "negative" ? semanticNegativeTarget(semanticEvent) : null;`,
);

replaceOnce(
  'src/services/kairoDialogueDecisionEngine.ts',
  `function isShortAnswerToPreviousKairaTurn(\n  history: ConversationTurn[],\n  userMessage: string,\n): boolean {`,
  `function isReciprocalSocialRoutine(\n  userMessage: string,\n  event: SemanticEvent,\n): boolean {\n  const locallyObservedRoutine = interpretSemanticEvent(userMessage).socialRoutine;\n  return (\n    event.socialRoutine === "how_are_you" ||\n    event.socialRoutine === "what_doing" ||\n    locallyObservedRoutine === "how_are_you" ||\n    locallyObservedRoutine === "what_doing"\n  );\n}\n\nfunction isShortAnswerToPreviousKairaTurn(\n  history: ConversationTurn[],\n  userMessage: string,\n): boolean {`,
);

replaceOnce(
  'src/services/kairoDialogueDecisionEngine.ts',
  `  if (event.discourseAct === "recall_request") {`,
  `  if (isReciprocalSocialRoutine(userMessage, event)) {\n    return {\n      move: "natural_reaction",\n      allowFollowUpQuestion: true,\n      allowSpeculation: false,\n      maxSentences: 2,\n      maxWords: 10,\n      hasSupportedTargetClaim: false,\n      reason:\n        "Kullanıcı Kaira'nın halini veya ne yaptığını doğrudan soruyor. Kısa cevap ver; doğal karşılıklılık için en fazla bir kısa 'sen?' / 'senden naber?' sorusu sorabilirsin.",\n    };\n  }\n\n  if (event.discourseAct === "recall_request") {`,
);

replaceOnce(
  'src/services/kairoLocalLanguageEngine.ts',
  `  const event = semanticEvent ?? interpretSemanticEvent(message);\n  if (event.adviceRequested) return null;\n\n  const directIntent = localIntentFromEvent(event);`,
  `  const event = semanticEvent ?? interpretSemanticEvent(message);\n  if (event.adviceRequested) return null;\n\n  // Exact local social routines are deterministic and narrower than a coarse external\n  // semantic label. Preserve reciprocal "naber/nasılsın/ne yapıyorsun" behavior even\n  // when an upstream provider collapses the turn to generic greeting/general chat.\n  const locallyObserved = interpretSemanticEvent(message);\n  const locallyObservedIntent = localIntentFromEvent(locallyObserved);\n  if (locallyObservedIntent === "how_are_you" || locallyObservedIntent === "what_doing") {\n    return locallyObservedIntent;\n  }\n\n  const directIntent = localIntentFromEvent(event);`,
);

const regression = `import { describe, expect, it } from "vitest";\nimport { analyzeKdmInteraction } from "./kdmConsistencyEngine";\nimport { planDialogueResponse } from "./kairoDialogueDecisionEngine";\nimport { tryLocalKairoReply } from "./kairoLocalLanguageEngine";\nimport type { SemanticEvent } from "./semanticEventEngine";\n\nconst state = () => ({\n  calmness: 76, anger: 20, stress: 16, happiness: 66, confidence: 86, surprise: 14,\n  lastStatus: "Sakin ve kontrollü",\n  relationship: {\n    firstSeenAt: "2026-09-01T02:04:55.191Z",\n    lastInteractionAt: "2026-09-01T02:04:55.191Z",\n    interactionCount: 3, familiarityDays: 0, warmth: 52, trust: 54, positiveEvents: 2,\n    negativeEvents: 0, conflictScore: 0, hurtScore: 0, repairProgress: 8,\n    repeatedNegativeCount: 0, conversationState: "active", repairAttempts: 0,\n  },\n}) as any;\n\nconst event = (overrides: Partial<SemanticEvent> = {}): SemanticEvent => ({\n  raw: "test", normalized: "test", intent: "general_chat", socialRoutine: "none",\n  discourseAct: "none", adviceRequested: false, valence: "neutral", target: "unknown",\n  relationalAct: "none", relationalIntensity: 0, severity: 0, insult: false, redLine: false,\n  disrespect: 0, coercion: 0, manipulation: 0, privacyViolation: 0, apology: false,\n  repairAttempt: false, stopQuestions: false, stopTalking: false, frustration: 0,\n  emotionalLoad: 0, affection: 0, support: 0, compliment: 0, ...overrides,\n});\n\ndescribe("session 0209 regressions", () => {\n  it("does not convert a zero-severity confusion challenge into relationship damage", () => {\n    const canonical = event({\n      raw: "ne alaka", normalized: "ne alaka", valence: "negative", target: "kaira",\n      discourseAct: "confusion_or_challenge", frustration: 0.35, emotionalLoad: 0.2, severity: 0,\n    });\n    const result = analyzeKdmInteraction("ne alaka", undefined, state(), canonical);\n    const rel = result.nextDynamicState.relationship!;\n    expect(result.trace.messageInterpretation.sentiment).toBe("duygusal_yük");\n    expect(rel.warmth).toBe(52);\n    expect(rel.trust).toBe(54);\n    expect(rel.negativeEvents).toBe(0);\n    expect(rel.conflictScore).toBe(0);\n    expect(rel.hurtScore).toBe(0);\n    expect(rel.repeatedNegativeCount).toBe(0);\n    expect(result.nextDynamicState.reactionMode).toBe("neutral");\n  });\n\n  it("does not subtract warmth for a benign Kaira-targeted provider false negative", () => {\n    const canonical = event({\n      raw: "bana bi kıyak geçsen :)", normalized: "bana bi kıyak geçsen :)", intent: "banter",\n      valence: "negative", target: "kaira", severity: 0,\n    });\n    const result = analyzeKdmInteraction("bana bi kıyak geçsen :)", undefined, state(), canonical);\n    expect(result.trace.messageInterpretation.sentiment).toBe("nötr");\n    expect(result.nextDynamicState.relationship?.warmth).toBe(52);\n    expect(result.nextDynamicState.relationship?.negativeEvents).toBe(0);\n  });\n\n  it.each(["naber", "nasılsın kank", "ne yapıyorsun"])(\n    "allows one reciprocal social question for: %s",\n    (message) => {\n      const coarseProviderEvent = event({\n        raw: message, normalized: message, intent: "greeting", socialRoutine: "greeting",\n        target: "kaira",\n      });\n      const plan = planDialogueResponse([], message, "Mert", coarseProviderEvent);\n      expect(plan).toMatchObject({ move: "natural_reaction", allowFollowUpQuestion: true });\n    },\n  );\n\n  it("keeps exact local how-are-you routine when provider collapses naber to greeting", () => {\n    const coarseProviderEvent = event({\n      raw: "naber", normalized: "naber", intent: "greeting", socialRoutine: "greeting", target: "kaira",\n    });\n    const local = tryLocalKairoReply(\n      "naber",\n      { humor: 50 } as any,\n      state(),\n      { decision: { chosenTone: "playful" } } as any,\n      "session-0209-regression",\n      "natural_reaction",\n      { continueConversation: true, allowQuestion: true, allowHumor: true, relationshipLevel: "new" } as any,\n      coarseProviderEvent,\n      false,\n    );\n    expect(local.handled).toBe(true);\n    expect(local.intent).toBe("how_are_you");\n    expect(local.reply).toMatch(/sen|senden/u);\n  });\n});\n`;
fs.writeFileSync('src/services/kairaSession0209Regression.test.ts', regression);
console.log('session 0209 fixes applied');
// trigger workflow after workflow file exists

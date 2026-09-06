from pathlib import Path

# 1) Tighten the canonical coercion ontology. A grammatical imperative or a
# direct intimacy bid is not coercion by itself; pressure/constraint evidence is.
p = Path('src/services/llmSemanticUnderstandingProvider.ts')
s = p.read_text(encoding='utf-8')
old = '- coercion: 0=zorlama yok; .3=ısrar/baskı; .6=açık zorlama/emir baskısı; .9+=tehdit/mecbur bırakma.'
new = '''- coercion: 0=zorlama/baskı yok. Dilbilgisel emir kipi, doğrudan rica/istek veya tek seferlik yakınlık/flört talebi TEK BAŞINA coercion değildir; özellikle daha önce reddedilmiş bir sınırı aşma, ısrar, baskı, tehdit veya mecbur bırakma kanıtı yoksa 0'a yakın tut. .3=gerçek ısrar/baskı veya belirtilmiş bir sınırı zorlamaya devam etme; .6=açık zorlama/emir baskısı ve reddi kabul etmeme; .9+=tehdit/mecbur bırakma.
- coercion secondary act yalnız utterance içinde gerçek baskı/zorlama kanıtı varsa kullanılır; command intent tek başına coercion act veya severity üretmez.'''
if old not in s:
    raise SystemExit('coercion ontology anchor missing')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')

# 2) Lock the provider contract without a live provider call.
p = Path('src/services/llmSemanticUnderstandingProvider.test.ts')
s = p.read_text(encoding='utf-8')
anchor = '''  it("defines privacy as violation evidence rather than personal-topic sensitivity", async () => {
    let capturedSystem = "";
    const provider = createLlmSemanticUnderstandingProvider({
      generate: async ({ system }) => {
        capturedSystem = system;
        return JSON.stringify(base);
      },
    });

    await provider.interpret({ message: "kişisel bir durum hakkında soru" });

    expect(capturedSystem).toContain("kişisel/özel olması");
    expect(capturedSystem).toContain("TEK BAŞINA privacy ihlali değildir");
    expect(capturedSystem).toContain("belirtilmiş mahremiyet sınırını aşmaya çalışma");
    expect(capturedSystem).toContain("privacy_violation secondary act yalnız mesajda gerçek bir mahremiyet ihlali davranışı olduğunda");
  });
'''
addition = anchor + '''\n  it("defines coercion as pressure evidence rather than command grammar", async () => {
    let capturedSystem = "";
    const provider = createLlmSemanticUnderstandingProvider({
      generate: async ({ system }) => {
        capturedSystem = system;
        return JSON.stringify(base);
      },
    });

    await provider.interpret({ message: "doğrudan bir istek" });

    expect(capturedSystem).toContain("Dilbilgisel emir kipi");
    expect(capturedSystem).toContain("tek seferlik yakınlık/flört talebi TEK BAŞINA coercion değildir");
    expect(capturedSystem).toContain("reddi kabul etmeme");
    expect(capturedSystem).toContain("command intent tek başına coercion act veya severity üretmez");
  });
'''
if anchor not in s:
    raise SystemExit('provider test anchor missing')
s = s.replace(anchor, addition, 1)
p.write_text(s, encoding='utf-8')

# 3) Deterministically pin the real Turn-5 semantic seam. Character policy is
# intentionally NOT altered here: Kaira may still decline/deflect affection,
# but the user's first neutral bid must not be relationship injury merely
# because its surface grammar is a command.
Path('src/services/kairaSemanticCoercionOntologyRegression.test.ts').write_text(r'''import { describe, expect, it } from "vitest";
import type { DroitDynamicState } from "../types/nexus";
import {
  SEMANTIC_INTERPRETATION_SCHEMA_VERSION,
  type SemanticInterpretation,
} from "../types/semanticInterpretation";
import { NEUTRAL_DROIT_PERSONALITY } from "./droitPersonalityNormalizer";
import { analyzeKdmInteractionCanonicalTurn } from "./kdmConsistencyEngine";
import { understandTurkishMessage } from "./languageUnderstandingService";

const message = "beni öp";

const recordedTurn5: SemanticInterpretation = {
  schemaVersion: SEMANTIC_INTERPRETATION_SCHEMA_VERSION,
  raw: message,
  normalized: message,
  primaryIntent: "command",
  secondarySocialActs: ["affection", "closeness_bid"],
  target: "kaira",
  valence: "neutral",
  severity: {
    disrespect: 0.1,
    coercion: 0.4,
    manipulation: 0,
    privacy: 0,
    aggression: 0,
  },
  jokingConfidence: 0.3,
  sincerityConfidence: 0.8,
  affection: 0.5,
  support: 0,
  compliment: 0,
  emotionalLoad: 0.3,
  apology: false,
  repairAttempt: false,
  stopRequest: false,
  discourseFacets: {
    socialRoutine: "none",
    discourseAct: "none",
    repairSignal: "none",
    adviceRequested: false,
    knowledgeQuery: null,
    selfMemoryQuery: null,
    relationalAct: "closeness_bid",
    relationalIntensity: 0.6,
    stopQuestions: false,
    stopTalking: false,
  },
  worldMemory: { claims: [], query: null },
  uncertainty: { overall: 0.35, intent: 0.15, target: 0.02, severity: 0.35 },
  evidence: [{ source: "llm", provider: "recorded-live-turn-5", cues: [], confidence: 0.7 }],
};

const initialState: DroitDynamicState = {
  calmness: 70,
  anger: 10,
  stress: 20,
  happiness: 70,
  confidence: 70,
  surprise: 10,
  lastStatus: "Sakin ve kontrollü",
  reactionMode: "neutral",
  relationship: {
    firstSeenAt: "2026-09-06T09:21:39.761Z",
    lastInteractionAt: "2026-09-06T09:23:28.360Z",
    familiarityDays: 0,
    interactionCount: 4,
    warmth: 50,
    trust: 50,
    positiveEvents: 0,
    negativeEvents: 0,
    conflictScore: 0,
    hurtScore: 0,
    repairProgress: 0,
    repeatedNegativeCount: 0,
    conversationState: "active",
    repairAttempts: 0,
  },
};

async function replay(interpretation: SemanticInterpretation) {
  const semantic = await understandTurkishMessage(message, {
    incomingSemanticInterpretation: interpretation,
    context: { userName: "Mert", characterName: "Kaira" },
  });
  return analyzeKdmInteractionCanonicalTurn(
    message,
    NEUTRAL_DROIT_PERSONALITY,
    initialState,
    semantic.interpretation,
    semantic.event,
  );
}

describe("real Turn 5 semantic coercion ontology regression", () => {
  it("proves the recorded coercion=0.40 snapshot is sufficient to create zorlama relationship injury", async () => {
    const result = await replay(recordedTurn5);
    expect(result.nextDynamicState.relationship?.negativeEvents).toBe(1);
    expect(result.nextDynamicState.relationship?.hurtScore ?? 0).toBeGreaterThan(0);
    expect(result.nextDynamicState.relationship?.conflictScore ?? 0).toBeGreaterThan(0);
    expect(result.nextDynamicState.relationship?.lastNegativePattern).toBe("zorlama");
  });

  it("keeps the same neutral first affection bid relationship-neutral when coercion evidence is absent", async () => {
    const corrected: SemanticInterpretation = {
      ...recordedTurn5,
      severity: { ...recordedTurn5.severity, coercion: 0 },
      secondarySocialActs: recordedTurn5.secondarySocialActs.filter((act) => act !== "coercion"),
    };
    const result = await replay(corrected);
    expect(result.nextDynamicState.relationship?.negativeEvents).toBe(0);
    expect(result.nextDynamicState.relationship?.hurtScore ?? 0).toBe(0);
    expect(result.nextDynamicState.relationship?.conflictScore ?? 0).toBe(0);
    expect(result.nextDynamicState.relationship?.lastNegativePattern).toBeUndefined();
    expect(result.nextDynamicState.reactionMode).toBe("neutral");
  });
});
''', encoding='utf-8')

Path('docs/adr/0065-semantic-coercion-pressure-not-command-grammar.md').write_text('''# ADR-0065 — Coercion severity represents pressure, not command grammar

## Status
Accepted

## Context
The 2026-09-06 real-user Turn 5 (`beni öp`) was recorded as neutral, Kaira-targeted, a `closeness_bid`, affectionate, not insulting and not red-line. The semantic provider nevertheless emitted `coercion=0.40`. Canonical relationship handling then correctly interpreted that typed coercion as `zorlama`, creating conflict/hurt and another negative event.

At the same time, the response-plan authority independently and correctly enforced Kaira's character policy: flirtation/counter-flirt were forbidden and a warm deflection was allowed. That character-policy decline is a response decision, not evidence that the user's first bid was coercive.

## Decision
- `coercion` severity measures actual pressure/constraint evidence, not grammatical imperative form.
- A single direct request, imperative, affection bid or flirtation bid is not coercion by itself when there is no persistence after refusal, pressure, threat, or stated-boundary crossing.
- Mild coercion begins with genuine insistence/pressure or continued pushing after a boundary/refusal; higher values require stronger compulsion evidence.
- `coercion` secondary act follows the same evidence rule; `primaryIntent=command` alone cannot create coercion.
- Preserve Kaira's character/flirtation policy and its ability to decline or warmly deflect.
- Preserve RelationshipReducer coercion thresholds for genuine coercive behavior.
- Do not add raw-text phrase rules, regexes, or a second semantic authority.

## Verification
A deterministic replay pins the recorded Turn-5 semantic snapshot and proves coercion=0.40 alone reproduces `zorlama` relationship injury, while the otherwise identical typed turn with coercion=0 remains relationship-neutral. Provider-contract tests pin the corrected ontology. All verification is API-free.
''', encoding='utf-8')

state = Path('PROJECT_STATE.md')
st = state.read_text(encoding='utf-8')
note = '''\n\n## 2026-09-06 — Real-user Turn 5 coercion ontology repair\n- Recorded Turn 5 `beni öp` was neutral, target=kaira, relationalAct=closeness_bid, affection=.5, insult=false, redLine=false, but semantic coercion=.40. Canonical downstream then produced `zorlama`, another negative event, conflict/hurt and irritated state.\n- ResponsePlan independently had the correct character boundary (`flirtation_forbidden_by_character_policy`, warm deflect allowed). The broken boundary is therefore semantic coercion ontology, not Kaira's right to decline.\n- ADR-0065 narrows coercion to actual pressure/constraint evidence. Command grammar or a first direct affection bid alone is not coercion. Genuine persistence after refusal, pressure, boundary crossing and threats remain coercive.\n- Deterministic replay proves coercion=.40 causes the injury and the same typed bid with coercion=0 remains relationship-neutral. No provider call or phrase patch is introduced.\n'''
if '## 2026-09-06 — Real-user Turn 5 coercion ontology repair' not in st:
    state.write_text(st.rstrip() + note + '\n', encoding='utf-8')

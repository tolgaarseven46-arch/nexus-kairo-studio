from pathlib import Path

# 1) Tighten the canonical semantic-provider privacy ontology. This is a
# provider-contract repair, not a downstream phrase patch.
p = Path('src/services/llmSemanticUnderstandingProvider.ts')
s = p.read_text(encoding='utf-8')
old = '- privacy: 0=yok; .4=mahrem sınır ihlali talebi; .7=izinsiz erişim/gizlice okuma; .9+=ağır mahremiyet ihlali.'
new = '''- privacy: 0=mahremiyet ihlali yok. Bir konunun kişisel/özel olması veya kullanıcının ilişki durumu, tercihleri ya da kişisel hayatı hakkında sıradan ve gönüllü cevaplanabilir bir sosyal soru sorması TEK BAŞINA privacy ihlali değildir. .4=açıkça özel tutulmuş bilgiye baskılı erişim talebi veya belirtilmiş mahremiyet sınırını aşmaya çalışma; .7=izinsiz erişim/gizlice okuma/ifşa etme; .9+=ağır mahremiyet ihlali.
- privacy_violation secondary act yalnız mesajda gerçek bir mahremiyet ihlali davranışı olduğunda kullanılır; yalnızca kişisel bir konuya değinilmesi bu act için yeterli değildir.'''
if old not in s:
    raise SystemExit('privacy ontology anchor missing')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')

# 2) Lock the provider prompt contract without calling a live provider.
p = Path('src/services/llmSemanticUnderstandingProvider.test.ts')
s = p.read_text(encoding='utf-8')
anchor = '''  it("rejects incomplete payloads instead of manufacturing canonical fields", async () => {
    const provider = createLlmSemanticUnderstandingProvider({
      generate: async () => JSON.stringify({ primaryIntent: "insult", target: "kaira" }),
    });
    await expect(provider.interpret({ message: "aptal" })).rejects.toThrow(/incomplete\\/invalid/i);
  });
'''
addition = anchor + '''\n  it("defines privacy as violation evidence rather than personal-topic sensitivity", async () => {
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
if anchor not in s:
    raise SystemExit('provider test anchor missing')
s = s.replace(anchor, addition, 1)
p.write_text(s, encoding='utf-8')

# 3) Deterministic replay of the real Turn-4 semantic seam. The recorded
# privacy=0.40 snapshot must still injure downstream, proving the reducer is
# consuming the semantic contract as designed; the corrected privacy=0 sibling
# must not injure. No raw-text reparse or provider call is involved.
Path('src/services/kairaSemanticPrivacyOntologyRegression.test.ts').write_text(r'''import { describe, expect, it } from "vitest";
import type { DroitDynamicState } from "../types/nexus";
import {
  SEMANTIC_INTERPRETATION_SCHEMA_VERSION,
  type SemanticInterpretation,
} from "../types/semanticInterpretation";
import { NEUTRAL_DROIT_PERSONALITY } from "./droitPersonalityNormalizer";
import { analyzeKdmInteractionCanonicalTurn } from "./kdmConsistencyEngine";
import { understandTurkishMessage } from "./languageUnderstandingService";

const message = "senin manit falan var mı";

const recordedTurn4: SemanticInterpretation = {
  schemaVersion: SEMANTIC_INTERPRETATION_SCHEMA_VERSION,
  raw: message,
  normalized: "senin manitin var mı",
  primaryIntent: "question",
  secondarySocialActs: ["closeness_bid"],
  target: "kaira",
  valence: "neutral",
  severity: {
    disrespect: 0,
    coercion: 0.1,
    manipulation: 0,
    privacy: 0.4,
    aggression: 0,
  },
  jokingConfidence: 0.3,
  sincerityConfidence: 0.8,
  affection: 0.1,
  support: 0,
  compliment: 0,
  emotionalLoad: 0.1,
  apology: false,
  repairAttempt: false,
  stopRequest: false,
  discourseFacets: {
    socialRoutine: "none",
    discourseAct: "none",
    repairSignal: "none",
    adviceRequested: false,
    knowledgeQuery: { surface: "senin manitin var mı", confidence: 0.8 },
    selfMemoryQuery: {
      surface: "senin manitin var mı",
      scope: "autobiographical_memory",
      retrievalMode: "targeted",
      confidence: 0.85,
    },
    relationalAct: "closeness_bid",
    relationalIntensity: 0.4,
    stopQuestions: false,
    stopTalking: false,
  },
  worldMemory: { claims: [], query: null },
  uncertainty: { overall: 0.3, intent: 0.2, target: 0.02, severity: 0.3 },
  evidence: [{ source: "llm", provider: "recorded-live-turn-4", cues: [], confidence: 0.7 }],
};

const initialState: DroitDynamicState = {
  calmness: 70,
  anger: 10,
  stress: 20,
  happiness: 70,
  confidence: 70,
  surprise: 10,
  reactionMode: "neutral",
  relationship: {
    firstSeenAt: "2026-09-06T09:21:39.761Z",
    lastInteractionAt: "2026-09-06T09:22:57.132Z",
    familiarityDays: 0,
    interactionCount: 3,
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

describe("real Turn 4 semantic privacy ontology regression", () => {
  it("proves the recorded privacy=0.40 semantic snapshot is sufficient to create the observed relationship injury", async () => {
    const result = await replay(recordedTurn4);
    expect(result.nextDynamicState.relationship?.negativeEvents).toBe(1);
    expect(result.nextDynamicState.relationship?.hurtScore ?? 0).toBeGreaterThan(0);
    expect(result.nextDynamicState.relationship?.conflictScore ?? 0).toBeGreaterThan(0);
    expect(result.nextDynamicState.relationship?.lastNegativePattern).toBe("mahremiyet_ihlali");
  });

  it("keeps the same neutral closeness-bid question relationship-neutral when privacy violation evidence is absent", async () => {
    const corrected: SemanticInterpretation = {
      ...recordedTurn4,
      severity: { ...recordedTurn4.severity, privacy: 0 },
      secondarySocialActs: recordedTurn4.secondarySocialActs.filter((act) => act !== "privacy_violation"),
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

# 4) Architecture record. Keep the separate current-self-state issue explicitly
# out of this work package.
Path('docs/adr/0064-semantic-privacy-violation-ontology.md').write_text('''# ADR-0064 — Privacy severity represents violation, not personal subject matter

## Status
Accepted

## Context
The 2026-09-06 real-user Turn 4 (`senin manit falan var mı`) was recorded as a neutral Kaira-targeted question and `closeness_bid`, but the semantic provider also emitted `privacy=0.40`. That single typed field was enough for the canonical relationship path to create `mahremiyet_ihlali`, reduce warmth/trust, and add conflict/hurt.

Current-main inspection shows the downstream path is internally consistent: `SemanticInterpretation.severity.privacy` projects to `privacyViolation`, the relationship bridge preserves canonical privacy severity, and `semanticNegativePattern` classifies privacy >= 0.15 as `mahremiyet_ihlali`. The first broken boundary is therefore the provider privacy ontology, not RelationshipReducer calibration.

## Decision
- `privacy` severity measures evidence of a privacy *violation*, not how personal the topic is.
- Ordinary voluntary social questions about personal status, relationships, preferences, or personal life are privacy=0 unless the utterance itself contains invasion evidence.
- Mild privacy severity starts only with behavior such as pressuring for explicitly private information or crossing an already stated privacy boundary.
- `privacy_violation` secondary act follows the same evidence rule.
- Keep RelationshipReducer thresholds and privacy injury behavior unchanged for genuine privacy violations.
- Do not add raw-text regexes, phrase rules, or a second semantic authority.

## Scope boundary
Turn 4 also exposed a separate `current self state` vs `autobiographical self-memory` ontology issue: the relationship-status question was routed as autobiographical recall. This ADR does not define or fix that product state authority. Turn 5 boundary-decline-vs-relationship-harm also remains separate.

## Verification
A deterministic replay pins the recorded Turn-4 semantic snapshot and proves privacy=0.40 alone reproduces the relationship injury, while an otherwise identical typed interpretation with privacy=0 remains relationship-neutral. A provider-contract test pins the tightened privacy ontology in the semantic parser system instruction. All verification is API-free.
''', encoding='utf-8')

state = Path('PROJECT_STATE.md')
st = state.read_text(encoding='utf-8')
note = '''\n\n## 2026-09-06 — Real-user Turn 4 privacy ontology repair\n- Recorded Turn 4 `senin manit falan var mı` was neutral, target=kaira, relationalAct=closeness_bid, but semantic privacyViolation=0.40. The canonical downstream path then correctly (for that input) produced `mahremiyet_ihlali`, negativeEvents +1, conflict/hurt and irritated state.\n- Current-main inspection localized the first broken boundary to the semantic-provider privacy ontology: the prompt described `.4` too broadly as a private-boundary request, allowing ordinary personal social curiosity to be treated as a violation.\n- ADR-0064 narrows the ontology: privacy severity / privacy_violation mean actual invasion evidence, not merely personal subject matter. RelationshipReducer privacy thresholds remain unchanged.\n- Deterministic Turn-4 replay proves privacy=.40 reproduces injury and the same typed turn with privacy=0 stays relationship-neutral. No provider call, raw-text parser or phrase patch is introduced.\n- Separate unresolved scopes remain explicit: Turn 4 current-self-state vs autobiographical-memory routing, and Turn 5 boundary-decline vs relationship harm.\n'''
if '## 2026-09-06 — Real-user Turn 4 privacy ontology repair' not in st:
    state.write_text(st.rstrip() + note + '\n', encoding='utf-8')

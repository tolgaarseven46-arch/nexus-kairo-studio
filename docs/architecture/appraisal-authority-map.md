# Kaira Appraisal Authority Map

Status: **PR-A / migration baseline**  
Scope: production social / relational / affective path  
Goal: freeze who may interpret raw user text, who may appraise structured meaning, who may mutate state, and who may choose behavior **before** introducing `SocialAppraisal`.

## 1. Non-negotiable causal rule

The intended post-migration flow is:

```text
raw user message
  -> canonical semantic authority
  -> structured semantic candidates
  + active dyad / relationship / current state / relevant memory
  -> social appraisal
  -> relational + affective projections
  -> state reducers
  -> behavior contract / response plan
  -> speech realization / local language realization
```

### Authority invariant

A production module belongs to exactly one of these roles:

1. **RAW SEMANTIC AUTHORITY** — may read raw user text to create canonical semantic observations.
2. **APPRAISAL** — may combine structured semantic observations with structured context. It MUST NOT reinterpret raw user text.
3. **STATE TRANSITION / PROJECTION** — may mutate/project state from appraisal output. It MUST NOT decide what the user meant.
4. **BEHAVIOR DECISION** — may choose WHAT/WHETHER from state + discourse obligations. It MUST NOT reclassify the user message.
5. **SPEECH REALIZATION** — may choose HOW to express an already-authorized behavior.
6. **OUTPUT VALIDATION** — may inspect Kaira's generated reply. Raw-text inspection here is allowed because it is validating **Kaira output**, not reinterpreting user input.

A module that reads raw user text downstream of canonical semantic ingestion to infer intent, emotion, seriousness, social meaning, relationship meaning, or discourse meaning is a **shadow authority violation**.

---

## 2. Confirmed authority inventory

| Module | Current role | Raw user text? | Creates semantic/social meaning? | Mutates state? | Target role | Status |
|---|---|---:|---:|---:|---|---|
| `serverLanguageUnderstanding` / canonical LU path | canonical ingestion | yes | yes | no | RAW SEMANTIC AUTHORITY | **KEEP** |
| `SemanticInterpretation@2` | canonical immutable turn representation | contains raw/normalized text but is data | no secondary interpretation by itself | no | CANONICAL DATA | **KEEP** |
| `semanticEventEngine` / compatibility projection | deterministic compatibility projection | legacy helpers may receive text | projects canonical/legacy semantics | no | COMPATIBILITY ONLY | **AUDIT / CONTAIN** |
| `kdmRelationshipReducerBridge` | bridge + relational appraisal-like logic + reducer wiring | no raw reparse in canonical path | yes: `semanticNegativePattern`, harm confidence, dyadic/third-party signal construction | indirectly wires relationship + affect transition | APPRAISAL ADAPTER, then thin reducer bridge | **MIGRATE IN PR-C** |
| `relationshipReducer` | relationship FSM + score/recovery/affect math | no | partially: harm/recovery significance is still inferred from input signal | yes | STATE TRANSITION / PROJECTION | **KEEP MATH; CHANGE INPUT** |
| `relationshipBehaviorService::applyRelationshipContext` | relationship-to-behavior projection | no | yes: independently derives `friendlyRelationship`, `damagedRelationship`, `severelyDamagedRelationship`, `healingRelationship` from its own thresholds | modifies behavior profile, not persistent relationship | consume shared appraisal/state projection only | **MIGRATE IN PR-C** |
| `droitBehaviorEngine::computeBehaviorProfile` | personality synthesis | **yes** | **yes**: raw-text distress/emergency detection (`acil`, `üzgün`, `kötü`, `ağla`, `tehlike`, `çök`, `saldır`) changes humor/tone | no persistent state in canonical call | personality-only synthesis; structured appraisal may modulate later | **CONFIRMED SHADOW AUTHORITY / MIGRATE PR-C/E2** |
| `discourseSocialAct::userSignalsAlreadyAnswered` | discourse observation helper | **yes** | yes: re-derives user discourse meaning | no | canonical `discourseFacets` consumer | **CONFIRMED SHADOW AUTHORITY / REMOVE E1** |
| `discourseSocialAct::userSignalsAnswerFriction` | discourse observation helper | **yes** | yes | no | canonical `discourseFacets` consumer | **CONFIRMED SHADOW AUTHORITY / REMOVE E1** |
| `discourseSocialAct::userSignalsStateAnswer` | discourse observation helper | **yes** | yes | no | canonical `discourseFacets` consumer | **CONFIRMED SHADOW AUTHORITY / REMOVE E1** |
| `kairoDialogueDecisionEngine` | discourse/dialogue decision | partly; contains legacy/raw-text helpers and output checks | some input-side heuristics still infer conversational shape | no persistent social state | BEHAVIOR/DIALOGUE DECISION from canonical facets + discourse state | **AUDIT; INPUT-SIDE REPARSE MUST GO** |
| `behaviorContract` | hard social permission contract | no raw reinterpretation | derives permissions from state + structured semantic transient observations | no | BEHAVIOR DECISION BOUNDARY | **KEEP** |
| `kairaResponsePlan` | final WHAT/WHETHER resolver | inspects generated reply only in validators | behavior authority; output validators inspect Kaira reply | no relationship mutation | FINAL BEHAVIOR AUTHORITY + OUTPUT VALIDATION | **KEEP** |
| `kairoSpeechIdentity` | style projection | no raw reparse | derives HOW from personality/state/trace | no | SPEECH REALIZATION | **KEEP** |
| `kairoLanguageMemory` dyadic alignment | learned person-specific writing style | observes raw user style markers during learning | contract explicitly forbids intent/emotion/relationship meaning | language-style memory only | HOW-ONLY DYADIC STYLE | **KEEP; DO NOT CONFUSE WITH DYADIC SOCIAL NORM** |
| `appraisalEngine` | novelty / expectedness / prediction-error proxy | no raw text | yes, but from observable counts/timing | no relationship state | reusable appraisal evidence (`expectedness`, novelty) | **REUSE IN PR-C** |
| `worldStateAppraisal` | read-only epistemic appraisal | no raw reparse | yes, on canonical retrieved evidence | explicitly no relationship/emotion mutation | DOMAIN APPRAISAL REFERENCE | **KEEP / REFERENCE MODEL** |
| `kairaAffectBaseline` | resting affect baseline | no | no | baseline config only | AFFECT BASELINE | **KEEP** |
| final delivery / response consistency guards | output verification | inspect Kaira reply | validate output only | no user-state interpretation | OUTPUT VALIDATION | **KEEP** |

---

## 3. Confirmed architectural facts

### 3.1 Identity continuity exists

Kaira already has user/instance-scoped persistent ownership. The missing construct is **not** “who is this user?”; it is the stronger social context “what is normal/expected in this Kaira-user dyad?” and its causal use during appraisal.

### 3.2 Dyadic style exists, dyadic social norm does not

`kairoLanguageMemory` already learns safe person-specific style signals such as markers and message length, but its own contract is **HOW-only / low authority** and explicitly forbids learning intent, insult meaning, emotion, relationship result, or behavior permission.

Therefore `DyadicSocialNorm` must be introduced as a separate appraisal input, not by increasing the authority of language-style memory.

### 3.3 Appraisal is present but fragmented

There is no single absence of appraisal. Instead, appraisal-like judgments are distributed across:

- `kdmRelationshipReducerBridge` (harm/pattern/context credibility),
- `relationshipBehaviorService` (friendly/damaged relationship categorization),
- `droitBehaviorEngine` (raw-text distress seriousness),
- `appraisalEngine` (novelty/expectedness, currently isolated from social/relationship appraisal),
- domain-specific `worldStateAppraisal` (well-bounded read-only appraisal).

The migration goal is **not** “add appraisal”. It is “create one explicit social-appraisal seam and move the existing social-appraisal responsibilities behind it”.

---

## 4. Target ownership after migration

### Canonical semantic authority owns

- proposition / utterance semantics,
- entity/role observations,
- social-act candidate readings,
- discourse facets,
- uncertainty and evidence/provenance.

It does **not** own Kaira-relative injury, relationship change, emotional change, or final behavior.

### Social appraisal owns

Inputs only:

- canonical semantic candidate readings,
- active dyad identity,
- relationship state,
- `DyadicSocialNorm`,
- current Kaira affect/state,
- personality/boundaries,
- relevant structured memory,
- reusable expectedness/novelty evidence.

Outputs only:

- relational significance,
- affective significance,
- expectedness / norm deviation,
- harm evidence,
- repair evidence,
- confidence / rationale,
- explicit `noMaterialEffect` possibility.

It does **not** mutate persistent state and does **not** inspect raw user text.

### Relationship reducer owns

- warmth/trust/conflict/hurt/repair/familiarity projections,
- decay and recovery math,
- relationship FSM,
- long-horizon relationship projection.

It consumes relational appraisal; it does not infer message meaning.

### Affective transition owns

- projection toward/away from affect baseline,
- bounded anger/stress/happiness/calmness/reaction changes.

It consumes affective appraisal; it does not infer message meaning.

### Behavior contract / response plan own

- WHAT / WHETHER,
- conversation continuation,
- question/humor/affection/advice/forgiveness permissions,
- final social move and response budgets.

They consume state + dialogue/discourse obligations, not raw-message reclassification.

### Speech identity / local language engine own

- HOW / wording / rhythm / style realization.

They cannot create new social permission or override appraisal/state/response plan.

---

## 5. Migration ledger

### PR-A — this document

- [x] Freeze authority roles.
- [x] Record confirmed shadow authorities.
- [x] Record appraisal-like duplicate responsibilities.
- [x] Separate dyadic language style from dyadic social norm.
- [x] Define post-migration ownership.

### E1 — safe early cleanup

- [ ] Remove raw-user-text discourse reparse in `userSignalsAlreadyAnswered`.
- [ ] Remove raw-user-text discourse reparse in `userSignalsAnswerFriction`.
- [ ] Remove raw-user-text discourse reparse in `userSignalsStateAnswer`.
- [ ] Consume canonical `discourseFacets` instead.

### PR-B — contracts only

- [ ] Add `SocialAppraisalInput` / `SocialAppraisalResult`.
- [ ] Add `RelationalAppraisalProjection` / `AffectiveAppraisalProjection`.
- [ ] Encode “appraisal never reads raw user text”.
- [ ] Encode independent zero-effect for relational and affective projections.

### PR-C — parity migration

- [ ] Move bridge harm/pattern/credibility logic behind appraisal seam.
- [ ] Move `relationshipBehaviorService` friendly/damaged categorization behind shared appraisal/state projection.
- [ ] Remove `computeBehaviorProfile` raw-text distress classification; use structured appraisal evidence instead.
- [ ] Reuse `appraisalEngine` expectedness/novelty mathematics rather than rewriting it.
- [ ] Preserve behavior parity where possible.

### PR-D — reducer input switch

- [ ] RelationshipReducer consumes relational appraisal projection.
- [ ] Affective transition consumes affective appraisal projection.
- [ ] Keep tested mutation/decay/recovery math unless a falsification proves the math itself is wrong.

### E2 — appraisal-dependent shadow cleanup

- [ ] Remove remaining downstream raw-user social/emotional interpretation.
- [ ] Keep raw-text access only in canonical ingestion and Kaira-output validators.

### PR-F — minimal DyadicSocialNorm v0

- [ ] `informalityBaseline`
- [ ] `teasingReciprocity`
- [ ] `normConfidence`

### G1 — single-reading zero-effect

- [ ] Appraisal may emit no relational change and/or no affective change for expected benign interactions.

### H — candidate readings

- [ ] Add optional `candidateReadings` beside existing canonical primary fields; do not break current consumers.

### G2 — full contextual adjudication

- [ ] Structured context chooses among canonical candidate readings without rereading raw text.

---

## 6. Stop condition / falsification criterion

After G2/H, run 20–30 **novel** social scenarios that are not paraphrases of known PR#147 bug families.

If passing those scenarios requires more than roughly **3–5 new special-case appraisal branches**, stop adding patches and re-evaluate the abstraction. The failure hypothesis is then not “we need another rule”, but “one monolithic social-appraisal function is itself the wrong abstraction and needs multiple independent appraisal lenses”.

---

## 7. Review rule for future PRs

Any PR that adds a new user-message interpretation outside canonical semantic ingestion must answer:

1. Why is the required observation absent from `SemanticInterpretation` / canonical facets?
2. Why can the canonical contract not be extended once at ingestion?
3. Why is this not a new shadow authority?

If those questions cannot be answered, the interpretation must not be added downstream.

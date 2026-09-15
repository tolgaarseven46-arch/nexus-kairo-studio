# KAIRO PROJECT STATE

> Bu dosya projenin **aktif çalışma checkpoint'idir**; GitHub gerçekliğinin kopyası değildir. Yeni sohbet/çalışma başladığında önce repository'nin gerçek `main` SHA'sı, açık PR/issue'lar ve CI durumu GitHub'dan doğrulanır. Bu dosyada "güncel main SHA", "açık PR yok" veya benzeri hızla bayatlayan iddialar tutulmaz. Tarihsel ayrıntı Git geçmişi, `AI_CHANGELOG.md` ve `docs/adr/**` içindedir.

## 1. Değişmez mimari kurallar
- `SemanticInterpretation@2` current-turn sınıflandırmasının tek canonical semantik otoritesidir.
- Morphology / syntax / discourse katmanları typed evidence üretir; downstream katmanlar raw text'ten ikinci semantic truth üretmez.
- Historical consumer, persisted canonical semantic snapshot mevcutsa onu kullanır; geçmiş raw text yeni semantic authority olamaz.
- `RelationshipReducer`, social appraisal, memory, dialogue decision, behavior/response ve persistence ownership sınırları korunur.
- SpeechIdentity yalnız **HOW**; BehaviorContract / KairaResponsePlan **WHAT/WHETHER** authority'sidir.
- Prompt assembly yeni semantic/behavior authority değildir; upstream typed/owned blokları provider sınırında serialize eder.
- Meaning/content `unknown | ambiguous | low-confidence` kalabilir; state ownership / lease / scope / canonical authority belirsiz bırakılamaz.
- Provider/API seçimi canonical semantic truth veya deterministic architecture proof değildir.
- Yeni regex/classifier/phrase patch yalnız ölçülmüş failure class ile gerekçelendirilir.
- Production patch zinciri: deterministic characterization RED → owning-seam minimal fix → neighboring regression → full CI.

## 2. Pre-AI sistem sınırı
Bu checkpoint'in kapsamı kullanıcı mesajının girişinden **final provider prompt boundary**'ye kadardır. Model cevabının kalitesi, prompt wording tuning'i, temperature/model seçimi ve provider-output estetik değerlendirmesi bu kapanışın dışında tutulur.

Katman modeli:
- A Input / Evidence
- B Entity / Attribution
- C Discourse / Episode
- D Canonical Semantic
- E Temporal / Lifecycle
- F Relationship
- G Memory
- H Social Appraisal
- I Commitment / Norm
- J State Ownership
- K Concurrency
- L Persistence / Hydration
- M Decision / Behavior
- N Speech Identity
- O Controlled Spontaneity / Historical Recall
- P Observability / Trace
- Q Architecture Governance
- R Multi-Party Attention / Engagement
- S Prompt Assembly / Realization Authority

`R` gerçek eşzamanlı multi-party engagement kararı mevcut tek-aktif-konuşmacı runtime için **FUTURE / OUT-OF-SCOPE**'tur; participant attribution ve user-local isolation mevcut pre-AI invariants içinde kalır.

## 3. Foundation — CLOSED for measured pre-AI scope
Aşağıdaki foundation aileleri deterministic/contract/integration kanıtlarıyla kurulmuştur; ayrıntılı PR/commit geçmişi Git ve `AI_CHANGELOG.md` içindedir:
- canonical semantic authority + provider-neutral boundary,
- relationship / memory / persistence foundation,
- state mutation ownership + concurrency / idempotency / lease fail-closed,
- discourse / counterfactual / temporal authority,
- world/self/relationship separation,
- social appraisal + commitment/betrayal lifecycle,
- affect baseline + qualitative reaction mode,
- BehaviorContract / KairaResponsePlan final WHAT/WHETHER authority,
- SpeechIdentity HOW boundary,
- final-delivery/provider-attempt/timeout safety,
- persistence/hydration parity and corruption/version mismatch handling,
- multi-user deterministic isolation,
- controlled spontaneity persisted semantic history consumption,
- Phase-0 deterministic pre-AI harness + beta/KNT/seeded acceptance gates.

## 4. Final pre-AI architecture — FROZEN
A–S pre-AI architecture is frozen at the architectural layer level.

Final decisions:
- **T3 / Dialogue Board:** CLOSED — observational only; no question/advice/humor/speculation/social-move/style permission grant.
- **T6 / historical grounding:** CLOSED — persisted canonical semantic history owns historical uncertainty; raw text cannot recreate shadow semantics; missing snapshot fails closed.
- **T2 / SpeechIdentity:** CLOSED — HOW only; reopening/forgiveness/repair-completion remain ResponsePlan/BehaviorContract decisions.
- **T5 / provider-output repair:** CLOSED as bounded realization mechanism — repaired output must pass the same grounding/attribution/dialogue/ResponsePlan/affect/world validators before adoption.
- **R / true simultaneous multi-party engagement:** FUTURE / OUT-OF-SCOPE under current single-active-speaker runtime.
- **S / prompt assembly + socialStyle:** CLOSED — assembly/default-style guidance may narrow realization but cannot grant new WHAT/WHETHER permission or semantic certainty.
- **Q / governance:** CLOSED — volatile GitHub truth is queried from GitHub; this file is not a SHA/PR/CI mirror.

Freeze ADR:
- `docs/adr/2026-09-15-pre-ai-architecture-freeze.md`

Authority-closure ADR:
- `docs/adr/2026-09-15-pre-ai-final-authority-closure.md`

## 5. Frozen finite composition stress suite
Architecture closure uses six finite cross-layer composition classes rather than an unbounded sentence catalog:
1. attribution × uncertainty × historical memory,
2. repair × relationship × HOW,
3. fragmented discourse × commitment lifecycle,
4. concurrency × persistence × user isolation,
5. ambiguity × fail-closed × state mutation,
6. provider-boundary authority collision.

These classes are backed by existing characterization/contract/integration/acceptance/historical-replay gates in CI. They prove failure containment and authority composition; they do not claim universal natural-language understanding.

## 6. Test truth / proof levels
Test results must be described by what they really exercise:
1. unit proof,
2. contract proof,
3. characterization proof,
4. shared-production-function proof,
5. production-context integration proof,
6. deterministic pre-AI end-to-end proof,
7. persistence/hydration/concurrency proof,
8. adversarial / long-horizon / historical replay proof.

A green harness may not be described as full production-path proof when it intentionally substitutes deterministic ingress, omits persistent hydration, or stops before provider execution.

The frozen Phase-0 baseline remains 21 scenarios / 423 turns and stops at `FINAL_PROVIDER_PROMPT_BUILT_NO_PROVIDER_CALL`.

## 7. Grey-zone policy
- Semantic meaning may remain `unknown`, `ambiguous`, `low-confidence`, or unresolved when evidence is insufficient.
- Uncertainty may damp or block state mutation rather than forcing a guessed interpretation.
- Downstream layers cannot increase semantic certainty without an explicitly owned resolution contract.
- Authority, state ownership, user scope, persistence owner and concurrency lease are not grey zones; ambiguity there fails closed.
- A weird conversation that stays inside these invariants is a bounded product-quality issue, not automatically a reason to reopen architecture.

## 8. Architecture reopening rule
After pre-AI freeze, **general architecture audit does not automatically reopen the system**.

New architecture work requires at least one of:
1. a measured invariant violation with reproducible evidence,
2. a frozen reopening-condition hit (authority collision, ownership leak, cross-user contamination, persistence divergence, production/test-path mismatch that invalidates a claimed proof),
3. an explicit new product requirement that expands the frozen system boundary.

Otherwise:
- new sentence/conversation examples map to an existing failure class,
- non-critical ambiguity remains a typed grey zone,
- future modalities/features stay in backlog/out-of-scope,
- no ad-hoc downstream regex/phrase patch is added.

## 9. Frozen Definition of Done — pre-AI architecture
The pre-AI Definition of Done is satisfied when the freeze ADR is on `main` and its CI remains green:
- A–S layer set and owners explicit,
- canonical authority collisions absent,
- state scopes/owners deterministic,
- historical semantic consumers do not create shadow truth,
- grey-zone/fail-closed policy explicit,
- production seams honestly classify proof coverage,
- measured closure blockers GREEN under targeted + neighboring + full CI,
- persistence/hydration/concurrency isolation gates GREEN,
- prompt assembly cannot silently expand WHAT/WHETHER authority,
- observability identifies owning seam/failure class,
- governance docs do not claim volatile GitHub state.

## 10. Next handoff rule
Before any next action:
1. query GitHub for actual `main`, PRs and CI,
2. read the freeze/closure ADRs,
3. do not reopen frozen pre-AI architecture from old chat memory or generic audit concerns,
4. reopen architecture only under the frozen reopening rule,
5. otherwise move to **model-in-the-loop / answer-quality validation** and treat ordinary response-quality misses as product-quality work unless they reveal a measured frozen invariant violation.

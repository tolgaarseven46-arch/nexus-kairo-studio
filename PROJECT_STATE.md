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

## 11. Model-in-the-loop recovery checkpoint
A live provider response exposed the measured failure class `response_plan_unsupported_generated_claim`.

Current decision:
- generated-claim provenance remains authoritative and must continue rejecting unsupported claims,
- this failure does **not** reopen the frozen pre-AI architecture,
- containment belongs to the existing `kairaRecoveryPolicy` seam,
- recovery may remove the unsupported claim and emit only a bounded ResponsePlan-conformant fallback; it must not reinterpret user semantics or grant new WHAT/WHETHER permission,
- characterization evidence must remain RED-before-fix and the fix must pass the same canonical constraint boundary plus full CI.


## 12. PrivatRoom platform capability boundary — additive product expansion
A new explicit product requirement expands the frozen system boundary: Kaira must operate inside PrivatRoom as a typed social-platform admin without moving platform authority into the Kaira core.

Boundary decision:
- the frozen semantic / memory / relationship / appraisal / decision / behavior authorities remain unchanged,
- PrivatRoom owns platform facts, roles, rules source-of-truth, scoped capability grants, approval policy and execution,
- Kaira may consume typed platform context and emit typed proposed platform actions,
- social/group-fit inference is Kaira-owned and is intentionally excluded from `PlatformContextV1`,
- event identity/version/idempotency remain in the event envelope, not the context snapshot,
- rules are referenced by `rulesVersion` rather than copied into every message event,
- capability grants are scoped and may expire; role identity does not imply executable capability,
- this contract-only phase does not yet wire actions into the canonical decision runtime or change live response behavior.

Initial contract proof:
- `src/integrations/privatroom/platformContracts.ts`
- `src/services/privatRoomPlatformContracts.test.ts`

Next seam after contract closure:
- characterize where `PlatformActionIntent` belongs in the existing canonical decision output before any runtime wiring.


## 13. Social-platform product freeze → Slice A measurement-first checkpoint

The Kaira × PrivatRoom product/scenario design was reviewed through v0.4 with Tolga + Claude.
No freeze-blocker remains at product level.

Delivery is now measurement-first:
- prior action-decision PR #283 is intentionally parked/closed and must not be merged before Slice A/B gates,
- Slice A owns TestRun provenance, Fresh/Continuation/Replay isolation, replay hard sandbox and proof quality,
- Slice B owns multi-user Conversation Graph/context fixtures,
- Slice C owns first user-facing behavior (adaptive address, trial UI authority, first-server rule draft).

Hard product/test invariants:
- exact build/prompt/policy/feature/environment provenance,
- replay allowlist/default-deny and zero real side effects,
- namespaced test memory/relationship/KNT,
- cross-server zero-leak,
- demographic/tone-only data structurally excluded from decision/capability input,
- independent Claude red-team and Tolga product review,
- no promotion without CI + replay + live TestRun review.

Current implementation slice:
**Slice A1 — TestRun provenance v1 + replay sandbox policy.**

Authority/behavior expansion is intentionally paused until Slice A measurement infrastructure is proven.


## 14. Slice A2 — explicit Fresh / Continuation / Replay state isolation
After Slice A1 merged, state isolation is characterized before any real persistence wiring.

Current proof:
- every TestRun state is namespaced by environment + testRun + server + Kaira instance,
- Fresh has no implicit source,
- Continuation requires an explicit sourceRunId and forks into a new namespace,
- Replay requires explicit sourceRunId + frozenSnapshotId,
- memory / relationship / appraisal / explicit address override / capability / KNT / trial /
  conversation graph / repair state classes are all covered by deterministic zero-leak tests,
- continuation does not see source state until an explicit validated fork is performed.

This remains a pure proof seam; production memory/relationship persistence is not rewired yet.


## 15. Slice A3 — frozen replay platform snapshot + TestRun record factory
Replay inputs are now explicitly frozen before real runtime integration.

Current proof:
- replay records require a source TestRun + frozenSnapshotId,
- replay snapshot freezes platform context, capability grants, rules, trial state, feature flags,
  policyConfigVersion, integration contract version and conversation events,
- TestRun record construction rejects source/snapshot/version mismatches,
- non-replay runs cannot accidentally carry a replay snapshot,
- replay readers return defensive copies so replay execution cannot mutate frozen source evidence.

Next Slice A work:
- persist/populate a real TestRun record at runtime,
- add demographic decision-parity characterization,
- wire replay-local sinks without production side effects.


## 16. Slice A4 — decision / realization data isolation
The v0.4 product freeze requires demographic/profile facts to affect HOW only, never WHAT/WHETHER.

Current proof seam:
- `PlatformDecisionContextV1` structurally excludes form-of-address, gender, age-band, locale and room-style fields,
- `ToneOnlyRealizationContextV1` owns those realization-only hints,
- parity harness never passes tone context into the decision function,
- a near-boundary moderation fixture proves the comparable decision projection remains identical across very different tone profiles,
- realization may vary wording while the frozen decision object remains equal.

This is additive proof infrastructure only; the live provider call split is not wired yet.


## 17. Slice A5 — runtime provenance population seam
A runtime-internal TestRun provenance route now builds a complete TestRun record from exact deploy/build facts.

Current proof:
- Kaira deploy SHA is sourced from `RENDER_GIT_COMMIT` (or explicit `KAIRA_GIT_COMMIT` fallback),
- PrivatRoom deploy SHA must be supplied as an exact SHA and invalid/missing values fail closed,
- prompt/policy/model/feature/scenario/environment provenance is populated into the same record,
- Fresh and Continuation state bindings are created through the same validated factory,
- continuation requires an explicit source run,
- the internal route does not change live Kaira reply behavior; it is an observability/provenance seam.

Next Slice A work:
- carry TestRun context from PrivatRoom beta room automatically,
- persist/retrieve the populated TestRun record under an isolated test namespace,
- connect turn-level KNT/session evidence to the TestRun id.


## 18. Slice A6 — live beta TestRun binding
Live PrivatRoom beta rooms now carry a deterministic TestRun identity into Kaira without changing ordinary chat behavior.

Current binding:
- PrivatRoom beta route derives one TestRun id per room/environment and forwards it with environment + exact PrivatRoom deploy SHA,
- Kaira validates the incoming live TestRun record through the same provenance/state factories used by Slice A,
- the TestRun id becomes the chat session id for beta test runs,
- KNT traces receive both `testRunId` and `sessionId`,
- TestSession turn records receive `testRunId` + full TestRun provenance,
- parent TestSession summaries keep the same TestRun link,
- non-TestRun callers retain the legacy session id path unchanged.

This gives one stable review key for:
PrivatRoom room → Kaira chat turn → KNT trace → TestSession transcript → exact build/prompt/policy provenance.


## 19. Slice A8 — persisted live capture proof
Live beta observability now distinguishes "reply succeeded" from "TestRun evidence persisted".

Current proof:
- chat response emits a typed TestRun capture proof only for TestRun-bound traffic,
- `persisted=true` requires a concrete saved TestSession turn id,
- missing/failed TestSession persistence cannot be presented as a successful recording,
- PrivatRoom propagates the capture proof and logs `testRunId + persisted`,
- beta owner UI shows `REC` / `NO REC` next to the TestRun id,
- legacy non-TestRun chat gets no capture proof.

This closes the final silent-failure gap before the first real live TestRun acceptance.


## 20. Slice A9 — TestRun review packet
A persisted live TestRun can now be projected into one stable review packet.

Current proof:
- one TestRun id resolves to its persisted TestSession transcript,
- the review packet carries exact stored provenance, turn order, user/assistant text, provider, timings,
  semantic evidence, reasoning trace, response plan, state/relationship changes, retrieved memory and consistency evidence,
- review identity remains the canonical TestRun/session id; no parallel review id is invented,
- the read-only review route is internal-authenticated and does not change live chat behavior.

This is the review seam needed for joint live-beta inspection after REC proof.


## 21. Slice A10 — live-beta TestSession read privacy hardening + live acceptance proof

The first real Slice A live acceptance passed against deployed Render services using an isolated synthetic room/user.

Acceptance evidence:
- GitHub Actions run: `35310419905`,
- TestRun: `TR_live_beta_slice-a-acceptance-35310419905`,
- PrivatRoom -> Kaira live bridge returned `testCapture.persisted=true`,
- persisted turn id: `turn_1789708851349_avm4`,
- persisted TestSession read-back returned the same TestRun/session id and one stored turn,
- live provider reply was `merhaba`,
- acceptance ended with `SLICE_A_LIVE_ACCEPTANCE=PASS`.

The acceptance also exposed a privacy gap: predictable `TR_live_beta_*` TestSession ids were readable through the legacy public TestSession endpoints.

A10 hardening:
- exact `/api/test-sessions/:sessionId` reads require internal bearer auth when the id starts `TR_live_beta_`,
- `/api/test-sessions/active` also refuses to return a protected live-beta session without internal auth,
- legacy Studio TestSession ids remain backward-compatible/public under the existing test tooling contract,
- the owner-facing PrivatRoom review path remains server-mediated and uses the server-side integration token after Firebase owner verification.

This privacy gate must be live-verified before Slice A is declared complete.

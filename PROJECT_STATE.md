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


## 21. Slice A W9 — internal live review evidence probe
The final Slice A joint-review gate may use an ephemeral internal startup probe to read the already-persisted live TestRun through the same review-packet builder without weakening any external auth boundary.

Constraints:
- the probe is read-only and uses the existing persisted TestSession,
- it logs only a sanitized review summary (canonical ids, exact build provenance, transcript/provider/timing and evidence-presence booleans),
- it does not expose a public route or bypass the owner-authenticated PrivatRoom review proxy,
- it must be removed after W9 evidence is captured,
- W10 remains blocked until the captured packet is reviewed and the promotion gate is explicitly closed.

- W9 startup evidence probe retries persisted TestSession reads after process startup so infrastructure initialization order cannot create a false negative.


## 22. Slice A W9/W10 — live review accepted and measurement slice promoted
W9 live review evidence was captured from Render for TestRun `TR_live_beta_slice-a-acceptance-35310419905`.

Verified review packet:
- canonical `testRunId == sessionId == TR_live_beta_slice-a-acceptance-35310419905`,
- turnCount = 1,
- Kaira provenance commit = `8de75dc71a32f8d4c31c83bcc45ccb4cbd972fb5`,
- PrivatRoom provenance commit = `033fadf62d175811f2071fd6782c982b65094e9f`,
- transcript = user `selam kairo` → assistant `merhaba`,
- provider = `local_language`,
- semantic, reasoning, response-plan, state, relationship and consistency evidence are present,
- retrieved-memory count = 0 for this greeting turn,
- no cross-server leak, false execution claim or replay sandbox leak was observed in the accepted Slice A evidence chain.

The ephemeral startup reader was removed after evidence capture; no external auth boundary was weakened.

W10 decision:
- Slice A measurement/isolation infrastructure is promoted/accepted.
- The W0–W10 workflow remains authoritative for later slices.
- Slice B may begin; Slice C behavior remains gated behind its own W0–W10 evidence chain.


## 23. Slice B — W0/W1 multi-user observation checkpoint
Slice A is accepted; Slice B has begun under the same W0–W10 workflow.

Current scope is observation only:
- Conversation Graph evidence,
- cold / warm / experienced-owner fixtures,
- addressedTo / suppressedResponse / ignoredBy / escalation evidence.

The frozen pre-AI `R` multi-party engagement authority is NOT reopened. Conversation Graph may not decide WHETHER/WHAT Kaira says, grant capabilities, mutate relationship/appraisal state, or create canonical semantics.

W0 product problem and W1 scenarios/failure classes are captured in:
- `docs/slice-b-multi-user-observation-freeze-packet.md`

W2 independent red-team and W3 Tolga product freeze remain mandatory. No W5 RED or implementation begins before both gates close.


## 24. Slice B pre-red-team hardening
An internal adversarial pass found and hardened eight candidate authority/isolation risks before W2:
- resolved addressed-to truth replaced by explicit facts + inferred candidates,
- `ignoredBy` renamed to observable unanswered-turn evidence,
- escalation reduced to refs to existing owned evidence,
- cold/warm/experienced-owner kept test-fixture-only,
- suppression requires an owning decision receipt,
- deterministic total order defined,
- graph schema/derivation/snapshot provenance required,
- actor kind made explicit for Droit/system self-event observation.

This pass is deliberately NON-AUTHORITATIVE and does not satisfy W2 independent review.


## 25. Slice B W3/W4 preparation
While W2 independent red-team remains open, a non-authoritative W3 freeze draft and W4 deterministic test map are prepared at:
- `docs/slice-b-w3-freeze-draft-w4-test-map.md`

This does not close W2 or W3 and does not authorize W5/implementation.
The draft defines the candidate graph shape, fixture semantics and 20 characterization targets so W2 findings can be applied mechanically rather than restarting design.


## 26. Slice B W2 reviewer handoff ready
The exact independent red-team request and response schema are frozen at:
- `docs/reviews/slice-b-w2-independent-red-team-request.md`

This makes W2 externally reviewable without ambiguity. It does not itself satisfy W2.


## 27. Slice B W5 fixture preparation
Twenty deterministic Slice B fixture contracts are prepared but inactive at:
- `docs/tests/slice-b-w5-fixture-spec.md`

They define expected invariants for cold/warm/experienced-owner, explicit reply/mention, unresolved refs, duplicate/conflicting ids, ordering, namespace isolation, unanswered-turn evidence, suppression receipts, escalation refs, semantic non-invention, replay and Droit self-events.

No characterization RED has been run. W5 remains blocked by W2 independent review + W3 freeze.


## 28. Slice B W2 machine-readable review intake
The external W2 review can now be validated structurally before it is accepted:
- schema: `docs/reviews/slice-b-w2-review.schema.json`
- validator: `src/services/sliceBW2ReviewIntake.ts`
- tests: `src/services/sliceBW2ReviewIntake.test.ts`

The gate requires an explicitly independent reviewer, complete finding fields, all seven verdicts, zero remaining blockers and an explicit safe-to-enter-W3 verdict.

This governance tooling does not satisfy W2 by itself and does not authorize W5.


## 29. Slice B W2 → W3 transition planner
A deterministic transition planner now converts a validated independent W2 review into:
- unresolved blocker IDs,
- minimum repair + required-test work,
- the seven-item W3 freeze checklist,
- an explicit `canFreezeW3` result.

Files:
- `src/services/sliceBW2ToW3TransitionPlanner.ts`
- `src/services/sliceBW2ToW3TransitionPlanner.test.ts`

This still does not satisfy W2 by itself; it only prevents manual ambiguity once the external review arrives.


## 30. Slice B W2 one-shot external handoff
A single-copy external reviewer prompt is prepared at:
- `docs/reviews/slice-b-w2-one-shot-external-prompt.md`

It requires JSON output matching the already-merged W2 intake validator, so an external review can be processed immediately into blocker repairs and the W3 transition plan.


## 31. Canonical PrivatRoom welcome migration
PrivatRoom welcome behavior is moving off the temporary platform-owned `kaira_welcome_pool`.

Authority boundary:
- PrivatRoom owns factual lifecycle events: `room.created` / `participant.joined`.
- Kaira owns WHETHER/HOW-TO-WELCOME decision in `kairaWelcomeDecision.ts`.
- Kaira realization owns wording/variant selection in `kairaWelcomeRealizer.ts`.
- Conversation Graph remains observational and owns no welcome decision.
- Cold-start welcome reads no relationship memory.
- Internal architecture terms are prohibited at realization.
- `realizationVariantSeed` + `realizationVariantId` are persisted in TestRun metadata for deterministic replay/review.

The temporary PrivatRoom local welcome pool is migration-only and must be removed from live production once the lifecycle gateway is deployed.


## 32. First-encounter quality + latency evidence gate (2026-09-18)

Live beta reproduced four concrete first-encounter failures in one room/TestRun:
- scripted welcome wording,
- `naber` degrading to generic acknowledgement (`he anladım`),
- `napıyoruz burada` degrading to a non-answer (`heh, baya net söyledin`),
- user-facing identity drift/generic labels, plus ~20s reply latency.

The repair is explicitly evidence-gated by:
- `docs/reviews/first-encounter-quality-latency-proof-plan.md`
- `src/services/kairaFirstEncounterHistoricalRegression.test.ts`

Authority decision:
- SemanticInterpretation@2 remains the only user-semantic authority.
- First-encounter speedups may only consume canonical socialRoutine / reconciled first-encounter semantic evidence.
- PrivatRoom remains factual context only (room name / owner fact); it does not choose reply meaning or wording.
- Kaira decision/response-plan remains WHAT/WHETHER authority.
- First-encounter deterministic realizers are HOW-only and are still subjected to canonical delivery checks.
- Conversation Graph remains observational.

Runtime decision:
- trivial canonical social routines and typed room-context questions may bypass provider calls during the first three real turns;
- non-trivial first-encounter provider calls have explicit semantic/generation deadlines;
- first-encounter repair does not launch an additional provider round-trip;
- timing + realization variant provenance is persisted for live TestRun review.

Historical RED evidence was captured in CI run `35333356648`: all four live failure fixtures failed before the repair.


## 32. First-encounter continuity + latency v2

Live beta TestRun evidence on 2026-09-18 exposed two remaining defects after the first canonical welcome repair:

1. canonical fast social replies were semantically correct but still user-visible after multi-second persistence/post-process waits;
2. contextual short replies such as `iyilik` after Kaira asked `sen nasılsın?` fell out of the canonical social fast path and could reach the provider, producing weak acknowledgement output.

### Authority decision

- `SemanticInterpretation@2` remains the only semantic authority.
- A new canonical social routine `well_being_reply` represents a short contextual answer to Kaira's immediately preceding well-being prompt.
- This reconciliation is context-bounded and evidence-backed inside `serverLanguageUnderstanding.ts`; no separate raw-string persona/intention engine is introduced.
- First-encounter realization consumes canonical routine + response plan only.
- Provider bypass is allowed only for canonical safe social routines already accepted by the existing final-delivery constraints.

### Latency decision

Critical user-visible continuity is defined as:
- KDM relationship/state persistence when enabled;
- TestRun turn + session summary persistence.

Those writes must complete successfully before a first-encounter fast reply is returned.

Non-critical telemetry/state observation:
- KDM metric telemetry;
- KNT trace telemetry;
- autonomous activity observation;
- lived/world memory persistence for trivial canonical social fast turns

must not extend the user-visible critical path.

Implementation:
- KDM state + trace are committed in one Firestore batch.
- TestRun turn + session summary are committed in one Firestore batch.
- first-encounter fast turns use strict persistence semantics for critical continuity writes.
- trivial social fast turns skip lived-world persistence as not applicable.
- telemetry/autonomous observation runs after the response payload has been sent.
- runtime logs now expose `ownershipMs`, `livedMemoryMs`, `criticalPersistenceMs`, `postProcessMs`, and `serverTotalMs`.

### Acceptance evidence

Historical live evidence before v2:
- greeting: semantic ~137ms, AI 0ms, server total ~10.14s
- how-are-you: semantic ~72ms, AI 0ms, server total ~6.37s
- `iyilik`: fell through to provider and returned weak acknowledgement

Required post-deploy proof:
- `iyilik` resolves as `well_being_reply` with zero provider calls;
- continuity records exist before response;
- telemetry runs after response;
- first-encounter fast replies materially reduce server total latency while preserving replay/TestRun continuity.


## 33. First-encounter well-being decision-authority live RED (2026-09-18)

Post-#309 production probe exposed an authority-ordering defect that deterministic semantic-only coverage did not catch.

Live RED evidence from temporary non-merge PR #310:
- input: `iyilik` after Kaira `gayet iyiyim, sen nasılsın?`
- canonical semantic routine: `well_being_reply`
- semantic source: `fallback_regex`
- actual provider: `openrouter`
- actual reply: `he tamam o zaman`
- `semanticMs=302`, `memoryMs=573`, `kdmMs=9`, `aiMs=2054`, `postProcessMs=4800`, `serverTotalMs=11582`
- external probe wall time: `14735ms`

Root cause:
- `discourse.previousTurnDependency` was evaluated before the canonical social-routine decision.
- That observational dependency converted the primary move to `follow_previous_answer` even though canonical semantics already classified the turn as `well_being_reply`.
- The first-encounter HOW-only realizer correctly refused to override that decision, so runtime fell through to provider generation.

Authority repair:
- observational previous-turn dependency must not demote a typed `well_being_reply` semantic routine;
- `well_being_reply` retains `complete_social_routine` as the primary dialogue move;
- no new semantic authority, raw-text shortcut, or realizer-side decision override is introduced.

Regression:
- `kairaFirstEncounterContinuityLatencyV2Regression.test.ts` now reproduces the exact history + semantic + discourse composition and requires `complete_social_routine / well_being_reply`.


## 34. First-encounter critical-path latency v3 (2026-09-18)

Post-#311 production acceptance fixed the semantic/realization failure but still measured excessive latency:
- reply: `güzel, sevindim`
- provider: `local_language`
- semantic routine: `well_being_reply`
- `aiMs=0`
- `serverTotalMs=7642`
- external wall time: `9175ms`
- `ownershipMs=775`
- `criticalPersistenceMs=881`
- `postProcessMs=1657`

This proves the remaining latency is not provider generation and not required continuity persistence alone.

v3 critical-path rule:
- typed trivial first-encounter social turns may skip unrelated activity-permission lookup unless an explicit permission request id is being answered;
- they may skip social-appraisal autobiographical/world-memory hydration because the canonical turn carries no appraisal/commitment obligation;
- relationship/KDM state hydration remains enabled;
- state-mutation ownership verification remains enabled;
- relationship persistence and TestRun turn/session continuity remain strict and complete before response;
- non-trivial/default turns retain the existing activity-permission and social-appraisal behavior.

No new semantic or decision authority is introduced. The optimization is execution scheduling only.


## 35. First-encounter Firestore round-trip latency v4 (2026-09-18)

Live v3 production evidence remained latency-RED despite semantic/provider GREEN:
- `providerUsed=local_language`
- `socialRoutine=well_being_reply`
- `aiMs=0`
- `memoryMs=1385`
- `ownershipMs=1453`
- `criticalPersistenceMs=1733`
- `serverTotalMs=7798`
- client wall time `10872ms`

The remaining delay is dominated by distributed coordination and persistence round trips rather than language generation.

v4 scheduling decisions:
- the state-mutation lease is already acquired authoritatively before the turn pipeline and renewed by its background lease timer;
- immediately before mutation, the runtime now performs a local held/lost assertion instead of forcing an additional Firestore renewal transaction;
- typed trivial first-encounter social turns still hydrate relationship state, but skip unrelated persistent dialogue-memory and language-memory hydration;
- after strict relationship/TestRun continuity writes succeed, the user response may be sent before distributed replay bookkeeping finishes;
- distributed idempotency completion and state-lease release still execute immediately after response as deferred bookkeeping;
- non-trivial/default turns retain synchronous coordination completion behavior.

No semantic, dialogue-decision, relationship, or replay authority is weakened. This is execution scheduling only.


## 36. First-encounter TestSession persistence latency v5 (2026-09-18)

v4 production evidence:
- semantic/provider path GREEN: `well_being_reply`, `local_language`, `aiMs=0`
- client wall time GREEN against the 7s gate: `5702ms`
- strict internal server gate narrowly RED: `5468ms`
- `ownershipMs=0`, `memoryMs=253`, `criticalPersistenceMs=1741`

The remaining dominant critical-path cost is TestSession persistence performing a Firestore session `getDoc` immediately before its batch commit.

v5 rule:
- for first-encounter fast turns, the caller supplies a deterministic `turnNumberHint` derived from canonical request history;
- `saveTestSessionTurn` skips the session pre-read when that hint is present;
- the turn document and session summary are still committed atomically in the same strict Firestore batch before response;
- default/non-fast callers retain the existing session pre-read and turn-count behavior.

This removes one network round trip without weakening TestRun/session continuity.


## 37. First-encounter parallel coordination latency v6 (2026-09-18)

v5 production probe remained latency-RED under Firestore variance:
- `providerUsed=local_language`
- `socialRoutine=well_being_reply`
- `aiMs=0`
- `memoryMs=1503`
- `ownershipMs=0`
- `criticalPersistenceMs=1899`
- `serverTotalMs=8301`
- client wall time `8527ms`

The measured blocks leave ~4.68s before/around semantic+state preparation. Code inspection shows two independent distributed Firestore operations were serialized at request start: state-mutation lease acquisition followed by distributed idempotency claim.

v6 scheduling:
- begin state-mutation lease acquisition and distributed idempotency claim concurrently;
- an owner claim still waits for state-mutation ownership before entering the mutable turn pipeline;
- replay/wait claims no longer wait for a state lease that they do not need; any concurrently-started lease acquisition is released asynchronously;
- relationship-state hydration starts immediately after coordination ownership and overlaps semantic interpretation;
- strict relationship and TestRun continuity persistence remain response-blocking for first-encounter fast replies.

No replay, serialization, semantic, or persistence authority is weakened; only independent I/O is overlapped.


## 38. First-encounter lease-held deferred continuity v7 (2026-09-18)

v6 production probe:
- semantic/provider GREEN: `well_being_reply`, `local_language`, `aiMs=0`
- client latency: `5641ms`
- server latency: `5444ms` (444ms above the internal 5s gate)
- `memoryMs=1391`
- `criticalPersistenceMs=1908`

The remaining visible wait is the durability barrier itself. v7 changes the barrier shape without allowing a later turn to observe stale state:
- first-encounter fast replies preallocate a canonical `turnId`;
- the response is sent with that exact id before Firestore relationship/TestSession continuity commits finish;
- the distributed state-mutation lease and idempotency ownership remain held after response;
- relationship state and TestSession turn/session continuity are persisted immediately after response;
- only after those strict writes succeed is the distributed idempotency claim completed and the state lease released;
- therefore a subsequent request for the same state owner cannot enter the mutable turn pipeline before prior continuity is durable;
- telemetry/autonomous observation remains non-causal and runs after continuity.

Failure caveat: a process crash in the short post-response/pre-persistence window can lose the just-returned turn. The lease-held design removes stale-next-turn execution during normal operation but is not equivalent to pre-response crash durability. This tradeoff is explicit and bounded to the first-encounter trivial social fast path.


## 39. First-encounter combined distributed coordination v8 (2026-09-18)

v7 production timing proved the remaining response delay is dominated by request-start coordination rather than semantic, model, or persistence work:
- `semanticMs=291`
- `memoryMs=1454`
- `kdmMs=36`
- `aiMs=0`
- `criticalPersistenceMs=0` before response
- `postProcessMs=0`
- `serverTotalMs=6706`
- client wall time `7271ms`

The measured work accounts for only ~1.8s, leaving ~4.9s in distributed coordination before semantic processing.

v8 coordination rule:
- first-encounter requests use one Firestore transaction to acquire both the distributed idempotency claim and the state-owner mutation lease;
- replay and in-flight duplicate detection remain authoritative through the same idempotency record;
- state-owner serialization remains authoritative through the same state-lock record;
- both ownership records are written atomically only when neither an active duplicate nor an active state owner blocks the request;
- first-encounter owner requests then adopt the already-acquired state lease without a second acquisition transaction;
- default/non-first-encounter requests retain the existing coordinator path unchanged;
- lease renewal, failure cleanup, replay completion and state release remain unchanged after acquisition.

This removes one full Firestore transaction from the normal first-encounter critical path without weakening replay or state-serialization guarantees.


## 40. First-encounter first-user hydration v9 (2026-09-18)

v8 production proof:
- reply `güzel, sevindim`
- `providerUsed=local_language`
- `socialRoutine=well_being_reply`
- `aiMs=0`
- `semanticMs=226`
- `memoryMs=1386`
- `kdmMs=13`
- `postProcessMs=0`
- `serverTotalMs=5654`
- client wall time `6019ms`

The remaining measured avoidable cost is remote relationship hydration on the first user turn of a first-encounter flow.

v9 rule:
- if `conversationPhase=first_encounter` and sanitized history contains no prior user turn, persisted relationship state is not fetched from Firestore before response;
- explicit request dynamicState remains authoritative when supplied;
- later first-encounter turns and all default turns keep persistent relationship hydration unchanged;
- deferred continuity persistence remains lease-held exactly as in v7/v8.

This is a first-turn scheduling optimization only; no semantic or relationship authority is changed.

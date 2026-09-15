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

`R` gerçek eşzamanlı multi-party engagement kararı mevcut tek-aktif-konuşmacı runtime için future/out-of-scope olabilir; participant attribution ve user-local isolation mevcut pre-AI invariants içinde kalır.

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

## 4. Final pre-AI authority closure — ACTIVE CHECKPOINT
Final closure work is tracked by the latest GitHub PR/CI, not by a hard-coded "current main" line in this document.

Measured closure findings:
- **T3 / Dialogue Board:** current production block is explicitly observational and states it does not grant question/advice/humor/speculation/social-move/style permissions; DialogueDecision + KairaResponsePlan own those decisions.
- **T6 / historical grounding:** characterization proved historical uncertainty could be reconstructed from raw wording even when persisted canonical semantics disagreed. Closure requires persisted semantic uncertainty to be authoritative; missing historical semantic snapshot fails closed.
- **T2 / SpeechIdentity:** two reaction-mode phrases duplicated relationship WHAT/WHETHER decisions. Closure keeps only distance/rhythm/softening HOW and leaves reopening/forgiveness/repair-completion to ResponsePlan.
- **T5 / provider-output repair:** realization-stage retry is bounded; a repaired candidate must pass the same grounding/attribution/dialogue/ResponsePlan/affect/world validators before adoption. It cannot bypass the validator chain.
- **R / true multi-party engagement:** future/out-of-scope unless product runtime is expanded beyond the current active-speaker model.
- **S / final prompt assembly:** serializer owns ordering/assembly only. Upstream layer ownership remains authoritative; prompt blocks may not silently manufacture new permissions or certainty.

Current closure ADR:
- `docs/adr/2026-09-15-pre-ai-final-authority-closure.md`

## 5. Test truth / proof levels
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

## 6. Grey-zone policy
- Semantic meaning may remain `unknown`, `ambiguous`, `low-confidence`, or unresolved when evidence is insufficient.
- Uncertainty may damp or block state mutation rather than forcing a guessed interpretation.
- Downstream layers cannot increase semantic certainty without an explicitly owned resolution contract.
- Authority, state ownership, user scope, persistence owner and concurrency lease are not grey zones; ambiguity there fails closed.
- A weird conversation that stays inside these invariants is a bounded product-quality issue, not automatically a reason to reopen architecture.

## 7. Architecture reopening rule
After final pre-AI closure, **general architecture audit does not automatically reopen the system**.

New architecture work requires at least one of:
1. a measured invariant violation with reproducible evidence,
2. a frozen reopening-condition hit (authority collision, ownership leak, cross-user contamination, persistence divergence, production/test-path mismatch that invalidates a claimed proof),
3. an explicit new product requirement that expands the frozen system boundary.

Otherwise:
- new sentence/conversation examples map to an existing failure class,
- non-critical ambiguity remains a typed grey zone,
- future modalities/features stay in backlog/out-of-scope,
- no ad-hoc downstream regex/phrase patch is added.

## 8. Definition of Done — pre-AI architecture
Pre-AI architecture can be frozen when:
- A–S layer set and owners are explicit,
- canonical authority collisions are absent,
- state scopes/owners are deterministic,
- historical semantic consumers do not create shadow truth,
- grey-zone/fail-closed policy is explicit,
- production seams have honestly classified proof coverage,
- measured closure blockers are GREEN under targeted + neighboring + full CI,
- persistence/hydration/concurrency isolation gates remain GREEN,
- prompt assembly cannot silently expand WHAT/WHETHER authority,
- observability can identify owning seam/failure class,
- governance docs do not claim volatile GitHub state and therefore cannot silently drift from branch/CI reality.

## 9. Next handoff rule
Before any next action:
1. query GitHub for actual `main`, PRs and CI,
2. read the latest closure ADR(s),
3. do not reopen already-closed architecture from old chat memory,
4. finish any active closure PR through test → CI → merge → main-CI,
5. only after pre-AI freeze decision move to model-in-the-loop / answer-quality validation.

# Kaira Phase 0 — Known Gaps Register

Classification:
- `STRUCTURAL` — ownership/type/authority model has a real representation or boundary defect.
- `EVIDENCE` — architecture may be correct but adequacy is not proven.
- `TEST` — behavior is believed correct but regression/self-validation proof is missing.
- `FUTURE_CAPABILITY` — product target exists; current architecture has not yet been shown to fail.

| ID | Gap | Class | Canonical owner / target | Why open | Phase |
|---|---|---|---|---|---|
| G-01 | Prompt block authority metadata absent | STRUCTURAL — CONFIRMED | shared PromptBlock model + serializer | string-only prompt parts cannot express authority class; #260 and T3 prove shadow-authority risk | 1 / PR-1 |
| G-02 | Speech/HOW mechanical enforcement | EVIDENCE + STRUCTURAL-CANDIDATE | ResponsePlan + SpeechIdentity | reopening-closeness may already be canonical duplicate; full-repair declaration may be a missing distinct behavior concept | 1 / characterization first |
| G-03 | Controlled Spontaneity historical raw-text reinterpretation | STRUCTURAL — CONFIRMED | persisted turn-linked canonical semantics + bounded realization | subsystem reparses historical raw text with legacy semantic interpreter after ResponsePlan exists | 1 |
| G-04 | Repair prompt authority role | STRUCTURAL — CONFIRMED | narrow Repair Authority | post-assembly free-text directive is untyped; realization-only scope is not mechanically enforced | 1 |
| G-05 | Local reply authority role | TEST / CONTRACT WATCH | Local Language Engine | implementation is realization-only conceptually; add no-widening regression only, do not redesign | 1 |
| G-06 | Deterministic fallback authority role | TEST / CONTRACT WATCH | Dialogue fallback | expected plan-preserving realization; verify legacy raw/provenance paths cannot widen plan | 1 |
| G-07 | BehaviorContract vs ResponsePlan permission duplication | RESOLVED | BehaviorContract → HardConstraints → PlanResolver → ResponsePlan | forgiveness is staged refinement, not duplicate ownership | closed unless contrary counterexample |
| G-08 | Audit detector self-validation | TEST | Pre-AI Audit / authority checker | new authorityClass checker must prove known historical and synthetic violations | 1 / PR-1 |
| G-09 | Semantic provider parity vs deterministic floor | EVIDENCE | language-understanding gateway | deterministic harness does not establish real provider semantic parity | 2 |
| G-10 | Fallback semantic usage rate | EVIDENCE | language-understanding gateway | production frequency/scenarios unknown | 2 |
| G-11 | Reconciliation patch-layer growth | EVIDENCE | language-understanding gateway | need principle-vs-pattern audit | 2 |
| G-12 | Harness vs full production prompt context | TEST + EVIDENCE — CONFIRMED | Phase-0/production harness | production Dialogue Board authority surface is absent from simplified harness slot | 1/2; T3 proof first |
| G-13 | KNT completeness / sampling bias | EVIDENCE | KNT | completeness and curated-fixture bias remain open | 2 |
| G-14 | Temporal relationship consolidation | STRUCTURAL-CANDIDATE | relationship/social appraisal | time evidence exists but canonical representation is not decided | 3 |
| G-15 | Shared witnessed-event consistency | FUTURE_CAPABILITY / STRUCTURAL-CANDIDATE | world event + identity | same shared event across dyadic reports not yet proven | 3 |
| G-16 | Social comparison/competition primitive | STRUCTURAL-CANDIDATE | Social Appraisal | comparative social relation may be needed for jealousy/favoritism/exclusion | 3 |
| G-17 | Witness/visibility scope primitive | STRUCTURAL-CANDIDATE | Social Appraisal / World Event | public/private and witness effects need explicit evidence if current model cannot represent them | 3 |
| G-18 | Long-horizon relationship differentiation | EVIDENCE | relationship/KDM | 1-day vs 1-month qualitative behavior not proven | 3 |
| G-19 | Personality sensitivity | EVIDENCE | personality/KDM/Speech | systematic same-event/different-personality proof limited | 3 |
| G-20 | Prompt ordering/recency behavior | EVIDENCE | prompt model + provider | static authority correctness does not prove provider obedience under ordering effects | 4 |
| G-21 | Model stochasticity accumulation | EVIDENCE | provider/runtime | long sessions may accumulate stochastic divergence | post-4 |
| G-22 | Real concurrency/persistence races | EVIDENCE | persistence/idempotency | deterministic/mock restart is not real concurrent writes/reconnects | later beta |
| G-23 | Multi-party runtime | FUTURE_CAPABILITY | entity/world/discourse/relationship | dyadic model strong; real group runtime not validated | later beta |
| G-24 | Multimodal/platform semantics | FUTURE_CAPABILITY | canonical evidence gateway | images/GIFs/replies/reactions/voice are target inputs but modality neutrality unproven | later beta |
| G-25 | Production Dialogue Board carries WHAT/WHETHER directives | STRUCTURAL + TEST — CONFIRMED / HIGHEST PRIORITY CONTENT BUG | DialogueDecision | evidence board tells realizer to choose social move and ask clarification; current harness does not prove this surface | 1 / PR-2 |
| G-26 | `server.ts` socialStyle mixes HOW + behavior policy | STRUCTURAL — CONFIRMED | split across canonical owners | free-text block duplicates question/advice/dialogue/memory/epistemic rules | 1 / after PR-1 |
| G-27 | Post-assembly repair extension lacks authority typing | STRUCTURAL — CONFIRMED | Repair Authority + prompt model | appended directive bypasses typed prompt inventory | 1 |
| G-28 | Conversation Grounding converts lexical raw-text evidence into semantic conclusions | STRUCTURAL — CONFIRMED | SemanticInterpretation@2 / typed semantic evidence | uncertainty/judgment conclusions are independently inferred downstream | 1/2; content fix after PR-1 |
| G-29 | Local reply candidate templates remain free text | TEST / WATCH | Local Language Engine | no current violation; future templates could widen plan without mechanical regression | 1 test only |

## Frozen Phase 1 order
1. **PR-1 — T7:** typed `authorityClass` mechanism + detector self-validation.
2. **PR-2 — T3:** make production Dialogue Board observational and inject real production board into authority/compound harness.
3. **PR-3 — T1:** remove historical raw semantic reparse from bounded variation, after persistence-access proof.
4. **PR-4 — T5:** typed realization-only `RepairDirective`.
5. **PR-5 — T2:** characterization-only investigation first; implementation only if counterexample proves a missing canonical behavior concept.
6. **PR-6 — T4:** split/remove `socialStyle` duplicates at canonical owners.
7. **PR-7 — T6:** route uncertainty/judgment semantic conclusions back through canonical semantic authority.

Parallel work is allowed only where dependencies stay valid; one owning seam remains the default PR boundary.

## Rules
1. A gap may move class only with evidence.
2. `STRUCTURAL-CANDIDATE` is not permission to create a new layer; first prove the current owner cannot represent the counterexample cleanly.
3. `EVIDENCE` gaps do not justify refactors before measurement.
4. `FUTURE_CAPABILITY` items stay out of active PRs unless a current dependency/counterexample activates them.
5. Side findings are appended here instead of silently expanding an active PR.
6. Any `authority-contract` or `compound-interaction` failure automatically reopens architecture red-team for the affected scope.
7. Resolved items reopen only on a new counterexample or regression outside the recorded closure scope.

# Kaira Phase 0 — Known Gaps Register

Classification:
- `STRUCTURAL` — ownership/type/authority model lacks an explicit representation.
- `EVIDENCE` — architecture may be correct but adequacy is not proven.
- `TEST` — behavior is believed correct but regression/self-validation proof is missing.
- `FUTURE_CAPABILITY` — product target exists; current architecture has not yet been shown to fail.

| ID | Gap | Class | Current owner candidate | Why open | Phase |
|---|---|---|---|---|---|
| G-01 | Prompt block authority metadata absent | STRUCTURAL | Final prompt model | string-only prompt parts cannot express authority class; #260 exposed real shadow-authority bug | 1 |
| G-02 | Speech/HOW mechanical enforcement | STRUCTURAL — CONFIRMED | SpeechIdentity + prompt model | HOW block currently includes behavior constraints such as not reopening closeness / not declaring full repair | 1 |
| G-03 | Controlled Spontaneity authority role | STRUCTURAL — CONFIRMED | ResponsePlan/realization boundary | subsystem reparses prior raw user text via legacy semantic interpreter while choosing a prior-topic nudge | 1 |
| G-04 | Repair prompt authority role | STRUCTURAL-CHECK | repair realization boundary | post-assembly natural-language repair directive is untyped; expected to preserve plan but not mechanically enforced | 1 |
| G-05 | Local reply authority role | TEST / CONTRACT | local realization boundary | code is realization-only and consumes shared SemanticEvent/DialogueDecision/ResponsePlan; needs mechanical no-widening proof | 1 |
| G-06 | Deterministic fallback authority role | STRUCTURAL-CHECK | dialogue fallback boundary | mostly maps existing DialogueDecision to text, but banter/recall paths contain legacy raw/provenance surfaces | 1 |
| G-07 | BehaviorContract vs ResponsePlan permission duplication | RESOLVED-CONCEPT / TEST | BehaviorContract → HardConstraints → PlanResolver → ResponsePlan | forgiveness audit shows staged refinement, not independent duplicate calculation; analogous fields still need contract coverage | 1 |
| G-08 | Audit detector self-validation | TEST | Pre-AI Audit | detector true-positive/false-positive/adversarial generality not comprehensively proven | 1 |
| G-09 | Semantic provider parity vs deterministic floor | EVIDENCE | language-understanding gateway | Phase-0 uses deterministic floor while production can use LLM semantic provider | 2 |
| G-10 | Fallback semantic usage rate | EVIDENCE | language-understanding gateway | fallback exists but production frequency/scenarios are unknown | 2 |
| G-11 | Reconciliation patch-layer growth | EVIDENCE | language-understanding gateway | multiple reconciliation rules exist; need principle-vs-pattern audit | 2 |
| G-12 | Harness vs full production prompt context | EVIDENCE — CONFIRMED IMPACT | Phase-0 harness | serializer is shared but context is a deterministic subset; production Dialogue Board contains authority-relevant instructions absent from the simplified harness slot | 2 |
| G-13 | KNT completeness / sampling bias | EVIDENCE | KNT | rich data exists but completeness and curated-fixture bias remain open | 2 |
| G-14 | Temporal relationship consolidation | STRUCTURAL-CANDIDATE | relationship/social appraisal | time evidence exists in multiple places but no accepted canonical familiarity representation | 3 |
| G-15 | Shared witnessed-event consistency | FUTURE_CAPABILITY / STRUCTURAL-CANDIDATE | world event + identity model | Ali/Mert reports of same event may lack one shared event identity across dyadic sessions | 3 |
| G-16 | Social comparison/competition primitive | STRUCTURAL-CANDIDATE | Social Appraisal | jealousy/favoritism/exclusion may require a common comparative relation primitive | 3 |
| G-17 | Witness/visibility scope primitive | STRUCTURAL-CANDIDATE | Social Appraisal / World Event | public/private humiliation and group effects need witness scope evidence | 3 |
| G-18 | Long-horizon relationship differentiation | EVIDENCE | relationship/KDM | bounded state is proven; 1-day vs 1-month qualitative behavior is not | 3 |
| G-19 | Personality sensitivity | EVIDENCE | personality/KDM/Speech | personality exists but systematic same-event/different-personality behavior proof is limited | 3 |
| G-20 | Prompt ordering/recency behavior | EVIDENCE | prompt model + provider | static authority correctness does not prove real-model obedience under ordering effects | 4 |
| G-21 | Model stochasticity accumulation | EVIDENCE | provider/runtime | long real-user sessions may accumulate stochastic divergence beyond single-turn model-in-loop tests | post-4 |
| G-22 | Real concurrency/persistence races | EVIDENCE | persistence/idempotency | deterministic/mock restart is not equivalent to production concurrent writes/reconnects | later beta |
| G-23 | Multi-party runtime | FUTURE_CAPABILITY | entity/world/discourse/relationship | dyadic model is strong; real group runtime is not yet validated | later beta |
| G-24 | Multimodal/platform semantics | FUTURE_CAPABILITY | canonical evidence gateway | images/GIFs/replies/reactions/voice are target inputs but modality neutrality is unproven | later beta |
| G-25 | Production Dialogue Board carries WHAT/WHETHER directives | STRUCTURAL — CONFIRMED | DialogueDecision / prompt projection boundary | evidence board tells realizer to choose a social move and ask clarification, duplicating behavior authority | 1 |
| G-26 | `server.ts` socialStyle is mixed HOW + behavior policy | STRUCTURAL — CONFIRMED | character-style policy / ResponsePlan / prompt model | inline server-owned prompt string contains response-format/question/advice/memory-surfacing behavior rules | 1 |
| G-27 | Post-assembly prompt extensions lack authority typing | STRUCTURAL | repair/prompt model | repair directive is appended after final prompt serializer and cannot currently be classified by type system | 1 |

## Rules
1. A gap may move class only with evidence.
2. `STRUCTURAL-CANDIDATE` is not permission to create a new layer; first prove the current owner cannot represent the counterexample cleanly.
3. `EVIDENCE` gaps do not justify refactors before measurement.
4. `FUTURE_CAPABILITY` items stay out of active PRs unless a current dependency or counterexample activates them.
5. Side findings are appended here rather than silently expanding an active PR.
6. Any `authority-contract` or `compound-interaction` finding automatically enters the architecture red-team path before Phase 1 fix design.

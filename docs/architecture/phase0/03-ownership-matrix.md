# Kaira Phase 0 — Canonical Ownership Matrix

| Concept | Canonical owner | Key consumers | Authority class | Persistence owner | Phase 0 status |
|---|---|---|---|---|---|
| Raw input normalization | language-understanding boundary | semantic gateway | evidence | none | known |
| Canonical current-message meaning | `SemanticInterpretation@2` | entity/world/discourse/KDM | canonical semantic authority | trace/KNT | frozen |
| Historical canonical turn meaning | persisted turn-linked `SemanticInterpretation@2` | history-aware downstream consumers | historical semantic evidence | turn/session persistence | owner frozen; availability proof needed for T1 |
| Entity identity / target grounding | Entity Resolution | world/discourse/social appraisal | grounding | trace/KNT | frozen |
| Canonical world proposition | CanonicalWorldEvent | world memory/reasoning/social appraisal | event truth | world event store | frozen |
| Discourse topology/state | DiscourseState | DialogueDecision / prompt projection | observational | session-derived | frozen |
| Dialogue move / obligation | DialogueDecision | ResponsePlan / guards | dialogue decision authority | trace/KNT | frozen; T3 duplicate removal required |
| Dynamic affect state | KDM DynamicState | BehaviorContract / Speech | state | KDM state | frozen |
| Relationship state | KDM/relationship reducer | BehaviorContract / Social Appraisal | social state | KDM state | frozen |
| Persistent user memory | KDM memory runtime/store | KDM / prompt context | evidence | KDM memory store | frozen |
| Kaira autobiographical memory | autobiographical runtime | prompt / epistemic audit | evidence + self-epistemic authority | instance/self-memory store | frozen |
| World memory/retrieval | world event runtime | world reasoning / prompt | evidence | world event store | frozen |
| World-state truth posture | World State Appraisal + World Reasoning Policy | prompt / world guards | epistemic/world authority | derived | frozen |
| Knowledge access | Epistemic Gate | prompt / response guard | epistemic authority | knowledge profile store | frozen |
| Relationship/state eligibility | BehaviorContract | HardConstraints / ResponsePlan | policy eligibility compression | trace/KNT | frozen staged owner |
| Hard deontic gate | HardConstraints | PlanResolver | hard permission boundary | derived | frozen staged owner |
| Final social turn behavior permission | KairaResponsePlan via PlanResolver | local/provider/fallback/guards | **single social WHAT/WHETHER authority** | trace/KNT | frozen final owner |
| Speech/style identity | SpeechIdentity | realizer | HOW-only target | language/style memory | mixed today; T2 characterization required |
| Bounded expression variation | controlled-spontaneity subsystem | prompt realization | subordinate realization only | trace/KNT | mixed today; T1 fix required |
| Local language realization | Local Language Engine | delivery guards | realization-only / plan-narrowing | none | conceptually clean; no-widening test only |
| Provider prompt blocks | typed shared PromptBlock model (Phase 1 target) | serializer/provider/audit | classified by domain (`authorityClass`) | KNT snapshot | T7 structural gap confirmed |
| Provider prompt assembly | Final Prompt Serializer | provider | assembly-only | KNT snapshot | frozen owner; block typing missing today |
| Dialogue-board prompt projection | Dialogue Board builder | provider | observational evidence target | none | T3 structural + test gap confirmed |
| Server-owned social-style prompt | canonical owners split by rule; `server.ts` is not owner | provider | mixed today; no single valid authority class | none | T4 structural gap confirmed |
| Repair directive | narrow Repair Authority / typed realization directive | provider / post guards | realization-only | KNT/metrics | T5 structural gap confirmed |
| Deterministic grounded fallback | Dialogue fallback | delivery guards | plan/move-preserving realization | KNT/metrics | conceptually clean; contract proof pending |
| Conversation lexical grounding/retrieval | grounding/retrieval helpers | canonical semantic/evidence consumers | lexical evidence only | derived | T6 boundary violation confirmed where lexical output becomes semantic conclusion |
| Invariant verification | Pre-AI/Post-generation guards | CI / delivery | verification-only | KNT/metrics | frozen |
| Observability | KNT | humans/tests | non-authoritative | KNT store | frozen |
| Autonomous activity permission prompt | structured UI/activity subsystem | caller/UI | separate structured product action; not canonical chat authority | activity stores | verified non-bypass |

## Staged refinement rule
A concept may appear across multiple layers when each layer has a different formal role and downstream layers only narrow/resolve upstream eligibility.

Confirmed example — forgiveness:

```text
KDM/relationship state
  -> BehaviorContract.forgivenessGranted        (eligibility)
  -> HardConstraints.forgivenessAllowed         (hard gate)
  -> PlanResolver                               (turn-level resolution)
  -> KairaResponsePlan.allowForgiveness         (final social WHAT/WHETHER)
```

Claude withdrew the earlier duplicate-owner concern after code evidence confirmed this staged chain.

## T2 explicit owner check
Two SpeechIdentity statements must not be conflated:

1. **Do not reopen closeness while withdrawn**
   - expected owner: existing `KairaResponsePlan.allowReopeningCloseness` if semantics already cover this state.
   - action before fix: characterize actual withdrawn behavior and field value.

2. **Do not declare relationship fully repaired while repairing**
   - expected owner: ResponsePlan/domain behavior model if this is a distinct real product concept.
   - action before fix: characterize whether existing repair/forgiveness fields already encode it.

No new field is authorized by Phase 0 alone.

## T4 socialStyle owner split
The inline `socialStyle` string is not itself a legitimate domain owner. Individual rules classify as follows pending exact redundancy checks:
- question-ending habit -> HOW / response realization style, subordinate to `allowQuestion`.
- emotional-opening problem-solving -> DialogueDecision family.
- unsolicited advice/list behavior -> ResponsePlan / canonical behavior permission.
- memory relevance -> memory surfacing/retrieval policy.
- unsupported recall detail -> epistemic/self-grounding authority.

Phase 1 must remove duplicates at their real owner rather than relocate the mixed string intact.

## Local engine watch item
The Local Language Engine is currently classified as realization-only and must not be redesigned. Add only a mechanical no-widening/authority regression because its free-text candidate templates are still a potential future risk surface.

## Vocabulary decisions
- `Grounding` is an operation/category. `Entity Resolution` is one concrete grounding component; CanonicalWorldEvent owns event/proposition grounding.
- Never use bare `appraisal` in architecture docs. Use `World State Appraisal` or `Social Appraisal` explicitly.
- Use `Bounded Expression Variation` as the neutral architectural name for the current Controlled Spontaneity mechanism.
- Use `Repair Authority` only for a narrow realization-only repair contract; it is not a behavior planner.

## Phase 0 owner closure
No critical provider-facing surface remains `TBD` at the conceptual ownership level. Several surfaces remain intentionally marked `mixed today`; those are Phase 1 structural fixes with owners now named.

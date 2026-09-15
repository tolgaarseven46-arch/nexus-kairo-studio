# Kaira Phase 0 — Canonical Ownership Matrix

| Concept | Canonical owner | Key consumers | Authority class | Persistence owner | Phase 0 status |
|---|---|---|---|---|---|
| Raw input normalization | language-understanding boundary | semantic gateway | evidence | none | known |
| Canonical message meaning | `SemanticInterpretation@2` | entity/world/discourse/KDM | canonical truth | trace/KNT only | known |
| Entity identity / target grounding | Entity Resolution | world/discourse/appraisal | grounding | trace/KNT | known |
| Canonical world proposition | CanonicalWorldEvent | world memory/appraisal | event truth | world event store | known |
| Discourse topology/state | DiscourseState | DialogueDecision / prompt projection | observational | session-derived | known |
| Dialogue move / obligation | DialogueDecision | ResponsePlan / guards | dialogue decision | trace/KNT | known |
| Dynamic affect state | KDM DynamicState | BehaviorContract / Speech | state | KDM state | known |
| Relationship state | KDM/relationship reducer | BehaviorContract / appraisal | social state | KDM state | known |
| Persistent user memory | KDM memory runtime/store | KDM / prompt context | evidence | KDM memory store | known |
| Kaira autobiographical memory | autobiographical runtime | prompt / epistemic audit | evidence | instance/self-memory store | known |
| World memory/retrieval | world event runtime | world reasoning / prompt | evidence | world event store | known |
| Knowledge access | Epistemic Gate | prompt / response guard | epistemic authority | knowledge profile store | known |
| Behavior permissions | BehaviorContract | ResponsePlan | policy compression | trace/KNT | boundary audit required |
| Dialogue realization constraints | KairaResponsePlan | local/provider/fallback/guards | **WHAT/WHETHER authority** | trace/KNT | intended owner confirmed conceptually |
| Speech/style identity | SpeechIdentity | realizer | HOW-only | language/style memory | boundary audit required |
| Controlled spontaneity | TBD Phase 1 | prompt/local realization | TBD | trace/KNT | unresolved |
| Local language realization | Local Language Engine | delivery guards | TBD realization-only expected | none | unresolved |
| Provider prompt assembly | Final Prompt Serializer | provider | assembly-only | KNT snapshot | known conceptually; string typing gap |
| Repair prompt/regeneration | Repair path | provider / post guards | TBD realization-only expected | KNT/metrics | unresolved |
| Deterministic grounded fallback | Dialogue fallback | delivery guards | TBD plan-preserving expected | KNT/metrics | unresolved |
| Invariant verification | Pre-AI/Post-generation guards | CI / delivery | verification-only | KNT/metrics | known |
| Observability | KNT | humans/tests | non-authoritative | KNT store | known |

## Mandatory ownership audits before Phase 1

### Forgiveness
`BehaviorContract.forgivenessGranted` and `KairaResponsePlan.allowForgiveness` both exist.
Phase 0 must establish whether:
- BehaviorContract owns the permission and ResponsePlan only projects/resolves it, or
- both recompute it independently (not allowed).

### Grounding vocabulary
`Grounding` is the operation/category; `Entity Resolution` is one concrete owner/component for identity/target grounding. World grounding is separate through CanonicalWorldEvent. These names must not be used as synonyms.

### Appraisal vocabulary
Never use bare `appraisal` in architecture docs.
Use one of:
- `World State Appraisal` / `World Reasoning Policy` for retrieved-world evidence reasoning,
- `Social Appraisal` for the relationship/emotional meaning of an event.

### server.ts composition-root audit
Phase 0 will classify every important conditional branch as:
- infrastructure/orchestration, or
- domain decision.

Any domain decision owned only by `server.ts` is an ownership smell and must enter the Known Gaps Register.

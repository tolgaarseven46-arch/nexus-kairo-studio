# Kaira Phase 0 — Canonical Ownership Matrix

| Concept | Canonical owner | Key consumers | Authority class | Persistence owner | Phase 0 status |
|---|---|---|---|---|---|
| Raw input normalization | language-understanding boundary | semantic gateway | evidence | none | known |
| Canonical message meaning | `SemanticInterpretation@2` | entity/world/discourse/KDM | canonical truth | trace/KNT only | known |
| Entity identity / target grounding | Entity Resolution | world/discourse/social appraisal | grounding | trace/KNT | known |
| Canonical world proposition | CanonicalWorldEvent | world memory/reasoning/social appraisal | event truth | world event store | known |
| Discourse topology/state | DiscourseState | DialogueDecision / prompt projection | observational | session-derived | known |
| Dialogue move / obligation | DialogueDecision | ResponsePlan / guards | dialogue decision | trace/KNT | known |
| Dynamic affect state | KDM DynamicState | BehaviorContract / Speech | state | KDM state | known |
| Relationship state | KDM/relationship reducer | BehaviorContract / Social Appraisal | social state | KDM state | known |
| Persistent user memory | KDM memory runtime/store | KDM / prompt context | evidence | KDM memory store | known |
| Kaira autobiographical memory | autobiographical runtime | prompt / epistemic audit | evidence + self-epistemic authority | instance/self-memory store | known |
| World memory/retrieval | world event runtime | world reasoning / prompt | evidence | world event store | known |
| World-state truth posture | World State Appraisal + World Reasoning Policy | prompt / world guards | epistemic/world authority | derived | known |
| Knowledge access | Epistemic Gate | prompt / response guard | epistemic authority | knowledge profile store | known |
| Relationship/state eligibility | BehaviorContract | HardConstraints / ResponsePlan | policy compression | trace/KNT | known staged owner |
| Hard deontic gate | HardConstraints | PlanResolver | hard permission boundary | derived | known staged owner |
| Final turn behavior permission | KairaResponsePlan via PlanResolver | local/provider/fallback/guards | **WHAT/WHETHER authority** | trace/KNT | canonical final owner |
| Speech/style identity | SpeechIdentity | realizer | intended HOW-only | language/style memory | **mixed today; Phase 1 fix required** |
| Controlled spontaneity / bounded variation | current spontaneity subsystem | prompt realization | intended subordinate variation | trace/KNT | **mixed today; raw-text reinterpretation confirmed** |
| Local language realization | Local Language Engine | delivery guards | realization-only / plan-narrowing | none | conceptually resolved; contract proof pending |
| Provider prompt assembly | Final Prompt Serializer | provider | assembly-only | KNT snapshot | concept resolved; typed block gap confirmed |
| Dialogue-board prompt projection | Dialogue Board builder | provider | intended evidence | none | **mixed today; direct WHAT directives confirmed** |
| Server-owned social-style prompt | `server.ts` inline composition | provider | intended HOW/global policy | none | **mixed today; owner split required** |
| Repair prompt/regeneration | Repair path | provider / post guards | intended repair realization | KNT/metrics | untyped post-assembly authority surface; Phase 1 hardening |
| Deterministic grounded fallback | Dialogue fallback | delivery guards | plan/move-preserving realization | KNT/metrics | mostly resolved; legacy raw/provenance surfaces need contract proof |
| Conversation grounding policy | Grounding builder | provider / guards | epistemic/grounding authority | derived | raw-history reinterpretation confirmed; Phase 2 evidence-path review |
| Invariant verification | Pre-AI/Post-generation guards | CI / delivery | verification-only | KNT/metrics | known |
| Observability | KNT | humans/tests | non-authoritative | KNT store | known |

## Staged refinement rule
A value may appear in more than one layer without duplicate ownership if each layer has a distinct role and downstream stages only narrow/resolve upstream eligibility.

Confirmed example — forgiveness:

```text
KDM/relationship state
  -> BehaviorContract.forgivenessGranted        (state/policy eligibility)
  -> HardConstraints.forgivenessAllowed         (hard deontic gate)
  -> PlanResolver.allowForgiveness              (final turn resolution)
  -> KairaResponsePlan.allowForgiveness         (WHAT/WHETHER authority exposed to realizers)
```

This is staged refinement, not independent duplicate calculation.

## Vocabulary decisions
- `Grounding` is an operation/category. `Entity Resolution` is one concrete grounding component; CanonicalWorldEvent owns event/proposition grounding.
- Never use bare `appraisal` in architecture docs. Use `World State Appraisal` or `Social Appraisal` explicitly.
- Architecture docs use `Bounded Expression Variation` as the neutral name for the current Controlled Spontaneity concept until Phase 1 freezes its authority contract.

## Remaining owner checks before Phase 0 exit
1. Finish deterministic fallback historical/provenance authority audit.
2. Finish important `server.ts` branch classification (orchestration vs domain decision).
3. Confirm no additional provider-facing prompt extension bypasses the prompt inventory.
4. Run mandatory architecture red-team on confirmed authority-contract/compound findings before Phase 1 design.

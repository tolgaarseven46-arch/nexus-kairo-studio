# Kaira Phase 0 — Authority Graph

This is the gate diagram for Phase 1. It distinguishes canonical truth, evidence, state, policy compression, final behavior authority, HOW, assembly and verification.

```mermaid
flowchart LR
  RAW[Raw Input] --> SG[Semantic Gateway\nCANONICAL TRUTH]
  SG --> SEM[SemanticInterpretation@2\nCANONICAL SEMANTIC AUTHORITY]

  SEM --> EVID[Entity / World / Discourse / Memory Evidence\nEVIDENCE / GROUNDING]
  EVID --> APP[Social / World Appraisal\nDERIVED EVIDENCE]
  SEM --> APP

  APP --> KDM[KDM\nSTATE TRANSITION OWNER]
  KDM --> REL[Relationship State\nSOCIAL STATE]
  KDM --> DYN[Dynamic State\nAFFECT STATE]

  REL --> BC[BehaviorContract\nPOLICY COMPRESSION]
  DYN --> BC
  SEM --> BC

  SEM --> DD[DialogueDecision\nDIALOGUE OBLIGATION / MOVE]
  EVID --> DD

  BC --> RP[KairaResponsePlan\nSINGLE WHAT / WHETHER AUTHORITY]
  DD --> RP

  REL --> HOW[Speech Identity\nHOW ONLY]
  DYN --> HOW

  RP --> REAL[Realization Paths]
  HOW --> REAL
  EVID --> REAL

  REAL --> LOCAL[Local Reply\nTBD realization authority]
  REAL --> PROMPT[Prompt Blocks\nTBD typed authority metadata]
  PROMPT --> SER[Final Prompt Serializer\nASSEMBLY ONLY]
  SER --> MODEL[Provider]
  MODEL --> REPAIR[Repair / Fallback\nTBD realization authority]

  RP --> AUDIT[Pre/Post Audits\nVERIFICATION ONLY]
  PROMPT --> AUDIT
  LOCAL --> AUDIT
  REPAIR --> AUDIT

  AUDIT --> KNT[KNT\nOBSERVABILITY ONLY]
```

## Frozen authority rules
1. `SemanticInterpretation@2` owns canonical message meaning.
2. Entity/world/discourse/memory layers may add grounding/evidence but may not manufacture a competing semantic truth downstream.
3. KDM owns dynamic/relationship state transition, not raw semantic reinterpretation.
4. `BehaviorContract` compresses policy/state into permissions; it is not the final realizer instruction surface.
5. `DialogueDecision` owns dialogue obligation/move selection, subject to realizability by final permissions.
6. `KairaResponsePlan` is the intended single WHAT/WHETHER behavior authority.
7. Speech identity is HOW-only and may not widen permissions.
8. Final prompt serializer owns assembly only.
9. Audit and KNT are non-authoritative.

## Phase 0 unresolved boundaries
These require ownership audit before Phase 1 implementation:
- `BehaviorContract.forgivenessGranted` vs `KairaResponsePlan.allowForgiveness`: owner vs projection must be explicit.
- Controlled Spontaneity: must be classified as HOW-only or plan-owned projection; it may not silently become a second WHAT authority.
- Local language reply: must be proven to realize the canonical plan, not decide around it.
- Repair prompt: must repair realization errors without reopening forbidden decisions.
- Deterministic fallback: must be a plan-preserving fallback, not an independent behavior planner.
- Prompt blocks: current string-only shape cannot mechanically express authority classes; this is a confirmed structural gap for Phase 1.

## Phase 1 prerequisite
No Phase 1 code change starts until every `TBD` above is resolved as one of:
- canonical authority,
- projection,
- evidence,
- HOW,
- assembly,
- verification.

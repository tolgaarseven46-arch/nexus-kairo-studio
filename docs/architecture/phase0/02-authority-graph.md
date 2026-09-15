# Kaira Phase 0 — Authority Graph

This is the gate diagram for Phase 1. It distinguishes canonical truth, evidence, state, epistemic/world authority, final social-behavior authority, HOW, assembly and verification.

```mermaid
flowchart LR
  RAW[Raw Input] --> SG[Semantic Gateway]
  SG --> SEM[SemanticInterpretation@2\nCANONICAL SEMANTIC AUTHORITY]

  SEM --> ENT[Entity Resolution\nIDENTITY/TARGET GROUNDING]
  SEM --> WORLD[Canonical World Event\nEVENT TRUTH]
  SEM --> DISC[Discourse State\nOBSERVATIONAL]
  SEM --> SELF[Self-Memory Query]
  SEM --> KNOW[Knowledge Query]

  WORLD --> WM[World Retrieval\nEVIDENCE]
  WM --> WAPP[World State Appraisal\nWORLD EVIDENCE POSTURE]
  WAPP --> WRP[World Reasoning Policy\nEPISTEMIC/WORLD AUTHORITY]
  KNOW --> EPI[Epistemic Gate\nKNOWLEDGE AUTHORITY]
  SELF --> SM[Autobiographical Recall\nSELF-EPISTEMIC AUTHORITY/EVIDENCE]

  SEM --> KDM[KDM\nSTATE TRANSITION OWNER]
  WORLD --> KDM
  SM --> KDM
  KDM --> REL[Relationship State\nSOCIAL STATE]
  KDM --> DYN[Dynamic State\nAFFECT STATE]

  SEM --> DD[DialogueDecision\nDIALOGUE OBLIGATION / MOVE]
  DISC --> DD

  REL --> BC[BehaviorContract\nSTATE/POLICY ELIGIBILITY]
  DYN --> BC
  SEM --> BC
  BC --> HC[HardConstraints\nDEONTIC GATE]

  HC --> RP[KairaResponsePlan\nSINGLE SOCIAL WHAT/WHETHER AUTHORITY]
  DD --> RP

  REL --> HOW[Speech Identity\nINTENDED HOW — MIXED TODAY]
  DYN --> HOW

  RP --> VAR[Bounded Expression Variation\nINTENDED SUBORDINATE — MIXED TODAY]
  HOW --> VAR

  ENT --> PB[Prompt Blocks]
  WORLD --> PB
  DISC --> PB
  WRP --> PB
  EPI --> PB
  SM --> PB
  RP --> PB
  HOW --> PB
  VAR --> PB

  PB --> MIX[CURRENT MIXED PROMPT SURFACES\nDialogue Board / socialStyle / HOW directives]
  MIX --> SER[Final Prompt Serializer\nASSEMBLY ONLY]
  SER --> MODEL[Provider]

  RP --> LOCAL[Local Language Engine\nREALIZATION-ONLY conceptually]
  LOCAL --> GUARD[Canonical Guards / Delivery]
  MODEL --> REPAIR[Repair Realization\nUNTYPED EXTENSION TODAY]
  REPAIR --> GUARD
  MODEL --> DF[Deterministic Fallback if needed\nPLAN-PRESERVING expected]
  DF --> GUARD

  RP --> AUDIT[Pre/Post Audits\nVERIFICATION ONLY]
  PB --> AUDIT
  LOCAL --> AUDIT
  REPAIR --> AUDIT
  DF --> AUDIT
  AUDIT --> KNT[KNT\nOBSERVABILITY ONLY]
```

## Frozen authority rules
1. `SemanticInterpretation@2` owns canonical current-message meaning.
2. Entity/world/discourse/memory layers may add grounding/evidence but may not manufacture a competing semantic truth downstream.
3. World/epistemic authorities may constrain factual certainty without becoming social-behavior authorities.
4. KDM owns dynamic/relationship state transition, not raw semantic reinterpretation.
5. `BehaviorContract` owns state/policy eligibility; `HardConstraints` converts this into hard deontic gates.
6. `DialogueDecision` owns dialogue obligation/move selection.
7. `KairaResponsePlan` owns the final social WHAT/WHETHER decision for the turn.
8. Speech/language style may control HOW only and may not widen or reverse ResponsePlan permissions.
9. Final prompt serializer owns assembly only.
10. Audit and KNT are non-authoritative.

## Resolved Phase 0 ownership questions

### Forgiveness
Resolved as staged refinement rather than duplicate ownership:

```text
Relationship/KDM
 -> BehaviorContract.forgivenessGranted
 -> HardConstraints.forgivenessAllowed
 -> PlanResolver
 -> ResponsePlan.allowForgiveness
```

### Local language path
Conceptually realization-only: it consumes shared SemanticEvent, DialogueDecision and ResponsePlan and is guarded before delivery. Phase 1 still needs a mechanical no-widening contract.

### Activity-permission UI
Resolved non-bypass: structured activity permission prompt is returned separately; reply composer returns the canonical reply text unchanged.

## Confirmed authority problems entering mandatory red-team
1. Controlled Spontaneity reparses prior raw text with `interpretSemanticEvent` while selecting a topic nudge.
2. SpeechIdentity contains relationship-behavior constraints despite HOW-only labeling.
3. Production Dialogue Board tells the realizer to choose social moves and ask clarification.
4. `server.ts` socialStyle mixes HOW with behavior policy.
5. Repair instruction is appended after final prompt assembly without typed authority classification.
6. Conversation grounding reparses raw history/message for uncertainty/judgment policy.
7. Prompt parts are string-only; authority classes are not mechanically expressible.

## Phase 1 prerequisite
Phase 1 may begin only after architecture red-team reviews the confirmed trigger set and Phase 0 freezes each mixed surface as one of:
- canonical/domain authority,
- projection,
- evidence,
- HOW,
- realization,
- assembly,
- verification.

No Phase 1 implementation may introduce a new authority class not present on this graph without reopening the Phase 0 authority decision.

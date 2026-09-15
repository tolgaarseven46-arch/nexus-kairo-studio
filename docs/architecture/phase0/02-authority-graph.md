# Kaira Phase 0 — Authority Graph

This is the frozen gate diagram for Phase 1. It distinguishes canonical truth, evidence, state, epistemic/world authority, final social-behavior authority, HOW, realization, assembly and verification.

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

  REL --> HOW[Speech Identity\nHOW ONLY TARGET\nMIXED TODAY]
  DYN --> HOW

  SEM --> HIST[Persisted turn-linked canonical semantics\nHISTORICAL SEMANTIC EVIDENCE TARGET]
  HIST --> VAR[Bounded Expression Variation\nSUBORDINATE REALIZATION]
  RP --> VAR
  HOW --> VAR

  ENT --> PB[Typed Prompt Blocks\nTARGET]
  WORLD --> PB
  DISC --> PB
  WRP --> PB
  EPI --> PB
  SM --> PB
  RP --> PB
  HOW --> PB
  VAR --> PB

  PB --> SER[Final Prompt Serializer\nASSEMBLY ONLY]
  SER --> MODEL[Provider]

  RP --> LOCAL[Local Language Engine\nREALIZATION ONLY]
  LOCAL --> GUARD[Canonical Guards / Delivery]

  MODEL --> REPAIR[RepairDirective\nREALIZATION ONLY TARGET]
  REPAIR --> GUARD

  RP --> DF[Deterministic Fallback\nPLAN-PRESERVING REALIZATION]
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
2. Historical semantic consumers must prefer persisted turn-linked canonical interpretations; raw historical text may be used for lexical retrieval but may not silently become a second semantic authority.
3. Entity/world/discourse/memory layers may add grounding/evidence but may not manufacture a competing semantic truth downstream.
4. World/epistemic authorities may constrain factual certainty without becoming social-behavior authorities.
5. KDM owns dynamic/relationship state transition, not raw semantic reinterpretation.
6. `BehaviorContract` owns state/policy eligibility; `HardConstraints` converts this into hard deontic gates.
7. `DialogueDecision` owns dialogue obligation/move selection.
8. `KairaResponsePlan` owns the final social WHAT/WHETHER decision for the turn.
9. Speech/language style may control HOW only and may not widen, reopen or reverse ResponsePlan permissions.
10. Bounded expression variation may choose among already-authorized realizations only; it may not reinterpret raw language into new behavioral permission.
11. Repair may correct realization only; it may not replan semantics or WHAT/WHETHER decisions.
12. Local and deterministic fallback paths are realizers, not independent planners.
13. Final prompt serializer owns assembly only.
14. Audit and KNT are non-authoritative.

## Red-team resolutions

### T1 — Controlled Spontaneity
Confirmed structural gap. Historical topic selection must consume persisted turn-linked canonical semantics rather than call a legacy semantic interpreter on raw historical text. Exact persistence accessibility is a prerequisite check before implementation.

### T2 — SpeechIdentity
Partially resolved, intentionally not over-fixed.
- `withdrawn -> do not reopen closeness`: first verify that canonical `allowReopeningCloseness` already closes this gate. If yes, SpeechIdentity text is only a duplicate and should be removed.
- `repairing -> do not declare fully repaired`: may represent a distinct missing behavior concept; characterize before adding any field.

### T3 — Production Dialogue Board
Confirmed structural gap **and** confirmed test gap; highest-priority content authority bug. `DialogueDecision` owns move/question decisions. Dialogue Board must become pure observational evidence. Current Phase-0 harness does not provide adequate proof until it can inject the production board surface.

### T4 — server.ts socialStyle
Confirmed structural gap. It is not one coherent owner. Rules must be checked against their canonical owners and duplicates removed rather than moving the same string wholesale.

### T5 — Repair
Confirmed structural gap. Target contract is a narrow typed realization directive such as:

```text
RepairDirective {
  rejectionReasons: string[]
  allowedScope: "realization_only"
}
```

### T6 — Conversation Grounding
Confirmed structural gap where raw lexical evidence becomes a semantic conclusion outside canonical interpretation. Lexical retrieval/ranking is allowed; independently deciding uncertainty/judgment intent is not.

### T7 — Prompt authority typing
Confirmed shared structural mechanism. Prompt blocks need an `authorityClass`-style type so authority mismatches are mechanically visible. Typing does **not** replace T3/T4/T6 content cleanup.

## Resolved non-bugs
- Forgiveness is staged refinement, not duplicate ownership.
- Local Language Engine is realization-only conceptually; only mechanical no-widening proof remains.
- Autonomous activity permission is structured UI data and does not mutate canonical chat reply text.

## Phase 1 frozen order
1. Typed prompt-block `authorityClass` mechanism — T7.
2. Production Dialogue Board authority cleanup + production-context harness proof — T3.
3. Controlled Spontaneity historical canonical-semantic input — T1 (parallel-capable after dependency check).
4. Typed realization-only repair directive — T5 (parallel-capable after dependency check).
5. SpeechIdentity characterization — T2.
6. `socialStyle` owner split/removal — T4.
7. Conversation Grounding canonicalization — T6.

This order is dependency guidance, not permission to combine unrelated seams in one PR.

## Reopen conditions
Reopen Phase 0 authority decisions only if a new provider-facing/realization surface, a second WHAT/WHETHER owner, a downstream raw semantic reinterpretation, or an authority/compound regression is demonstrated.

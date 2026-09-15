# Kaira Phase 0 — Unified Runtime Flow

This diagram deliberately keeps local, provider, repair, deterministic fallback, persistence and KNT on one map.

```mermaid
flowchart TD
  IN[User / Platform Event] --> COORD[Request Coordination / Instance / Session]
  COORD --> LU[Server Language Understanding]
  LU --> SEM[SemanticInterpretation@2]
  LU --> ENT[Entity Resolution]
  LU --> WORLD[Canonical World Event]

  SEM --> DISC[Discourse State]
  ENT --> DISC
  WORLD --> WRET[World Retrieval]
  WRET --> WRP[World Reasoning Policy]
  SEM --> EPI[Epistemic Gate]
  SEM --> SELF[Self-Memory Runtime]
  SEM --> DLG[Dialogue Analysis / Decision]
  DISC --> DLG

  COORD --> PSTATE[Persistent Relationship State]
  COORD --> PMEM[Persistent User Memory]
  SELF --> KDM[KDM Canonical Turn]
  PSTATE --> KDM
  SEM --> KDM
  WORLD --> KDM

  KDM --> DYN[Dynamic State]
  KDM --> REL[Relationship Trace / State]
  DYN --> BC[BehaviorContract]
  REL --> BC
  SEM --> BC

  BC --> RP[KairaResponsePlan]
  DLG --> RP
  DYN --> HOW[Speech Identity / HOW]
  REL --> HOW
  RP --> VAR[Controlled Spontaneity / Bounded Variation — authority TBD Phase 1]
  HOW --> VAR

  RP --> LOCAL{Local language handled?}
  LOCAL -- yes --> LREPLY[Local Reply]
  LREPLY --> LCONS[Constraint / Epistemic / World / Plan Guards]
  LCONS --> DELIV[Final Delivery Gate]

  LOCAL -- no --> PROMPT[Prompt Block Construction]
  VAR --> PROMPT
  DISC --> PROMPT
  ENT --> PROMPT
  WRP --> PROMPT
  EPI --> PROMPT
  SELF --> PROMPT
  PMEM --> PROMPT
  PROMPT --> SER[Final Provider Prompt Serializer]
  SER --> PROVIDER[AI Provider]
  PROVIDER --> POST[Generated Reply Validation]
  POST --> NEED{Issues remain?}
  NEED -- no --> DELIV
  NEED -- yes --> REPAIR[Repair Prompt / Regeneration — authority TBD Phase 1]
  REPAIR --> POST2[Revalidate repaired reply]
  POST2 --> FALL{Still invalid / provider failed?}
  FALL -- no --> DELIV
  FALL -- yes --> DF[Deterministic Grounded Fallback — authority TBD Phase 1]
  DF --> DELIV

  DELIV --> PERSIST[Persist KDM / memory / world / test-session state]
  DELIV --> KNT[KNT / Metrics / Observability]
  PERSIST --> OUT[User-facing reply]
  KNT --> OUT
```

## Current verified composition points
- `resolveServerLanguageUnderstanding` owns server semantic ingestion.
- `SemanticInterpretation@2` is the canonical semantic object.
- `KairaResponsePlan` is intended as the final WHAT/WHETHER authority.
- `buildKairaFinalProviderSystemPrompt` owns assembly only.
- local replies are post-checked by canonical constraints/guards before delivery.
- provider replies are validated and may enter a repair path.
- deterministic fallback exists after generation/repair failure.
- persistence and KNT happen after accepted delivery path decisions.

## Phase 0 open authority questions
The following are deliberately not silently classified:
1. Controlled Spontaneity: HOW-only projection or WHAT-capable decision?
2. Repair Prompt: corrective realization only or second authority?
3. Local Language Engine: realization shortcut only or hidden decision owner?
4. Deterministic fallback: projection of existing plan or new behavioral decision?

Phase 1 may not begin until these are represented on the Authority Graph with an explicit classification.

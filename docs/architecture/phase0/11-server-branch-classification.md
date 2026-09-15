# Kaira Phase 0 — `server.ts` Responsibility Classification

Purpose: determine whether `server.ts` is merely a large composition root or also owns domain decisions.

## Healthy orchestration / infrastructure branches
These belong in a composition root:

| Surface | Classification | Notes |
|---|---|---|
| provider key/model selection | infrastructure | OpenRouter/Gemini transport selection and bounded attempt budget |
| request coordination/idempotency | infrastructure | replay/wait/claim/ownership |
| instance/session scoping | infrastructure/orchestration | derives state/session scope through owned helpers |
| feature-policy routing | orchestration | decides whether persistent capabilities are enabled for instance type |
| persistent store loading | orchestration | state/memory/world/identity loads delegated to owner services |
| local vs provider route selection | orchestration | candidate generation path selection after canonical plan is built |
| persistence fan-out | orchestration | delegates to KDM/world/KNT/session stores |
| timing/metrics aggregation | observability | non-authoritative |
| activity-permission UI attachment | orchestration | verified safe: text composer returns canonical reply unchanged; prompt is structured UI data |

## Domain/evidence logic currently embedded in `server.ts`

### C-01 — Session working-memory relevance selection
`buildSessionWorkingMemory()` tokenizes the current raw user message, scores older turns by lexical overlap + recency, and chooses which old transcript fragments enter the prompt.

This is not transport/orchestration; it is **evidence retrieval policy**.

**Owner candidate:** Session Working Memory retrieval policy.

**Phase classification:** STRUCTURAL-CHECK, not an immediate bug. The logic may remain behaviorally correct, but its owner should not be implicitly `server.ts`.

### C-02 — Entity grounding prompt projection
`buildEntityGroundingInstruction()` is defined inside `server.ts` and serializes canonical entity resolution plus grounding rules.

This is domain prompt projection rather than orchestration.

**Owner candidate:** Entity Grounding / prompt projection service.

### C-03 — World-event prompt projection
`buildWorldEventInstruction()` is defined inside `server.ts` and serializes CanonicalWorldEvent plus anti-invention rules.

**Owner candidate:** Canonical World Event prompt projection.

### C-04 — Social style policy
Inline `socialStyle` is a mixed HOW/behavior policy block and is a confirmed authority-hardening target.

**Owner is currently not explicit.** It must be decomposed/classified in Phase 1, not merely moved to another file.

### C-05 — Prompt composition
`server.ts` correctly invokes the shared final serializer, but it also decides which producer output feeds each prompt slot. This is healthy composition only if all producer outputs already have typed authority classes in Phase 1.

### C-06 — Relationship prompt string
`relationshipInstruction` is constructed from `behaviorProfile.relationshipInstruction` in the inspected path but is not passed into the final serializer call shown in the same production branch.

**Classification:** dead/legacy candidate to verify before removal; do not infer behavior impact while unused status is not mechanically proven.

## Resolved side finding — activity permission
The server invokes `attachActivityPermission()` after final delivery selection. Inspection of the owned runtime confirms `composeKairaActivityPermissionChatReply()` returns the original reply unchanged; the permission prompt is returned separately as structured UI data.

Therefore this path does **not** currently bypass `allowQuestion`, `maxSentences`, or `maxWords` in the canonical reply text.

## Phase 0 conclusion
`server.ts` is mostly a valid composition root, but it also contains several domain/evidence prompt helpers and one mixed social-policy block. Therefore:

> `server.ts` size alone is not the problem. The measurable smell is domain ownership embedded in the composition root.

Phase 1/2 work should move or type ownership only when doing so resolves a confirmed authority/evidence seam; there is no blanket `server.ts` refactor project.

# ADR-0030: World-memory retrieval authorization uses canonical semantics

- Status: Accepted
- Date: 2026-09-04

## Context

The live chat server previously decided whether to load persistent world-event memory before canonical language understanding completed. `shouldRetrieveWorldEvents(...)` therefore re-parsed the raw user message and treated lexical temporal cues such as `bugün` as sufficient retrieval authority.

That created a second semantic authority downstream from `SemanticInterpretation@2`. A benign self-share such as `bugün çok enerjik hissediyorum` could open world-memory retrieval even though the canonical turn was not a recall request, allowing unrelated older world events to enter response context.

Persistent world memory itself is intentionally cross-session for the same user and Kaira instance. The storage scope is already `userId + kairaInstanceId`; adding a hard `sessionId` filter would incorrectly destroy legitimate long-term recall.

## Decision

World-event retrieval authorization is decided only from canonical typed semantics:

- resolve canonical `SemanticInterpretation@2` before attempting world-event retrieval;
- authorize retrieval only when `discourseFacets.discourseAct === "recall_request"`;
- `shouldRetrieveWorldEvents(...)` accepts the typed semantic facet rather than raw user text;
- raw user text may still be used by the already-authorized ranking/relevance stage, but it cannot grant retrieval authority;
- persistent world-memory scope remains `userId + kairaInstanceId`; no session hard-filter is introduced.

## Authority invariant

Semantic ingestion remains the single classification authority. A downstream memory seam may consume canonical semantic evidence, but it may not reopen the semantic decision with regexes, keywords, or temporal lexical cues.

If a genuine recall request is misclassified by the semantic provider, the correction belongs at the producer/schema/prompt evidence boundary. Downstream raw-text heuristics must not compensate for provider drift.

## Consequences

- Temporal words alone cannot cause unrelated persistent world memory to enter the reply context.
- Genuine canonical recall requests retain cross-session persistent retrieval.
- Ranking, contradiction resolution, temporal graph logic, and evidence projection remain unchanged after authorization.
- The change removes a duplicate semantic-decision seam rather than adding a new memory policy layer.

## Verification

- `src/services/kairaWorldEventRetrievalCoordinatorContracts.test.ts` locks typed recall authorization and rejects non-recall semantics even when the original message contains a temporal cue.
- `src/services/kairaWorldMemorySemanticGateRegression.test.ts` permanently locks the reproduced benign temporal self-share boundary and genuine recall eligibility.
- Server wiring resolves canonical language understanding before world-event retrieval and passes `canonicalSemantic.interpretation` into the retrieval gate.
- Required validation: architecture contracts, autonomous runtime contracts, beta gates, full Vitest suite, TypeScript, production build, behavior/docs guards, Architecture Review, and production smoke proving both non-recall isolation and cross-session recall preservation.
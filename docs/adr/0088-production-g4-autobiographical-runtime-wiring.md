# ADR-0088: Production G4 autobiographical runtime wiring

- Status: Accepted
- Date: 2026-09-08

## Context

ADR-0087 established the bounded typed autobiographical context that G4 may consume, but intentionally left persistence/loading upstream. Production `server.ts` therefore still called the canonical KDM turn without supplying that context, so the G4 autobiographical seam existed in types/tests but was inactive in the live chat path.

The missing step must not move Firestore access, raw autobiographical records, or semantic interpretation into G4. It must also preserve the existing authority split: `SemanticInterpretation@2` owns current-turn meaning, `RelationshipState` owns durable relationship quality, the learned dyadic norm owns event-family expectation, and autobiographical depth is only bounded affective context.

## Decision

Add an upstream runtime loader that:

1. loads the Kaira-instance-owned canonical identity through the canonical identity store;
2. projects it with the existing ADR-0087 `buildSocialAppraisalAutobiographicalContext` boundary;
3. selects only the exact active user's stable participant identity;
4. returns only `SocialAppraisalMemoryContext`, never raw autobiographical records;
5. passes that typed context through `analyzeKdmInteractionCanonicalTurn` and `kdmRelationshipReducerBridge` into the single G4 resolution for the turn.

`server.ts` owns the persistence-aware orchestration. G4 remains synchronous and persistence-free.

If canonical identity is missing, unavailable, or ephemeral, the runtime passes `memory=undefined`, preserving the pre-wiring appraisal baseline.

## Authority constraints

This wiring MUST NOT:

- reparse current-turn raw text;
- infer semantic target, intent, valence, harm, repair, or affection from autobiographical content;
- pass raw facts, event text, event type, or emotion labels into KDM/G4;
- create relationship meaning from memory alone;
- replace `RelationshipState` or the learned dyadic norm as their respective authorities.

Autobiographical depth retains the ADR-0087 rule: it may only boundedly modulate an affective projection that canonical current-turn appraisal already made material.

Explicit autobiographical self-recall remains a separate runtime concern. It answers questions about Kaira's own remembered experience and has its own response guard; it does not become the social-appraisal authority.

A turn that requires both explicit self-recall and social-appraisal context may currently read the same canonical identity through two upstream seams. That is performance/IO debt only, not duplicated semantic authority. A future shared request-scoped identity load may optimize it without changing either contract.

## Regression proof

`src/services/socialAppraisalAutobiographicalRuntimeWiringNeighborProofRegression.test.ts` is the historical RED→GREEN proof against pre-wiring main `532d64b86e577540283a0a94f2b7ab84ce2cbc93`.

The reported case proves exact active-user projection. Neighbor cases prove non-canonical, non-lived, and sensitive records stay outside the G4 context. The counterexample proves missing canonical identity preserves the memory-free baseline.

The existing ADR-0087 regression continues to prove the downstream semantic safety invariant: autobiographical depth cannot create effect from zero or rewrite relational harm/repair meaning.

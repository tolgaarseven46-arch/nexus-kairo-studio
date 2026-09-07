# ADR-0075: Low-confidence canonical world-memory queries fail closed

- Status: Accepted
- Date: 2026-09-07

## Context

A fresh live KNT session exposed a retrieval-authority failure on Turn 11. The user asked whether they were still in a relationship with Ece. Canonical semantics correctly authorized recall and emitted a typed world-memory query for `person:ece.relationship_status_with_user`, but the query confidence was `0.70`.

`rankWorldEventObservations(...)` admitted structured memory queries only at `>= 0.72`. Below that threshold it converted the canonical query to `null` and silently continued with generic lexical / temporal ranking. Because the raw message contained a current-state cue, unrelated grounded events about the current user and Kaira were promoted as canonical conflict evidence. The world guard then authored an irrelevant conflict response, and final delivery rejected the turn.

The problem is not that `0.70` must be considered sufficiently trustworthy. The problem is that an explicitly typed but insufficiently confident canonical query was treated as if no canonical query existed, reopening a broader lower-authority relevance path.

## Decision

Keep the existing `0.72` structured-query admission threshold.

When a canonical `SemanticWorldMemoryQuery` is present but its confidence is below the admission threshold, world-event retrieval returns no evidence for that query. It must not broaden into lexical, temporal, name, contradiction, or current-state ranking.

When no canonical memory query exists at all, existing general/legacy relevance ranking remains available for authorized recall requests.

When a canonical query clears the admission threshold, existing exact `subjectId + attributeKey` memory-fact filtering remains unchanged.

## Authority invariant

A downstream retrieval seam may narrow canonical memory intent; it may not erase a typed canonical query and substitute a broader raw-text interpretation.

`query present + confidence below admission` means **insufficient evidence to retrieve**, not **permission to guess relevance differently**.

## Non-goals

This change does not:

- lower the `0.72` query or memory-fact confidence threshold;
- add Ece/person-specific logic;
- add a raw-text classifier;
- change recall authorization (`discourseAct=recall_request` remains canonical authority);
- change world-event persistence or contradiction projection;
- fix the separate Turn 12 action-request delivery failure.

## Verification

`kairaLowConfidenceWorldMemoryQueryRegression.test.ts` locks:

1. a `0.70` typed query fails closed even when unrelated world events would otherwise score highly;
2. the same structured query at `0.90` retrieves only its exact matching fact;
3. query-less authorized/general ranking remains available and is not globally disabled.

The PR must pass architecture contracts, autonomous runtime contracts, beta gates, full Vitest, TypeScript, production build, behavior/docs guards and SHA-bound Architecture Review before merge.

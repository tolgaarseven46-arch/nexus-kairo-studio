# ADR-0013: Fresh-user owner scope isolation

- Status: Accepted
- Date: 2026-09-04

## Context

Kaira persistent relationship, recent/deep KDM memory and the server memory cache share an owner scope derived from `userId` (and, for non-reference Kairas, `instanceId`). The legacy owner segment replaced every non `[A-Za-z0-9_-]` character with `_` and truncated to 96 characters.

That transform was not injective. Distinct fresh users such as `fresh:user` and `fresh/user` could resolve to the same owner key, and two long ids differing only after character 96 could also collide. Because the same key partitions Firestore state/memory and the fast-memory cache, a collision could expose one user's persisted context to another user.

## Decision

Keep byte-compatible legacy owner paths only for already-safe ids (`[A-Za-z0-9_-]`, at most 96 characters) that do not use the reserved `u2_` prefix.

All unsafe, overlong, or reserved-prefix raw user ids are encoded into the `u2_` namespace using their complete Unicode code-point sequence. The encoding is deterministic and filesystem/Firestore-key safe. `u2_` is reserved so a raw user cannot choose another user's encoded owner key: a raw id beginning with `u2_` is encoded again.

The resulting owner scope continues to be the single partition key consumed by relationship state, KDM memory, language memory and the server memory cache. No response-time filtering is added; isolation is enforced at ownership-key construction.

Instance-id migration is explicitly out of scope for this repair. Existing instance behavior remains unchanged.

## Compatibility

Existing safe reference-Kaira owner keys remain unchanged, so normal legacy Firestore records stay readable without migration. Existing safe non-reference instance scopes also retain the same `<user>__<instance>` shape.

Legacy records belonging to previously lossy unsafe/overlong ids cannot be safely auto-associated because the old key may represent multiple distinct raw ids. The runtime therefore prioritizes non-contamination over ambiguous legacy recovery for those ids.

## Verification

`kairaFreshUserMemoryIsolationRegression.test.ts` proves that:

1. formerly-colliding punctuation variants produce distinct owner/cache scopes;
2. a literal raw id cannot shadow the reserved encoded namespace;
3. long ids differing beyond the old truncation boundary remain distinct;
4. user A can retrieve an A-only memory canary through the real KDM persistence loader while fresh user B retrieves no canary;
5. already-safe legacy ids keep their existing paths.

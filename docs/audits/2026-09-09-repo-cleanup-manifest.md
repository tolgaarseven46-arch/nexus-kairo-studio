# Repo Cleanup Manifest — 2026-09-09

## Purpose

Repository hygiene without deleting evidence by filename/age alone. Git history remains the archive; active runtime, CI, regression and architecture evidence stays in the current tree.

## Verified state before this cleanup PR

- Canonical main after PR #190: `5a00364af59f1968d1432ac0524dd7c02800e148`.
- Natural Characterization v2: 10 scenarios / 11 executions / 220 turns, API-free.
- Known reproducible product failures discovered in this characterization cycle were closed through PRs #182, #183, #185, #186, #187, #188, #189 and #190.
- S6 playful/hurt is additionally protected by a hard trajectory regression after PR #190.

## Workflow inventory — KEEP

All four workflows remain active and are not cleanup candidates:

- `.github/workflows/ci.yml` — FULL merge gate.
- `.github/workflows/architecture-review.yml` — architecture boundary review.
- `.github/workflows/fast-ci.yml` — branch FAST lane + evidence artifact.
- `.github/workflows/kaira-autonomous-life.yml` — autonomous-life runtime workflow.

## Active script/tooling policy — KEEP

Keep scripts that are referenced by package/workflow/current testing, including:

- `scripts/run-behavior-red-green-proof.mjs`
- FAST CI runner
- Natural Characterization v2 report runner
- Phase-0 / beta acceptance runners used by FULL CI

## One-shot source-rewrite/debug scripts — REMOVED FROM CURRENT TREE

The following files were verified as unreferenced by `package.json`, workflows, source imports and current repo code search. Representative inspection also confirmed that they mutate source files as historical migration/debug helpers rather than serving runtime/test execution.

Removed in `codex/repo-cleanup-one-shot-scripts`:

1. `scripts/addSemanticTestsToLiveDebug.mjs`
2. `scripts/removeSemanticTestsFromLiveDebug.mjs`
3. `scripts/makeSemanticQuickTestsVisible.mjs`
4. `scripts/fixTestLabCanonicalState.mjs`
5. `scripts/applyEntityGroundingToResponse.mjs`
6. `scripts/applyEntityResolutionPersistence.mjs`
7. `scripts/applyLanguageUnderstandingIntegration.mjs`
8. `scripts/applyWorldEventIntegration.mjs`
9. `scripts/applyWorldEventRetrieval.mjs`
10. `scripts/applyWorldEventRetrievalAudit.mjs`
11. `scripts/applyWorldModelEventStore.mjs`

These are **not destroyed historical evidence**: their contents and commits remain recoverable through git history.

## Branch hygiene

The earlier inventory found 72 `codex/*` branches. Several heads are proven merged and are safe deletion candidates, including the heads used by PRs #181–#190.

However, the currently available GitHub connector exposes branch create/update but **no delete-ref action**. Therefore branch refs are not claimed as deleted in this cleanup. The safe-delete classification remains recorded; physical branch deletion is a repository-hygiene follow-up when an authorized delete-ref path is available.

Important: some older branches diverge from main and cannot be deleted merely because their names look historical. Git history/merged-PR evidence is required.

## Docs policy

KEEP:
- `PROJECT_STATE.md`
- `AI_CONTEXT.md`
- `AI_CHANGELOG.md`
- `AGENTS.md`
- `CLAUDE.md`
- `docs/adr/**`

ARCHIVE/KEEP as historical evidence:
- `docs/audits/**`

Root historical audit documents should migrate under `docs/audits/` or `docs/archive/` in a future docs-only cleanup if needed; this is not allowed to block product work.

## Cleanup result

- 11 obsolete one-shot scripts removed from the live tree.
- Active CI/runtime/test tooling preserved.
- No product runtime behavior changed by this cleanup PR.
- No regression baseline removed.
- No provider/API evidence used.
- Branch refs remain only because delete-ref capability is unavailable; no false claim of deletion is made.

## Closure rule

This cleanup phase is complete when this PR passes normal gates and merges. Further branch/doc hygiene is backlog and must not block the next product capability unless a concrete repository-operability problem is demonstrated.

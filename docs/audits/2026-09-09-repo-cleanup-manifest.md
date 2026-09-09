# Repo Cleanup Manifest — 2026-09-09

## Purpose

This manifest records repository cleanup candidates **without deleting by appearance or age alone**. Cleanup must preserve canonical architecture, regression evidence, active CI, and historical ADR/audit records.

Classification:

- `KEEP` — active runtime/CI/architecture evidence.
- `DELETE_BRANCH` — branch is proven merged and has no open PR/work remaining.
- `REVIEW_BRANCH` — branch exists but must receive merge/ancestry evidence before deletion.
- `REVIEW_SCRIPT` — helper looks one-shot/legacy but must receive reference/history evidence before deletion.
- `ARCHIVE` — historical evidence that should remain in git/docs even if no longer active.

## Current verified repository state

- Canonical main after PR #183: `86a8cbd4664d5d52ecad5a268d83138117410caf`.
- Open PRs at inventory time: `0`.
- `codex/*` branches discovered: `72`.
- Natural Characterization v2 latest deterministic result before PR #183 merge: 10 scenarios / 11 executions / 220 turns, `FAIL_PRODUCT=0`, `FAIL_TEST_OR_DETECTOR=0`.
- Provider/API was not used as proof for the S5/S8 fixes.

## Workflow inventory

| Path | Class | Evidence / reason |
| --- | --- | --- |
| `.github/workflows/ci.yml` | KEEP | FULL merge gate: architecture contracts, autonomous contracts, beta, Phase-0, historical proof, full Vitest, TypeScript, production build. |
| `.github/workflows/architecture-review.yml` | KEEP | Active architecture review gate; PR #183 Architecture Review #755 passed. |
| `.github/workflows/fast-ci.yml` | KEEP | Active `codex/**` FAST operating model; reruns touched tests and Natural Characterization v2 on semantic-ingestion changes. |
| `.github/workflows/kaira-autonomous-life.yml` | KEEP | Production autonomous-life scheduler/runtime workflow. |

No workflow is a deletion candidate in this pass.

## Immediately proven merged branch candidates

These branch heads were used by merged PRs and there are no open PRs now.

| Branch | Class | Merge evidence |
| --- | --- | --- |
| `codex/natural-characterization-v2` | DELETE_BRANCH | PR #181 merged; Natural Characterization v2 tooling is on main. |
| `codex/semantic-negation-stop-paraphrase` | DELETE_BRANCH | PR #182 merged; merge SHA `4870d5a2398082eefdc31a04c0078b9b91875b4f`. |
| `codex/third-party-reported-target-resolution` | DELETE_BRANCH | PR #183 merged; merge SHA `86a8cbd4664d5d52ecad5a268d83138117410caf`. |

Branch deletion is repository hygiene only; it must not remove git history or merged commits.

## Remaining branch inventory

The repository still contains 69 additional `codex/*` branches after excluding the three directly proven candidates above. They are `REVIEW_BRANCH` until GitHub merge/ancestry evidence is checked. No branch may be deleted merely because its name looks old.

Notable families observed:

- Phase-0 authority/harness/report/red-team branches.
- Social Appraisal G1/G2/G3/G4 and dyadic-norm branches.
- Autonomous-life scheduler/finalize/diagnostics branches.
- Conversation/final-delivery/question/memory bug-fix branches.
- World-model/event/retrieval branches.
- FAST CI / beta acceptance / characterization branches.

Cleanup rule: a branch becomes `DELETE_BRANCH` only if all branch-only commits are already represented on main (directly or through a merged PR) and there is no open PR or active checkpoint depending on it.

## Script inventory — active vs review

### KEEP — explicitly wired to package/CI or current operating model

- `scripts/run-behavior-red-green-proof.mjs` — called by FULL CI historical RED→GREEN gate.
- FAST CI runner and Natural Characterization v2 report runner — active branch validation/characterization evidence.
- Phase-0/beta acceptance report runners referenced by `.github/workflows/ci.yml` — active CI evidence.

### REVIEW_SCRIPT — likely one-shot migration/debug helpers; no deletion in this manifest

The `scripts/` directory still contains helpers with migration/debug naming such as:

- `addSemanticTestsToLiveDebug.mjs`
- `removeSemanticTestsFromLiveDebug.mjs`
- `makeSemanticQuickTestsVisible.mjs`
- `fixTestLabCanonicalState.mjs`
- `applyEntityGroundingToResponse.mjs`
- `applyEntityResolutionPersistence.mjs`
- `applyLanguageUnderstandingIntegration.mjs`
- `applyWorldEventIntegration.mjs`
- `applyWorldEventRetrieval.mjs`
- `applyWorldEventRetrievalAudit.mjs`
- `applyWorldModelEventStore.mjs`

`package.json` does not expose these helpers as npm scripts. That is **not sufficient evidence for deletion**. Before deleting each file, require:

1. no reference from package scripts, workflows, source imports, docs instructions, or current tooling;
2. its intended transformation is already represented in main;
3. no regression/restore procedure depends on it;
4. deletion passes FAST and FULL gates when behavior-critical paths are involved.

## Docs / audit policy

- `PROJECT_STATE.md`: KEEP, but update to the post-PR-183 checkpoint.
- `AI_CONTEXT.md`, `AI_CHANGELOG.md`, `docs/adr/**`: KEEP; they hold architecture/contracts/history.
- `docs/audits/**`: ARCHIVE by default. Audit files are evidence, not runtime clutter; delete only duplicate/generated artifacts that are reproducible and carry no unique decision record.

## Cleanup execution order

1. Update `PROJECT_STATE.md` to mark Natural Characterization v2 tooling + S5 + S8 closed and main at `86a8cbd4…`.
2. Remove only the three directly proven merged branch refs above when branch-ref deletion capability is available.
3. Batch-audit the remaining 69 branches against main/merged PR history; promote only proven ones to `DELETE_BRANCH`.
4. Audit `REVIEW_SCRIPT` helpers for references and historical necessity.
5. Delete script files only in a dedicated cleanup PR with no product behavior change, and run the normal gates.
6. Recount branch/script inventory after merge and record the reduced state.

## Explicit non-goals

- No architecture redesign.
- No new semantic classifier or regex patch.
- No G1→G4, RelationshipReducer, memory, ResponsePlan, or speech-identity change.
- No regression baseline removal.
- No provider/API evidence.
- No deletion based only on filename, age, or branch naming.

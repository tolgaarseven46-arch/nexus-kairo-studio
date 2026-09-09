# ADR-0090 — Fast branch validation + full PR merge gate

Date: 2026-09-09
Status: Proposed

## Context

Recent Kaira work showed that GitHub full CI was being used as an iterative debugger. A single acceptance-test measurement mistake required repeated PR CI isolation runs even though production runtime was not broken. This created avoidable latency without adding architectural safety.

The repository already has a comprehensive `CI` workflow on pull requests and `main`. Its coverage is intentionally broad and remains the final merge safety gate.

## Decision

Use two validation lanes with different purposes.

### FAST lane — development feedback

- Trigger: push to `codex/**` development branches.
- No provider/API calls.
- Runs a compact high-value canonical set covering architecture authority, semantic authority, G4/social appraisal, typed repair, conversation state, behavior-policy boundary and final ResponsePlan authority.
- Runs TypeScript after the fast test set.
- Always uploads one `fast-ci-<sha>` artifact containing:
  - Vitest JSON output (`vitest.json`) with failing test/assertion/stack data;
  - human-readable Vitest log;
  - TypeScript log;
  - machine-readable `summary.json` with command, exit code and duration.
- Purpose: diagnose branch work before a PR exists. It is not a merge gate and does not replace the full suite.

### FULL lane — merge gate

- Existing `.github/workflows/ci.yml` remains unchanged.
- Trigger: pull request to `main` and push to `main`.
- Continues to run architecture contracts, autonomous contracts, beta regressions, Phase-0 baseline/report, captured KNT acceptance, historical RED→GREEN proof, full Vitest, TypeScript and production build.
- Architecture Review remains independent.

Development discipline becomes:

1. branch from current `main`;
2. iterate using FAST lane;
3. open PR only when the branch is ready;
4. run FULL lane once on the merge-ready PR head;
5. merge only if FULL CI + required guards/review are green.

## Shadow-authority checkpoint

A small current-main verification was performed rather than reopening a global audit:

1. `discourseSocialAct.ts` classifies **user** turns strictly from the shared canonical event. Its compatibility `_message` argument is intentionally ignored. Regexes in that file apply only to Kaira's already-delivered reply as self-observation/repetition tracking.
2. `droitBehaviorEngine.computeBehaviorProfile` still contains a legacy raw-text distress fallback, but the canonical production KDM entrypoint `analyzeKdmInteractionCanonicalTurn` always passes `appraiseBehaviorSeriousContext(semanticInterpretation)`. Therefore the raw fallback is not production semantic authority on that path.
3. `relationshipBehaviorService.applyRelationshipContext` still exists, but current-main code search found no caller. Treat it as a cleanup/dead-code candidate until reference manifest work proves otherwise; do not delete based on name alone.

No product behavior is changed by this ADR or FAST lane.

## Non-decisions

- Full CI coverage is not reduced.
- Closed architecture seams are not reopened.
- Provider/API is not introduced into core validation.
- No new semantic/appraisal/relationship authority is added.
- Repository cleanup remains evidence-before-deletion and is a separate manifest-driven task.

## Success criteria

- A `codex/**` push can produce canonical test + TypeScript feedback and a reusable failure artifact without opening a PR.
- PR creation remains the point at which comprehensive FULL validation starts.
- A failed FAST run can be diagnosed from one uploaded artifact instead of repeated CI binary isolation.

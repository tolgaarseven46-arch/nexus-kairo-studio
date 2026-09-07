# ADR-0078 — Deterministic KNT replay and bug-class RED→GREEN proof

Status: Accepted
Date: 2026-09-07

## Context

Fresh production KNT sessions repeatedly exposed neighboring failures after a reported example had already been fixed. Existing CI required tests and golden/long-session regressions, but it did not prove that a bug fix generalized beyond the single reported example, and the two fresh captured sessions (Test A: 13 turns; Test B: 6 turns) were not replayed as exact artifacts in CI.

The result was an expensive loop: live bug → narrow fix → live retest → neighboring bug.

## Decision

### 1. Exact captured KNT replay

The raw Test A and Test B exports are stored losslessly as gzip+base64 fixtures. The replay test decodes them and verifies the SHA256 of the original raw export before using them. This prevents silent fixture editing or summary drift.

The captured replay runs without OpenRouter/Gemini/API calls. It replays the captured semantic/event/memory/response-plan surfaces through current deterministic production functions for the measured failure seams.

`config/beta-conversation-acceptance.json` includes the captured replay test, so every beta conversation acceptance run executes it.

### 2. Bug-class proof instead of single-example regression

Every behavior bug cluster recorded in `config/behavior-regression-proof.json` must declare:

- one invariant in plain language,
- the exact historical pre-fix commit SHA (`redSha`),
- one reported failure case,
- at least two same-class neighboring failure cases,
- at least one counterexample that must remain valid.

The test file must contain every declared case.

### 3. Historical RED→GREEN evidence

`scripts/run-behavior-red-green-proof.mjs` performs executable proof:

- each reported + neighboring case must be RED when the current proof test is run against the recorded historical pre-fix SHA,
- the same cases must be GREEN on HEAD,
- counterexamples must remain GREEN on both the historical SHA and HEAD.

This distinguishes a genuine generalized fix from a test that was always green or from a fix that only matches the reported phrase.

### 4. CI enforcement

CI uses full git history (`fetch-depth: 0`) and runs:

1. beta conversation acceptance including captured Test A/B replay,
2. proof-manifest validation,
3. historical RED→GREEN proof,
4. the full normal test suite, TypeScript and production build.

For behavior-critical PRs whose title begins with `fix(`, `behavior-guard` additionally requires:

- `config/behavior-regression-proof.json` to change,
- a `*NeighborProofRegression.test.ts` file to change.

This is intentionally stricter than the previous "some test changed" gate.

## Invariants

- A raw captured KNT fixture is immutable evidence; replay must verify its original SHA256.
- A behavior bug is not considered proven fixed by one green reported example.
- A bug-class fix needs at least two independently named neighboring failures.
- Historical RED evidence is required; tests that were already green before the fix do not prove the bug.
- Counterexamples must stay green before and after the fix.
- Captured replay never calls an external AI provider.
- Existing architecture contracts, beta regression, full tests, TypeScript and build remain mandatory; this ADR adds gates rather than replacing them.

## Non-goals

- Reproducing nondeterministic provider wording byte-for-byte.
- Treating archived bad assistant text as desired output.
- Replacing live natural conversation testing; fresh sessions remain discovery tools, while deterministic replay prevents recurrence.
- Requiring feature-only PRs to invent a historical RED bug proof.

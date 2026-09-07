# ADR-0079 — Phase 0 machine-readable report gate

Date: 2026-09-07
Status: Accepted

## Context

PR #142 introduced the no-AI Phase 0 scenario harness: 21 regression scenarios / 423 fixed user turns across five root-cause clusters. The harness intentionally stops at `FINAL_PROVIDER_PROMPT_BUILT_NO_PROVIDER_CALL` and does not invoke Gemini/OpenRouter.

The repository already contains `scripts/run-kaira-preai-phase0-report.ts`, but the normal CI workflow did not execute that report generator. As a result, the scenario harness could pass while the joint user + ChatGPT + Cloud review still lacked a reproducible machine-readable batch report.

## Decision

CI must execute the Phase 0 report generator immediately after the deterministic scenario harness and print the resulting JSON between explicit log markers.

The report is a tooling/diagnostic product only. It does not change Kaira behavior and does not expand Phase 0 beyond the current no-AI boundary.

## Required boundary

- Scenario count: 21
- Fixed user turns: 423
- Track: regression
- AI provider calls: forbidden
- Stop seam: `FINAL_PROVIDER_PROMPT_BUILT_NO_PROVIDER_CALL`
- Review gate: Phase 1 / 100-scenario scale-up remains blocked until the report is jointly reviewed and the exact production final-provider-prompt seam limitation is resolved.

## Consequences

- CI now produces an inspectable Phase 0 batch report instead of only pass/fail test status.
- Failure clusters can be reviewed together before any Test C behavior fix is attempted.
- No claim is made that the deterministic regex-floor ingress equals semantic-provider quality.
- No claim is made that the current prompt snapshot is byte-identical to the full `server.ts` production template until that seam is explicitly shared and verified.

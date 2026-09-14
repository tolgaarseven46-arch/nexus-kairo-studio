# Pre-API architecture stress characterization

Date: 2026-09-14
Status: characterization only

## Purpose

Extend the existing Phase-0 deterministic pre-provider proof without changing production behavior. The stress suite exercises compound modality, attribution, correction/temporal, commitment, deterministic replay, multi-user isolation and long-session pressure. A separate runtime-boundary test invokes the real client chat pipeline, mocks only the external HTTP boundaries, and captures the `/api/chat` payload before provider output is evaluated.

## Authority boundaries

- `SemanticInterpretation@2` remains the canonical current-turn semantic authority.
- No downstream raw-text reparsing or second semantic authority is added.
- No production fix is included in this PR.
- Failures are to be classified before any production patch: architecture RED, test/harness defect, or intentionally unimplemented capability.
- PR #268 remains the separate characterization for fragmented episode × reply/mention interruption.

## Evidence goal

The test run must distinguish:
1. existing layer/contract and 21-scenario / 423-turn baseline health;
2. new compound and long-run deterministic stress behavior;
3. real client runtime propagation from assembled input through canonical LU and behavior preparation into the final `/api/chat` request payload;
4. infrastructure/documentation failures that are not behavioral failures.

No provider response quality is part of the acceptance criterion.
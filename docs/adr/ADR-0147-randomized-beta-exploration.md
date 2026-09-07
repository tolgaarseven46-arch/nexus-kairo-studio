# ADR-0147 — Seedable randomized beta exploration

## Status
Accepted for test/observability infrastructure.

## Context
The existing beta acceptance and Phase 0 gates are deterministic regression suites. They prove known contracts but do not explore varied multi-turn combinations similar to manual live-beta sessions.

The project needs a reproducible randomized exploration track that can expose interaction/state/authority seams without pretending that CI has executed a live OpenRouter/Gemini response.

## Decision
Add a seedable randomized beta exploration runner which:

- generates multi-turn scenarios from curated social, injury/repair, third-party memory, action coordination, affection-boundary and slang/noise families;
- executes the repository's existing Phase 0 canonical core (`language understanding -> canonical KDM -> discourse/dialogue -> behavior contract -> speech identity -> response plan -> shared final-provider prompt serializer`);
- records compact per-turn semantic, dialogue, relationship/dynamic-state, response-plan and prompt-audit observations;
- uses deterministic PRNG seeding so any discovered run is exactly reproducible;
- does **not** call a model provider and does **not** invent an assistant reply;
- explicitly reports `semanticProvider=deterministic_regex_floor` and `modelProvider=not_called` so exploratory evidence is not confused with live provider quality.

A dedicated GitHub Actions workflow runs 24 eight-turn sessions by default and prints the machine-readable report. `workflow_dispatch` can provide a custom seed and scenario count for follow-up reproductions.

## Consequences
- Randomized exploration can find state/authority inconsistencies that fixed regression cases may miss.
- A failure or anomaly can be replayed from its seed.
- This track is evidence about deterministic canonical-core composition and state evolution, not evidence about model-provider language quality or full persistent production context.
- Captured KNT replay and live beta tests remain separate evidence tracks for delivered-response behavior until a provider-enabled, credential-safe automated beta runner is deliberately introduced.

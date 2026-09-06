# ADR-0061 — Beta final-delivery acceptance ownership

## Status
Accepted

## Context
ADR-0005 defines the beta conversation acceptance gate as a small set of durable product-facing scenarios that are not already owned by another early gate. The current manifest covers integrated relationship/state recovery and per-turn persistence/hydration, but it does not exercise the quality of the replies that would actually be delivered across a mixed conversation before the full suite runs.

A deterministic 20-turn product-facing scenario already exists in `kairaTwentyTurnFinalDeliveryQualityRegression.test.ts`. It crosses canonical semantic understanding, KDM state, DialogueDecision, ResponsePlan, speech identity, local/AI routing, quality repair, final consistency enforcement, relationship injury/repair and repetition constraints. It uses deterministic local fixtures rather than a live provider.

The scenario is not owned by `test:beta`, so promoting it does not duplicate an existing early gate.

## Decision
- Add `kairaTwentyTurnFinalDeliveryQualityRegression.test.ts` to the canonical `config/beta-conversation-acceptance.json` manifest.
- Keep the manifest as the single acceptance source; do not duplicate filenames in CI workflow YAML.
- Keep focused natural-conversation mechanism regressions in the full suite unless they become durable cross-cutting acceptance scenarios.
- Preserve `test:beta` ownership separation.
- This change modifies acceptance coverage only; it does not change runtime behavior, response policy, probabilities, personality, memory, routing or provider usage.
- No provider/API/live smoke is introduced.

## Consequences
A green beta conversation acceptance step now proves three distinct product-facing surfaces before the full suite: integrated relationship/state recovery, turn-by-turn persistence/hydration integrity, and delivered-reply quality across a mixed 20-turn conversation. This strengthens the product-readiness signal without turning the acceptance gate into a duplicate of the full regression suite.

## Verification
The pre-change characterization had one intentional failure: the final-delivery quality scenario existed and was distinct from `test:beta`, but was absent from the acceptance manifest. After promotion, the characterization and canonical gate contract must pass together with the acceptance runner, full Vitest suite, TypeScript and production build. Final PR CI is required on the committed head. No provider calls are part of verification.

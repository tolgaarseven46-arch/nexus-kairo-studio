# ADR-0015 — Emotional load confidence and policy calibration

- Status: Accepted
- Date: 2026-09-03

## Context

Canonical `SemanticInterpretation@2` already carries graded `emotionalLoad`, interpretation uncertainty and evidence confidence. Two older seams ignored that richer contract:

1. canonical → legacy projection accepted the model-provided `emotionalLoad` with a raw `max(...)`, so an uncertain LLM guess could mark ordinary chat as emotionally loaded;
2. KDM mapped every `emotionalLoad > 0` to the coarse `duygusal_yük` sentiment, collapsing mild and salient emotion into the same policy label.

The old `kairaEmotionalLoadWiring` TODO described the absence of a confidence gate, but the current canonical schema already provides the evidence needed to build that gate.

## Decision

1. Semantic extraction continues to own the raw 0..1 `emotionalLoad` measurement. Policy does not reparse the message.
2. A single `emotionalLoadPolicy` defines shared thresholds:
   - `< 0.30`: none
   - `0.30..0.59`: mild
   - `0.60..0.79`: salient
   - `>= 0.80`: intense
3. A canonical measured load may raise the legacy projection only when:
   - evidence confidence is at least `0.65`, and
   - overall interpretation uncertainty is at most `0.55`.
4. The deterministic regex floor remains independent evidence and can never be erased by an uncertain model reading.
5. KDM's coarse `duygusal_yük` label is reserved for salient-or-intense load (`>= 0.60`). Mild trusted emotion remains observable numerically but does not receive the full coarse load label.
6. `emotionalLoad` does not directly decide dialogue moves, relationship repair, advice, or response permissions. Those remain owned by their canonical semantic facets and final BehaviorContract/KairaResponsePlan boundaries.

## Consequences

- Ordinary chat no longer becomes `duygusal_yük` merely because an uncertain LLM emits a small/non-grounded non-zero value.
- Mild emotion can be represented without being flattened into the same policy class as strong emotional disclosure.
- Deterministic low-mood signals remain fail-safe.
- Thresholds and trust criteria live in one reusable policy module instead of consumer-specific magic numbers.

## Permanent verification

- `src/services/kairaEmotionalLoadPolicyContracts.test.ts`
- `src/services/kairaEmotionalLoadCalibrationRegression.test.ts`
- `src/services/kairaEmotionalLoadWiring.test.ts`
- full CI, TypeScript and production build

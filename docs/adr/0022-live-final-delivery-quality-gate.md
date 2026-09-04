# ADR-0022: Live final-delivery quality gate

- Status: Accepted
- Date: 2026-09-04

## Context

After PR #46 established a canonical 20-turn final-delivery acceptance regression, a one-time 30-turn conversation was executed against the deployed production `/api/chat` path while recording per-turn semantic source, KDM/reaction state, response plan, provider route, final reply and consistency result.

The characterization reproduced two delivery defects on the live canonical path:

1. An emotional-opening turn (`ben bugün baya yoruldum`) produced `Hatırladığım kayda göre:`. The downstream dialogue-quality check correctly marked the delivered text invalid, but that check ran after the canonical constraint pass had already made its fallback decision. The server therefore returned `consistency.accepted=false` while still delivering the invalid reply.
2. Model output occasionally exposed internal speaker/target labels such as `[Kaira → Ali]:` / `[Kaİra → Ali]:` because the visible-reply sanitizer only recognized the `Kairo` spelling.

The same live run also surfaced separate characterization candidates (irrelevant memory-prefix surfaces, long-gap Mert recall loss, and a stop-questions relationship/reaction change). They are not part of this fix because they require separate causal reproduction.

## Decision

### 1. Final quality failures participate in fallback selection

`runKairaResponseConstraintPass(...)` now accepts a lower-authority `additionalIssueFinder` callback. The server supplies the existing final-delivery checks for grounding, attribution, dialogue-move conformance and response rhythm.

These checks do not create new WHAT/WHETHER authority. They may only reject a realized candidate that violates already-resolved dialogue/grounding/rhythm contracts. If they reject a candidate, the existing grounded fallback is run through the same ordered canonical constraint pass before delivery.

This closes the ordering bug where a reply could become invalid only after fallback selection had finished.

### 2. Internal reply labels are transport-only

`sanitizeKairoReplyText(...)` recognizes Kairo/Kaira and Turkish dotted/dotless-I variants and removes the internal `[name → participant]:` prefix before visible delivery.

## Authority invariant

- `SemanticInterpretation@2` remains the semantic authority.
- KDM/BehaviorContract/DialogueDecision/ResponsePlan remain the behavior authority chain.
- Truth guards remain truth-only.
- `additionalIssueFinder` is a delivery-conformance seam only; it cannot grant permissions, change semantic classification or choose a new behavior move.
- Fallbacks remain untrusted and must pass the same canonical constraint pipeline.

## Verification

Permanent regression: `src/services/kairaLiveFinalDeliveryQualityRegression.test.ts`.

The regression locks the exact live-reproduced invalid emotional-opening draft and the Kairo/Kaira label leak. Full CI, TypeScript, production build and Architecture Review are required before merge. A focused production smoke must follow deployment.

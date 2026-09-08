# ADR-0023 — Single authority for dyadic social norms

## Status

Accepted.

## Context

ADR-0019 introduced `DyadicSocialNormProfile` as the learned Kaira↔person social-context model. An older SocialAppraisal contract still contained a separate minimal `DyadicSocialNormSnapshot` (`informalityBaseline`, `teasingReciprocity`, `normConfidence`). Keeping both would create two competing representations of the same learned concept.

## Decision

`src/types/dyadicSocialNorm.ts` is the canonical contract location for dyadic social-norm data.

- `DyadicSocialNormProfile` and related evidence/reading types live in `src/types`.
- `dyadicSocialNorm.ts` is implementation only: observe/read/map operations consume that contract.
- The service re-exports the types temporarily for import compatibility; this does not create a second definition.
- `SocialAppraisalInput.dyadicNorm` now accepts the canonical `DyadicSocialNormProfile` directly.
- The legacy `DyadicSocialNormSnapshot` definition is removed.

## Authority invariant

There is one learned dyadic norm state model. Compatibility may re-export the canonical type, but no parallel field set or independently evolving snapshot may interpret the same concept.

## Consequences

G2/G3 appraisal work can consume the same profile produced by norm learning/persistence without adapters that silently translate meaning. It also preserves layer direction: `types` defines contracts; `services` implement behavior over them.

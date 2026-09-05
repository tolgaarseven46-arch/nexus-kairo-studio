# ADR-0052 — Grounded natural reactions must engage content; neutral third-party events are not emotional openings

- **Status:** Accepted
- **Date:** 2026-09-05

## Context

Natural-conversation characterization v2 exposed two related quality failures on the live reference instance.

1. Grounded mundane statements such as `az önce kahveyi döktüm masaya` and `yarın toplantım var` were sometimes answered with only `he anladım`. Diagnostic replay proved this was not a hidden deterministic fallback: the live OpenRouter generation itself produced the generic acknowledgement, all canonical constraints accepted it, and consistency scored it 100/100.
2. `bu arada Mert yine geç kaldı` was classified as `emotional_share` even though the canonical provider also marked it neutral, third-party, low emotional load (0.3), no emotional-opening routine and no meaningful support/affection. DialogueDecision therefore opened an unnecessary emotional-context question.

## Decision

### Content engagement
- A grounded `natural_reaction` with semantic uncertainty below the existing ambiguity threshold receives canonical `requiredContent=engage_user_content`.
- `preserve_ambiguity` and `engage_user_content` are mutually exclusive. Opaque turns stay safely minimal.
- The realizer must react to at least one concrete part of the user's content without inventing new facts.
- Final ResponsePlan validation rejects acknowledgement-only surfaces (`he`, `hee`, `hmm`, `anladım`, `he anladım`, `tamam`, `tamamdır`) when this plan-owned obligation is active.
- The validator does not classify message content; it only consumes the PlanResolver-owned obligation.

### Neutral third-party event reconciliation
- The single canonical language-understanding gateway reconciles `primaryIntent=emotional_share` to `smalltalk` when the same typed interpretation says: target `third_party`, neutral valence, emotionalLoad <= 0.35, no emotional-opening routine, and low support/affection.
- The reconciliation uses only canonical SemanticInterpretation fields; it does not reparse raw text or create a downstream semantic authority.
- Genuine negative/high-load third-party emotional sharing remains `emotional_share`.

## Consequences

Mundane conversation can stay short without becoming contentless, while true ambiguity is still protected. Neutral observations about third parties no longer manufacture an emotional-opening workflow solely because the provider over-read mild event affect.

No RelationshipReducer, persistence, identity, memory, world truth or Claim provenance ownership changes.

## Verification

`kairaNaturalConversationV2QualityRegression.test.ts` covers neutral third-party reconciliation, genuine emotional-share preservation, content engagement, generic acknowledgement rejection and ambiguity exclusivity. Post-merge production characterization must replay the measured cases and a longer-session matrix.

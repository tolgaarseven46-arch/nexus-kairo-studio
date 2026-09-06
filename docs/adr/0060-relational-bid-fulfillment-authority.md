# ADR-0060 — Relational bid fulfillment authority

## Status
Accepted

## Context
After ADR-0059, substantive answer and grounded-recall moves carry a `DialogueDecision`-owned fulfillment contract. `respond_to_relational_bid` had the same user-facing requirement — generic acknowledgement is insufficient — but the rule was implemented as a dedicated branch inside `findDialogueDecisionIssues`. That made the downstream validator a second source of WHAT-level obligation semantics.

An API-free characterization on current `main` reproduced the boundary inconsistency: relational bids were planned correctly and generic acknowledgement was rejected, but `decision.obligation` was undefined and the rejection came from a move-specific validator rule.

## Decision
- Add `respond_to_relational_bid` to `DialogueObligationType`.
- Attach the existing `acknowledgement_only` prohibition through `attachDecisionOwnedObligation`.
- Remove the relational-bid-specific acknowledgement branch from `findDialogueDecisionIssues`.
- The generic obligation validator becomes the sole enforcement path for this fulfillment requirement.
- Pure social routines remain obligation-free.
- Relational realization/fallback remains responsible for HOW/content selection; this ADR changes only ownership of the fulfillment contract.
- No raw-text semantic reparse, provider call, live smoke, or additional WHAT authority is introduced.

## Consequences
The same user-visible behavior is preserved while the architecture becomes compositional: answer, recall, and relational-bid fulfillment requirements are declared upstream and consumed generically downstream. New substantive moves can extend the typed contract without adding validator-local semantic branches.

## Verification
API-free deterministic coverage includes the original characterization, a dedicated regression, existing DialogueDecision tests, full Vitest suite, TypeScript, architecture contracts, docs guard and production build.

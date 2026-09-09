# ADR-0022 — Contextual `yeter` stop scope

Status: Accepted
Date: 2026-09-09

## Context

Natural Characterization v2 S4 exposed a canonical-ingestion overreach on the turn:

`bilmiyorsan bilmiyorum de yeter`

The previous stop-paraphrase matcher treated any bounded `yeter` token as a current-turn stop request. That incorrectly converted a sufficiency/predicative use of `yeter` (roughly: “that is enough”) into `stopTalking=true`, causing `KairaResponsePlan.continueConversation=false` while the relationship itself remained active.

## Decision

At the canonical language-understanding boundary:

- explicit stop paraphrases remain stop requests;
- standalone conversational `yeter` / `yeter artık`, optionally with a small discourse prefix such as `tamam`, remain stop requests;
- `yeter` embedded as the predicate/complement of a sufficiency statement is not a stop request.

Examples that must **not** stop conversation:

- `bilmiyorsan bilmiyorum de yeter`
- `bu bilgi yeter`
- `şimdilik bu kadarı yeter`

Examples that remain stop requests:

- `yeter`
- `tamam yeter artık`
- `yeter artık cevap verme`

## Authority boundary

This change belongs only to canonical semantic ingestion. It does not add a downstream ResponsePlan heuristic and does not modify G1→G4, RelationshipReducer, memory, or speech identity.

## Verification

- reported + neighbor + counterexample regression coverage lives in `kairaSemanticNegationStopNeighborProofRegression.test.ts`;
- FAST lane reruns changed tests and Natural Characterization v2 for semantic-ingestion changes;
- frozen 21/423 baseline remains unchanged.

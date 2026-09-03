# ADR-0014 — Repetition observation → dialogue policy boundary

- Status: Accepted
- Date: 2026-09-03

## Context

`DiscourseState.selfRepeat` already observes Kaira repeating a coarse social act in a short window. The observation was visible to prompts, but it was not a binding delivery rule. This allowed the dialogue planner/model to emit the same social act again even though repetition had already been detected.

Repetition evidence must not become a second semantic authority. Current-turn meaning remains owned by canonical `SemanticEvent`; the final WHAT/WHETHER boundary remains `BehaviorContract` + `KairaResponsePlan`.

## Decision

1. `DiscourseState.selfRepeat` remains observational context and never reparses or relabels the user message.
2. `planDialogueResponse` preserves the canonical dialogue move, then projects detected self-repeat into an optional typed `repeatGuard` on `DialogueDecisionPlan`.
3. `repeatGuard` constrains only the delivered social surface: the same observed social act must not be emitted again on that turn.
4. `findDialogueDecisionIssues` deterministically rejects a reply whose coarse Kaira social act equals `repeatGuard.act`.
5. Dialogue instruction exposes the same typed constraint to the AI verbalizer; deterministic fallbacks avoid known repeat loops for greeting and acknowledgement.
6. Explicit farewell is exempt. Ending a conversation remains a social obligation even when farewell has recently repeated.
7. Repetition context cannot replace or downgrade factual answers, recall, correction, typed repair, emotional opening, or other canonical dialogue moves.

## Consequences

- Repetition becomes a real policy constraint instead of prompt-only advice.
- No new user-message classifier or semantic producer is introduced.
- AI and deterministic fallback paths share the same guard through `DialogueDecisionPlan` validation.
- Exact-text rhythm checks remain complementary; this ADR covers repeated **social function**, not only identical wording.

## Permanent verification

- `src/services/kairaRepetitionPolicyContracts.test.ts`
- `src/services/kairaRepetitionPolicyRegression.test.ts`
- normal CI architecture contracts, full tests, TypeScript and production build

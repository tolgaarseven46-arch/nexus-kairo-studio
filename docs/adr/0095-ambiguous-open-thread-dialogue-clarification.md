# ADR-0095: Clarify ambiguous open-thread resumption before content

## Status
Accepted for implementation on `codex/counterfactual-causal-replay-v2`.

## Context
`DiscourseStateReducer` already preserves uncertainty when more than one unresolved conversation thread can plausibly own a resumption: it sets `ambiguousThreadResumption=true` instead of inventing a `resumedThreadId`.

A red/green dialogue regression showed that `planDialogueResponse` did not consume that typed ambiguity. The same short advice request could therefore proceed through ordinary advice handling even though DialogueDecision had no grounded thread target. Historical RED commit: `ee8b3959df3352a1da5a3d84e1fa8d10d12f9980`; the reported case expected one clarification sentence but received the normal three-sentence advice budget.

## Decision
DialogueDecision must consume the reducer-owned `ambiguousThreadResumption` signal before recall/advice content routing.

When the signal is true, the response plan must:

- use `answer_or_clarify`,
- allow one follow-up clarification question,
- prohibit speculation,
- limit the turn to one short sentence,
- avoid answering the unresolved content until the user identifies the intended thread.

The reducer remains the sole owner of thread ambiguity detection. DialogueDecision only decides what response move is safe given that canonical discourse state. No lexical classifier, regex rule, or parallel thread resolver is introduced.

## Consequences
- Multiple unresolved threads cannot silently collapse into the most recent or otherwise guessed thread at response time.
- Ordinary unambiguous advice handling remains unchanged.
- The response layer gains a fail-closed behavior for unresolved discourse ownership without moving semantic authority downstream.
- Neighbor proof covers same-class short recommendation/opinion variants, while the counterexample preserves normal advice behavior when ambiguity is absent.
- Cross-domain appraisal/relationship and self-fact persistence/retrieval probes remain test-only evidence and do not alter their production authorities.

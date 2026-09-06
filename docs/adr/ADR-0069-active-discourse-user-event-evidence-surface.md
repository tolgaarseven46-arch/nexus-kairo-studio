# ADR-0069 — Active discourse user-event evidence surface

Date: 2026-09-06
Status: Proposed / regression characterization

## Context

ADR-0068 / PR #121 allows grounded first-party/current-user events to live in the bounded session `DiscourseState.openThreads` ledger as `user_event_topic`.

Retention alone does not affect dialogue. The current observational instruction surfaces only explicitly resumed third-party threads, so a retained user-event thread remains invisible to ResponsePlan/runtime generation.

Turn 24 therefore still lacks a deterministic path by which the earlier Turn 3 event can become salient conversational evidence.

## Decision

Surface the bounded set of retained `user_event_topic` anchors in the existing observational discourse instruction.

This is evidence exposure only:

- do not declare two event threads equivalent;
- do not mutate `resumedThreadId`;
- do not parse anchor text;
- do not inspect attribute-key prefixes;
- do not create a new semantic or decision authority;
- do not persist this working set outside the session-derived discourse fold.

The prompt must explicitly state that these anchors are unresolved prior user-event evidence and may be connected to the current turn only when supported; otherwise the model must not invent a relation.

## Scope

This step makes earlier bounded event evidence available after intervening turns. It does not yet claim deterministic topic-equivalence between `back_sunburned` and `back_discomfort`.

## Regression invariant

After Turn 3 is retained, intervening unrelated turns must not erase its bounded event evidence. When Turn 24 arrives, the observational discourse instruction must contain both the earlier Turn 3 anchor and the current event anchor.

With no `user_event_topic` in the working set, no event-evidence block may be emitted.

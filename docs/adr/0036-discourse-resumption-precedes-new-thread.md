# ADR-0036 — Typed thread resumption precedes new-thread creation

## Status
Accepted precommit — 2026-09-04

## Context
Production S7 after PR #66 proved DialogueDecision now preserves an explicit advice obligation, but DiscourseState still failed to resume the only unresolved third-party thread when the current turn was simultaneously classified as `target=third_party` and `adviceRequested=true`. The reducer evaluated `opensThirdPartyThread(...)` before `requestsThreadResumption(...)`, so the resumption turn itself became a new thread.

## Decision
For a canonical user turn that carries a typed resumption signal (`adviceRequested` or `recall_request`), DiscourseState MUST resolve existing open-thread context before considering new-thread creation.

- Exactly one unresolved thread: resume it; do not create a second thread from the same turn.
- More than one unresolved thread: mark resumption ambiguous; do not invent a target and do not create another thread merely from the resumption turn.
- Zero unresolved threads: normal new-thread creation rules may still apply.
- This is a reducer ordering rule over canonical semantic facets, not a raw-text special case.
- DiscourseState remains observational context, not response-decision authority.

## Falsification
The rule is false if the S7 compound final turn (`target=third_party` + explicit advice request) creates a second thread or fails to expose the original single thread as resumed. A counter-regression must also prove ordinary third-party openings still create threads.

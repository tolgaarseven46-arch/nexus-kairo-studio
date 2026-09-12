# ADR-0010 — Semantic fallback reachability

## Status
Accepted — 2026-09-12

## Context
Two consumer modules retain compatibility fallback logic when a canonical semantic event is absent. The normal production chat flow is required to pass the canonical event explicitly.

## Decision
The following production wiring is a required invariant:

- `droitChatService` passes `semanticEvent` to `integrateBehaviorLayers`.
- Every server `planDialogueResponse` call passes `languageUnderstanding.event`.

A CI regression test verifies these call sites. If the wiring is removed or a new unverified dialogue call site is added, CI must fail.

Compatibility fallback logic is not a normal production semantic authority.

## Scope
This ADR records repository-level production reachability. It does not claim a live traffic count. No runtime behavior or provider configuration changes in this decision.

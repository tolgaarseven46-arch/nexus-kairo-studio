# ADR-0067 — Active discourse same-turn grounding

Date: 2026-09-06
Status: Proposed / red characterization

## Context

The 27-turn real-user acceptance test exposed Turn 3:

> `sabah havuza gittim güneşin altında uyuya kalmışım sırtım yanıyor`

Canonical semantics already carried grounded current-turn event content (`worldMemory.claims`), but DialogueDecision selected `invite_emotional_context`, allowing the delivered reply `hmm niye`.

This is not a retrieval or persistent-memory failure. The required context is already present in the current canonical turn.

## Decision

DialogueDecision must consume typed current-turn grounding before selecting a curiosity move.

For a first emotional opening:

- if the canonical turn contains no grounded event content, bounded curiosity remains allowed;
- if the canonical turn already contains grounded event content, DialogueDecision must not choose a move whose purpose is to ask for the missing context again;
- no raw-text reparsing, new regex/classifier, second semantic authority, or provider call may be introduced.

`SemanticEvent.worldMemory.claims` is existing canonical typed input. This ADR does not create a new memory store or active-discourse working set.

## Scope

This ADR covers only the Turn 3 same-turn completeness failure.

It explicitly does not claim to solve:

- Turn 24 multi-turn topic continuity; that requires a separate short-lived discourse working set;
- Turn 25 unsupported conversational fabrication; that belongs to consequence/evidence binding.

## Regression invariant

Given a first emotional opening with canonical current-turn grounded event content, `planDialogueResponse(...)` must not select `invite_emotional_context` and must not reopen a `why/what happened` follow-up question.

A genuinely context-free opening such as `moralim bozuk` must remain on the existing bounded-curiosity path.

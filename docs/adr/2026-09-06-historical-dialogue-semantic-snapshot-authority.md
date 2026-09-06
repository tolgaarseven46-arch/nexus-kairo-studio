# Historical dialogue replay trusts persisted canonical semantic snapshots

Date: 2026-09-06
Status: Accepted

## Context

`ConversationTurn` already carries an optional persisted `SemanticInterpretation@2` snapshot. Current-turn dialogue analysis uses the canonical projected `SemanticEvent`, but `kairoDialogueChaosEngine` still reparsed historical user text with `analyzeDialogueTurn(rawText)` when rebuilding the dialogue board and claim ledger.

This creates a second historical semantic authority. A deterministic counterexample shows the impact: a historical raw surface such as `hayır` can be classified by the legacy regex analyzer as a correction and manufacture a denial against an earlier supported claim even when the persisted canonical snapshot explicitly says `discourseAct=none`. That changes claim provenance and therefore recall truth.

## Decision

Historical dialogue replay follows this precedence:

1. If a valid persisted `SemanticInterpretation@2` exists on the historical turn, project it deterministically with `projectSemanticEvent(...)` and `projectSemanticEventToDialogueAnalysis(...)`.
2. Raw `analyzeDialogueTurn(text)` remains only as compatibility for genuinely old/pre-snapshot turns.
3. The claim ledger and dialogue-board historical analyses use the same snapshot-aware helper.
4. No raw-text classifier, provider call, or new semantic schema is added.

## Consequences

- Persisted canonical truth cannot be silently overridden during historical replay.
- Claim denial/support state is derived from the same canonical semantics that were authoritative when the turn was accepted.
- Legacy history without semantic snapshots remains readable.
- Current-turn authority remains unchanged: its canonical `currentAnalysis` continues to be supplied by the live language-understanding path.

## Regression

`kairaHistoricalDialogueSnapshotAuthorityRegression.test.ts` locks both sides: a canonical non-correction snapshot prevents a raw-text false denial, while a historical turn with no snapshot retains the legacy compatibility parse.

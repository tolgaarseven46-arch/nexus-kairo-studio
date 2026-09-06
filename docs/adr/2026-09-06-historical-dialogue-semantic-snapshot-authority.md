# Historical dialogue replay trusts persisted canonical semantic snapshots

Date: 2026-09-06
Status: Accepted

## Context

`ConversationTurn` already carries an optional persisted `SemanticInterpretation@2` snapshot. Current-turn dialogue analysis uses the canonical projected `SemanticEvent`, but historical dialogue consumers still had raw-text reparsing seams.

The first measured seam was `kairoDialogueChaosEngine`: historical user text was reparsed with `analyzeDialogueTurn(rawText)` when rebuilding the dialogue board and claim ledger. A historical raw surface such as `hayır` could therefore manufacture a correction/denial against an earlier supported claim even when the persisted canonical snapshot explicitly said `discourseAct=none`, changing claim provenance and recall truth.

A second measured seam remained in `kairoDialogueDecisionEngine`: `isFirstEmotionalOpening(...)` reparsed the last historical user turns with `interpretSemanticEvent(rawText)`. A raw historical phrase that the legacy parser reads as an emotional opening could suppress the current turn's first-opening policy even when its persisted canonical snapshot says the historical turn was not emotional.

## Decision

Historical dialogue replay follows this precedence:

1. If a valid persisted `SemanticInterpretation@2` exists on a historical turn, it is the semantic authority for that turn and is consumed through deterministic projection.
2. Raw legacy analysis remains only as compatibility for genuinely old/pre-snapshot turns.
3. Claim-ledger and dialogue-board reconstruction use the snapshot-aware historical analysis path.
4. Historical first-emotional-opening detection obeys the same snapshot-first rule; raw `interpretSemanticEvent(...)` is used only when no persisted snapshot exists.
5. No raw-text classifier, provider call, new semantic schema, or downstream compensating rule is added.

## Consequences

- Persisted canonical truth cannot be silently overridden during historical replay.
- Claim denial/support state is derived from the same canonical semantics that were authoritative when the turn was accepted.
- Dialogue policy cannot silently change whether an emotional opening is considered first by reparsing canonical history.
- Legacy history without semantic snapshots remains readable.
- Current-turn authority remains unchanged: its canonical event/analysis continues to be supplied by the live language-understanding path.

## Regression

- `kairaHistoricalDialogueSnapshotAuthorityRegression.test.ts` locks claim-ledger replay: a canonical non-correction snapshot prevents a raw-text false denial, while a historical turn with no snapshot retains legacy compatibility parsing.
- `kairaHistoricalEmotionalOpeningSnapshotAuthorityRegression.test.ts` locks planner replay: a canonical historical non-opening snapshot cannot suppress a current first emotional opening, while a pre-snapshot historical turn retains the legacy raw-history behavior.

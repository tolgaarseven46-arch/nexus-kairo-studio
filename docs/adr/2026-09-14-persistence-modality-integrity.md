# Persistence modality integrity gate

Date: 2026-09-14
Status: GREEN candidate

## Context

Durable profile persistence still contains legacy raw-text candidate extraction for names, preferences, goals, and facts. Canonical `SemanticInterpretation@2` now carries typed proposition modality (`assertion`, `question`, `hypothetical`, `wish`, `prediction`). Without an integrity gate, a non-assertive utterance can match a legacy memory regex and be written as durable user truth.

## Decision

When canonical proposition evidence exists and none of the propositions is an `assertion`, durable structured user-memory candidate extraction fails closed and produces no profile write.

If proposition evidence is absent, legacy compatibility behavior remains unchanged. If at least one assertion is present, existing candidate extraction remains available; this change does not introduce a new semantic classifier or attempt proposition-to-field extraction.

## Authority boundary

- `SemanticInterpretation@2` remains the sole current-turn semantic authority.
- Persistence consumes canonical proposition modality only as an integrity gate.
- No raw-text reparsing is added; existing legacy regex extraction is only prevented from overriding explicit non-assertive canonical evidence.
- Relationship, retrieval, response, and provider authority are unchanged.

## Characterization

The deterministic characterization covers `question`, `hypothetical`, `wish`, and `prediction` turns whose raw text would otherwise match the durable goal regex. None may produce a `kairoMemory` profile write.

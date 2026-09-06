# Contextual relationship pattern appraisal

Status: Accepted
Date: 2026-09-06

## Context

The targeted architecture audit found that `SemanticInterpretation@2` already exposes canonical `jokingConfidence`, `sincerityConfidence`, and uncertainty, while `semanticNegativePattern()` classified severity-based relationship patterns without consuming that context. The canonical relationship reducer already dampens harm using those fields.

## Decision

Relationship negative-pattern appraisal must remain downstream of canonical semantic authority and must not reparse raw text. Severity-only pattern decisions are contextualized with the existing relationship reducer configuration (`jokingDampen` and `uncertaintyDampen`). Explicit canonical social acts such as `insult`, `mockery`, `coercion`, `manipulation`, and `privacy_violation` remain authoritative.

## Invariants

- No raw-text parsing is added to the relationship bridge.
- `SemanticInterpretation@2` remains the semantic authority.
- Relationship appraisal may derive relational categories from canonical fields, but it must consume relevant canonical context instead of selectively ignoring it.
- Existing relationship reducer numeric damping behavior is unchanged by this change.

## Regression requirement

A joking, low-sincerity turn whose contextualized disrespect falls below the existing relationship threshold must not persist a false negative pattern; the same raw canonical severity with sincere context must still persist the pattern. Explicit canonical insult acts remain authoritative.

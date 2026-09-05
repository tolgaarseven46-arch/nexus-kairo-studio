# ADR-0019: Opaque current turns require ambiguity-preserving realization

## Status
Accepted

## Context
A five-run production trace after semantic context-non-invention showed the canonical current-turn semantics remaining neutral/opaque with semantic uncertainty around 0.80–0.85, while the realizer still produced unsupported interpretations such as `aniden sert döndün`, `tamam sustum`, and `hoş değil o laf`. DialogueDecision and ResponsePlan did not contain those premises, and final consistency accepted them.

## Decision
PlanResolver owns a new hard content obligation label, `preserve_ambiguity`, for high-uncertainty (`semantic >= 0.75`) `natural_reaction` turns where DialogueDecision forbids speculation. The realizer receives that obligation explicitly.

A separate named output-conformance validator checks only this plan-owned obligation. It is not a behavior authority: it cannot decide when ambiguity must be preserved, and it cannot widen or narrow ResponsePlan. Under this obligation, the delivered reply must stay a minimal neutral acknowledgement or explicit uncertainty statement rather than committing to a new interpretation of the user's opaque turn.

This intentionally modularizes the canonical final-delivery boundary instead of adding more semantic heuristics to `kairaResponsePlan.ts`.

## Consequences
- Opaque/high-uncertainty current turns cannot be realized as invented hostility, stop requests, or other specific premises.
- Low-uncertainty turns and non-`natural_reaction` moves are unchanged.
- The validator is a contract checker, not a second WHAT/WHETHER authority.
- Future richer lexical-grounding provenance may replace this bounded obligation, but the production trust failure is closed now without an `sg`-specific rule.

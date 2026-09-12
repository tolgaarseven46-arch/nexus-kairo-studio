# ADR 0097 — Severe single-axis relationship harm floor

- Status: Accepted
- Date: 2026-09-12

## Context

Mature, high-trust relationships apply familiarity/history attenuation to ordinary negative interaction. That is desirable for mild conflict and playful disrespect, but it created an invalid edge case for severe direct single-axis harm: a high-confidence coercion or privacy violation could be attenuated so strongly that the relationship remained fully `active` with negligible durable injury.

The existing combined coercion + privacy redline already owns hard-stop behavior and remains correct. The missing behavior is narrower: a severe, confident, direct single-axis event must not be fully erased by maturity damping.

## Decision

Keep the existing hard-stop/redline mechanism unchanged.

For a direct severe single-axis `coercion` or `privacy` event, the canonical relationship reducer applies a narrow protection only when semantic confidence is high enough. After ordinary maturity/history attenuation, the result must preserve:

- a minimum durable injury floor of `conflict >= 8` and `hurt >= 12` for the turn outcome;
- a conversation-state nudge of at least `distancing`;
- no forced hard-stop solely because one severe axis is present.

The protection is confidence-gated. Ambiguous/low-confidence severe readings continue through the prior relationship-sensitive path and do not receive the forced floor/state nudge.

Combined severe coercion + privacy continues to use the pre-existing redline and disengagement behavior.

Mild joking disrespect remains relationship-sensitive and is explicitly outside this protection.

## Rationale

This separates two rates of change: durable relationship injury must survive inappropriate over-attenuation for severe direct harm, while conversation state may move to `distancing` without pretending that every severe single event requires permanent disengagement.

The reducer remains the single authority for relationship state and injury. No downstream service repairs or reinterprets the reducer output. The floor values reuse the reducer's existing conflict/hurt scale instead of introducing a new punishment scale.

## Consequences

- Mature relationships still absorb ordinary conflict and banter.
- Severe confident coercion/privacy cannot disappear into a fully active/no-injury outcome.
- Low-confidence semantic readings fail closed with respect to the new protection.
- The existing combined-event redline is untouched.
- Regression coverage preserves severe coercion, severe privacy, confidence-gate, combined redline, and joking-disrespect counterexample behavior.

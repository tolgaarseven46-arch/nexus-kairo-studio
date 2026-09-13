# ADR 0021: Isolated relationship maturity damping proof

## Status
Accepted

## Context
Core adversarial coverage already compared the highest-quality mature relationship against the lowest-quality immature relationship under the same insult. That proved bounded behavior across extremes, but it did not isolate maturity itself because trust and warmth changed at the same time.

The product goal requires a stricter invariant: with current trust, warmth, injury state, affect, and incoming semantic signal held constant, an established relationship should absorb the same mild direct negative event better than a newly formed relationship. Maturity must therefore be observable as its own bounded factor rather than merely correlating with higher relationship quality.

## Decision
Lock a single-variable relationship-maturity falsification at the canonical `RelationshipReducer` seam.

The regression holds current relationship quality and the incoming signal constant while varying only the established-history inputs used by the existing maturity model (`firstSeenAt` and `interactionCount`). It requires:

- mature familiarity to be greater than fresh familiarity;
- the mature relationship to receive a smaller conflict/hurt injury delta for the same mild direct negative event;
- neither case to manufacture a hard disengage.

No new production rule or authority is introduced. Existing `computeFamiliarity()` and maturity damping remain canonical.

## Consequences
- The intended "new relationship vs established relationship" behavior is now directly falsifiable without confounding trust/warmth differences.
- Severe-event floors remain governed by the separate severe-event policy and are not weakened by this proof.
- Any future change that erases isolated maturity damping will fail CI before altering runtime behavior.

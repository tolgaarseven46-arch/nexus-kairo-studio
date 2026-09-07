# ADR-0021 — Canonical behavior seriousness appraisal

Status: accepted

## Context

`droitBehaviorEngine::computeBehaviorProfile` inspected raw user text for words such as `acil`, `üzgün`, `kötü`, `tehlike`, and `saldır` to suppress humor and alter tone. Production canonical KDM therefore had a shadow semantic authority after `SemanticInterpretation@2` had already been produced.

## Decision

Introduce `appraiseBehaviorSeriousContext()` in the shared SocialAppraisal seam. It consumes only canonical emotional-load and severity evidence and produces a structured `seriousContext` projection.

`computeBehaviorProfile` accepts an optional structured behavior context. When the canonical caller supplies it, raw user text cannot override that result. The old raw-text heuristic remains temporarily only as a legacy compatibility fallback for callers that do not yet supply canonical context.

`analyzeKdmInteractionCanonicalTurn` must supply the shared appraisal result, so the production canonical KDM path no longer uses raw-message distress keywords as a behavior authority.

## Consequences

- production humor/tone suppression is grounded in canonical semantics;
- no new keyword list is created;
- the existing emotional-load policy is reused;
- legacy helper behavior can be removed in a later cleanup once all noncanonical callers migrate.

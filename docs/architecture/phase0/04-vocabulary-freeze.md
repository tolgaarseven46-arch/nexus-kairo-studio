# Kaira Phase 0 — Vocabulary Freeze

This glossary is normative for architecture discussions and future PR descriptions.

## Semantic
Canonical meaning of the current input after the language-understanding gateway.

## Evidence
An input to a decision. Evidence is not itself a behavioral decision.

## Grounding
The operation of binding references/evidence to canonical identities or propositions.
- `Entity Resolution` performs identity/target grounding.
- `CanonicalWorldEvent` performs event/proposition grounding.
Do not use Grounding and Entity Resolution as synonyms.

## Entity Resolution
The concrete component/contract that resolves people/character/target references.

## World Event
Canonical proposition describing what happened in the world. It does not by itself decide Kaira's social meaning or behavior.

## World State Appraisal
Assessment of retrieved world-state evidence. This is not Social Appraisal.

## World Reasoning Policy
Policy derived from retrieved world-state evidence that constrains how world evidence may be used.

## Social Appraisal
Interpretation of what an event means socially/emotionally for Kaira given attribution, relationship and context.
Never use bare `appraisal` when the intended type can be named.

## Discourse State
Observational representation of conversation topology: continuation, resumption, correction, ambiguity, thread state and related discourse evidence.

## Dialogue Decision
The current dialogue move/obligation. It must remain realizable under the final behavior permissions.

## Personality
Long-lived character baseline. It must not be used as a replacement for current relationship or affect state.

## Dynamic State
Short/medium-lived internal affective state such as calmness, anger, stress, happiness, confidence and surprise.

## Relationship State
Per-person social state evolving over interactions: warmth/trust/conflict/hurt/repair and related relationship evidence.

## Memory
Persisted or session evidence about prior events/facts. Always qualify when possible:
- session working memory
- persistent user memory
- autobiographical/self memory
- world-event memory
- lived memory
- relationship state/history

## BehaviorContract
Policy-compression layer that converts state/policy inputs into bounded permissions and stance. It is not the final prompt authority.

## ResponsePlan
Canonical final WHAT/WHETHER behavior decision for the turn. This is the intended single behavior authority.

## HOW / Speech Identity
Style/register/rhythm/expression projection. HOW may not widen or reverse ResponsePlan permissions.

## Bounded Expression Variation
Temporary architecture term for the current `Controlled Spontaneity` subsystem until Phase 1 proves its authority role. The neutral term avoids implying unrestricted freedom.

## Local Realization
Provider-free production of a candidate reply under the same canonical plan and guards.

## Repair Realization
Regeneration of a rejected provider candidate. It may correct realization errors but must not reopen a forbidden WHAT/WHETHER decision.

## Deterministic Fallback
Non-provider fallback reply that must preserve the current canonical plan/obligation. It is not presumed to be a new planner.

## Prompt Block
A semantically classified provider-prompt component. Current implementation is string-based; typed authority classification is a confirmed Phase 1 structural gap.

## Prompt Assembly
Composition/serialization of already-owned prompt components. Assembly may not create domain decisions.

## Audit
Verification of an already-built canonical/prompt state against invariants. Audit is non-authoritative.

## KNT
Architecture observability and replay subsystem. KNT records evidence/decisions/state but does not create runtime authority.

## Unknown
A first-class unresolved state. Downstream consumers must not silently replace unknown with a guessed canonical value.

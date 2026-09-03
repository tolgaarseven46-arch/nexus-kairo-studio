# ADR-0016: Canonical mixed-behavior acceptance

- Status: Accepted
- Date: 2026-09-03

## Context

The canonical migration is complete: `SemanticInterpretation@2` is the immutable current-turn semantic authority and production KDM consumes that interpretation together with its deterministic grounded event projection.

The repository already had a high-level 20-turn regression covering mixed local/AI routing, reported-memory recall, relationship injury/repair and interaction continuity. However, that regression still entered KDM through the legacy/test helper `analyzeKdmInteraction(...)` and independently called `interpretSemanticEvent(...)`. It therefore did not prove that the post-migration canonical semantic gateway and canonical KDM boundary remained coherent across the same product-level conversation.

## Decision

The mixed 20-turn quality regression is promoted to a canonical-path acceptance test.

Each user turn must:

1. enter through `understandTurkishMessage(...)` with a valid immutable `SemanticInterpretation@2` snapshot;
2. consume the gateway's grounded `event` plus `interpretation` through `analyzeKdmInteractionCanonicalTurn(...)`;
3. persist that exact semantic snapshot on the corresponding `ConversationTurn`;
4. derive `DiscourseState` from canonical history rather than reparsing historical raw text;
5. build the same BehaviorContract → DialogueDecisionPlan → SpeechIdentity → KairaResponsePlan chain used by live behavior;
6. retain local/AI route coverage, relationship reaction/repair continuity and grounded reported-memory recall checks.

The acceptance test supplies deterministic semantic snapshots instead of calling an external LLM. This keeps CI deterministic while still exercising the canonical ingestion, grounding, KDM and history boundaries. Provider-quality evaluation remains a separate concern.

## Invariants

- No current turn in this acceptance flow may silently fall to an independent semantic authority.
- Historical user turns carry immutable `semanticInterpretation` snapshots.
- KDM state on each turn is derived from the canonical interpretation/event pair.
- The 20-turn flow contains both local and AI routes.
- Reported recall preserves attribution through the world-model guard.
- Relationship injury persists across an unrelated turn and explicit repair moves recovery forward.
- Interaction history advances once per user turn.

## Non-goals

This ADR does not change product behavior thresholds, semantic classification policy, relationship rules, repetition policy or emotional-load calibration. It only moves an existing high-level product regression onto the canonical-only runtime boundary.

## Consequences

Future changes that pass unit/architecture contracts but break the integrated canonical conversation path will fail a product-level 20-turn acceptance regression. The legacy deterministic KDM helper may continue to exist for narrow unit/test ingress uses, but it is not the authority used by this high-level acceptance test or production server behavior.

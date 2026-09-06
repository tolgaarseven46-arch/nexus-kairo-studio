# ADR-0070 — Generated conversational claim provenance

Date: 2026-09-06
Status: Proposed

## Context

The 27-turn real-user acceptance test exposed Turn 25:

- user: `yandık ya la`
- Kaira: `sen bi şeyler çevirdin ama itiraf etmiyorsun bak 😏`
- canonical user semantics: smalltalk / target=event
- ResponsePlan: natural_reaction + engage_user_content
- final consistency: accepted=true / score=100

The plan instruction already says `yeni bilgi veya varsayım uydurma`, but the final validator only checks that `engage_user_content` is not satisfied by an acknowledgement-only reply. It does not verify provenance of factual/conversational claims introduced by the generated reply.

## Decision

Generated conversational claims must be checked against canonical semantic evidence when the ResponsePlan requires grounded content engagement.

The verifier consumes only `SemanticInterpretation@2` objects:

- candidate reply interpretation;
- canonical current/prior evidence interpretations already admitted to the response context.

It must not parse raw text, add regex claim detectors, inspect keyword prefixes, or create a second semantic authority.

A generated world-memory claim is supported only when the same canonical `(subjectId, attributeKey, value)` tuple exists in admitted evidence. Confidence may differ.

Pure social wording that produces no canonical world-memory claim is unaffected.

## Runtime implication

The server may reuse the existing canonical language-understanding bridge to interpret a generated reply before final delivery. This is verification with the same semantic authority, not a second parser.

The provenance issue must flow through the existing canonical final constraint pass; that pass remains the delivery gate and does not invent a replacement response.

## Scope

This ADR addresses unsupported generated conversational claims such as Turn 25. It does not define generic natural-language entailment and does not permit lexical/token-overlap heuristics as a substitute for canonical claim identity.

## Regression invariant

For a grounded-content ResponsePlan, a generated `current_user.concealing_action=true` claim must be rejected when no admitted canonical evidence contains that claim.

A generated claim matching an admitted canonical claim is allowed, and a reply with no generated world-memory claim is not blocked by this guard.

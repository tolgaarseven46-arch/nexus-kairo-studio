# ADR — Reply and mention text-context boundary

Status: Accepted / GREEN.

## Context

Discord-style transports already know when a message is a reply and which platform entities were explicitly mentioned. That information is not equivalent to free text:

- `@Ayşe` may have a stable platform identity even when display names collide or change;
- a reply such as `aynen` may be semantically incomplete without the replied-to message and author;
- reconstructing reply/mention ownership later from raw text would create a weaker lexical authority beside canonical language understanding.

Before this change, the chat input carried `userMessage` plus coarse user/session fields but no typed reply or mention context. The client language-understanding request likewise only carried message text, user/character names, history, and provider.

## Decision

Use a typed text-interaction context at the transport-to-language-understanding boundary.

The contract carries:

- a reply reference with stable `messageId` and `authorId` identity;
- zero or more mention references with stable entity ids;
- the context alongside, not concatenated into, the user's message text;
- the same structured context across the client language-understanding request boundary.

Canonical `SemanticInterpretation@2` remains the sole current-turn meaning authority. Platform metadata is evidence supplied to that authority; it is not itself a semantic verdict.

## Safety and compatibility invariant

Plain single-message text without reply/mention metadata remains valid. Display names or `@name` text may remain conversational surface evidence, but they must not override stable platform metadata when that metadata is present.

This change does not decide Discord-specific role/channel mention handling or retrieval policy for old replied-to content.

## Resolution

`TextReplyReference`, `TextMentionReference`, and `TextInteractionContext` are now explicit typed contracts. `SendKairoChatOptions` can carry `messageContext`, and `droitChatService` forwards that context to `requestCanonicalLanguageUnderstanding` as structured `interactionContext`. The client language-understanding request forwards the same field in JSON without modifying `userMessage`.

The characterization moved RED → GREEN with architecture contracts, autonomous runtime contracts, beta regression, Phase-0 deterministic harness/report, beta conversation/KNT replay, proof manifest, historical proof, full tests, TypeScript, production build, docs/behavior guards, and Architecture Review all GREEN.

Multimodal interpretation remains parked. Long-history provenance was handled separately by PR #266.

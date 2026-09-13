# ADR — Reply and mention text-context boundary

Status: Characterization checkpoint; no production change.

## Context

Discord-style transports already know when a message is a reply and which platform entities were explicitly mentioned. That information is not equivalent to free text:

- `@Ayşe` may have a stable platform identity even when display names collide or change;
- a reply such as `aynen` may be semantically incomplete without the replied-to message and author;
- reconstructing reply/mention ownership later from raw text would create a weaker lexical authority beside canonical language understanding.

The current chat input carries `userMessage` plus coarse user/session fields but no typed reply or mention context. The client language-understanding request likewise only carries message text, user/character names, history, and provider.

## Decision

Characterize a typed text-interaction context at the transport-to-language-understanding boundary.

The target contract carries:

- a reply reference with stable `messageId` and `authorId` identity;
- zero or more mention references with stable entity ids;
- the context alongside, not concatenated into, the user's message text;
- the same structured context across the client language-understanding request boundary.

Canonical `SemanticInterpretation@2` remains the sole current-turn meaning authority. Platform metadata is evidence supplied to that authority; it is not itself a semantic verdict.

## Safety and compatibility invariant

Plain single-message text without reply/mention metadata must remain valid. Display names or `@name` text may remain conversational surface evidence, but they must not override stable platform metadata when that metadata is present.

This characterization does not yet decide Discord-specific role/channel mention handling, retrieval policy for old replied-to content, or long-history retrieval.

## Scope

This checkpoint is characterization only. It does not change production runtime behavior.

Multimodal interpretation remains parked. Long-history retrieval remains the next text-reality stage after reply/mention metadata characterization.

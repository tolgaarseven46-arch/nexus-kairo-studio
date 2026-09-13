# ADR — Fragmented-message text episode boundary

Status: Characterization checkpoint; no production change.

## Context

Discord-style conversation does not guarantee that one transport message equals one complete thought. A user may send:

- `yarın işten`
- `istifa etmeyi düşünüyorum`

as two consecutive messages while expressing one semantic episode.

ADR-0025 established that fragmented-message episode assembly belongs at the batching/input boundary around `SemanticInterpretation@2`, not inside a second parser or semantic authority. The current Studio/chat path still forwards each raw `userMessage` directly to canonical language understanding, so transport-message boundaries are effectively treated as semantic-turn boundaries.

## Decision

Characterize a typed pre-semantic text-episode boundary before changing runtime behavior.

The target contract is:

- an ordered `TextEpisodeFragment[]` carrying the text fragments that belong to one episode;
- a bounded `TextEpisodeInput` accepted by the chat/runtime input boundary;
- canonical language understanding receives the assembled episode text rather than an individual raw transport message.

The transport/ingestion adapter owns *when* consecutive messages are grouped or flushed. `SemanticInterpretation@2` remains the sole current-turn meaning authority and does not infer transport batching policy.

This characterization deliberately does **not** choose a debounce, settle-window, or Discord-specific timing threshold. Such values are adapter policy and require separate evidence/calibration.

## Safety and compatibility invariant

A single-message input must remain representable as an episode containing one fragment. Episode assembly must not introduce a parallel semantic interpretation path or alter downstream reducer, relationship, memory, or persistence authority.

## Scope

This checkpoint includes only the typed fragmented-text input boundary and canonical-LU handoff characterization.

It explicitly excludes:

- persistence-integrity fixes already characterized separately;
- reply/mention metadata, which is the next text-reality stage;
- long-history retrieval;
- image/GIF/audio/video interpretation;
- production batching/timer policy.

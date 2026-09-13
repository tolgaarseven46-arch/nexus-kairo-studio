# ADR — Fragmented-message text episode boundary

Status: Accepted / GREEN.

## Context

Discord-style conversation does not guarantee that one transport message equals one complete thought. A user may send:

- `yarın işten`
- `istifa etmeyi düşünüyorum`

as two consecutive messages while expressing one semantic episode.

ADR-0025 established that fragmented-message episode assembly belongs at the batching/input boundary around `SemanticInterpretation@2`, not inside a second parser or semantic authority. The previous Studio/chat path forwarded each raw `userMessage` directly to canonical language understanding, so transport-message boundaries were effectively treated as semantic-turn boundaries.

## Decision

The chat input boundary now supports a typed pre-semantic text episode:

- ordered `TextEpisodeFragment[]` values carry the fragments belonging to one episode;
- `TextEpisodeInput` is accepted by `SendKairoChatOptions`;
- fragments are deterministically assembled into `episodeText` before canonical language understanding;
- when an episode is supplied, the same assembled text is used consistently across retry identity, canonical LU, fallback interpretation, behavior boundaries/integration, and the server chat payload;
- when no episode is supplied, the existing single-message `userMessage` behavior remains unchanged.

The transport/ingestion adapter still owns *when* consecutive messages are grouped or flushed. `SemanticInterpretation@2` remains the sole current-turn meaning authority and does not infer transport batching policy.

No debounce, settle-window, or Discord-specific timing threshold is introduced here. Those remain adapter policy requiring separate evidence/calibration.

## Safety and compatibility invariant

A single-message input remains valid. Episode assembly introduces no parallel semantic interpretation path and does not move reducer, relationship, memory, persistence, reply/mention, or provider authority.

## Verification

The characterization moved RED → GREEN. On head `00743adabc5347f543927236b3f8501838f8fcfa`, Architecture Review classify, docs-guard, behavior-guard, architecture contracts, autonomous runtime contracts, beta runtime regression, Phase-0 harness/report, beta conversation acceptance/KNT replay, bug-class proof manifest, Historical RED→GREEN, full tests, TypeScript, and production build all passed.

## Scope

This decision covers only the typed fragmented-text input boundary and canonical-LU handoff. Production batching/timer policy and multimodal interpretation remain outside this change.

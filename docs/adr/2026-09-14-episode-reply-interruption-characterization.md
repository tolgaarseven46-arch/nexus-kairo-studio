# Episode × reply/mention interruption characterization

Status: Measured RED → minimal fix under verification

## Question

Can one fragmented text episode preserve a change in structured reply/mention context between fragments before canonical language understanding runs?

Example shape:
- fragment 1: ordinary continuation text;
- fragment 2: user replies to or mentions another participant;
- transport groups both close-in-time messages into one candidate episode.

The architecture had two individually green contracts: ordered text fragments and typed reply/mention metadata. This characterization checks whether they compose without flattening identity evidence.

## Measured RED

On RED head `8c2cf428b534557276309ba2f352569493e3b1ed`:
- Architecture Review GREEN;
- docs-guard and behavior-guard GREEN;
- architecture contracts, autonomous runtime contracts, beta runtime regression, Phase-0 harness/report, beta conversation/KNT replay, proof manifest, and historical RED→GREEN proof GREEN;
- full `Tests` failed before TypeScript/build.

Source inspection confirmed the representational gap: `TextEpisodeFragment` carried only text, while `messageContext` existed once for the whole send. A candidate episode containing a mid-burst reply/mention change could therefore not preserve or validate that context boundary.

## Minimal fix

The transport/episode boundary now:
- allows each `TextEpisodeFragment` to carry optional typed `TextInteractionContext`;
- fingerprints structured reply target + mention ids without parsing raw text;
- rejects a candidate episode when fragment interaction contexts differ;
- rejects conflict between fragment context and the legacy top-level `messageContext`;
- forwards the validated episode context to canonical language understanding;
- preserves top-level `messageContext` as the compatibility fallback when fragment-level context is absent.

A context change therefore becomes a deterministic transport-boundary split signal rather than being silently flattened into one context-free string.

No debounce/timing policy, regex identity reconstruction, raw-text reparse, or second semantic authority was added.

## Verification state

The minimal fix plus neighboring source-contract checks are in CI. Do not mark GREEN until full tests, TypeScript, production build, guards, and Architecture Review pass.

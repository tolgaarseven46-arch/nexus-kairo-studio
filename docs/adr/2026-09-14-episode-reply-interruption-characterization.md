# Episode × reply/mention interruption characterization

Status: RED characterization / no production fix yet

## Question

Can one fragmented text episode preserve a change in structured reply/mention context between fragments before canonical language understanding runs?

Example shape:
- fragment 1: ordinary continuation text;
- fragment 2: user replies to or mentions another participant;
- transport groups both close-in-time messages into one candidate episode.

The current architecture has two individually green contracts: ordered text fragments and typed reply/mention metadata. This characterization checks whether they compose without flattening identity evidence.

## Expected invariant

A fragment-level context change must remain representable at the transport/episode boundary. The system must not force all fragments through one episode-level context or silently discard the structured context change.

## Discipline

This first commit is test-only. No timing policy, semantic reparsing, or second identity authority is introduced. A RED result only proves a representational gap; the follow-up fix must remain in the transport/episode boundary and preserve canonical language understanding as semantic authority.

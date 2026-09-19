# Slice B — W4 → W5 deterministic characterization map

Date: 2026-09-19
Status: ACTIVE under W3 frozen contract
Branch: `test/slice-b-w5-characterization-red`

This map binds every active W4 target to deterministic fixture evidence before W5 RED begins.

## Conflict contract closure

The inactive fixture spec still contained one pre-freeze sentence for F-B08 saying W2/W3 must choose the exact duplicate-conflict contract.

W3's frozen idempotency rule already forbids silent divergent merge. For W5, the exact deterministic contract is now recorded as:

- byte-identical duplicate `eventId` => idempotent no-op;
- same `eventId` + divergent canonical event payload => fail closed with typed `duplicate_event_conflict`;
- conflicting duplicate does not increment counters, create/replace edges, or mutate an existing accepted event;
- conflict evidence is deterministic and namespace-local.

This clarification narrows an already-frozen invariant; it does not grant new authority.

## W4 → W5 mapping

| W4 | Fixture / proof | Characterization assertion |
|---|---|---|
| T-B01 | F-B04 | explicit reply edge survives conflicting inferred candidate |
| T-B02 | F-B05 | all explicit mentions preserved; no resolved single target |
| T-B03 | F-B06 | missing parent becomes typed unresolved reference; no fabricated event |
| T-B04 | F-B07 + F-B08 | identical duplicate is no-op; conflicting duplicate fails closed typed conflict |
| T-B05 | F-B09 | different arrival orders yield byte-equivalent normalized graph |
| T-B06 | F-B10 | sourceSequence deterministically orders equal timestamps |
| T-B07 | F-B10 | eventId final tie-break is deterministic |
| T-B08 | F-B11 | same users across servers never share counters/edges/hash namespace |
| T-B09 | F-B12 | same server across rooms remains isolated |
| T-B10 | F-B13 | same room across Kaira instances remains isolated |
| T-B11 | F-B19 | frozen replay bundle yields byte-equivalent result |
| T-B12 | F-B19 | replay performs zero live platform / semantic-store access |
| T-B13 | F-B14 | production graph has no unanswered-addressed-turn field |
| T-B14 | F-B15 + F-B16 | only authenticated registered suppression owner receipt is admitted |
| T-B15 | F-B17 + F-B17B | escalation ref requires owned ref + owner/hash match; invalid stays unresolved |
| T-B16 | F-B01 + F-B02 + F-B03 | lifecycle fixture metadata cannot change frozen decision projection |
| T-B17 | F-B01/F-B02 + NB-W2-07 hardening | participant output is deep-whitelisted objective fact only |
| T-B18 | F-B20 | Droit self-event is stored once and produces no trigger/answer decision |
| T-B19 | F-B18 | missing semanticSnapshotRef never creates semantic truth from raw text |
| T-B20 | F-B19 | schema/derivation/namespace/builtFromEventIds/snapshotHash required |
| T-B21 | static boundary proof | decision/behavior modules cannot import raw ConversationGraphV1 |
| T-B22 | F-B21 | test namespace without testRunId fails closed |
| T-B23 | F-B17B | nonexistent/hash-mismatched escalation ref is not admitted |
| T-B24 | F-B22 | eventId final ordering stays byte-equivalent across locales |
| T-B25 | F-B20 + platform ingress fixture | Droit/system identity mislabeled as human fails identity boundary |
| T-B26 | retention fixture | derived counters/timestamps cannot outlive source evidence |
| T-B27 | runtime ingress proof suite | malformed raw JSON fails before typed graph value exists |
| T-B28 | runtime evidence-view proof + NB-W2-07 | excluded top-level and participant/event non-whitelisted fields are physically absent |
| T-B29 | F-B19 | missing frozen semantic snapshot rejects replay, no fallback lookup |

## W5 RED entry rule

W5 RED is valid only if:
1. all fixtures above are deterministic and namespace-local;
2. any failing assertion represents absent Slice B graph implementation, not an ambiguous W3 rule;
3. existing pre-Slice-B suites remain GREEN;
4. no production WHAT/WHETHER, relationship/appraisal, moderation/capability or canonical-semantic authority is introduced.

## W6 promotion rule

Only after W5 RED evidence is recorded:
- add the minimum runtime graph implementation needed to satisfy the frozen assertions;
- preserve the existing ingress runtime guards already merged during W2 repair;
- run full CI and compare RED → GREEN evidence.

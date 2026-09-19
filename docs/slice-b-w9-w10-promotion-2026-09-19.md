# Slice B — W9 review + W10 controlled promotion

Date: 2026-09-19
Status: PROMOTED / CLOSED

## W8 live-beta proof

Authoritative live proof:
- PrivatRoom workflow run: 35441979293
- artifact: `slice-b-w8-live-beta-proof`
- artifact id: 10584092956
- artifact digest: `sha256:3ee684285a8eb98dc7f72b1a04e737b4750e4b59e37a38428b79bb695c91b85d`
- TestRun: `TR_live_beta_slice_b_w8_35441979293`
- environment: `live-beta`
- persisted: true
- Conversation Graph schemaVersion: 1
- derivationVersion: `conversation-graph-v1@1`
- participantCount: 3
- humanParticipantCount: 2
- droitParticipantCount: 1
- eventCount: 3
- builtFromEventCount: 3
- snapshotHash: `fnv1a32:708466b9`

## Deployed commits

Kaira:
- `d7ec31fc431d6c1938d1f079aa2098ecc2c5ebb6`
- Render status: LIVE

PrivatRoom:
- `c731bbae1ea4f3d6aa358d09dbb872ce4694f8a4`
- Render status: LIVE

## W9 joint review

Reviewed evidence:
- W5 historical RED precedes implementation.
- W6 implementation remains observation-only.
- W7 full CI and deterministic replay are GREEN.
- W8 uses a real two-human + one-Droit room.
- TestRun persistence is confirmed.
- Graph proof is sanitized; no raw transcript/relationship/private graph payload is exposed in the proof response.
- Same TestRun id appears in both Kaira and PrivatRoom live logs.
- No error / critical / fatal logs were emitted by either service during the proof window.
- No cross-server leak, replay sandbox leak, false execution claim or behavior-authority promotion was observed.

Promotion-stop criteria were not triggered.

## W10 controlled promotion

Slice B is promoted as the production observation foundation only.

Promoted authority:
- platform-owned participant and room facts,
- deterministic ConversationGraphV1 observation,
- explicit reply / mention evidence,
- unresolved references,
- authenticated suppression/evidence receipts,
- deterministic replay and namespace isolation,
- sanitized TestRun proof metadata.

Explicitly NOT promoted:
- multi-party engagement authority R,
- proactive reply/engagement decisions from graph evidence,
- relationship/appraisal mutation from room graph evidence,
- moderation/capability authority,
- canonical semantic interpretation authority.

Any future use of graph evidence for WHETHER/WHAT Kaira says requires a new slice and authority review.

Rollback / promotion-stop remains mandatory on:
- cross-server or cross-Kaira state leak,
- replay live-state access,
- false execution/provenance claim,
- graph becoming semantic/relationship/behavior authority,
- privacy leakage from TestRun or graph evidence.

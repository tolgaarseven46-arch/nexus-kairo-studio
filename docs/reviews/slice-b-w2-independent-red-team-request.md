# Slice B W2 — Independent red-team handoff

Date: 2026-09-18
Gate: W2 independent reviewer
Authority: reviewer findings are advisory until W3 product freeze

## Read first

1. `docs/slice-b-multi-user-observation-freeze-packet.md`
2. `docs/slice-b-w3-freeze-draft-w4-test-map.md`
3. `docs/adr/2026-09-18-social-platform-test-first-workflow.md`
4. `PROJECT_STATE.md` sections 23–31

## Reviewer mission

Do not approve the design by default.

Try to falsify the claim that Slice B is only an observational Conversation Graph and cannot become:
- a shadow semantic authority,
- a hidden response/engagement authority,
- a relationship/appraisal authority,
- a capability/moderation authority,
- a cross-server or replay leak.

## Mandatory attacks

### Authority
- Can any graph field be consumed as WHAT/WHETHER truth without an explicit adapter?
- Do inferred address candidates belong here at all?
- Does unanswered-turn evidence reopen multi-party engagement authority R?
- Do escalation refs belong in the graph or in a separate observational index?
- Can suppression receipts be forged or accepted from the wrong owner?

### Evidence
- Are platform facts, canonical semantic refs, inferred graph edges and downstream decision receipts distinguishable byte-for-byte?
- Can missing semanticSnapshotRef cause raw text to be reinterpreted?
- Can unresolved refs accidentally be "repaired" into invented edges?

### Identity/isolation
- Is namespace environment + testRun? + server + room + Kaira instance sufficient?
- Can same user in two servers or two Kaira instances leak counters/edges?
- Are human/droit/system identities stable enough to prevent self-trigger loops?

### Ordering/idempotency
- Is occurredAt -> sourceSequence? -> eventId a valid deterministic total order?
- What happens when sourceSequence conflicts with timestamp?
- Are duplicate event ids guaranteed idempotent when payload differs?
- Is event correction/versioning missing?

### Replay
- Can replay rebuild the graph from live platform state?
- Is snapshotHash enough; what exact canonical serialization is hashed?
- Are derivation rule versions frozen with replay evidence?

### Fixtures
- Can cold/warm/experienced-owner metadata accidentally influence production decision inputs?
- Should experienced-owner exist only in fixture-builder metadata and nowhere in graph/runtime types?

### Privacy/data minimization
- Are participant counters/timestamps necessary?
- Could graph retention unintentionally become behavioral profiling?
- Which fields should be ephemeral vs persisted?

## Required output format

### BLOCKERS
For each:
- ID
- concrete counterexample
- violated authority/invariant
- minimum repair
- required test

### NON-BLOCKERS
For each:
- ID
- why it is not promotion-blocking
- recommended cleanup/test

### FUTURE / OUT-OF-SCOPE
For each:
- ID
- why it should not reopen Slice B

### Explicit verdicts
Answer each exactly:
1. Shadow semantic authority blocker remains? YES/NO
2. Hidden engagement/response authority blocker remains? YES/NO
3. Cross-server/Kaira isolation blocker remains? YES/NO
4. Replay purity blocker remains? YES/NO
5. Determinism/idempotency blocker remains? YES/NO
6. Privacy/data-minimization blocker remains? YES/NO
7. Safe to enter W3 freeze after listed blocker repairs? YES/NO

## Independence provenance rule

The review content and the proof that the reviewer is independent are separate authorities.

- `reviewer.independent=true` inside a returned payload is only a reviewer declaration.
- That declaration alone MUST NOT open W3.
- The project-side intake must attach separately verified provenance containing:
  - external channel/artifact reference,
  - reviewer identity,
  - explicit independent-verification receipt,
  - verifier identity.
- A self-authored/self-attested payload without that trusted provenance remains structurally reviewable but promotion-ineligible.
- This provenance rule is governance-only and does not count as W2 review evidence.

Do not provide an overall score.
Do not redesign unrelated frozen A–S architecture unless a concrete Slice B counterexample proves a frozen invariant violation.

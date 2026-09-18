# ADR — Social-platform product freeze and test-first delivery workflow

Date: 2026-09-18
Status: ACCEPTED / FREEZE CANDIDATE
Scope: Kaira × PrivatRoom social-platform expansion

## Context

The social-platform integration adds a new product boundary beyond the frozen A–S pre-AI architecture.
Earlier work proved transport and typed platform capability seams, but product review showed that
behavior features must not outrun scenario definition, observability, replay, privacy and isolation.

The approved product direction is captured in the v0.4 master spec reviewed with Tolga and Claude.

## Decision

Delivery order is fixed:

W0 Product problem
→ W1 Scenario expansion + failure classes
→ W2 Claude red-team
→ W3 Tolga product review / freeze
→ W4 Test design + architecture mapping
→ W5 Characterization RED
→ W6 Minimal implementation
→ W7 CI + deterministic replay
→ rollback/promotion-stop gate
→ W8 Live beta TestRun
→ W9 Joint review
→ W10 Promote / controlled rollout

Independent reviewer gates (W2 and W3) may not be collapsed.

## Slice order

### Slice A — measurement and isolation first
1. TestRun provenance v1.
2. Fresh / Continuation / Replay state namespaces.
3. Replay hard sandbox using explicit allowlist/default-deny.
4. Replay-only KNT / memory / relationship sinks.
5. Cross-server zero-leak characterization.
6. Demographic decision-parity characterization.
7. Real populated TestRun proof.

### Slice B — multi-user observation
1. Conversation Graph.
2. Cold / warm / experienced-owner fixtures.
3. addressedTo / suppressedResponse / ignoredBy / escalation evidence.

### Slice C — first user-facing behavior
1. explicit form-of-address override + room-context realization,
2. trial UI authority + account-once beta eligibility,
3. first-server rule-draft scenario.

No Slice B/C behavior is promoted before Slice A acceptance.

## Hard invariants

- Replay is sandboxed by allowlist, not denylist.
- Replay may not call live platform fetch/mutation, analytics, webhook, real trial writes,
  production KNT, production memory/relationship or external integrations.
- Every TestRun captures exact Kaira/PrivatRoom commits, contract, prompt, policy,
  model/provider, feature flags, scenario pack, environment and retry/idempotency provenance.
- Test state is namespaced by environment + testRun + server + Kaira instance.
- Platform tone-only demographics are not decision/capability inputs.
- Safety data does not become ordinary relationship/appraisal state.
- Any cross-server state leak, false execution claim or replay sandbox leak blocks promotion
  and triggers immediate rollback/promotion-stop handling.

## Definition of Done — Slice A

Slice A is not complete because types/files exist.
It is complete only when:
- Fresh, Continuation and Replay each have a passing fixture,
- a real TestRun record contains every required provenance field,
- replay default-deny tests prove all real-world effect classes are blocked,
- cross-server isolation proves zero leak for all enumerated state classes,
- demographic decision-parity proof exists including a near-boundary decision fixture,
- targeted tests, full tests, TypeScript and production build are green,
- the resulting live beta TestRun is reviewed before Slice B starts.

# Natural Characterization v2 — Initial API-Free Results

Date: 2026-09-09
Status: Characterization evidence; product fixes intentionally deferred to follow-up work.

## Scope

This work adds a new evolving characterization corpus without modifying the frozen 21-scenario / 423-turn Phase-0 regression baseline.

- scenarios: 10
- executions: 11 (`S9` runs two seeded relationship variants)
- total user turns: 220
- provider/API calls: none
- semantic ingestion: existing deterministic pre-provider floor
- final behavior owner observed: canonical `KairaResponsePlan`

Each scenario carries one `openQuestionId` and is classified as one of:

- `PASS`
- `FAIL_PRODUCT`
- `FAIL_TEST_OR_DETECTOR`
- `OBSERVATION`
- `CAPABILITY_GAP`

The FAST lane stores the complete per-turn report as `natural-characterization-v2-report.json` in the `fast-ci-<sha>` artifact.

## Initial result summary

Final corrected run on branch head `3d590f61572cba89cea28d198b8601fa0813af70`:

- `PASS`: 3 executions
- `FAIL_PRODUCT`: 2 executions
- `FAIL_TEST_OR_DETECTOR`: 0
- `OBSERVATION`: 6
- `CAPABILITY_GAP`: 0

FAST validation passed. Product failures are non-blocking for the characterization tooling itself; a broken detector/test contract would block it.

## Proven good behavior

### S7 — repair requires a canonical source — PASS

After genuine relational injury, neutral continuation turns did not increase `repairProgress` without canonical repair/apology evidence.

Evidence:

`repairProgress never increased without canonical repair/apology evidence`

This closes the specific D2 repair-provenance question for this deterministic trajectory without a provider call.

### S9 — paired seeded relationship trajectory — PASS

The exact same 20-turn transcript was run with two initial relationship fixtures:

- fresh / fragile
- established / trusting

Observed:

- `pairedTrajectoryDifferentiated=true`
- fresh hurt delta: `+4`
- established hurt delta: `+3`

The same social stream therefore has a measurably different effect under relationship history, while established familiarity does not erase injury.

## Proven product failures

### S5 — stop/resume paraphrase and negated-apology semantics — FAIL_PRODUCT

The current architecture intentionally treats `stopTalking` as a **current-turn transient command**, not a persisted relationship disengagement. The oracle was corrected to measure only exact stop turns rather than demanding a persistent lock until a later resume.

After that correction, the following real semantic gaps remain:

- turn 6 — `konuşmayı bırak` failed to set `continueConversation=false`
- turn 8 — `yeter artık cevap verme` failed to set `continueConversation=false`
- turn 9 — `çekil git` failed to set `continueConversation=false`
- turn 12 — `bana bir şey yazma` failed to set `continueConversation=false`
- turn 17 — `ama özür dilemedim` was incorrectly promoted to apology/repair semantics

The turn-17 error is material because the false apology interpretation produced relationship softening in the captured trajectory.

Root-cause boundary has **not** yet been patched. Follow-up must begin at the canonical language-understanding / semantic authority boundary; downstream raw-text patches are forbidden.

### S8 — third-party target bleed under high activation — FAIL_PRODUCT

High-activation initial state was used intentionally.

The material failure is turn 4:

`iş arkadaşına salak dedi`

Observed semantic target:

`target=kaira`

Observed relationship delta on that turn:

- warmth: `-3`
- trust: `-2`
- conflict: `+4`
- hurt: `+5`

This is a genuine third-party-to-dyad bleed: the described insult to another person's coworker was interpreted as directed at Kaira and poisoned the Kaira-user relationship.

Several neighboring turns resolved to `unknown`/`event` targets but produced no dyadic harm. The oracle was corrected so target uncertainty alone is an observation, not a product failure. Only actual relationship contamination is blocking evidence.

Root-cause boundary has **not** yet been patched. Follow-up must begin at canonical target/entity/semantic resolution, not in `RelationshipReducer` or response rendering.

## Exploratory observations

`S1`, `S2`, `S3`, `S4`, `S6`, and `S10` remain `OBSERVATION` in the first run because no hard oracle was assigned. Their complete trajectories are retained in the machine-readable artifact for later targeted review.

This is intentional: exploration/characterization is not automatically converted into a bug merely because a behavior is interesting or unexpected.

## Test/tooling quality result

The first draft of the v2 oracle generated false-positive pressure in two places:

1. it initially treated stop as persistent until explicit resume, contrary to the existing transient `stopTalking` BehaviorContract design;
2. it initially treated any non-`third_party` target in S8 as failure even when no dyadic harm occurred.

Both were corrected **before** product patching. Final classification contains zero `FAIL_TEST_OR_DETECTOR` executions.

This validates the intended operating model:

- characterization may discover product failures;
- test/oracle defects are classified separately;
- product code is not changed until the evidence boundary is clean.

## Next action

Create a separate product-fix branch from current main after this characterization framework merges.

Only the two proven failure families may open product work:

1. canonical stop/paraphrase + negated-apology semantics from S5;
2. canonical third-party target resolution from S8.

Required fix discipline:

- no provider/API;
- no downstream raw-text parser;
- no second semantic authority;
- reported case + neighbor cases;
- frozen 21/423 baseline remains green;
- final full CI remains the merge gate.

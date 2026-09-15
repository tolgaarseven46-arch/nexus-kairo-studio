# Kaira Phase 0 — `server.ts` Composition Audit Pass 1

Goal: distinguish healthy orchestration from domain/prompt decisions embedded in the composition root.

## Healthy orchestration observed
The following are appropriate composition-root responsibilities:
- request/session/instance coordination,
- idempotency claim/replay/wait,
- loading persistent state/memory,
- invoking canonical language understanding,
- invoking KDM/Behavior/ResponsePlan builders,
- selecting local vs provider route,
- provider invocation/retry budgeting,
- persistence fan-out,
- KNT/metrics persistence,
- delivery and timing aggregation.

## Domain/prompt surfaces embedded in `server.ts`

### S-01 — `socialStyle` is a behavior-instruction block owned directly by server.ts

The server constructs a long natural-language prompt block containing instructions such as:
- default to short social replies,
- do not provide lists/menus/advice packages unless asked,
- do not end every reply with a question,
- do not immediately solve emotional disclosures,
- avoid assistant-like phrases,
- use memory only when relevant,
- do not invent unsupported recall details.

Some of these are HOW/style constraints; others overlap WHAT/WHETHER domains already represented by `BehaviorContract`, `DialogueDecision`, epistemic policy or `KairaResponsePlan`.

**Classification:** STRUCTURAL-CHECK / `authority-contract` mechanical trigger.

**Why this matters:**
A composition root should compose owned decisions, not become the canonical owner of social behavior policy through an inline prompt string.

Phase 0 question:
> Which rules in `socialStyle` are pure HOW, which are global character policy, which duplicate existing canonical decisions, and who should own each rule?

No runtime move/refactor is authorized in Phase 0.

### S-02 — ResponsePlan + Controlled Spontaneity instructions are concatenated in server.ts

```text
buildCanonicalBehaviorBlock(responsePlan)
+
kairaControlledSpontaneityInstruction(...)
```

This is orchestration if both inputs are already authority-safe projections. Because Controlled Spontaneity currently reparses historical raw text, this composition amplifies Finding A from Authority Audit Pass 1.

### S-03 — Repair directive is appended after final system assembly

The repair provider call uses the already-built `system` prompt and appends an untyped `DÜZELTME KAPISI` instruction.

Expected role: realization repair only.
Open risk: post-assembly instruction can become a new authority surface unless Phase 1 types/classifies it.

### S-04 — Provider failure fallback selection is orchestration, fallback content ownership is not server-owned

The server decides *when* to call `buildGroundedDialogueFallback`; the fallback service decides the deterministic realization. This split is healthy provided the fallback remains plan-preserving.

### S-05 — `relationshipInstruction` is constructed locally in server.ts

A relationship prompt string is derived from `behaviorProfile.relationshipInstruction`. In the inspected assembly path it is not passed into `buildKairaFinalProviderSystemPrompt`.

**Classification:** dead/unused composition candidate to verify, not a behavior bug claim.

## Phase 0 composition-root rule
`server.ts` may:
- route,
- load,
- invoke,
- compose typed owned outputs,
- persist,
- deliver.

`server.ts` should not be the canonical owner of:
- semantic interpretation,
- relationship meaning,
- social appraisal,
- WHAT/WHETHER behavior policy,
- raw natural-language prompt rules that duplicate those owners.

## Mechanical red-team triggers raised in this pass
1. Controlled Spontaneity downstream raw-text reinterpretation.
2. `socialStyle` behavior instruction surface outside the explicit ResponsePlan authority.
3. repair directive appended after final prompt assembly without typed authority classification.

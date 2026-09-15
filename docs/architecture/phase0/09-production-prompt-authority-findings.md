# Kaira Phase 0 — Production Prompt Authority Findings

This pass compares the real production prompt surface against the intended single-WHAT/WHETHER authority model.

## P-01 — SpeechIdentity is not strictly HOW-only today

The block labels itself `HOW ONLY`, but some instructions constrain WHAT/WHETHER behavior, including examples equivalent to:
- do not initiate renewed closeness while withdrawn,
- do not declare the relationship fully repaired while repairing.

These may be valid constraints, but they are behavior decisions already expected to be represented by BehaviorContract/ResponsePlan.

**Classification:** CONFIRMED authority-boundary violation candidate / mechanical `authority-contract` trigger.

Phase 1 must decide whether these meanings:
- already exist in ResponsePlan and should be removed from HOW, or
- reveal a missing ResponsePlan field/semantic obligation.

Phase 0 does not patch them.

---

## P-02 — Production Dialogue Board contains direct WHAT/WHETHER instructions

`buildDialogueBoardInstruction()` serializes a `KARMAŞIK DİYALOG TAHTASI` containing evidence/claims, but its `KURALLAR` section also tells the realizer to:
- choose the single most natural social move (reaction/question/opinion/joke/correction/acknowledgement),
- ask a short clarification question when misunderstanding would change an important person/plan/event fact.

These are not merely observations. They select or authorize behavior.

This is especially important because the production server passes `buildDialogueBoardInstruction(...)` as `dialogueInstruction`, while the current Phase-0 core prompt harness uses a much narrower `CURRENT USER TURN` placeholder for this slot.

Therefore the existing Phase-0 green result does **not** prove this production-only instruction surface is authority-clean.

**Classification:** CONFIRMED STRUCTURAL / `authority-contract` + `compound-interaction` trigger.

Counterexample:
> ResponsePlan has `allowQuestion=false`, but the Dialogue Board independently says to ask a short clarification question for an important ambiguity. Even if current ordering or detectors happen to suppress/catch some cases, ownership is duplicated at the prompt surface.

---

## P-03 — `socialStyle` is a mixed HOW + WHAT policy block in `server.ts`

The production server builds a free-form social-style block containing both style guidance and behavioral rules (question habits, advice/problem-solving behavior, memory surfacing behavior, response-format constraints).

Some rules may be legitimate global character policy, but they are not typed/classified by authority and can overlap ResponsePlan/DialogueDecision/Epistemic owners.

**Classification:** CONFIRMED structural prompt-classification gap; specific conflicting rules require Phase 1 characterization.

---

## P-04 — Learned language style / dyadic language alignment are comparatively clean HOW projections

Both blocks explicitly:
- limit themselves to writing rhythm/markers,
- forbid learning/creating content, memory, intent or behavior permission,
- subordinate themselves to ResponsePlan/SpeechIdentity.

**Classification:** HOW projection, conceptually GREEN.

Typed prompt classification is still required in Phase 1 because string labels alone are not mechanical enforcement.

---

## P-05 — Runtime identity is a grounding/identity authority, not behavior authority

Runtime identity projection carries configured identity/continuity facts and explicitly refuses to manufacture autobiographical memory, preference, belief or relationship outcomes.

**Classification:** identity/grounding authority; conceptually GREEN.

---

## Phase 0 consequence

The confirmed structural gap is broader than one discourse block:
- `KairaFinalProviderPromptParts` is string-only,
- production prompt blocks include mixed authority classes,
- at least SpeechIdentity, Dialogue Board and server-owned social style contain behavior-relevant directives outside the canonical ResponsePlan block,
- repair adds another post-assembly untyped directive,
- the Phase-0 harness does not currently serialize every production block with full production context.

This does **not** invalidate the core architecture. It proves Phase 1 authority hardening is necessary and gives it concrete owning surfaces.

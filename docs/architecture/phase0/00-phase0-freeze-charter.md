# Kaira Phase 0 — Architecture Freeze Charter

Status: ACTIVE  
Base: `main@a46152f6d3384a7751e779affdf5d0e1c83c81bf`  
Scope: user/platform input through local/provider/repair/fallback delivery boundaries, with persistence and KNT paths included.

## Goal
Freeze the *current real architecture* before Phase 1 changes authority contracts.

Phase 0 changes documentation only. No runtime behavior changes are allowed.

## Required outputs
1. Unified runtime/dataflow diagram.
2. Authority graph.
3. Ownership matrix.
4. Vocabulary freeze.
5. Known-gaps register.
6. Explicit Phase 0 exit review.

## Fast-Discipline rules
Every later work item starts with:

```text
QUESTION:
CLASS: structural | evidence | test | future-capability
OWNER:
MULTI-LAYER: yes | no
COUNTEREXAMPLE:
RED PROOF:
EXIT GATE:
```

If `MULTI-LAYER=yes`, perform a quick ownership-table check before implementation. This is not a redesign meeting; it only verifies that the work still has one owning seam.

A closed topic records:

```text
WORK:
OWNER:
CLASS:
ROOT CAUSE:
FIX:
TARGETED PROOF:
COMPOUND PROOF:
FULL CI:
COVERED:
NOT COVERED:
REOPEN IF:
MERGE:
```

`authority-contract` and `compound-interaction` reopening reasons automatically trigger the architecture red-team path; reopening and red-team cannot be separated.

Fast-Discipline retrospective runs at phase exit and every 10 merges inside a phase. No new dashboard is required; PR/CI history is sufficient.

## Exit gate
Phase 0 is complete only when:
- every critical concept has a named canonical owner,
- no WHAT/WHETHER decision has two canonical owners,
- local/provider/repair/fallback paths appear on the same runtime map,
- terminology collisions are resolved,
- every known open issue is classified as structural/evidence/test/future-capability,
- Diagram B (Authority Graph) is accepted before Phase 1 begins.

# Kaira Phase 0 — Freeze Checklist

## Completed in initial blueprint pass
- [x] Phase 0 freeze charter
- [x] Unified runtime flow including local/provider/repair/fallback
- [x] Authority graph draft
- [x] Canonical ownership matrix draft
- [x] Vocabulary freeze draft
- [x] Known gaps register
- [x] Fast-Discipline start/closure rules embedded in Phase 0 charter
- [x] Claude-trigger linkage made explicit for authority/compound reopening
- [x] 10-merge workflow retrospective cadence recorded

## Still required before Phase 0 exit
- [ ] Audit `BehaviorContract` → `KairaResponsePlan` field-by-field owner/projection relationship
- [ ] Classify Controlled Spontaneity authority from real code
- [ ] Classify Local Language Engine authority from real code
- [ ] Classify Repair Prompt authority from real code
- [ ] Classify Deterministic Fallback authority from real code
- [ ] Audit important `server.ts` conditional branches: orchestration vs domain decision
- [ ] Verify Grounding / Entity Resolution naming against current code/docs
- [ ] Verify World State Appraisal vs Social Appraisal naming across architecture docs
- [ ] Confirm no other prompt-producing path bypasses the unified diagram
- [ ] Update authority graph and ownership matrix with all TBDs resolved
- [ ] Three-way Phase 0 exit review: Tolga product-fit + Claude red-team + repo evidence

## Exit rule
No Phase 1 runtime change begins while a critical authority row remains `TBD` or while a critical concept has no named owner.

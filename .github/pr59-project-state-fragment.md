

## 142. Relationship accountability / complaint boundary production acceptance — PR #59 — 2026-09-04
- Real 21-turn KNT characterization exposed a relationship-accountability bug: legitimate user criticism of Kaira's own poor prior response could be classified correctly as a complaint yet still enter relationship injury because low `severity.disrespect` was independently mapped to the generic `hakaret` pattern downstream.
- Live semantic-provider measurement for `bişey anlatmadınki sohbet bile edemedik` produced `primaryIntent=complaint`, `target=kaira`, `discourseFacets.discourseAct=confusion_or_challenge`, `discourseFacets.relationalAct=challenge`, no `insult` social act, and severity `disrespect=0.2 / aggression=0.1`.
- PR #59 merged as commit `f0c730427a6e631110fd9dc430388f932f9f065c`. The relationship ingress now separates typed accountability complaints from independent relationship harm. A complaint/challenge without explicit insult/mockery/coercion/manipulation/privacy/boundary harm is relationship-neutral even when the provider emits mild disrespect/aggression severity. No raw-text reparse and no global RelationshipReducer threshold weakening were added.
- Permanent `kairaAccountabilityComplaintRelationshipRegression.test.ts` locks three invariants: complaint does not create injury; repeating the same complaint does not manufacture repeated-negative escalation; complaint plus genuine typed insult still creates injury. Existing question-only-stop relationship policy remains composed through the same typed neutral-turn boundary.
- ADR-0031 records the accepted authority boundary. PR #59 passed architecture contracts, autonomous runtime contracts, beta runtime regression, beta conversation acceptance, full Vitest, TypeScript, production build, behavior/docs guards and exact-SHA Architecture Review before merge.
- Render auto-deploy `dep-dadahqnavr4c73fj5t5g` became live from exact merge commit `f0c730427a6e631110fd9dc430388f932f9f065c`.
- Final production smoke workflow run `33867964349` passed on the live service:
  - complaint turn 1: `negativeEvents=0`, `conflictScore=0`, `hurtScore=0`, `repeatedNegativeCount=0`;
  - identical persisted complaint turn 2: values remain `0/0/0/0`, proving repetition does not create a synthetic abuse pattern;
  - real `salaksın` provider snapshot produced `primaryIntent=insult`, `secondarySocialActs=[insult]`, `disrespect=0.7`, `aggression=0.5`; the canonical chat path produced `negativeEvents=1`, `conflictScore=5`, `hurtScore=8`, `repeatedNegativeCount=1`, `lastNegativePattern=hakaret`.
- The first smoke attempt failed only because the one-time harness read `discourseAct` from the old top-level location instead of `discourseFacets.discourseAct`; no product behavior assertion failed. The corrected schema-aligned run passed.
- Temporary production-smoke branch content was force-reset to the PR #59 merge commit, so no one-time smoke workflow remains in that branch state.

### Current verified checkpoint
- PR #30–#59 relevant canonical authority/hardening work is merged. The measured world-memory retrieval leak and relationship-accountability complaint leak from the 21-turn characterization are closed in production.
- Canonical semantic ingestion remains the single classification authority. Downstream relationship policy may project typed semantics into relationship harm/neutrality but may not reparse raw text or loosen global reducer invariants to compensate for provider output.
- Production is verified live at feature commit `f0c730427a6e631110fd9dc430388f932f9f065c` for the relationship-accountability boundary.

### Next verified development question
- Continue the remaining evidence-driven 21-turn findings in order. Re-run/inspect the next unresolved turn-level failure using semantic snapshot + relationship/reaction state + response plan + provider route + final delivered text together. Patch only a failure reproduced on the live canonical path; do not reopen world-memory or complaint-accountability work without new production evidence.

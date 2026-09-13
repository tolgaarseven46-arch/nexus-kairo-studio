# Kaira Live Beta Protocol

Status: Active

## Goal

Turn real-human beta conversations into reproducible engineering evidence without creating a second semantic, relationship, memory, or behavior authority.

The beta is product acceptance, not architecture invention. A surprising reply is not automatically a bug. A bug is promoted to engineering work only when the observed failure can be tied to captured runtime evidence and reduced to a deterministic counterexample or replay.

## Entry criteria

Live beta may start only when all of the following are true:

- `main` CI is GREEN.
- Automated pre-beta system acceptance is GREEN.
- No known open production failure is being ignored.
- Provider/API configuration is intentionally selected for the session.
- The tester knows the session may be inspected for debugging and does not enter secrets or sensitive personal data.

## Minimum session metadata

Every beta session must record:

- session ID;
- tester alias, never a secret identifier;
- UTC start/end timestamp;
- app commit SHA;
- provider/model identity when available;
- character/instance ID;
- conversation/user ID used by persistence;
- whether the session started from fresh state or hydrated state;
- whether any restart/reload occurred during the session.

## Minimum evidence for a reported turn

A failure report must preserve the smallest useful contiguous window around the failure, normally 3-10 turns, plus:

- exact user message;
- exact delivered Kaira reply;
- preceding messages needed for discourse/memory context;
- `SemanticInterpretation@2` / canonical language-understanding event when available;
- relationship snapshot before and after the turn;
- affect/reaction mode before and after the turn;
- memory writes/reads relevant to the turn;
- dialogue decision / BehaviorContract / SpeechIdentity summary when available;
- final-delivery decision and rejection/fallback issue codes when applicable;
- provider attempt/fallback identity when applicable;
- persistence/hydration evidence if the failure depends on restart or another session.

Raw text must not be reparsed downstream to invent missing canonical evidence. Missing evidence is recorded as missing.

## Failure classes

Use one primary class per report:

1. `LANGUAGE` — canonical interpretation/provenance/target/intent is wrong or insufficient.
2. `DISCOURSE` — referent, addressee, counterfactual, temporal, or cross-turn resolution is wrong.
3. `RELATIONSHIP` — canonical relationship mutation/state transition is wrong.
4. `MEMORY` — write/read/lifecycle/person/scope isolation is wrong.
5. `AFFECT_APPRAISAL` — appraisal or affect magnitude/direction is wrong while semantics remain correct.
6. `DECISION_BEHAVIOR` — WHAT/WHETHER decision is wrong with correct upstream state.
7. `SPEECH_REALIZATION` — HOW/style realizes the correct decision badly or inconsistently.
8. `FINAL_DELIVERY` — accepted/rejected/fallback/persisted reply invariant fails.
9. `PERSISTENCE` — save/load/restart/hydration changes truth or contaminates another user.
10. `PROVIDER_TRANSPORT` — timeout, retry, fallback, quota, malformed provider response, or provider parity issue.
11. `PRODUCT_UX` — product-facing issue without evidence of core behavior failure.
12. `UNKNOWN` — evidence is insufficient; do not patch production from this class.

## Severity

- `S0` — data/security/privacy loss or destructive cross-user contamination. Stop beta and fix before continuing.
- `S1` — canonical truth, identity, relationship, memory, or hard permission is materially wrong. Reproduce before broadening beta.
- `S2` — repeated behavior/realization failure that breaks intended character experience but does not corrupt canonical state.
- `S3` — isolated awkwardness, wording, UI friction, or low-impact quality issue.

## Promotion rule: observation -> engineering bug

A beta observation becomes an implementation task only after this chain:

1. Capture the exact failing turn and required history.
2. Identify the owning seam from evidence; do not choose the seam from the surface symptom.
3. Reduce the failure to the smallest deterministic fixture/replay possible.
4. Produce a RED test or explicit deterministic counterexample.
5. Patch only the owning seam.
6. Re-run the new regression, neighboring contracts, full Tests, TypeScript, production build, and Architecture Review.
7. Merge only after GREEN.

If step 2 or 3 cannot be completed, keep the report as evidence-gathering work. Do not add a phrase patch, regex, second classifier, or downstream semantic authority.

## Multi-user beta requirements

Before declaring beta complete, include sessions that exercise:

- at least two distinct users with independent relationship/memory histories;
- fresh vs mature relationship behavior;
- positive history followed by mild conflict;
- repeated negative history followed by repair attempts;
- third-party references that must not mutate the Kaira-user relationship;
- restart/hydration between conversations;
- same or similar input given to different users where history should legitimately change the result.

Any cross-user contamination is `S0/S1` depending on impact and blocks beta completion.

## Long-horizon requirements

At least one real session should exceed 100 conversational turns without manually resetting state. Inspect not only the final state but the per-turn evolution of relationship, affect, memory, and decision outputs. A final snapshot alone is not sufficient evidence.

## Exit criteria

Live beta may be called complete for the tested build when:

- no unresolved `S0` or `S1` report remains;
- every fixed `S1/S2` behavior failure has a deterministic regression/replay;
- multi-user and restart/hydration sessions show no contamination;
- long-horizon sessions do not show unexplained drift in canonical state;
- provider/transport failures are separated from canonical semantic/behavior failures;
- remaining `S3` issues are explicitly accepted as product-polish backlog rather than hidden core failures.

## Report handoff

Use the repository live-beta failure issue template for every promoted or still-investigating failure. Attach only the smallest necessary evidence window and redact secrets, API keys, private identifiers, and unrelated personal content.

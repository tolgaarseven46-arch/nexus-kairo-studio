from pathlib import Path
p = Path('PROJECT_STATE.md')
text = p.read_text(encoding='utf-8')
append = r'''

## 115. Canonical 20-turn mixed-conversation quality regression — 2026-09-01
- A single deterministic 20-turn conversation now exercises local/AI routing, canonical BehaviorContract -> DialogueDecision -> SpeechIdentity -> KairaResponsePlan construction, relationship/reaction continuity, apology/repair and reported-world recall together.
- Recall requests remain on grounded_recall/AI semantics while routine social turns may stay local.
- The regression preserves the authority split: higher WHAT/WHETHER planning may keep a low-score hurt conversation open while qualitative HOW still prevents the delivered local surface from jumping back to over-familiar language.
- CI #1248 passed architecture contracts, 853/853 tests, TypeScript and production build.

## 116. Runtime test-session hydration and save/load roundtrip — 2026-09-01
- loadTestSession is now exercised as runtime code with mocked Firestore rather than only source-string contracts.
- Reverse-ordered turn documents are sorted chronologically and the latest turn-local dynamic state, reactionMode, relationship lifecycle, responsePlan, provider/timings and world appraisal/policy/guard are restored without stale session-summary overwrite.
- saveTestSessionTurn -> Firestore payload -> loadTestSession roundtrip is also covered so metadata/state survival is verified on both write and read boundaries.
- CI #1249 and #1250 passed the full validation pipeline.

## 117. Twenty-turn per-turn persistence roundtrip — 2026-09-01
- Twenty sequential KDM turns are saved through the real persistence API and hydrated back from deliberately reversed Firestore documents.
- Every restored turn must equal its own original dynamicStateAfter and responsePlan; the regression explicitly rejects collapse of all historical turns into the final state snapshot.
- Turn document IDs are required to remain unique across the 20-turn run.
- CI #1252 passed architecture contracts, full tests, TypeScript and production build.

## 118. Deterministic final-delivery authority against bad model drafts — 2026-09-01
- Regression deliberately supplies model drafts that violate qualitative hurt, stopQuestions, stopTalking and reported-attribution recall constraints.
- The canonical final gates remove forbidden humor/question/over-familiarity, enforce closure budgets and repair reported claims without relying on model compliance.
- Final delivered text is required to have zero KairaResponsePlan issues after deterministic enforcement/world-memory guarding.
- CI #1253 passed the full validation pipeline.

## 119. Server-to-client authoritative response boundary — 2026-09-01
- droitChatService.sendMessage is exercised with a mocked /api/chat response to verify the client does not reinterpret a server-authoritative final reply.
- Final reply, dynamicState, reasoningTrace, consistency, responsePlan, worldStateAppraisal, worldReasoningPolicy, worldMemoryGuard and controlledSpontaneity are projected through the client boundary unchanged.
- Server session/turn/instance/provider identifiers remain authoritative as well.
- CI #1254 passed architecture contracts, full tests, TypeScript and production build.

## 120. Provider outage fallback and request-local provider observability — 2026-09-01
- Initial AI-generation failure no longer necessarily collapses /api/chat to HTTP 500. Moves with an existing grounded deterministic fallback can continue through the same final enforcement chain.
- Factual answer_or_clarify moves still return no invented fallback; if the model provider is unavailable and no grounded fallback exists, the generation error is preserved rather than fabricating knowledge.
- Deterministic provider-fallback text is not learned into persistent language style. If a later real repair generation succeeds and becomes the final reply, normal accepted-reply learning is re-enabled.
- Provider observability is request-local: generateTextResult returns text + providerUsed, removing the old module-global activeAiProviderUsed concurrency race. Repair provider metadata changes only when that repair becomes the chosen reply.
- Client KairoProviderUsed explicitly includes deterministic_fallback.
- CI #1257, #1260 and #1263 passed architecture contracts, full tests, TypeScript and production build.

### Next verified development question
- Audit timeout/retry idempotency. droitChatService aborts the client request at 35 seconds, but a server request can continue processing/persisting after the client disconnects. A retry must not apply the same logical user turn twice or advance relationship/state twice.
'''
if '## 120. Provider outage fallback and request-local provider observability' not in text:
    p.write_text(text.rstrip() + append + '\n', encoding='utf-8')

# Phase 2 — typed discourse resumption priority precommit

Production S7 on merge `fa1e6fbd9f3b38c64c1992e8598af56c712ec72f` proved the DialogueDecision advice obligation was preserved, but the single open thread was still not resumed. The final canonical turn carried both `target=third_party` and `adviceRequested=true`; `reduceOpenThreads` created a fresh third-party thread before evaluating the typed resumption signal.

Precommitted invariant: an explicit typed resumption signal binds existing open discourse context before the same compound turn may be treated as a new third-party opening. Exactly one open thread resumes; multiple open threads remain ambiguous; no raw-text phrase receives special treatment. See ADR-0036 and `kairaDiscourseResumptionPriorityRegression.test.ts`.

# Slice B W2 — GitHub Copilot independent red-team request

This PR exists only to obtain an independent W2 red-team review.

Reviewer instructions:
- Read `docs/reviews/slice-b-w2-independent-red-team-request.md`.
- Review the candidate design in:
  - `docs/slice-b-multi-user-observation-freeze-packet.md`
  - `docs/slice-b-w3-freeze-draft-w4-test-map.md`
  - `docs/tests/slice-b-w5-fixture-spec.md`
- Attack authority boundaries, isolation, replay purity, determinism, privacy/data minimization and self-message recursion.
- Classify findings as BLOCKER / NON-BLOCKER / FUTURE.
- Do not approve by default; prefer concrete counterexamples.
- This PR must not change production behavior.

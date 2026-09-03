# ADR-0010 — Runtime behavior proof strategy

Status: proposed in PR #31

## Context

A green unit/contract suite did not prevent the post-PR30 live KNT conversation from exposing repeated social moves, lost previous-turn dependency, punctuation-sensitive output guards, and an autonomous activity permission prompt entering the delivered chat reply outside the intended response-plan authority.

The failure was methodological as much as local: tests proved individual functions and selected literal examples, but did not prove the delivered runtime behavior across semantic interpretation, discourse state, response-plan conformance, side-channel composition, and multi-turn history.

## Decision

Behavior changes must be validated with multiple independent evidence classes rather than one example-specific regression.

Required evidence for behavior-critical changes:

1. Focused contract test for the local invariant.
2. Metamorphic/paraphrase tests that preserve meaning while changing surface text.
3. Sequence/long-session tests that fold real alternating user/Kaira turns.
4. Final-output conformance tests on the actually delivered text, including text appended by side channels.
5. Canonical/legacy rollout tests with explicit flag ON/OFF states; library defaults are not silently changed to make a test pass.
6. Red-team counterexamples for likely bypasses such as omitted punctuation, slang, profanity, reordered wording, and repeated social acts expressed with different text.

A passing test is evidence only for the invariant it directly observes. CI green is necessary but is not by itself proof of natural conversation quality.

## Runtime safety decisions in PR #31

- Previous-turn dependency is inferred from the pending conversational role plus canonical semantics, not from one exact phrase.
- Question blocking checks common punctuation-free Turkish question acts in addition to `?`, with reported-question counterexamples to reduce false positives.
- Activity-permission composition is explicitly tested as part of the delivered reply contract. The low-level permission service remains functional; the still-open integration requirement is that ordinary chat must not append a permission question after the response-plan authority has forbidden questions. PR #31 remains draft until that server seam is resolved or isolated out-of-band.
- Kaira self-repeat detection is evaluated by social act, not exact reply string.
- ADR-0006 behavior flags retain explicit opt-in/rollback semantics; canonical promotion must be proven at the runtime/deployment boundary rather than implemented as a hidden library default.

## Evidence classification

Tests in this strategy must say whether they are **acceptance** (the runtime is required to satisfy the invariant) or **characterization** (the test demonstrates an existing seam/problem without claiming it is fixed). A characterization test may stay green while proving that composing a given side-channel creates a plan violation; it must not be reported as evidence that the runtime has prevented that violation.

## Consequences

Behavior fixes will generally add more than one test and may intentionally keep a PR in draft while counterexamples are still being found. This increases short-term test work but reduces false confidence from narrow green suites.

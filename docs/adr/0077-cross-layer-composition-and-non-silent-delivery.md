# ADR-0077: Cross-layer composition invariants and non-silent final delivery

- Status: Accepted
- Date: 2026-09-07

## Context

Fresh natural-conversation KNT evidence after PR #136-#138 exposed a repeating failure class that is broader than any single wording bug:

1. canonical fields can be individually valid but mutually incoherent (`target=unknown` + reciprocal `what_doing`);
2. output-side structural recognition can miss an informal Turkish question surface (`ne tarz açıyosun şimdi`) even when generated-reply canonical semantics identifies the reply as a question;
3. a multi-facet candidate can contain both allowed content and one forbidden facet, but all-or-nothing rejection can erase the allowed content;
4. after canonical repair/fallback is exhausted, final delivery previously persisted an empty string for rejected candidates.

The root-cause audit concluded that the core architecture remains valid, but cross-layer composition lacked general invariants and fresh natural conversations were finding neighboring combinations not covered by narrow regressions.

## Decisions

### 1. Reciprocal social routines have a general target invariant

`how_are_you` and `what_doing` are reciprocal Kaira-facing routines. The final canonical interpretation must satisfy:

`socialRoutine in {how_are_you, what_doing} => target === kaira`.

The language-understanding gateway resolves contradictions using typed canonical evidence only:

- explicit non-Kaira targets (`third_party`, `self`, `event`) lose the reciprocal routine;
- `target=unknown` plus a canonical current-user state/share signal (for example a `current_user` world-memory claim or `stateAnswerShape`) also loses the routine because the user is describing themself rather than asking Kaira;
- `target=unknown` with a reciprocal routine and no current-user state/share evidence is resolved to `target=kaira`, representing the implicit addressee of the dyadic chat.

This preserves ordinary `naber şimdi`-style implicit address while closing the measured Turn 2 state-share over-read. No raw-text reparsing is added.

This supersedes the narrower PR #136 implementation that only reconciled `third_party`.

### 2. Final response validation may consume canonical generated-reply semantics

The structural Turkish question recognizer remains a fast deterministic measurement tool, not the sole semantic authority.

When canonical generated-reply `SemanticInterpretation@2` is already available, final `KairaResponsePlan` validation may use it to prove that the candidate performs a question or affection act. This closes structural coverage gaps without adding bare-token question rules as a second semantic authority.

### 3. Mechanical partial repair is facet-scoped

Before rejecting an otherwise useful candidate, final delivery may remove only a forbidden facet whose deletion is semantically safe:

- a structurally separable question clause may be removed when questions are forbidden;
- a standalone affectionate vocative (`aşkım`, `bebeğim`, `tatlım`, `sevgilim`) may be removed when affection is forbidden.

Mechanical repair must not delete proposition-bearing physical/romantic actions such as `sarıl` or `öp`; those remain owned by normal semantic repair/fallback.

Every mechanically repaired candidate must pass the same canonical final checks as any other candidate.

### 4. Final rejection may not fail silent

A candidate that still fails after canonical repair/fallback remains `accepted=false`, keeps all issues observable, and is never learned as a successful response.

However, final delivery must persist a short fact-free recovery surface instead of an empty string:

`bi saniye, bunu toparlayamadım`

This recovery line contains no world fact, advice, affection, question, promise, or relationship claim. It is an availability/recovery surface, not a substitute semantic answer.

### 5. Cross-field fixes require generalization evidence

For future behavior/memory/semantic fixes, PR review must explicitly answer whether the change expresses the general invariant supported by evidence or only the observed value combination.

If only a narrow fix is justified, the PR must say `NARROW FIX — GENERALIZATION OWED` and name the follow-up scope. Neighboring value combinations must be tested before merge.

## Invariants

1. Any surviving reciprocal `how_are_you/what_doing` routine has canonical `target=kaira`.
2. A current-user state/share signal cannot be reinterpreted as a reciprocal Kaira routine merely because target is unresolved.
3. A canonical generated-reply question cannot pass `allowQuestion=false` merely because the structural recognizer missed its surface form.
4. A mechanically removable forbidden facet must not force rejection of an independently valid facet in the same candidate.
5. `resolveKairaFinalDelivery(...).persistedReply` is non-empty for both accepted and rejected decisions.
6. `accepted=false` remains visible in metrics/KNT even when the non-silent recovery surface is delivered.
7. Mechanical delivery repair never invents a new semantic claim.

## Verification

Required regression coverage:

- explicit reciprocal-routine target matrix (`kaira`, `third_party`, `self`, `event`);
- unresolved implicit reciprocal addressee (`naber şimdi`) resolves to Kaira;
- measured Test B Turn 2 current-user state-share (`target=unknown + what_doing`) clears the routine;
- measured Turn 5 question surface with structural-fast-path miss plus canonical reply semantics;
- measured Turn 6 semicolon-separated reaction + forbidden question salvage;
- action + forbidden affectionate vocative partial repair;
- physical-affection negative guard proving proposition-bearing content is not mechanically erased;
- final rejected delivery remains `accepted=false` but persisted reply is non-empty;
- accepted candidates remain unchanged.

The PR must pass architecture contracts, autonomous runtime contracts, beta gates, full Vitest, TypeScript, production build, docs/behavior guards and SHA-bound Architecture Review before merge.

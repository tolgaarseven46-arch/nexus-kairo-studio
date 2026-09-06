# Provenance-aware memory guard composition

Status: Accepted
Date: 2026-09-06

## Context

The targeted architecture audit confirmed a composition bug in the final response boundary: world-memory enforcement can ground or repair a reply, after which the autobiographical/self-memory guard can overwrite that reply with a generic no-memory fallback because it receives only the resulting text and its own recall state. The effective winner becomes the last guard rather than the strongest available evidence.

The current canonical `runKairaResponseConstraintPass` still executes world-memory before autobiographical memory, so the issue remains relevant even though the server's older manual fallback branch is effectively bypassed by the canonical pass.

## Decision

Memory authorities remain separate. We do not merge world memory and self/autobiographical memory into one authority.

Instead, guard composition carries typed response-grounding provenance forward:

- world-memory enforcement reports whether the current reply has a grounded world-memory basis and satisfies the world response boundary;
- the autobiographical guard receives that provenance;
- a generic self-memory no-evidence fallback (`missing`, `unavailable`, `ephemeral`, or resolved-without-evidence) may not erase a reply protected by valid world grounding;
- resolved canonical self facts and resolved autobiographical evidence remain independently authoritative and continue to enforce their own conformance rules.

## Invariants

- World memory owns world/event evidence; self/autobiographical memory owns Kaira's identity and lived autobiography.
- Absence of evidence in one memory authority is not evidence against a grounded answer from another authority.
- Provenance affects only guard composition; it does not change semantic, relationship, emotional, behavioral, or ResponsePlan authority.
- No raw-text classifier or regex patch is introduced to detect a world-grounded reply after the fact.
- A prior grounding is protected only when world policy permits answering from memory, grounded evidence exists, and the resulting reply satisfies the world-memory response boundary.

## Regression requirement

A grounded world-memory reply must survive a subsequent self-memory `missing` fallback. Without protected prior grounding, the existing self-memory fallback behavior must remain unchanged. Resolved canonical self facts must still override a conflicting reply even when prior world grounding exists.

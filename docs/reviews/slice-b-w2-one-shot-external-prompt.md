# Slice B W2 — One-shot independent red-team prompt

You are the independent reviewer for Kaira × PrivatRoom Slice B.

Your job is NOT to approve by default. Attack the design and return only structured findings.

## Read these files from repo
- docs/slice-b-multi-user-observation-freeze-packet.md
- docs/slice-b-w3-freeze-draft-w4-test-map.md
- docs/tests/slice-b-w5-fixture-spec.md
- docs/reviews/slice-b-w2-independent-red-team-request.md
- PROJECT_STATE.md sections 23–29

## Review goals
Try to falsify the claim that Conversation Graph is observation-only and cannot become:
- a shadow semantic authority,
- a hidden engagement/response authority,
- a relationship/appraisal authority,
- a moderation/capability authority,
- a replay/cross-server/cross-Kaira leak.

Pay special attention to:
- explicit reply/mention facts vs inferred address candidates,
- unanswered-turn evidence and motive attribution,
- escalation evidence refs,
- suppression receipt provenance,
- duplicate/conflicting event ids,
- total-order determinism,
- replay snapshot purity,
- participant counters/timestamps and privacy profiling risk,
- Droit self-event recursion,
- cold/warm/experienced-owner fixture leakage into production WHAT/WHETHER.

## Required output
Return JSON only, matching this exact shape:

{
  "reviewer": {
    "name": "<independent reviewer/model>",
    "independent": true,
    "reviewedAt": "<ISO timestamp>"
  },
  "blockers": [
    {
      "id": "B-W2-...",
      "counterexample": "...",
      "violatedInvariant": "...",
      "minimumRepair": "...",
      "requiredTest": "..."
    }
  ],
  "nonBlockers": [
    {
      "id": "NB-W2-...",
      "rationale": "...",
      "recommendedCleanupOrTest": "..."
    }
  ],
  "future": [
    {
      "id": "F-W2-...",
      "whyOutOfScope": "..."
    }
  ],
  "verdicts": {
    "shadowSemanticAuthorityBlockerRemains": true,
    "hiddenEngagementAuthorityBlockerRemains": true,
    "isolationBlockerRemains": true,
    "replayPurityBlockerRemains": true,
    "determinismBlockerRemains": true,
    "privacyBlockerRemains": true,
    "safeToEnterW3AfterRepairs": false
  }
}

Rules:
- Use true/false based on your actual findings.
- Do not omit any verdict.
- If there are no blockers, use an empty blockers array.
- Do not give an overall score.
- Do not redesign unrelated frozen A–S architecture unless a concrete Slice B counterexample proves a frozen invariant violation.

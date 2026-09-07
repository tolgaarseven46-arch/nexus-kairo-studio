# ADR-0080 — Phase 0 detector observability and effective prompt reconciliation

Date: 2026-09-07
Status: Accepted

## Context

The first Phase 0 machine report executed 21 scenarios / 423 deterministic user turns and reported a single automatic violation. Joint user + ChatGPT + Cloud review found that this must not be interpreted as a 422/423 success rate: clusters A, B, D, and E did not yet have observable automatic detectors on real scenario turns.

The one working prompt contradiction detector immediately found C4 / Turn 13. The underlying pattern is not a wrong DialogueDecision or a wrong ResponsePlan in isolation. Raw DialogueDecision reason text was serialized into the final realizer prompt next to an effective ResponsePlan hard gate without reconciliation. This is a `reconciliation-free concatenation` seam.

A second audit finding is that detector contracts must match the real architecture. `SpeechIdentity` does not directly consume the canonical raw `joking` / `severity` fields, so forcing direct-value equality between RelationshipReducer and SpeechIdentity would create a false architectural dependency. HOW/STATE checks must instead validate provenance and require an explicit policy reason for qualitative divergence.

## Decision

1. Phase 0 reports MUST distinguish `zero violations` from `not observable`.
2. Every detector exposes cluster, detector id, active status, observable status, and an explicit reason.
3. Phase 1 is blocked until every A–E cluster has at least one automatic detector that is observable on representative real Phase 0 turns and each detector is proven by a known-bad synthetic case plus a neighboring non-bad case.
4. Raw DialogueDecision `reason` remains available to debug/KNT observability but MUST NOT be serialized as a realizer-facing instruction. Realizer instructions come from the effective, post-gate behavior plan surface.
5. Generic obligation metadata such as `allowedResolutions` is preserved for analysis; it is not itself realizer authority.
6. HOW/STATE divergence is not inherently invalid. Divergence is invalid only when it has no explicit named policy/provenance reason.
7. Missing canonical observability must be reported as missing. Tests MUST NOT synthesize fake runtime truth merely to make a detector appear active.
8. The full production final-provider-prompt template and the Phase 0 harness prompt still require parity proof. Shared canonical blocks alone are not sufficient evidence of byte-identical parity.

## Initial detector contracts

- A / self epistemics: a factual Kaira self-claim requirement needs grounded provenance or an explicit epistemic qualification. Grounded evidence must not be blocked by an unnecessary epistemic refusal.
- B / semantic completeness: if typed canonical `causeKnown=true`, a clarify/invite-context move is invalid. Corrected values may not reappear as active truth unless explicitly marked superseded. Until those typed runtime snapshots exist, B is reported unobservable.
- C / prompt reconciliation: any realizer-facing question authorization must be rejected when the effective plan has `allowQuestion=false`, unless a typed effective obligation override explicitly authorizes it. The detector must be general across wording, not tied to C4.
- D / HOW-STATE: qualitative divergence requires an explicit named policy reason; direct raw-field equality between layers is not required.
- E / repair-recovery: positive repair/recovery progress requires either `repairAttempt=true` or an explicit typed `recoverySource`.

## Consequences

- A report can no longer create false confidence by presenting unobserved clusters as clean.
- C4's raw debug reason no longer leaks into the realizer instruction surface through the shared dialogue-move serializer.
- Detector tests become tests of the detector itself, not only tests of Kaira behavior.
- Phase 1 / 100-scenario expansion and Test C behavior patches remain blocked until detector coverage and full prompt seam parity are proven.
- The no-AI boundary remains unchanged: Phase 0 stops at `FINAL_PROVIDER_PROMPT_BUILT_NO_PROVIDER_CALL`.

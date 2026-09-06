# ADR-0066 — Current self fact query ontology

## Status
Accepted

## Context
The real-user Turn 4 question about whether Kaira currently has a romantic partner exposed a semantic-scope ambiguity that remained explicitly open after the privacy repair. The structured-memory ontology already separates two Kaira-owned self-truth domains:

- `self_fact`: policy-gated, evidence-revision self truth
- `autobiographical_memory`: policy-gated, append-only lived self history

The canonical semantic schema already exposes the matching `selfMemoryQuery.scope`, but the LLM semantic-provider contract only said that the field applies to Kaira's “özelliği/geçmişi/anısı”. It did not state which scope owns present/mutable self state versus a lived past episode. A provider could therefore classify a current-state question as autobiography without violating its written contract.

## Decision
- `self_fact` owns Kaira's current or durable self truth: present status, current relationship status, preferences, identity attributes and other attribute/value self facts that may be revised by evidence.
- `autobiographical_memory` owns a past event/episode that Kaira actually lived or a request to recall that lived history.
- A present-state question must not become `autobiographical_memory` merely because its subject is personal.
- A historical lived-event question must not become `self_fact` merely because Kaira is the subject.
- `any` remains only for genuinely unresolved self-memory scope, not as a shortcut around this distinction.
- No new memory store, classifier, raw-text downstream parser, relationship rule or second semantic authority is introduced. The repair tightens the existing canonical semantic-provider ontology.

## Consequences
A question such as whether Kaira currently has a partner is a current self-fact lookup, while a question about a partner or relationship Kaira had in a past lived episode is autobiographical recall. The existing `kairaCanonicalIdentityStore`, `kairaAutobiographicalRecallRuntime`, final evidence guards and memory ontology remain the authorities they already were.

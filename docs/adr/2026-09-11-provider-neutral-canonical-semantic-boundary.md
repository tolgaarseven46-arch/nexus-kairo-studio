# Provider-neutral canonical semantic boundary

Status: Accepted
Date: 2026-09-11

## Context

`resolveServerLanguageUnderstanding` previously named the LLM semantic provider from the requested transport (`llm_semantic_${preferredProvider}`). The transport layer may transparently fall back from OpenRouter to Gemini, so the requested provider is not a trustworthy canonical semantic identity.

The semantic JSON is also model output. Therefore an `evidence.provider` string emitted by the model is not trusted provenance and must not be allowed to identify the canonical runtime authority.

## Decision

Canonical `SemanticInterpretation@2` parsing uses the stable provider-neutral identity `llm_semantic_runtime`. `preferredProvider` remains an input only to the text-generation transport selection. Concrete runtime provider/fallback identity remains observability metadata and must not influence canonical semantic/state transitions.

When the canonical result comes from `semantic_provider`, the server bridge overwrites LLM evidence provider labels with `llm_semantic_runtime`. Non-LLM evidence and client-shared/fallback semantic results are left intact.

## Consequences

- Switching or falling back between OpenRouter and Gemini cannot rename the canonical semantic authority.
- Model-generated provider labels cannot spoof canonical semantic provenance.
- Canonical KDM/state behavior remains provider-neutral.
- Runtime provider identity can still be recorded separately for diagnostics and cost/availability telemetry.
- Regression contracts lock both the transport-neutral boundary and trusted provenance rule.

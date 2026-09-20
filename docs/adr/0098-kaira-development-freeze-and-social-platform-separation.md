# ADR-0098 — Kaira development freeze and social-platform separation

**Status:** Accepted  
**Date:** 2026-09-20

## Decision

Freeze Kaira at the current main checkpoint while PrivatRoom/social-media development continues independently.

Kaira is not being deleted, rewritten, or rolled back. Its current architecture, tests, production evidence, and integration contracts are preserved.

## Scope of the freeze

Until explicitly reopened:
- no Kaira conversation-quality patches;
- no new first-encounter/routine/steering/realizer work;
- no memory/relationship/KDM/KTM refactors;
- no model/provider-routing experiments;
- no new Kaira features or moderation/action expansions;
- no speculative cleanup/simplification work.

The only permissible exception is a clearly identified platform-critical integration defect, and that exception must be explicit.

## Project boundary

PrivatRoom/social-media is now the active product track.

PrivatRoom may retain the existing Kaira integration seam, but social-platform completion must not depend on further Kaira development. New social features should be owned by the social-platform repository unless they are unambiguously Kaira-domain behavior.

## Frozen checkpoint

Kaira main at freeze: `fae784ab9f8f9c90df789c99c5f53d5766e12462`.

At the freeze decision:
- open Kaira issues: 0;
- open Kaira PRs: 0.

## Restart rule

A future Kaira phase must start from an explicit restart decision and a fresh scope review. Historical ideas are not automatically reopened.

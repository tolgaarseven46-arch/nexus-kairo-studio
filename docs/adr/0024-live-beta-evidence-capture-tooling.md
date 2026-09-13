# ADR 0024 — Live Beta Evidence Capture Tooling

Status: Accepted

## Context

Live beta needs reproducible session evidence that includes build provenance and runtime metadata in addition to persisted per-turn KNT/session data.

## Decision

Add a tooling-only capture script that combines:

- local Git HEAD SHA;
- `/api/runtime-info` provider/model/persistence metadata;
- `/api/test-sessions/:sessionId` persisted session evidence;
- explicit tester-provided fresh/hydrated, restart, and Kaira instance metadata.

The capture tool is not a semantic, relationship, memory, appraisal, behavior, speech, or persistence authority. It must not infer missing canonical evidence from raw text. Missing metadata stays `unknown`.

## Consequences

- live-beta evidence packages are easier to reproduce and compare across builds;
- no production Kaira runtime behavior changes;
- no observation becomes a production bug until the existing live-beta promotion chain produces an owning seam and deterministic RED/replay.

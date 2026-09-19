# ADR — Explicit Kaira invite lifecycle

Date: 2026-09-19

## Decision

PrivatRoom room creation no longer implies Kaira presence or conversation. Kaira becomes a room participant only after an explicit, authorized platform action represented as the factual platform-owned event `kaira.invited_to_server`.

The platform owns only invite/presence facts: room/server identity, inviter identity and role, invite request id, invitation time, entitlement/access gate, and Kaira participant presence. Kaira owns relationship/appraisal, dialogue decisions, realization, memory, and subsequent behavior.

## Introduction behavior

The invite event may trigger one short introduction that identifies Kaira and states the user-facing value: helping manage the server. It must not reuse room-created onboarding copy, ask the user to design the room immediately, expose internal terms, or enumerate a feature list.

## Idempotency

The platform supplies an `inviteRequestId`; the integration event id is deterministic for that request. Duplicate invite requests must not create duplicate Kaira participants or duplicate introductions.

## Billing boundary

Access/trial state remains platform-owned gating context and must not change Kaira decision/personality output.

## Compatibility

Legacy `room.created` and `participant.joined` lifecycle handling remains available for compatibility, but PrivatRoom's new room creation path must not emit a Kaira welcome before explicit invite.

## 2026-09-19 live acceptance clarification

Production acceptance showed that deterministic variant selection could emit alternate invite introductions even though the product copy is frozen. For `kaira.invited_to_server`, realization is therefore intentionally single-copy and must emit exactly:

`Selam 😄 ben Kaira. Sunucuyu yönetirken yanında olacağım.`

This clarification changes only realization wording. Platform invite authority, presence, access state, memory boundaries, relationship/appraisal ownership, and idempotency remain unchanged.

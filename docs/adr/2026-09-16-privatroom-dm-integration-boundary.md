# ADR — PrivatRoom DM integration boundary

Date: 2026-09-16

## Context
PrivatRoom is a separate social product that will host Kaira as a first-class Droit principal. The frozen pre-AI architecture remains authoritative inside Kaira. This integration is an explicit new product boundary, not a reason to create a second semantic or behavior authority.

## Decision
Add a versioned `POST /api/integrations/privatroom/dm` adapter.

The adapter:
- authenticates the PrivatRoom service with a dedicated integration secret,
- validates the versioned transport envelope,
- maps only platform identity/message fields into the existing `/api/chat` runtime,
- preserves `userId`, `userName`, `kairaInstanceId`, stable request identity, and conversation session identity,
- returns only proposed platform actions (`message.send`) to PrivatRoom,
- does not execute PrivatRoom actions itself,
- does not classify semantic meaning, mutate Kaira state directly, or bypass the existing response/delivery guards.

PrivatRoom remains authority for platform permissions, conversation membership, persistence of social messages, and execution of proposed platform actions. Kaira remains authority for Kaira semantic interpretation, memory, relationship state, decision/behavior, speech identity, and final generated reply.

## Failure policy
- Invalid or unauthenticated transport fails closed.
- Missing `message.send` capability returns a typed no-reply result.
- Kaira core errors surface as gateway errors so PrivatRoom's durable outbox can retry according to its own policy.
- The adapter cannot expand the capability list or redirect a response to another conversation.

## Consequence
The integration extends the external transport boundary while leaving the frozen A–S pre-AI authority model intact. Any later room/server administration capability must be added as a separate typed capability/action family with PrivatRoom-side permission enforcement.

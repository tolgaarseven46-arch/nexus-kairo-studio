# Action-request / relational-facet composition

Date: 2026-09-06
Status: Proposed

## Context

The exact 27-turn real-user session exposed Turn 14:

- user: `bana şiir oku`
- canonical intent: `command`
- target: `kaira`
- secondary relational act: `closeness_bid`
- old DialogueDecision move: `respond_to_relational_bid`

The semantic layer had already identified the primary request correctly. The first broken boundary was DialogueDecision ownership: a secondary relational facet could erase a primary user action obligation.

## Decision

Canonical `intent=command` owns a typed dialogue obligation:

- primary move: `respond_to_action_request`
- obligation type: `action_request`
- allowed resolutions: fulfill, clarify, explicitly decline, or explicitly defer
- acknowledgement-only output is insufficient

A concurrent `relationalAct` remains on the plan as compositional context. It may shape HOW the requested action is handled, but it cannot replace WHAT the user asked Kaira to do.

This also applies when the requested action itself is relational, for example a canonical command such as `sarıl bana`: the primary object is still an action request, while `closeness_bid` remains relevant context for boundaries and realization.

## Ordering

Action requests are evaluated before topic-shift and relational-bid branches, just as explicit advice obligations already survive a simultaneous topic-shift facet. Repair/correction/recall authorities remain higher-priority where already defined.

## Constraints

This change introduces no regex classifier, raw-text reparse, second semantic authority, or command-specific phrase list. It consumes the existing canonical `command` intent.

import type { DroitDynamicState } from "../types/nexus";
import type { KairaAutobiographicalMemory } from "./kairaIdentityContracts";
import type { KairaInstanceContext } from "./kairaInstanceContext";
import { instancePolicy, resolveKairaInstanceContext } from "./kairaInstanceContext";
import type { WorldEventObservation } from "./worldModelEventStore";

export type KairaLivedMemoryDecisionStatus =
  | "consolidate"
  | "skip_ephemeral_instance"
  | "skip_unpersisted_world_event"
  | "skip_ambiguous"
  | "skip_reported_claim"
  | "skip_nonpresent_claim"
  | "skip_not_self_relevant"
  | "skip_negated_event"
  | "skip_low_salience";

export interface KairaLivedMemoryDecision {
  status: KairaLivedMemoryDecisionStatus;
  score: number;
  reasons: string[];
  memory: KairaAutobiographicalMemory | null;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const EVENT_WEIGHT: Record<string, number> = {
  insult: 0.34,
  rejection: 0.30,
  apology: 0.28,
  repair: 0.32,
  support: 0.25,
  compliment: 0.20,
  emotional_share: 0.12,
  command: 0.08,
  general: 0.04,
};

function isKairaParticipant(observation: WorldEventObservation, instanceId: string): boolean {
  const event = observation.event;
  const candidates = [event.actor, event.target].filter(Boolean);
  return candidates.some((participant) => {
    const id = participant?.id?.toLocaleLowerCase("tr-TR");
    return (
      participant?.source === "second_person" ||
      id === instanceId.toLocaleLowerCase("tr-TR") ||
      id === "kaira" ||
      id === "current_kaira"
    );
  });
}

function emotionalImpact(state: DroitDynamicState): number {
  const deltaMagnitude = (state.lastEvent?.deltas || []).reduce(
    (sum, delta) => sum + Math.min(20, Math.abs(Number(delta.value) || 0)),
    0,
  );
  const reactionBoost =
    state.reactionMode === "withdrawn" ? 0.28 :
    state.reactionMode === "hurt" ? 0.24 :
    state.reactionMode === "irritated" ? 0.18 :
    state.reactionMode === "repairing" ? 0.16 : 0;
  return clamp01(deltaMagnitude / 80 + reactionBoost);
}

function relationshipImportance(state: DroitDynamicState): number {
  const relationship = state.relationship;
  if (!relationship) return 0;
  const warmth = clamp01(Number(relationship.warmth ?? relationship.warmthScore ?? 50) / 100);
  const trust = clamp01(Number(relationship.trust ?? relationship.trustScore ?? 50) / 100);
  const familiarity = clamp01(Math.log1p(Number(relationship.interactionCount || 0)) / Math.log(101));
  const injury = clamp01(
    (Number(relationship.conflictScore || 0) + Number(relationship.hurtScore || 0)) / 200,
  );
  return clamp01(warmth * 0.28 + trust * 0.24 + familiarity * 0.24 + injury * 0.24);
}

function memoryEmotions(state: DroitDynamicState): KairaAutobiographicalMemory["emotions"] {
  if (state.reactionMode === "hurt") {
    return [{ label: "kırgınlık", intensity: clamp01(Math.max(0.45, state.stress / 100)) }];
  }
  if (state.reactionMode === "withdrawn") {
    return [{ label: "geri_çekilme", intensity: clamp01(Math.max(0.5, state.stress / 100)) }];
  }
  if (state.reactionMode === "irritated") {
    return [{ label: "rahatsızlık", intensity: clamp01(Math.max(0.4, state.anger / 100)) }];
  }
  if (state.reactionMode === "repairing") {
    return [{ label: "rahatlama", intensity: clamp01(Math.max(0.35, state.calmness / 100)) }];
  }
  if (state.happiness >= 65) {
    return [{ label: "olumlu", intensity: clamp01(state.happiness / 100) }];
  }
  return [];
}

function compactFacts(observation: WorldEventObservation): string[] {
  const event = observation.event;
  const facts = new Set<string>();
  if (event.proposition?.contentKey) facts.add(event.proposition.contentKey);
  if (event.proposition?.actorKey) facts.add(`actor:${event.proposition.actorKey}`);
  if (event.proposition?.targetKey) facts.add(`target:${event.proposition.targetKey}`);
  if (event.polarity) facts.add(`polarity:${event.polarity}`);
  return [...facts];
}

export function appraiseLivedMemoryCandidate(input: {
  instance: Pick<KairaInstanceContext, "instanceId" | "instanceType">;
  observation: WorldEventObservation;
  dynamicStateAfter: DroitDynamicState;
}): KairaLivedMemoryDecision {
  const instance = resolveKairaInstanceContext(input.instance);
  const policy = instancePolicy(instance.instanceType);
  const observation = input.observation;
  const event = observation.event;

  if (!policy.persistentAutobiography || !policy.canConsolidateCoreMemories) {
    return { status: "skip_ephemeral_instance", score: 0, reasons: ["instance_policy"], memory: null };
  }
  if (!observation.id) {
    return { status: "skip_unpersisted_world_event", score: 0, reasons: ["observation_id_required"], memory: null };
  }
  if (observation.status !== "grounded") {
    return { status: "skip_ambiguous", score: 0, reasons: ["grounded_evidence_required"], memory: null };
  }
  if (observation.kind !== "direct_interaction") {
    return { status: "skip_reported_claim", score: 0, reasons: ["reported_claim_not_lived"], memory: null };
  }
  if (event.temporal?.relation === "past" || event.temporal?.relation === "future") {
    return { status: "skip_nonpresent_claim", score: 0, reasons: ["current_experience_required"], memory: null };
  }
  if (!isKairaParticipant(observation, instance.instanceId)) {
    return { status: "skip_not_self_relevant", score: 0, reasons: ["kaira_not_participant"], memory: null };
  }
  if (event.polarity === "negative") {
    return { status: "skip_negated_event", score: 0, reasons: ["negated_event_not_experienced"], memory: null };
  }

  const eventWeight = EVENT_WEIGHT[event.eventType] ?? 0.04;
  const affect = emotionalImpact(input.dynamicStateAfter);
  const relationship = relationshipImportance(input.dynamicStateAfter);
  const score = clamp01(eventWeight + affect * 0.34 + relationship * 0.24);
  const reasons = [
    `event_weight:${eventWeight.toFixed(2)}`,
    `affect:${affect.toFixed(2)}`,
    `relationship:${relationship.toFixed(2)}`,
  ];

  if (score < 0.55) {
    return { status: "skip_low_salience", score, reasons, memory: null };
  }

  const selfIds = new Set([
    instance.instanceId.toLocaleLowerCase("tr-TR"),
    "kaira",
    "current_kaira",
  ]);
  const memory: KairaAutobiographicalMemory = {
    id: `lived_${observation.id}`,
    origin: "lived",
    occurredAt: observation.createdAt,
    participantIds: [event.actor?.id, event.target?.id]
      .filter((value): value is string => Boolean(value && !selfIds.has(value.toLocaleLowerCase("tr-TR")))),
    eventType: event.eventType,
    facts: compactFacts(observation),
    emotions: memoryEmotions(input.dynamicStateAfter),
    salience: score,
    sensitivity: "ordinary",
    canonical: true,
    sourceWorldObservationIds: [observation.id],
    consolidationKey: `world:${observation.id}`,
  };

  return { status: "consolidate", score, reasons, memory };
}

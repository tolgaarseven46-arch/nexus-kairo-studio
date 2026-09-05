export type KairaMemoryDomain =
  | "self_fact"
  | "autobiographical_memory"
  | "world_event"
  | "claim"
  | "language_style"
  | "relationship_state"
  | "discourse_state";

export type KairaMemoryKind =
  | "self_truth"
  | "world_truth"
  | "evidence"
  | "style"
  | "relational_state"
  | "discourse_state";

export type KairaMemoryPersistence =
  | "durable"
  | "policy_gated"
  | "ephemeral";

export type KairaMemoryMutability =
  | "evidence_revision"
  | "append_only"
  | "derived_support"
  | "bounded_learning"
  | "reducer_state"
  | "recomputed";

export interface KairaMemoryDomainDefinition {
  domain: KairaMemoryDomain;
  authority: string;
  kind: KairaMemoryKind;
  persistence: KairaMemoryPersistence;
  mutability: KairaMemoryMutability;
  recallAuthority: string;
  promotion: "none" | "explicit_grounded_world_event" | "lived_autobiographical_append";
}

/**
 * Declarative architecture registry only. It does not perform retrieval,
 * persistence, promotion, semantic interpretation or response decisions.
 */
export const KAIRA_MEMORY_ONTOLOGY: readonly KairaMemoryDomainDefinition[] = [
  {
    domain: "self_fact",
    authority: "kairaCanonicalIdentityStore",
    kind: "self_truth",
    persistence: "policy_gated",
    mutability: "evidence_revision",
    recallAuthority: "kairaAutobiographicalRecallRuntime",
    promotion: "none",
  },
  {
    domain: "autobiographical_memory",
    authority: "kairaCanonicalIdentityStore",
    kind: "self_truth",
    persistence: "policy_gated",
    mutability: "append_only",
    recallAuthority: "kairaAutobiographicalRecallRuntime",
    promotion: "lived_autobiographical_append",
  },
  {
    domain: "world_event",
    authority: "worldMemory",
    kind: "world_truth",
    persistence: "durable",
    mutability: "append_only",
    recallAuthority: "worldMemory",
    promotion: "none",
  },
  {
    domain: "claim",
    authority: "claimProvenance",
    kind: "evidence",
    persistence: "durable",
    mutability: "derived_support",
    recallAuthority: "claimProvenance",
    promotion: "explicit_grounded_world_event",
  },
  {
    domain: "language_style",
    authority: "kairoLanguageMemory",
    kind: "style",
    persistence: "policy_gated",
    mutability: "bounded_learning",
    recallAuthority: "kairoLanguageMemory",
    promotion: "none",
  },
  {
    domain: "relationship_state",
    authority: "RelationshipReducer",
    kind: "relational_state",
    persistence: "policy_gated",
    mutability: "reducer_state",
    recallAuthority: "KDM relationship state",
    promotion: "none",
  },
  {
    domain: "discourse_state",
    authority: "discourseStateReducer",
    kind: "discourse_state",
    persistence: "ephemeral",
    mutability: "recomputed",
    recallAuthority: "deriveDiscourseState(history,currentTurn)",
    promotion: "none",
  },
] as const;

export function kairaMemoryDomainDefinition(
  domain: KairaMemoryDomain,
): KairaMemoryDomainDefinition {
  const definition = KAIRA_MEMORY_ONTOLOGY.find((item) => item.domain === domain);
  if (!definition) throw new Error(`Unknown Kaira memory domain: ${domain}`);
  return definition;
}

export type KairaContractStatus = "active" | "superseded";

export interface KairaContractVersion {
  id: string;
  version: number;
  status: KairaContractStatus;
  ownerLayer: string;
  consumerLayers: string[];
  summary: string;
  supersedes?: string;
  revisionReason?: string;
}

export const KAIRA_CONTRACT_REGISTRY: readonly KairaContractVersion[] = [
  {
    id: "semantic-event",
    version: 1,
    status: "superseded",
    ownerLayer: "language-understanding",
    consumerLayers: ["world-event", "appraisal"],
    summary: "Open-ended language is reduced to bounded semantic signals without mutating downstream state.",
    revisionReason: "V2 makes social routine and repair subtype canonical semantic signals and explicitly adds dialogue/KDM consumers so downstream layers do not re-parse raw text.",
  },
  {
    id: "semantic-event",
    version: 2,
    status: "active",
    ownerLayer: "language-understanding",
    consumerLayers: ["world-event", "appraisal", "dialogue-decision", "kdm"],
    summary: "Canonical language understanding owns bounded semantic meaning, including socialRoutine and typed repairSignal. Downstream dialogue, appraisal, world-event and KDM consumers must use this event rather than invent a second raw-text interpretation.",
    supersedes: "semantic-event@1",
  },
  {
    id: "dialogue-sequence",
    version: 1,
    status: "active",
    ownerLayer: "dialogue-decision",
    consumerLayers: ["response-plan", "local-verbalizer", "llm-verbalizer", "consistency"],
    summary: "Dialogue decision owns adjacency and sequence interpretation over the supplied canonical SemanticEvent: social-routine completion, reciprocal permission, previous-answer continuation and repair adjacency. It cannot re-parse raw language or reopen behavior forbidden by social-state authority.",
  },
  {
    id: "entity-resolution",
    version: 1,
    status: "active",
    ownerLayer: "entity-resolution",
    consumerLayers: ["world-event", "retrieval"],
    summary: "Speaker/addressee/pronoun/named-person references are resolved conservatively and ambiguity is preserved.",
  },
  {
    id: "canonical-world-event",
    version: 1,
    status: "superseded",
    ownerLayer: "world-event",
    consumerLayers: ["world-model-store", "retrieval", "appraisal"],
    summary: "A canonical event preserves raw evidence, actor/target semantics, epistemic status and bounded certainty.",
    revisionReason: "V2 adds bounded proposition identity, polarity and temporal reference so contradiction/temporal consumers do not re-parse raw language.",
  },
  {
    id: "canonical-world-event",
    version: 2,
    status: "superseded",
    ownerLayer: "world-event",
    consumerLayers: ["world-model-store", "retrieval", "appraisal", "temporal-evidence", "contradiction-resolution"],
    summary: "Canonical events preserve V1 evidence semantics and additionally expose stable proposition identity, polarity and bounded temporal reference.",
    supersedes: "canonical-world-event@1",
    revisionReason: "V3 adds bounded proposition content identity because actor+predicate+target can collapse semantically different events such as separate insult contents.",
  },
  {
    id: "canonical-world-event",
    version: 3,
    status: "active",
    ownerLayer: "world-event",
    consumerLayers: ["world-model-store", "retrieval", "appraisal", "temporal-evidence", "contradiction-resolution", "discourse-context"],
    summary: "Canonical propositions include bounded content identity when available, preventing distinct event contents from collapsing into one proposition while preserving V2 polarity and temporal semantics.",
    supersedes: "canonical-world-event@2",
  },
  {
    id: "event-modality",
    version: 1,
    status: "active",
    ownerLayer: "world-event",
    consumerLayers: ["world-model-store", "retrieval", "response-generation"],
    summary: "Persisted world events distinguish bounded intention, plan, commitment, possibility, desire and refusal semantics without changing proposition identity; plan recall cannot promote weak or negative modality to committed execution.",
  },
  {
    id: "plan-lifecycle",
    version: 1,
    status: "superseded",
    ownerLayer: "world-event",
    consumerLayers: ["world-model-store", "retrieval", "response-generation"],
    summary: "Immutable plan evidence is resolved with later bounded executed, cancelled, postponed or failed signals; historical evidence is preserved and outcome recall never guesses across multiple propositions.",
    revisionReason: "V2 introduces plan generations so outcomes from an older plan cannot close or contaminate a newer plan for the same proposition.",
  },
  {
    id: "plan-lifecycle",
    version: 2,
    status: "active",
    ownerLayer: "world-event",
    consumerLayers: ["world-model-store", "retrieval", "response-generation"],
    summary: "The newest valid plan/commitment/intention starts a fresh immutable generation; only lifecycle signals newer than that generation anchor may resolve its executed, cancelled, postponed or failed state.",
    supersedes: "plan-lifecycle@1",
  },
  {
    id: "world-model-ownership",
    version: 1,
    status: "superseded",
    ownerLayer: "world-model-store",
    consumerLayers: ["retrieval", "future-multi-user-world-model"],
    summary: "Memory ownership is determined by persisted user scope, never by participant names inside an event; cross-user evidence is isolated before retrieval.",
    revisionReason: "V2 partitions ownership by both user and Kaira instance so two Kairas owned by the same account cannot share world evidence accidentally.",
  },
  {
    id: "world-model-ownership",
    version: 2,
    status: "active",
    ownerLayer: "world-model-store",
    consumerLayers: ["retrieval", "temporal-event-graph", "response-generation"],
    summary: "World evidence belongs to the user+Kaira-instance partition; legacy records without instance id belong only to the reference Kaira and cross-instance evidence is rejected before retrieval.",
    supersedes: "world-model-ownership@1",
  },
  {
    id: "instance-state-ownership",
    version: 1,
    status: "active",
    ownerLayer: "instance-context",
    consumerLayers: ["kdm-persistence", "relationship-state", "user-memory", "test-session", "language-memory"],
    summary: "KDM state, relationship state, user-memory projections, language memory, test sessions and caches use a user+Kaira-instance partition key; the reference Kaira retains its legacy user scope for compatibility.",
  },
  {
    id: "instance-provisioning",
    version: 1,
    status: "active",
    ownerLayer: "instance-provisioning",
    consumerLayers: ["product-onboarding", "identity-seed", "assignment"],
    summary: "Welcome Kairas are immediate lightweight onboarding instances with no durable identity/world/relationship memory; Individual Kairas pass ordered identity, knowledge, life-scaffold, validation and assignment stages before becoming ready.",
  },
  {
    id: "identity-memory-truth",
    version: 1,
    status: "active",
    ownerLayer: "identity-model",
    consumerLayers: ["future-autobiographical-memory", "future-self-model", "response-generation"],
    summary: "Self facts, known concepts and autobiographical memories are canonical structured truth; a memory stores facts/emotions/provenance rather than a finished prose narration, and temporary lore fixtures are explicitly non-production data.",
  },
  {
    id: "runtime-identity-projection",
    version: 1,
    status: "active",
    ownerLayer: "runtime-identity",
    consumerLayers: ["llm-verbalizer", "response-generation", "observability"],
    summary: "Resolved instance identity plus configured name/role/type are projected into a bounded runtime self-anchor. The projection may preserve identity continuity but cannot create autobiographical memory, preferences, beliefs, relationship outcomes, emotions or canonical self facts.",
  },
  {
    id: "epistemic-access",
    version: 1,
    status: "active",
    ownerLayer: "epistemic-gate",
    consumerLayers: ["appraisal", "behavior-policy", "response-generation"],
    summary: "Model knowledge and Kaira knowledge are separate concepts. Until real knowledge state is connected, one compatibility gate returns known; future knowledge decisions must plug into this seam rather than scatter checks across layers.",
  },
  {
    id: "world-event-retrieval",
    version: 1,
    status: "superseded",
    ownerLayer: "retrieval",
    consumerLayers: ["response-generation", "temporal-evidence", "contradiction-resolution"],
    summary: "Recall returns a bounded evidence set, not a generated answer; explicit compared people retain coverage.",
    revisionReason: "V2 lets current-state recall use canonical world-model projection while historical recall remains source-evidence-first.",
  },
  {
    id: "world-event-retrieval",
    version: 2,
    status: "active",
    ownerLayer: "retrieval",
    consumerLayers: ["world-model-projection", "response-generation", "temporal-evidence", "contradiction-resolution"],
    summary: "Historical recall preserves bounded source evidence, while explicit current-state queries rank canonical current proposition/lifecycle evidence ahead of stale lexical matches; real contradiction keeps both sides visible instead of synthesizing truth.",
    supersedes: "world-event-retrieval@1",
  },
  {
    id: "temporal-reference-resolution",
    version: 1,
    status: "active",
    ownerLayer: "world-model-store",
    consumerLayers: ["temporal-evidence", "retrieval", "response-generation"],
    summary: "Resolvable relative/explicit time expressions are anchored at observation persistence time into bounded intervals; vague references remain unresolved rather than guessed.",
  },
  {
    id: "relative-temporal-reference",
    version: 1,
    status: "active",
    ownerLayer: "world-event",
    consumerLayers: ["temporal-reference-resolution", "world-model-store", "retrieval"],
    summary: "Measurable offsets resolve against an explicit anchor; previous-event relations remain explicit dependencies until a referenced event interval is supplied.",
  },
  {
    id: "temporal-event-graph",
    version: 1,
    status: "active",
    ownerLayer: "world-model-store",
    consumerLayers: ["retrieval", "temporal-evidence", "future-event-chain-reasoning"],
    summary: "Persisted temporal provenance forms auditable same-session before/after edges; missing, cross-session, self-referential or interval-inconsistent links are rejected instead of inferred.",
  },
  {
    id: "discourse-temporal-anchor",
    version: 1,
    status: "active",
    ownerLayer: "discourse-context",
    consumerLayers: ["temporal-event-graph", "retrieval", "response-generation"],
    summary: "Explicit before/after discourse continuations may use only the unique latest persisted observation in the same session as an implicit anchor; ambiguity or missing provenance yields no guessed anchor.",
  },
  {
    id: "explicit-temporal-event-anchor",
    version: 1,
    status: "active",
    ownerLayer: "discourse-context",
    consumerLayers: ["temporal-event-graph", "retrieval", "response-generation"],
    summary: "Named temporal questions resolve an anchor only from same-session canonical participant names plus bounded canonical event-type markers; multiple matching events remain ambiguous instead of being broken by recency.",
  },
  {
    id: "proposition-temporal-event-anchor",
    version: 2,
    status: "active",
    ownerLayer: "discourse-context",
    consumerLayers: ["temporal-event-graph", "retrieval", "response-generation"],
    summary: "Specific temporal questions resolve anchors from same-session canonical actor, predicate, target, polarity and bounded content identity when present; repeated full propositions remain ambiguous and recency never breaks the tie.",
  },
  {
    id: "temporal-evidence",
    version: 1,
    status: "active",
    ownerLayer: "temporal-evidence",
    consumerLayers: ["retrieval", "response-generation", "contradiction-resolution"],
    summary: "For latest recall, valid timestamps are authoritative; historical evidence and epistemic status are preserved instead of destructively merged.",
  },
  {
    id: "contradiction-evidence",
    version: 1,
    status: "active",
    ownerLayer: "contradiction-resolution",
    consumerLayers: ["retrieval", "world-model-projection", "response-generation"],
    summary: "Opposite explicit polarities for the same canonical proposition are marked conflicting; source observations remain separate and newest evidence is not promoted to verified truth.",
  },
  {
    id: "world-model-projection",
    version: 1,
    status: "active",
    ownerLayer: "world-model-projection",
    consumerLayers: ["retrieval", "response-generation", "future-reasoning-policy"],
    summary: "Immutable world evidence is projected into bounded per-instance proposition state combining contradiction status, latest evidence polarity and current plan lifecycle without deleting or rewriting source observations; conflicting evidence remains conflicting instead of becoming truth by recency.",
  },
  {
    id: "world-state-appraisal",
    version: 1,
    status: "active",
    ownerLayer: "world-state-appraisal",
    consumerLayers: ["response-generation", "consistency", "future-reasoning-policy"],
    summary: "Retrieved canonical world evidence is reduced to read-only epistemic/reasoning permissions. It may constrain response truth posture and qualifiers but cannot mutate relationship, emotion, personality or dynamic state.",
  },
  {
    id: "world-reasoning-policy",
    version: 1,
    status: "active",
    ownerLayer: "world-reasoning-policy",
    consumerLayers: ["response-generation", "consistency", "world-model-response-guard"],
    summary: "Read-only world-state appraisal is converted into bounded response permissions: answer from evidence, preserve conflict, keep reported attribution, or avoid unsupported current-state claims. This policy has no authority over relationship, emotion, personality or dynamic state.",
  },
  {
    id: "relationship-state",
    version: 1,
    status: "active",
    ownerLayer: "appraisal-relationship",
    consumerLayers: ["conversation-authority", "behavior-policy", "speech-identity"],
    summary: "Relationship scores/counters remain bounded and conversationState is the authoritative social state.",
  },
  {
    id: "state-to-behavior",
    version: 1,
    status: "active",
    ownerLayer: "behavior-policy",
    consumerLayers: ["response-plan", "consistency", "future-learned-policy"],
    summary: "Behavior permissions cannot reopen a stricter authoritative relationship state.",
  },
  {
    id: "learned-policy-boundary",
    version: 1,
    status: "active",
    ownerLayer: "behavior-policy",
    consumerLayers: ["future-learned-policy", "response-plan", "consistency"],
    summary: "A learned policy may only preserve or restrict the authoritative BehaviorContract; it cannot mutate relationship state or reopen forbidden behavior.",
  },
  {
    id: "dyadic-language-alignment",
    version: 1,
    status: "active",
    ownerLayer: "language-memory",
    consumerLayers: ["local-verbalizer", "llm-verbalizer", "observability"],
    summary: "Repeated user-specific language evidence may produce a bounded HOW-only alignment signal. It may shape safe markers and response length only after maturity/relationship gates; it cannot create content, intent, emotion, memory facts, relationship outcomes or behavior permissions, and remains subordinate to SpeechIdentity and ResponsePlan.",
  },
  {
    id: "response-plan",
    version: 1,
    status: "active",
    ownerLayer: "response-plan",
    consumerLayers: ["local-verbalizer", "llm-verbalizer", "consistency", "observability"],
    summary: "BehaviorContract permissions, discourse move and HOW-only speech identity are intersected into one bounded response plan. Dialogue and speech may narrow style/shape but can never reopen behavior forbidden by the authoritative social contract.",
  },
  {
    id: "retrieval-to-response",
    version: 1,
    status: "active",
    ownerLayer: "response-generation",
    consumerLayers: ["consistency"],
    summary: "Matching grounded recall evidence is usable memory; reported claims retain their epistemic qualifier.",
  },
] as const;

export function activeContractVersion(id: string): KairaContractVersion | undefined {
  return KAIRA_CONTRACT_REGISTRY.find(
    (contract) => contract.id === id && contract.status === "active",
  );
}

export function validateContractRegistry(): string[] {
  const issues: string[] = [];
  const keys = new Set<string>();
  const activeIds = new Set<string>();

  for (const contract of KAIRA_CONTRACT_REGISTRY) {
    const key = `${contract.id}@${contract.version}`;
    if (keys.has(key)) issues.push(`Duplicate contract version: ${key}`);
    keys.add(key);

    if (contract.status === "active") {
      if (activeIds.has(contract.id)) issues.push(`Multiple active versions: ${contract.id}`);
      activeIds.add(contract.id);
    }

    if (contract.status === "superseded" && !contract.supersedes && !contract.revisionReason) {
      issues.push(`Superseded contract lacks revision metadata: ${key}`);
    }
  }

  return issues;
}

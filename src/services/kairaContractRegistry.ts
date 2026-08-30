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
    status: "active",
    ownerLayer: "language-understanding",
    consumerLayers: ["world-event", "appraisal"],
    summary: "Open-ended language is reduced to bounded semantic signals without mutating downstream state.",
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
    status: "active",
    ownerLayer: "world-event",
    consumerLayers: ["world-model-store", "retrieval", "appraisal", "temporal-evidence", "contradiction-resolution"],
    summary: "Canonical events preserve V1 evidence semantics and additionally expose stable proposition identity, polarity and bounded temporal reference.",
    supersedes: "canonical-world-event@1",
  },
  {
    id: "world-model-ownership",
    version: 1,
    status: "active",
    ownerLayer: "world-model-store",
    consumerLayers: ["retrieval", "future-multi-user-world-model"],
    summary: "Memory ownership is determined by persisted user scope, never by participant names inside an event; cross-user evidence is isolated before retrieval.",
  },
  {
    id: "world-event-retrieval",
    version: 1,
    status: "active",
    ownerLayer: "retrieval",
    consumerLayers: ["response-generation", "temporal-evidence", "contradiction-resolution"],
    summary: "Recall returns a bounded evidence set, not a generated answer; explicit compared people retain coverage.",
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
    consumerLayers: ["retrieval", "response-generation"],
    summary: "Opposite explicit polarities for the same canonical proposition are marked conflicting; source observations remain separate and newest evidence is not promoted to verified truth.",
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
    consumerLayers: ["response-generation", "consistency", "future-learned-policy"],
    summary: "Behavior permissions cannot reopen a stricter authoritative relationship state.",
  },
  {
    id: "learned-policy-boundary",
    version: 1,
    status: "active",
    ownerLayer: "behavior-policy",
    consumerLayers: ["future-learned-policy", "response-generation", "consistency"],
    summary: "A learned policy may only preserve or restrict the authoritative BehaviorContract; it cannot mutate relationship state or reopen forbidden behavior.",
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

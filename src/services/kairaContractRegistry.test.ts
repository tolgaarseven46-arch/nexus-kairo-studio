import { describe, expect, it } from "vitest";
import {
  activeContractVersion,
  KAIRA_CONTRACT_REGISTRY,
  validateContractRegistry,
} from "./kairaContractRegistry";

describe("Kaira contract registry", () => {
  it("contains only one active version per semantic contract", () => {
    expect(validateContractRegistry()).toEqual([]);
  });

  it("keeps the core producer-consumer seams explicitly registered", () => {
    for (const id of [
      "semantic-event",
      "entity-resolution",
      "canonical-world-event",
      "event-modality",
      "plan-lifecycle",
      "world-model-ownership",
      "instance-state-ownership",
      "instance-provisioning",
      "identity-memory-truth",
      "runtime-identity-projection",
      "epistemic-access",
      "world-event-retrieval",
      "temporal-reference-resolution",
      "relative-temporal-reference",
      "temporal-event-graph",
      "discourse-temporal-anchor",
      "explicit-temporal-event-anchor",
      "proposition-temporal-event-anchor",
      "temporal-evidence",
      "contradiction-evidence",
      "world-model-projection",
      "world-state-appraisal",
      "world-reasoning-policy",
      "relationship-state",
      "state-to-behavior",
      "learned-policy-boundary",
      "response-plan",
      "retrieval-to-response",
    ]) {
      expect(activeContractVersion(id)?.status).toBe("active");
    }
  });

  it("activates Canonical World Event v3 after explicit semantic revision", () => {
    expect(activeContractVersion("canonical-world-event")?.version).toBe(3);
    expect(
      KAIRA_CONTRACT_REGISTRY.find(
        (item) => item.id === "canonical-world-event" && item.version === 2,
      )?.status,
    ).toBe("superseded");
  });

  it("activates proposition temporal anchor v2 with content identity", () => {
    expect(activeContractVersion("proposition-temporal-event-anchor")?.version).toBe(2);
  });

  it("registers bounded modality semantics", () => {
    expect(activeContractVersion("event-modality")?.version).toBe(1);
  });

  it("activates generation-aware plan lifecycle v2", () => {
    expect(activeContractVersion("plan-lifecycle")?.version).toBe(2);
    expect(
      KAIRA_CONTRACT_REGISTRY.find(
        (item) => item.id === "plan-lifecycle" && item.version === 1,
      )?.status,
    ).toBe("superseded");
  });

  it("activates user+Kaira world-model ownership v2", () => {
    expect(activeContractVersion("world-model-ownership")?.version).toBe(2);
    expect(
      KAIRA_CONTRACT_REGISTRY.find(
        (item) => item.id === "world-model-ownership" && item.version === 1,
      )?.status,
    ).toBe("superseded");
  });

  it("registers canonical world-model projection as a bounded state seam", () => {
    const projection = activeContractVersion("world-model-projection");
    expect(projection?.version).toBe(1);
    expect(projection?.consumerLayers).toContain("response-generation");
  });

  it("activates projection-aware current-state retrieval v2", () => {
    expect(activeContractVersion("world-event-retrieval")?.version).toBe(2);
    expect(
      KAIRA_CONTRACT_REGISTRY.find(
        (item) => item.id === "world-event-retrieval" && item.version === 1,
      )?.status,
    ).toBe("superseded");
  });

  it("keeps world-state appraisal read-only and outside relationship mutation", () => {
    const appraisal = activeContractVersion("world-state-appraisal");
    expect(appraisal?.version).toBe(1);
    expect(appraisal?.ownerLayer).toBe("world-state-appraisal");
    expect(appraisal?.consumerLayers).toContain("response-generation");
    expect(appraisal?.consumerLayers).not.toContain("relationship-state");
  });

  it("keeps world reasoning policy separate from social-state authority", () => {
    const policy = activeContractVersion("world-reasoning-policy");
    expect(policy?.version).toBe(1);
    expect(policy?.ownerLayer).toBe("world-reasoning-policy");
    expect(policy?.consumerLayers).toContain("response-generation");
    expect(policy?.consumerLayers).not.toContain("relationship-state");
  });

  it("keeps runtime identity bounded away from autobiographical ownership", () => {
    const identity = activeContractVersion("runtime-identity-projection");
    expect(identity?.version).toBe(1);
    expect(identity?.ownerLayer).toBe("runtime-identity");
    expect(identity?.consumerLayers).toContain("llm-verbalizer");
    expect(identity?.consumerLayers).not.toContain("future-autobiographical-memory");
    expect(identity?.consumerLayers).not.toContain("relationship-state");
  });

  it("registers the response plan as the verbalizer/validator behavior seam", () => {
    const plan = activeContractVersion("response-plan");
    expect(plan?.version).toBe(1);
    expect(plan?.ownerLayer).toBe("response-plan");
    expect(plan?.consumerLayers).toContain("local-verbalizer");
    expect(plan?.consumerLayers).toContain("llm-verbalizer");
    expect(plan?.consumerLayers).toContain("consistency");
  });

  it("does not allow anonymous contracts without consumers", () => {
    expect(KAIRA_CONTRACT_REGISTRY.every((item) => item.consumerLayers.length > 0)).toBe(true);
  });
});

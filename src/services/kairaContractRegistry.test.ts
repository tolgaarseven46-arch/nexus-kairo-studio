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
      "relationship-state",
      "state-to-behavior",
      "learned-policy-boundary",
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

  it("does not allow anonymous contracts without consumers", () => {
    expect(KAIRA_CONTRACT_REGISTRY.every((item) => item.consumerLayers.length > 0)).toBe(true);
  });
});

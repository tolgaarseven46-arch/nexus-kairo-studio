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
      "world-model-ownership",
      "world-event-retrieval",
      "temporal-evidence",
      "relationship-state",
      "state-to-behavior",
      "learned-policy-boundary",
      "retrieval-to-response",
    ]) {
      expect(activeContractVersion(id)?.status).toBe("active");
    }
  });

  it("does not allow anonymous contracts without consumers", () => {
    expect(KAIRA_CONTRACT_REGISTRY.every((item) => item.consumerLayers.length > 0)).toBe(true);
  });
});

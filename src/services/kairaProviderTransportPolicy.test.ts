import { describe, expect, it } from "vitest";
import {
  KAIRA_IMPLICIT_PROVIDER_RETRY_LIMIT,
  KAIRA_PROVIDER_DEADLINE_MS,
  kairaProviderFailureMessage,
} from "./kairaProviderTransportPolicy";

describe("kaira provider transport policy", () => {
  it("keeps the server deadline below the client deadline", () => {
    expect(KAIRA_PROVIDER_DEADLINE_MS).toBe(55_000);
    expect(KAIRA_PROVIDER_DEADLINE_MS).toBeLessThan(75_000);
  });

  it("keeps implicit transport retries disabled", () => {
    expect(KAIRA_IMPLICIT_PROVIDER_RETRY_LIMIT).toBe(0);
  });

  it("classifies timeout and empty responses", () => {
    expect(kairaProviderFailureMessage("timeout")).toContain("55");
    expect(kairaProviderFailureMessage("empty_response")).toContain("boş yanıt");
  });
});

import { describe, expect, it } from "vitest";
import {
  KAIRA_CHAT_CLIENT_TIMEOUT_MS,
  kairaChatClientTimeoutMessage,
} from "./kairaChatTransportPolicy";

describe("kaira chat transport policy", () => {
  it("does not discard a provider response at the old 35 second boundary", () => {
    expect(KAIRA_CHAT_CLIENT_TIMEOUT_MS).toBeGreaterThan(35_000);
    expect(KAIRA_CHAT_CLIENT_TIMEOUT_MS).toBe(75_000);
  });

  it("warns against an immediate duplicate resend after an ambiguous timeout", () => {
    const message = kairaChatClientTimeoutMessage();
    expect(message).toContain("75 saniyede");
    expect(message).toContain("aynı mesajı hemen yeniden göndermeyin");
  });
});

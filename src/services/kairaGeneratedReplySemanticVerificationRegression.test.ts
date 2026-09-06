import { beforeEach, describe, expect, it, vi } from "vitest";
import type { KairaResponsePlan } from "./kairaResponsePlan";

const { resolveServerLanguageUnderstanding } = vi.hoisted(() => ({
  resolveServerLanguageUnderstanding: vi.fn(),
}));

vi.mock("./serverLanguageUnderstanding", () => ({
  resolveServerLanguageUnderstanding,
}));

import { resolveGeneratedReplySemanticVerification } from "./kairaGeneratedReplySemanticVerification";

const basePlan = {
  requiredContent: [],
} as unknown as KairaResponsePlan;

beforeEach(() => {
  resolveServerLanguageUnderstanding.mockReset();
});

describe("Kaira generated reply semantic verification", () => {
  it("does not spend a canonical LU verification call when provenance is not required", async () => {
    const result = await resolveGeneratedReplySemanticVerification({
      reply: "selam",
      plan: basePlan,
      preferredProvider: "openrouter",
      generateText: vi.fn(),
    });

    expect(result).toBeNull();
    expect(resolveServerLanguageUnderstanding).not.toHaveBeenCalled();
  });

  it("reuses canonical server LU for grounded-content replies", async () => {
    const interpretation = { schemaVersion: "semantic-interpretation@2", raw: "harbi yandık" };
    resolveServerLanguageUnderstanding.mockResolvedValue({ interpretation });
    const generateText = vi.fn();

    const result = await resolveGeneratedReplySemanticVerification({
      reply: "harbi yandık",
      plan: {
        ...basePlan,
        requiredContent: ["engage_user_content"],
      },
      preferredProvider: "openrouter",
      generateText,
    });

    expect(result).toBe(interpretation);
    expect(resolveServerLanguageUnderstanding).toHaveBeenCalledWith({
      message: "harbi yandık",
      preferredProvider: "openrouter",
      generateText,
    });
  });
});

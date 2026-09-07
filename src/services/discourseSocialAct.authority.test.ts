import { describe, expect, it } from "vitest";
import { classifyUserSocialAct } from "./discourseSocialAct";

describe("discourse user semantic authority", () => {
  const baseEvent = {
    socialRoutine: "none" as const,
    discourseAct: "none" as const,
    intent: "general_chat" as const,
    repairSignal: "none" as const,
    stateAnswerShape: false,
  };

  it("does not recreate agreement semantics from raw user text", () => {
    expect(classifyUserSocialAct(baseEvent, "tamam")).toBe("statement");
    expect(classifyUserSocialAct(baseEvent, "evet")).toBe("statement");
    expect(classifyUserSocialAct(baseEvent, "aynen")).toBe("statement");
  });

  it("accepts agreement only from the canonical event", () => {
    expect(classifyUserSocialAct({ ...baseEvent, socialRoutine: "agreement" }, "başka bir yüzey")).toBe("agreement_ack");
  });
});

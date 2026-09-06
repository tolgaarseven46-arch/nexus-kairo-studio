import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("final delivery enforcement characterization", () => {
  it("must reject a failed final consistency result before user delivery", () => {
    const source = readFileSync(resolve(process.cwd(), "server.ts"), "utf8");
    const consistencyIndex = source.lastIndexOf("const consistency =");
    const sendIndex = source.indexOf("await sendChatPayload({", consistencyIndex);

    expect(consistencyIndex).toBeGreaterThan(-1);
    expect(sendIndex).toBeGreaterThan(consistencyIndex);

    const finalDeliveryWindow = source.slice(consistencyIndex, sendIndex);
    expect(finalDeliveryWindow).toMatch(/if\s*\(\s*!consistency\.accepted\s*\)/u);
  });
});

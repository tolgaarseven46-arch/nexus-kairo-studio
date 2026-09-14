import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const chatServiceSource = readFileSync(new URL("./droitChatService.ts", import.meta.url), "utf8");

describe("compound interaction: text episode and reply interruption", () => {
  it("episode fragments can carry typed interaction context", () => {
    const fragmentBlock = chatServiceSource.split("export interface TextEpisodeFragment")[1]?.split("}")[0] || "";
    expect(fragmentBlock).toContain("interactionContext?: TextInteractionContext");
  });

  it("episode assembly inspects fragment interaction context", () => {
    const assemblyBlock = chatServiceSource.split("function assembleTextEpisode")[1]?.split("export const droitChatService")[0] || "";
    expect(assemblyBlock).toContain("interactionContext");
  });
});

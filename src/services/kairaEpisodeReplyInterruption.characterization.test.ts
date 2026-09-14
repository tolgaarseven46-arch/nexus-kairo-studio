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
    expect(assemblyBlock).toContain("fingerprints.size > 1");
  });

  it("fails closed when one candidate episode crosses a reply or mention context boundary", () => {
    const assemblyBlock = chatServiceSource.split("function assembleTextEpisode")[1]?.split("export const droitChatService")[0] || "";
    expect(assemblyBlock).toContain("split at transport boundary");
    expect(assemblyBlock).toMatch(/throw\s+new\s+Error/u);
  });

  it("forwards the validated episode context to canonical language understanding", () => {
    const sendBlock = chatServiceSource.split("async sendMessage")[1] || "";
    expect(sendBlock).toContain("episodeInteractionContext");
    expect(sendBlock).toMatch(/interactionContext:\s*episodeInteractionContext/u);
  });

  it("keeps legacy top-level messageContext as the fallback when fragments have no context", () => {
    const assemblyBlock = chatServiceSource.split("function assembleTextEpisode")[1]?.split("export const droitChatService")[0] || "";
    expect(assemblyBlock).toContain("fragmentContext ?? interactionContext");
  });
});

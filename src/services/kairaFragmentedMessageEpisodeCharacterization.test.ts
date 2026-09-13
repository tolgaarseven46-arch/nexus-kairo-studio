import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const chatServiceSource = readFileSync(
  new URL("./droitChatService.ts", import.meta.url),
  "utf8",
);

/**
 * Characterization only.
 *
 * Discord-style users often send one thought as several consecutive messages:
 *   "yarın işten"
 *   "istifa etmeyi düşünüyorum"
 *
 * Those transport messages must be eligible to become one bounded text episode
 * before canonical language understanding runs. This test intentionally does
 * not choose a debounce/settle-window duration; timing is adapter policy, not
 * semantic authority.
 */
describe("fragmented-message text episode boundary", () => {
  it("chat input has a typed episode contract capable of carrying ordered message fragments", () => {
    expect(chatServiceSource).toMatch(/interface\s+TextEpisodeFragment\b/u);
    expect(chatServiceSource).toMatch(/interface\s+TextEpisodeInput\b/u);
    expect(chatServiceSource).toMatch(
      /interface\s+TextEpisodeInput[\s\S]*fragments\s*:\s*TextEpisodeFragment\[\]/u,
    );
    expect(chatServiceSource).toMatch(
      /interface\s+TextEpisodeFragment[\s\S]*text\s*:\s*string/u,
    );
  });

  it("sendMessage can receive an assembled text episode without inventing a second semantic authority", () => {
    expect(chatServiceSource).toMatch(
      /interface\s+SendKairoChatOptions[\s\S]*textEpisode\??\s*:\s*TextEpisodeInput/u,
    );
  });

  it("canonical language understanding consumes episode text rather than the raw transport message", () => {
    expect(chatServiceSource).not.toMatch(
      /requestCanonicalLanguageUnderstanding\(\{[\s\S]{0,600}?message:\s*userMessage\s*,/u,
    );
    expect(chatServiceSource).toMatch(
      /requestCanonicalLanguageUnderstanding\(\{[\s\S]{0,600}?message:\s*(?:episodeText|assembledEpisodeText|textEpisodeText)\s*,/u,
    );
  });
});

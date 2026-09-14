import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const chatServiceSource = readFileSync(
  new URL("./droitChatService.ts", import.meta.url),
  "utf8",
);
const languageUnderstandingSource = readFileSync(
  new URL("./clientLanguageUnderstanding.ts", import.meta.url),
  "utf8",
);

/**
 * Characterization only.
 *
 * On Discord-style transports, reply target and mentions are already known as
 * structured platform metadata. Canonical language understanding must receive
 * that metadata explicitly instead of reconstructing identity from `@name`
 * text or losing the reply target before semantic interpretation.
 */
describe("reply and mention metadata boundary", () => {
  it("language-understanding input exposes typed reply and mention references with stable ids", () => {
    expect(languageUnderstandingSource).toMatch(/interface\s+TextReplyReference\b/u);
    expect(languageUnderstandingSource).toMatch(
      /interface\s+TextReplyReference[\s\S]*messageId\s*:\s*string[\s\S]*authorId\s*:\s*string/u,
    );
    expect(languageUnderstandingSource).toMatch(/interface\s+TextMentionReference\b/u);
    expect(languageUnderstandingSource).toMatch(
      /interface\s+TextMentionReference[\s\S]*entityId\s*:\s*string/u,
    );
    expect(languageUnderstandingSource).toMatch(/interface\s+TextInteractionContext\b/u);
    expect(languageUnderstandingSource).toMatch(
      /interface\s+TextInteractionContext[\s\S]*replyTo\??\s*:\s*TextReplyReference[\s\S]*mentions\??\s*:\s*TextMentionReference\[\]/u,
    );
  });

  it("chat send options can carry transport metadata without embedding it into user text", () => {
    expect(chatServiceSource).toMatch(
      /interface\s+SendKairoChatOptions[\s\S]*messageContext\??\s*:\s*TextInteractionContext/u,
    );
  });

  it("canonical language understanding receives the typed context alongside message text", () => {
    expect(languageUnderstandingSource).toMatch(
      /requestCanonicalLanguageUnderstanding\([\s\S]*interactionContext\??\s*:\s*TextInteractionContext/u,
    );
    expect(chatServiceSource).toMatch(
      /requestCanonicalLanguageUnderstanding\(\{[\s\S]{0,800}?interactionContext\s*:\s*(?:episodeInteractionContext|(?:options\.)?messageContext)/u,
    );
  });

  it("client transport forwards context structurally rather than concatenating metadata into userMessage", () => {
    expect(languageUnderstandingSource).toMatch(
      /JSON\.stringify\(\{[\s\S]*interactionContext\s*:\s*input\.interactionContext/u,
    );
    expect(languageUnderstandingSource).not.toMatch(
      /userMessage\s*:\s*`[^`]*(?:replyTo|mentions|interactionContext)[^`]*`/u,
    );
  });
});

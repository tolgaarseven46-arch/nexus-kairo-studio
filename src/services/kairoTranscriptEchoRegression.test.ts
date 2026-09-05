import { describe, expect, it } from "vitest";
import { findKairoTranscriptEchoIssues, sanitizeKairoReplyText } from "./kairoConversationGrounding";

describe("Kaira internal transcript echo regression", () => {
  it("rejects a full internal user+Kaira transcript echo from the real-chat failure", () => {
    const reply = "[Mert]: çok saçmalıyorsun [Kaira → Mert]: hoşuna gitmiyorsa yazma o zaman he";
    expect(findKairoTranscriptEchoIssues(reply)).toContain("internal_transcript_wrapper_echo");
  });

  it("rejects generic participant-prefixed transport syntax without hard-coding a name", () => {
    expect(findKairoTranscriptEchoIssues("[Ayşe]: tamam [Kairo → Ayşe]: peki")).toContain(
      "internal_transcript_wrapper_echo",
    );
  });

  it("still strips the ordinary leading Kaira label when no transcript is echoed", () => {
    expect(sanitizeKairoReplyText("[Kairo → Mert]: tamamdır")).toBe("tamamdır");
    expect(findKairoTranscriptEchoIssues(sanitizeKairoReplyText("[Kairo → Mert]: tamamdır"))).toEqual([]);
  });

  it("does not reject normal bracket use that is not internal speaker transport", () => {
    expect(findKairoTranscriptEchoIssues("bugün [bence] sakin geçer")).toEqual([]);
    expect(findKairoTranscriptEchoIssues("tamam, mesajı aldım")).toEqual([]);
  });
});

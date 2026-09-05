from pathlib import Path

# 1) Add structural transcript-echo validator next to the formatter that defines
# the internal bracketed role syntax.
p = Path('src/services/kairoConversationGrounding.ts')
s = p.read_text()
anchor = '''export function sanitizeKairoReplyText(reply: string): string {
  return String(reply || "")
    .replace(
      /^\\s*(?:\\[\\s*Ka[iİıI]r[ao](?:\\s*→\\s*[^\\]]+)?\\s*\\]|Ka[iİıI]r[ao](?:\\s*→\\s*[^:]+)?):\\s*/iu,
      "",
    )
    .trim();
}
'''
addition = anchor + '''
const INTERNAL_TRANSCRIPT_PREFIX_RE = /^\\s*\\[[^\\]\\n]{1,80}\\]\\s*:\\s*/u;
const INTERNAL_KAIRA_TRANSCRIPT_RE = /\\[\\s*Ka[iİıI]r[ao]\\s*→\\s*[^\\]\\n]{1,80}\\]\\s*:/iu;

/**
 * Detects model echoes of the internal history-board serialization.
 *
 * The bracketed speaker labels are prompt scaffolding, not user-facing prose.
 * This checker does not decide WHAT Kaira should say; it only rejects leakage
 * of the formatter's own transport syntax so normal generation repair can own
 * recovery.
 */
export function findKairoTranscriptEchoIssues(reply: string): string[] {
  const text = String(reply ?? "").trim();
  if (!text) return [];
  if (INTERNAL_TRANSCRIPT_PREFIX_RE.test(text) || INTERNAL_KAIRA_TRANSCRIPT_RE.test(text)) {
    return ["internal_transcript_wrapper_echo"];
  }
  return [];
}
'''
assert anchor in s
s = s.replace(anchor, addition, 1)
p.write_text(s)

# 2) Wire the validator into both initial and repaired final-delivery checks.
p = Path('server.ts')
s = p.read_text()
s = s.replace(
  '  findKairoGroundingIssues,\n  formatKairoHistoryForModel,',
  '  findKairoGroundingIssues,\n  findKairoTranscriptEchoIssues,\n  formatKairoHistoryForModel,',
  1,
)
old = '''          additionalIssueFinder: (candidateReply) => [
            ...findKairoGroundingIssues(candidateReply, cleanHistory, userMessage),
            ...findDialogueAttributionIssues(candidateReply, cleanHistory, userMessage, userName, dialogueAnalysis),
'''
new = '''          additionalIssueFinder: (candidateReply) => [
            ...findKairoTranscriptEchoIssues(candidateReply),
            ...findKairoGroundingIssues(candidateReply, cleanHistory, userMessage),
            ...findDialogueAttributionIssues(candidateReply, cleanHistory, userMessage, userName, dialogueAnalysis),
'''
assert old in s
s = s.replace(old, new, 1)
old = '''        const repairedIssues = [
          ...findKairoGroundingIssues(repairedReply, cleanHistory, userMessage),
          ...findDialogueAttributionIssues(
'''
new = '''        const repairedIssues = [
          ...findKairoTranscriptEchoIssues(repairedReply),
          ...findKairoGroundingIssues(repairedReply, cleanHistory, userMessage),
          ...findDialogueAttributionIssues(
'''
assert old in s
s = s.replace(old, new, 1)
p.write_text(s)

# 3) Regression tests exercise generic transport syntax, not one participant name.
Path('src/services/kairoTranscriptEchoRegression.test.ts').write_text(r'''import { describe, expect, it } from "vitest";
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
''')

# 4) Architecture record documents the boundary and why stripping is unsafe.
Path('docs/adr/0021-final-transcript-transport-non-leakage.md').write_text('''# ADR-0021: Internal transcript transport syntax cannot reach final delivery

## Status
Accepted

## Context
A fresh 15-turn production chat after PR #83 produced a user-facing reply containing the internal prompt serialization verbatim: `[Mert]: ... [Kaira → Mert]: ...`. The history formatter intentionally uses bracketed speaker labels to preserve participant attribution for the model. Existing reply sanitization only removes a leading Kaira label; when the model echoes a user-labeled transcript segment first, that transport scaffolding survives and is accepted by final consistency.

Blindly stripping all labels is unsafe because the echoed user message could then be delivered as if Kaira had said it.

## Decision
Keep the internal attribution format. Add a deterministic structural conformance check at the canonical final-delivery boundary that rejects replies containing the formatter's transcript-wrapper syntax. It does not choose reply content or behavior; it only detects leakage of internal transport framing and lets the existing generation repair/fallback pipeline recover.

The check is generic over participant names. It rejects a leading bracketed speaker transport label or an embedded internal `Kaira/Kairo → participant` wrapper, while ordinary bracket usage remains valid.

## Consequences
- Prompt attribution scaffolding remains available to the generator.
- Internal transcript wrappers cannot be exposed as user-facing chat text.
- Recovery remains owned by the existing DialogueDecision → ResponsePlan → Realizer pipeline; no canned reply or string-rewrite authority is introduced.
- Future internal serialization formats must add equivalent non-leakage coverage if their syntax changes.
''')

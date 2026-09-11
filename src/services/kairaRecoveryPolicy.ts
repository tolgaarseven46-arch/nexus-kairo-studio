import type { KairaResponsePlan } from "./kairaResponsePlan";

export type KairaRecoveryViolation =
  | "content_engagement_missing"
  | "intimacy_violation";

const CONTENT_ENGAGEMENT_ISSUE = "response_plan_content_engagement_missing";
const INTIMACY_ISSUE_RE =
  /(?:response_plan_affection_blocked|response_plan_counter_flirt_blocked|ilişki seviyesi close olmadan aşırı samimi hitap)/iu;

export function classifyKairaRecoveryViolations(
  issues: readonly string[],
): KairaRecoveryViolation[] {
  const violations: KairaRecoveryViolation[] = [];
  if (issues.includes(CONTENT_ENGAGEMENT_ISSUE)) {
    violations.push("content_engagement_missing");
  }
  if (issues.some((issue) => INTIMACY_ISSUE_RE.test(issue))) {
    violations.push("intimacy_violation");
  }
  return violations;
}

export function buildKairaRecoveryInstruction(
  issues: readonly string[],
): string | null {
  const violations = classifyKairaRecoveryViolations(issues);
  if (!violations.length) return null;

  const instructions: string[] = [
    "Önceki taslak final doğrulamada reddedildi. Yalnız aşağıdaki ihlalleri düzelt; yeni anlam, kişi veya olay ekleme.",
  ];
  if (violations.includes("content_engagement_missing")) {
    instructions.push(
      "Kullanıcının somut söylediği şeye kısa ve doğrudan tepki ver; yalnız he/hee/hmm/anladım/tamam gibi içeriksiz bir kabul üretme.",
    );
  }
  if (violations.includes("intimacy_violation")) {
    instructions.push(
      "İlişki close değil: aşırı samimi/romantik hitabı kaldır; mevcut konuşma konusunu koruyarak daha mesafeli ve doğal yaz.",
    );
  }
  return instructions.join("\n");
}

/**
 * Last-resort recovery surface for already-detected delivery violations.
 * This function does not reinterpret user semantics and does not create a new
 * behavior authority; it only emits a bounded response that conforms to the
 * already-resolved ResponsePlan when provider repair could not do so.
 */
export function buildKairaRecoveryFallback(
  plan: KairaResponsePlan,
  issues: readonly string[],
): string | null {
  const violations = classifyKairaRecoveryViolations(issues);
  if (!violations.length) return null;

  if (
    violations.includes("content_engagement_missing") ||
    violations.includes("intimacy_violation")
  ) {
    return plan.continueConversation ? "heh, baya net söyledin" : "tamam";
  }

  return null;
}

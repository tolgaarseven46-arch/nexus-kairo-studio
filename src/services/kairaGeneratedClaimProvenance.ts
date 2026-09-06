import type {
  SemanticInterpretation,
  SemanticWorldMemoryClaim,
} from "../types/semanticInterpretation";
import type { KairaResponsePlan } from "./kairaResponsePlan";

export const UNSUPPORTED_GENERATED_CLAIM_ISSUE =
  "response_plan_unsupported_generated_claim" as const;

function claimKey(claim: SemanticWorldMemoryClaim): string {
  return `${claim.subjectId}::${claim.attributeKey}::${JSON.stringify(claim.value)}`;
}

function evidenceClaims(
  interpretations: SemanticInterpretation[],
): SemanticWorldMemoryClaim[] {
  return interpretations.flatMap((item) => item.worldMemory?.claims ?? []);
}

/**
 * Verifies generated factual/conversational claims against canonical semantic
 * evidence. It does not parse text and does not create a second semantic
 * authority; both candidate and evidence are SemanticInterpretation@2 outputs.
 *
 * This guard is intentionally narrow: it only activates for response plans that
 * require grounded content engagement. Pure social wording with no generated
 * world-memory claims remains untouched.
 */
export function findGeneratedClaimProvenanceIssues(input: {
  plan: KairaResponsePlan;
  replyInterpretation?: SemanticInterpretation | null;
  evidenceInterpretations?: SemanticInterpretation[];
}): string[] {
  if (!input.plan.requiredContent?.includes("engage_user_content")) return [];
  const generated = input.replyInterpretation?.worldMemory?.claims ?? [];
  if (!generated.length) return [];

  const supported = new Set(
    evidenceClaims(input.evidenceInterpretations ?? []).map(claimKey),
  );
  const unsupported = generated.filter((claim) => !supported.has(claimKey(claim)));
  return unsupported.length ? [UNSUPPORTED_GENERATED_CLAIM_ISSUE] : [];
}

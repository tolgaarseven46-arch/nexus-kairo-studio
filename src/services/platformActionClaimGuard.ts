import type { PlatformActionResultV1 } from "../integrations/privatroom/platformContracts";

export type PlatformActionLifecycleStage =
  | "proposed"
  | "approval_pending"
  | "approved_pending_execution"
  | "executed"
  | "rejected"
  | "failed";

export function platformActionLifecycleStage(
  result?: PlatformActionResultV1 | null,
): PlatformActionLifecycleStage {
  if (!result) return "proposed";
  switch (result.status) {
    case "approval_required":
      return "approval_pending";
    case "executed":
      return "executed";
    case "rejected":
      return "rejected";
    case "failed":
      return "failed";
    default:
      return "proposed";
  }
}

export function canAssertPlatformActionExecuted(
  actionId: string,
  results: PlatformActionResultV1[],
): boolean {
  return results.some(
    (result) => result.actionId === actionId && result.status === "executed",
  );
}

export function assertPlatformActionExecutionClaim(
  actionId: string,
  results: PlatformActionResultV1[],
): void {
  if (!canAssertPlatformActionExecuted(actionId, results)) {
    throw new Error("platform_action_execution_claim_without_receipt");
  }
}

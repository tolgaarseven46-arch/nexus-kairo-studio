import {
  PRIVATROOM_PLATFORM_CONTRACT_VERSION,
  type PlatformActionFeasibilityRequestV1,
  type PlatformActionFeasibilityResultV1,
  type PlatformCapabilityGrant,
} from "../integrations/kaira/platformContracts";

export interface ResolveKairaActionFeasibilityInput {
  request: PlatformActionFeasibilityRequestV1;
  grants: PlatformCapabilityGrant[];
  checkedAt: number;
}

function scopeMatches(
  grant: PlatformCapabilityGrant,
  request: PlatformActionFeasibilityRequestV1,
): boolean {
  if (grant.scope.serverId !== request.serverId) return false;
  if (grant.scope.roomId === undefined) return true;
  return grant.scope.roomId === request.roomId;
}

export function resolveKairaActionFeasibility({
  request,
  grants,
  checkedAt,
}: ResolveKairaActionFeasibilityInput): PlatformActionFeasibilityResultV1 {
  const matchingGrant = grants.find((grant) => {
    if (grant.capability !== request.requestedCapability) return false;
    if (!scopeMatches(grant, request)) return false;
    if (grant.expiresAt !== undefined && grant.expiresAt <= checkedAt) return false;
    return true;
  });

  if (!matchingGrant) {
    return {
      contractVersion: PRIVATROOM_PLATFORM_CONTRACT_VERSION,
      requestId: request.requestId,
      intentId: request.intentId,
      requestedCapability: request.requestedCapability,
      status: "denied",
      checkedAt,
      reason: "no_active_scoped_grant",
    };
  }

  const status =
    matchingGrant.mode === "direct"
      ? "allowed"
      : matchingGrant.mode === "owner_approval"
        ? "approval_required"
        : "propose_only";

  return {
    contractVersion: PRIVATROOM_PLATFORM_CONTRACT_VERSION,
    requestId: request.requestId,
    intentId: request.intentId,
    requestedCapability: request.requestedCapability,
    status,
    matchedGrantId: matchingGrant.grantId,
    mode: matchingGrant.mode,
    constraints: matchingGrant.constraints,
    checkedAt,
  };
}

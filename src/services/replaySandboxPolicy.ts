export const REPLAY_SANDBOX_POLICY_VERSION = 1 as const;

export type ReplayEffect =
  | "frozen_context.read"
  | "frozen_capability.read"
  | "frozen_rules.read"
  | "frozen_feature_flags.read"
  | "frozen_policy_config.read"
  | "kaira.compute"
  | "replay_knt.write"
  | "replay_memory.write"
  | "replay_relationship.write"
  | "simulated_action.execute"
  | "live_platform.fetch"
  | "live_platform.mutate"
  | "live_trial.write"
  | "production_knt.write"
  | "production_memory.write"
  | "production_relationship.write"
  | "analytics.emit"
  | "webhook.emit"
  | "external_integration.call";

const REPLAY_ALLOWLIST: ReadonlySet<ReplayEffect> = new Set([
  "frozen_context.read",
  "frozen_capability.read",
  "frozen_rules.read",
  "frozen_feature_flags.read",
  "frozen_policy_config.read",
  "kaira.compute",
  "replay_knt.write",
  "replay_memory.write",
  "replay_relationship.write",
  "simulated_action.execute",
]);

export interface ReplaySandboxDecision {
  policyVersion: typeof REPLAY_SANDBOX_POLICY_VERSION;
  effect: ReplayEffect;
  allowed: boolean;
  reason: "explicit_allowlist" | "default_deny";
}

export function evaluateReplayEffect(effect: ReplayEffect): ReplaySandboxDecision {
  const allowed = REPLAY_ALLOWLIST.has(effect);
  return {
    policyVersion: REPLAY_SANDBOX_POLICY_VERSION,
    effect,
    allowed,
    reason: allowed ? "explicit_allowlist" : "default_deny",
  };
}

export function assertReplayEffectAllowed(effect: ReplayEffect): void {
  const decision = evaluateReplayEffect(effect);
  if (!decision.allowed) {
    throw new Error(`replay_sandbox_denied:${effect}`);
  }
}

export function replayAllowedEffects(): ReplayEffect[] {
  return [...REPLAY_ALLOWLIST];
}

import type {
  BehaviorIntegrationResult,
  IntegratedBehaviorDecision,
} from "./behaviorIntegrationEngine";

export const BEHAVIOR_POLICY_SCHEMA_VERSION = "behavior-policy@1" as const;
export const CLIENT_BEHAVIOR_POLICY_SOURCE = "client_behavior_integration" as const;

export interface BehaviorPolicyInput {
  schemaVersion: typeof BEHAVIOR_POLICY_SCHEMA_VERSION;
  source: typeof CLIENT_BEHAVIOR_POLICY_SOURCE;
  decision: IntegratedBehaviorDecision;
  pressures?: BehaviorIntegrationResult["pressures"];
}

const PRIORITIES = new Set<IntegratedBehaviorDecision["priority"]>([
  "boundary",
  "values",
  "relationship",
  "goal",
  "preference",
  "expression",
]);
const STANCES = new Set<IntegratedBehaviorDecision["stance"]>([
  "warm",
  "neutral",
  "firm",
  "distant",
  "disengage",
]);
const LENGTHS = new Set<IntegratedBehaviorDecision["responseLength"]>([
  "short",
  "medium",
  "long",
]);

const finite01 = (value: unknown, fallback = 0) => {
  const number = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.max(0, Math.min(1, number));
};

const bool = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

export function createClientBehaviorPolicy(
  decision: IntegratedBehaviorDecision,
  pressures?: BehaviorIntegrationResult["pressures"],
): BehaviorPolicyInput {
  return {
    schemaVersion: BEHAVIOR_POLICY_SCHEMA_VERSION,
    source: CLIENT_BEHAVIOR_POLICY_SOURCE,
    decision,
    ...(pressures ? { pressures } : {}),
  };
}

export function normalizeBehaviorPolicyInput(value: unknown): BehaviorPolicyInput | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, any>;
  if (raw.schemaVersion !== BEHAVIOR_POLICY_SCHEMA_VERSION) return undefined;
  if (raw.source !== CLIENT_BEHAVIOR_POLICY_SOURCE) return undefined;
  if (!raw.decision || typeof raw.decision !== "object") return undefined;

  const decision = raw.decision as Record<string, any>;
  const priority = PRIORITIES.has(decision.priority) ? decision.priority : "expression";
  const stance = STANCES.has(decision.stance) ? decision.stance : "neutral";
  const responseLength = LENGTHS.has(decision.responseLength) ? decision.responseLength : "medium";

  const normalizedDecision: IntegratedBehaviorDecision = {
    priority,
    continueConversation: bool(decision.continueConversation, true),
    humorAllowed: bool(decision.humorAllowed, true),
    askQuestion: bool(decision.askQuestion, true),
    acknowledgeComplaint: bool(decision.acknowledgeComplaint, false),
    repairAllowed: bool(decision.repairAllowed, true),
    stance,
    responseLength,
    directness: finite01(decision.directness, 0.5),
    warmth: finite01(decision.warmth, 0.5),
    distance: finite01(decision.distance, 0),
    explanation: Array.isArray(decision.explanation)
      ? decision.explanation.filter((item): item is string => typeof item === "string").slice(0, 12)
      : [],
  };

  const pressures = raw.pressures && typeof raw.pressures === "object"
    ? {
        boundary: finite01(raw.pressures.boundary),
        values: finite01(raw.pressures.values),
        relationship: finite01(raw.pressures.relationship),
        approach: finite01(raw.pressures.approach),
        withdrawal: finite01(raw.pressures.withdrawal),
        engagement: finite01(raw.pressures.engagement),
        humor: finite01(raw.pressures.humor),
      }
    : undefined;

  return {
    schemaVersion: BEHAVIOR_POLICY_SCHEMA_VERSION,
    source: CLIENT_BEHAVIOR_POLICY_SOURCE,
    decision: normalizedDecision,
    ...(pressures ? { pressures } : {}),
  };
}

import type {
  BehaviorIntegrationResult,
  IntegratedBehaviorDecision,
} from "./behaviorIntegrationEngine";
import type { ExpressionStyleResponse } from "./expressionStyleEngine";

export const BEHAVIOR_POLICY_SCHEMA_VERSION = "behavior-policy@1" as const;
export const CLIENT_BEHAVIOR_POLICY_SOURCE = "client_behavior_integration" as const;

export interface ExpressionStylePolicyHints {
  humorMode: ExpressionStyleResponse["humor"]["dominantMode"];
  informality: number;
  emotionalDisplay: number;
}

export interface BehaviorPolicyInput {
  schemaVersion: typeof BEHAVIOR_POLICY_SCHEMA_VERSION;
  source: typeof CLIENT_BEHAVIOR_POLICY_SOURCE;
  decision: IntegratedBehaviorDecision;
  pressures?: BehaviorIntegrationResult["pressures"];
  expressionStyle?: ExpressionStylePolicyHints;
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
const HUMOR_MODES = new Set<Exclude<ExpressionStyleResponse["humor"]["dominantMode"], null>>([
  "absurd",
  "irony",
  "sarcasm",
  "dark",
  "affiliative",
  "aggressive",
  "selfDirected",
  "wordplay",
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
  expressionStyle?: ExpressionStyleResponse,
): BehaviorPolicyInput {
  return {
    schemaVersion: BEHAVIOR_POLICY_SCHEMA_VERSION,
    source: CLIENT_BEHAVIOR_POLICY_SOURCE,
    decision,
    ...(pressures ? { pressures } : {}),
    ...(expressionStyle
      ? {
          expressionStyle: {
            humorMode: expressionStyle.humor.dominantMode,
            informality: finite01(expressionStyle.speech.informality, 0.5),
            emotionalDisplay: finite01(expressionStyle.speech.emotionalDisplay, 0.5),
          },
        }
      : {}),
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

  const rawExpressionStyle = raw.expressionStyle && typeof raw.expressionStyle === "object"
    ? raw.expressionStyle as Record<string, any>
    : undefined;
  const rawHumorMode = rawExpressionStyle?.humorMode;
  const expressionStyle: ExpressionStylePolicyHints | undefined = rawExpressionStyle
    ? {
        humorMode: rawHumorMode === null || HUMOR_MODES.has(rawHumorMode) ? rawHumorMode : null,
        informality: finite01(rawExpressionStyle.informality, 0.5),
        emotionalDisplay: finite01(rawExpressionStyle.emotionalDisplay, 0.5),
      }
    : undefined;

  return {
    schemaVersion: BEHAVIOR_POLICY_SCHEMA_VERSION,
    source: CLIENT_BEHAVIOR_POLICY_SOURCE,
    decision: normalizedDecision,
    ...(pressures ? { pressures } : {}),
    ...(expressionStyle ? { expressionStyle } : {}),
  };
}

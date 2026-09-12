export const RELATIONSHIP_SEVERE_EVENT_POLICY = {
  coercionMinSeverity: 0.9,
  privacyMinSeverity: 0.9,
  minSincerityConfidence: 0.9,
  maxUncertainty: 0.1,
  maxJokingConfidence: 0.1,
  minConflictDelta: 8,
  minHurtDelta: 12,
} as const;

export type NexusTab = 'KARAKTER' | 'TEST' | 'IC_SISTEMLER' | 'AYARLAR';

export interface RelationshipState {
  firstSeenAt?: string;
  lastInteractionAt?: string;
  interactionCount?: number;
  familiarityDays?: number;
  warmth?: number;
  warmthScore?: number;
  warmthLabel?: string;
  note?: string;
  trust?: number;
  trustScore?: number;
  positiveEvents?: number;
  negativeEvents?: number;
  conflictScore?: number;
  hurtScore?: number;
  repairProgress?: number;
  toleranceMultiplier?: number;
  lastConflictAt?: string;
  repeatedNegativeCount?: number;
  lastNegativePattern?: string;
  lastNegativePatternAt?: string;
}

export interface ReasoningTrace {
  whoSent: { userName: string; isNewUser: boolean; recognitionText: string; };
  relationship: { warmthScore: number; warmthLabel: string; note: string; familiarityDays?: number; interactionCount?: number; toleranceMultiplier?: number; trustScore?: number; conflictScore?: number; hurtScore?: number; repairProgress?: number; repeatedNegativeCount?: number; };
  currentMood: { moodText: string; reasonText: string; };
  messageInterpretation: { intent: string; sentiment: string; explanation: string; };
  decision: { chosenTone: string; explanation: string; };
  memoryUpdate: { warmthBefore: number; warmthAfter: number; warmthDelta: number; moodChange: string; reason: string; };
}

export type DroitWorkspaceType = 'PERSONALITY' | 'PHYSICAL' | 'EXPRESSIONS' | 'BEHAVIOR' | 'SPEECH' | 'MEMORY';
export type DroitExpressionId = 'NEUTRAL' | 'HAPPY' | 'PLAYFUL' | 'SAD' | 'ANGRY' | 'SURPRISED' | 'THINKING' | 'CONFUSED';
export interface DroitAvatarSettings { zoom: number; positionX: number; positionY: number; }
export interface DroitExpressionAsset { id?: string; characterId: string; expressionId: DroitExpressionId; name: string; storagePath?: string; downloadURL: string; imageDataUrl?: string; avatarSettings?: DroitAvatarSettings; uploaded: boolean; fileType?: string; fileSize?: number; updatedAt?: string; }
export type DroitAssetCategory = 'face' | 'eyes' | 'hair' | 'clothing' | 'accessory';
export interface DroitPhysicalAsset { id: string; characterId: string; category: DroitAssetCategory; name: string; storagePath?: string; downloadURL: string; createdAt: string; isActive?: boolean; fileType?: string; fileSize?: number; }
export interface DroitAppearanceBinding { faceAssetId?: string | null; eyesAssetId?: string | null; hairAssetId?: string | null; clothingAssetId?: string | null; accessoryAssetId?: string | null; }
export interface DroitPhysicalAppearance { face: { mainFace: string; faceShape: string; }; eyes: { eyeColor: string; eyeType: string; }; hair: { style: string; color: string; }; clothing: { outfit: string; style: string; }; accessories: { item: string; }; }
export interface StructuredDroitPersonality { emotional: { anger: number; patience: number; empathy: number; sensitivity: number; }; social: { socialIntelligence: number; confidence: number; humor: number; communication: number; charisma: number; }; cognitive: { curiosity: number; analyticalThinking: number; creativity: number; decisionMaking: number; attention: number; }; character: { authority: number; courage: number; seriousness: number; loyalty: number; initiative: number; }; }
export interface DroitPersonalityTraits { anger: number; patience: number; empathy: number; emotionalSensitivity: number; socialIntelligence: number; selfConfidence: number; humor: number; communication: number; charisma: number; curiosity: number; analyticalThinking: number; creativity: number; decisionMaking: number; attention: number; authority: number; courage: number; seriousness: number; loyalty: number; initiative: number; trust?: number; analytical?: number; [key: string]: number | undefined; }
export interface DynamicStateDelta { anger?: number; stress?: number; calmness?: number; confidence?: number; happiness?: number; surprise?: number; }
export interface LastEventReaction { eventTitle: string; reactionText: string; deltas: { label: string; key: string; value: number; }[]; }
export interface DroitDynamicState { calmness: number; anger: number; stress: number; happiness: number; confidence: number; surprise: number; lastStatus: string; lastEvent?: LastEventReaction; relationship?: RelationshipState; }
export type DroitExpressionMode = 'NEUTRAL' | 'FOCUSED' | 'ALERT' | 'CALM' | 'ANALYTICAL' | 'FRIENDLY' | 'CONFIDENT';
export interface TestMessage { id: string; sender: 'user' | 'droit'; text: string; timestamp: string; moodEffect?: string; participantId?: string; participantName?: string; replyToParticipantId?: string; replyToParticipantName?: string; }
export interface DroitStudioData { id: string; codeName: string; name: string; title: string; personality: DroitPersonalityTraits; dynamicState: DroitDynamicState; expression: DroitExpressionMode; }

export interface TestSessionTurnRecord {
  id?: string;
  turnId: string;
  turnNumber: number;
  sessionId: string;
  timestamp: string;
  userMessage: string;
  assistantReply: string;
  speaker: string;
  intent: string;
  detectedEmotion: string;
  reasoningTrace?: ReasoningTrace;
  kdmResult?: {
    chosenTone?: string;
    explanation?: string;
    score?: number;
    decision?: unknown;
  };
  activationValues?: {
    calmness?: number;
    anger?: number;
    stress?: number;
    happiness?: number;
    confidence?: number;
    surprise?: number;
    deltas?: Array<{ label: string; key: string; value: number }>;
  };
  dynamicStateBefore?: DroitDynamicState;
  dynamicStateAfter?: DroitDynamicState;
  relationshipState?: RelationshipState | Record<string, unknown>;
  retrievedMemories?: unknown[];
  memoryUpdate?: {
    warmthBefore: number;
    warmthAfter: number;
    warmthDelta: number;
    moodChange: string;
    reason: string;
  };
  consistency?: {
    accepted?: boolean;
    score?: number;
    issues?: string[];
    warnings?: string[];
  };
  metadata?: {
    providerUsed?: string;
    model?: string;
    timings?: Record<string, number>;
    speechIdentity?: unknown;
  };
}

export interface TestSessionSummary {
  sessionId: string;
  userId: string;
  userName: string;
  characterId: string;
  createdAt: string;
  updatedAt: string;
  turnCount: number;
  lastUserMessage?: string;
  lastAssistantReply?: string;
  dynamicState?: DroitDynamicState;
  relationship?: RelationshipState;
  active?: boolean;
}

export interface RestoredTestSession {
  session: TestSessionSummary;
  summary: TestSessionSummary;
  turns: TestSessionTurnRecord[];
  messages: TestMessage[];
  lastDynamicState?: DroitDynamicState;
  lastReasoningTrace?: ReasoningTrace;
  lastConsistency?: any;
  lastTimings?: any;
  lastProviderUsed?: string;
}

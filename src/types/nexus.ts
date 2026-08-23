export type NexusTab = 'KARAKTER' | 'TEST' | 'BEYIN' | 'BEYİN' | 'AYARLAR' | 'KAIRO';

export interface ReasoningTrace {
  whoSent: {
    userName: string;
    isNewUser: boolean;
    recognitionText: string;
  };
  relationship: {
    warmthScore: number;
    warmthLabel: string;
    note: string;
  };
  currentMood: {
    moodText: string;
    reasonText: string;
  };
  messageInterpretation: {
    intent: string;
    sentiment: string;
    explanation: string;
  };
  decision: {
    chosenTone: string;
    explanation: string;
  };
  memoryUpdate: {
    warmthBefore: number;
    warmthAfter: number;
    warmthDelta: number;
    moodChange: string;
    reason: string;
  };
}

export type DroitWorkspaceType =
  | 'PERSONALITY'
  | 'PHYSICAL'
  | 'EXPRESSIONS'
  | 'BEHAVIOR'
  | 'SPEECH'
  | 'MEMORY';

export type DroitExpressionId =
  | 'NEUTRAL'
  | 'HAPPY'
  | 'PLAYFUL'
  | 'SAD'
  | 'ANGRY'
  | 'SURPRISED'
  | 'THINKING'
  | 'CONFUSED';

export interface DroitAvatarSettings {
  zoom: number; // e.g. 1.0 (0.5 to 3.0)
  positionX: number; // -50% to +50%
  positionY: number; // -50% to +50%
}

export interface DroitExpressionAsset {
  id?: string;
  characterId: string;
  expressionId: DroitExpressionId;
  name: string;
  storagePath?: string;
  downloadURL: string;
  imageDataUrl?: string;
  avatarSettings?: DroitAvatarSettings;
  uploaded: boolean;
  fileType?: string;
  fileSize?: number;
  updatedAt?: string;
}

export type DroitAssetCategory = 'face' | 'eyes' | 'hair' | 'clothing' | 'accessory';

export interface DroitPhysicalAsset {
  id: string;
  characterId: string;
  category: DroitAssetCategory;
  name: string;
  storagePath?: string;
  downloadURL: string;
  createdAt: string;
  isActive?: boolean;
  fileType?: string;
  fileSize?: number;
}

export interface DroitAppearanceBinding {
  faceAssetId?: string | null;
  eyesAssetId?: string | null;
  hairAssetId?: string | null;
  clothingAssetId?: string | null;
  accessoryAssetId?: string | null;
}

export interface DroitPhysicalAppearance {
  face: {
    mainFace: string;
    faceShape: string;
  };
  eyes: {
    eyeColor: string;
    eyeType: string;
  };
  hair: {
    style: string;
    color: string;
  };
  clothing: {
    outfit: string;
    style: string;
  };
  accessories: {
    item: string;
  };
}


export interface StructuredDroitPersonality {
  emotional: {
    anger: number;
    patience: number;
    empathy: number;
    sensitivity: number;
  };
  social: {
    socialIntelligence: number;
    confidence: number;
    humor: number;
    communication: number;
    charisma: number;
  };
  cognitive: {
    curiosity: number;
    analyticalThinking: number;
    creativity: number;
    decisionMaking: number;
    attention: number;
  };
  character: {
    authority: number;
    courage: number;
    seriousness: number;
    loyalty: number;
    initiative: number;
  };
}

export interface DroitPersonalityTraits {
  // DUYGUSAL
  anger: number;                // Sinirlilik (0 - 100)
  patience: number;             // Sabır (0 - 100)
  empathy: number;              // Empati (0 - 100)
  emotionalSensitivity: number; // Duygusal Hassasiyet (0 - 100)

  // SOSYAL
  socialIntelligence: number;   // Sosyal Zekâ (0 - 100)
  selfConfidence: number;       // Özgüven (0 - 100)
  humor: number;                // Mizah (0 - 100)
  communication: number;        // İletişim (0 - 100)
  charisma: number;             // Karizma (0 - 100)

  // ZİHİNSEL
  curiosity: number;            // Merak (0 - 100)
  analyticalThinking: number;   // Analitik Düşünme (0 - 100)
  creativity: number;           // Yaratıcılık (0 - 100)
  decisionMaking: number;       // Karar Verme (0 - 100)
  attention: number;            // Dikkat (0 - 100)

  // KARAKTER
  authority: number;            // Otorite (0 - 100)
  courage: number;              // Cesaret (0 - 100)
  seriousness: number;          // Ciddiyet (0 - 100)
  loyalty: number;              // Sadakat (0 - 100)
  initiative: number;           // İnisiyatif (0 - 100)

  // Optional legacy / fallback keys
  trust?: number;
  analytical?: number;
  [key: string]: number | undefined;
}

export interface DynamicStateDelta {
  anger?: number;
  stress?: number;
  calmness?: number;
  confidence?: number;
  happiness?: number;
  surprise?: number;
}

export interface LastEventReaction {
  eventTitle: string;    // "Kullanıcı kuralları ihlal etti."
  reactionText: string;  // "Hafif rahatsızlık gösterdi."
  deltas: {
    label: string;
    key: string;
    value: number; // e.g. +8, +3, -5
  }[];
}

export interface DroitDynamicState {
  calmness: number;    // Sakinlik (0 - 100)
  anger: number;       // Öfke (0 - 100)
  stress: number;      // Stres (0 - 100)
  happiness: number;   // Mutluluk (0 - 100)
  confidence: number;  // Güven (0 - 100)
  surprise: number;    // Şaşkınlık (0 - 100)
  lastStatus: string;  // Mevcut ruh hali (e.g. "Sakin ve kontrollü")
  lastEvent?: LastEventReaction;
}

export type DroitExpressionMode =
  | 'NEUTRAL'
  | 'FOCUSED'
  | 'ALERT'
  | 'CALM'
  | 'ANALYTICAL'
  | 'FRIENDLY'
  | 'CONFIDENT';

export interface TestMessage {
  id: string;
  sender: 'user' | 'droit';
  text: string;
  timestamp: string;
  moodEffect?: string;
}

export interface DroitStudioData {
  id: string;
  codeName: string;
  name: string;
  title: string;
  personality: DroitPersonalityTraits;
  dynamicState: DroitDynamicState;
  expression: DroitExpressionMode;
}

export type RaceStatus = 'Active' | 'Draft' | 'Archived';

export interface Race {
  id: string;
  name: string;
  description: string;
  status: RaceStatus;
  createdAt: string; // ISO 8601 string
  updatedAt: string; // ISO 8601 string
  characterCount?: number;
}

export type CharacterStatus = 'Active' | 'Draft' | 'Standby' | 'Archived';

export interface CustomTrait {
  id: string;
  name: string;
  value?: number; // 0 - 100
  description?: string;
}

export interface ExpressionItem {
  id: string;
  emoji: string;
  label: string;
  isCustom?: boolean;
}

export interface AbilityItem {
  id: string;
  name: string;
  category?: string;
  enabled: boolean;
  isCustom?: boolean;
}

export interface TaskItem {
  id: string;
  title: string;
  priority: 'Düşük' | 'Orta' | 'Yüksek' | 'Kritik';
  description?: string;
  enabled?: boolean;
}

export interface RestrictionItem {
  id: string;
  text: string;
  severity?: 'Kesin Yasak' | 'Yönetici Onayı Gerekir' | 'Uyarı Verilir';
}

// 1. FİZİK KATMANI (Physical Layer)
export interface DroitPhysical {
  raceId?: string;
  raceName?: string;
  bodyScale?: string; // 'Kompakt' | 'Standart' | 'Ağır Zırhlı' | 'Devriye'
  bodyType?: string; // 'Biyonik Çerçeve' | 'Sentetik İnsansı' | 'Mekanik Çekirdek' | 'Siber Droit' | 'Kuantum Rezonatör'
  material?: string; // 'Karbon Fiber' | 'Titanyum Alaşım' | 'Mat Polimer' | 'Sıvı Metal' | 'Seramik Zırh'
  cyberPattern?: string; // 'Devre Hatları' | 'Dikey Matris' | 'Minimal Işıma' | 'Hex Izgara'
  faceShape?: string; // 'Keskin Hatlı' | 'Oval Sentetik' | 'Zırhlı Kask' | 'Çift Katman'
  visorType?: string; // 'Geniş Bant HUD' | 'Çift Optik Lens' | 'T-Vizör' | 'Minimal Sensör' | 'Monokl'
  mouthType?: string; // 'Siber Dalgaformu' | 'Titreşen LED Matrisi' | 'İnsansı Sentetik' | 'Kapalı Koruma Plakası'
  eyeColor?: string; // 'Cyan' | 'Kehribar' | 'Zümrüt Yeşili' | 'Safir Mavisi' | 'Kızıl Kırmızı' | 'Ametist Moru' | 'Buz Beyazı'
  eyeGlow?: number; // 0 - 100
  eyeType?: string; // 'Neon Çember' | 'Siber Nokta' | 'Fotonik Halka' | 'Holografik İris'
  primaryColor?: string; // e.g. '#0f172a' or 'Koyu Grafit'
  secondaryColor?: string; // e.g. '#334155' or 'Titanyum Gümüş'
  accentColor?: string; // e.g. '#06b6d4' or 'Elektrik Cyan'
  outfitStyle?: string; // 'Taktik Zırh' | 'Siber Pelerin' | 'Subay Üniforması' | 'Laboratuvar Cübbesi' | 'Minimal Şasi'
  accessories?: string[]; // ['Omuzluk Kalkanı', 'HUD Vizör Lensi', 'Harici Soğutucu', 'Anten Dizisi', 'Güç Pelerini']
  animationStance?: string; // 'Nöbet / Tetikte' | 'Rahat / Dengeli' | 'Dinamik / Taktiksel' | 'Meditatif'
  idlePulseSpeed?: string; // 'Sakin (Yavaş)' | 'Standart Nabız' | 'Yüksek Hızlı Tarama'
  avatarSeed: string;
}

// 2. BEYİN KATMANI (Brain / Personality & Mentality Layer)
export interface DroitBrain {
  personalityScores?: Partial<DroitPersonality>;
  situationalResponses?: {
    conflict?: string;
    insult?: string;
    joke?: string;
    error?: string;
    apology?: string;
    threat?: string;
    injustice?: string;
    [key: string]: string | undefined;
  };
  coreDirective?: string;
  speakingTone?: string;
  memoryDepth?: string;
  adaptationSpeed?: string;
  confidentialityLevel?: string;
  values?: string[];
}

export interface DroitPersonality {
  seriousness: number; // Ciddiyet (0 - 100)
  humor: number; // Mizah (0 - 100)
  patience: number; // Sabır (0 - 100)
  empathy: number; // Empati (0 - 100)
  authority: number; // Otorite (0 - 100)
  curiosity: number; // Merak (0 - 100)
  sociability: number; // Sosyallik (0 - 100)
  trust: number; // Güven (0 - 100)
  sensitivity: number; // Duyarlılık (0 - 100)
  decisiveness: number; // Kararlılık (0 - 100)
  customTraits: CustomTrait[];
}

export interface DroitBehavior {
  situationalResponses: {
    conflict: string; // Çatışma
    insult: string; // Hakaret
    joke: string; // Şaka
    error: string; // Hata
    apology: string; // Özür
    threat: string; // Tehdit
    injustice: string; // Haksızlık
  };
  speechStyle?: string;
  conflictApproach?: string;
  userRelationship?: string;
  values?: string[]; // Değerler
  rules?: string[]; // Ek kurallar
  boundaries?: string[]; // Ek sınırlar
}

export interface DroitMemory {
  shortTermLimit: number; // Kısa süreli bellek boyutu (ör. 100 mesaj)
  episodicMemoryEnabled: boolean; // Epizodik hafıza
  priorityLevel?: string; // 'Standart' | 'Yüksek Öncelikli' | 'Kritik Sistemler'
  retentionPolicy: string; // 'Kalıcı' | '30 Gün' | 'Oturum Boyunca'
  keyKnowledgeTags?: string[];
  priorityMoments?: string[];
  interactionLogEnabled?: boolean;
}

// 3. GÖREV KATMANI (Mission / Roles & Permissions Layer)
export interface DroitMission {
  category?: string;
  roleTitle?: string;
  hierarchyLevel?: string;
  deploymentZone?: string;
  accessPermissions?: string[];
  primaryTasks?: string[];
}

export interface DroitRole {
  title: string; // e.g. "Sunucu Yöneticisi"
  rank?: string;
  description?: string;
}

export interface DroitCategory {
  name: string; // e.g. "Yönetim"
  customCategories?: string[];
}

// ANA DROIT / KARAKTER VARLIĞI
export interface Character {
  id: string;
  name: string;
  status: CharacterStatus;
  createdAt: string; // ISO 8601 string
  updatedAt: string; // ISO 8601 string

  // 1. FİZİK
  physical: DroitPhysical;

  // 2. BEYİN
  personality: DroitPersonality;
  behavior: DroitBehavior;
  memory: DroitMemory;
  values: string[];
  brain?: DroitBrain;

  // 3. GÖREV
  role: DroitRole;
  category: DroitCategory;
  permissions: AbilityItem[];
  tasks: TaskItem[];
  restrictions: RestrictionItem[];
  mission?: DroitMission;

  // Yüz İfadeleri
  expressions: ExpressionItem[];
  currentExpression: string;

  // Geriye dönük uyumluluk alanları (Fallback alias getters)
  raceId?: string;
  raceName?: string;
  shortDescription?: string;
  avatarSeed?: string;
  roleTitle?: string;
  personalityScores?: Partial<DroitPersonality>;
  abilityPermissions?: AbilityItem[];
}

export type NavigationSection =
  | 'create-droit'
  | 'droits'
  | 'test-lab'
  | 'settings'
  | 'dashboard'
  | 'characters'
  | 'races'
  | 'personalities'
  | 'knowledge'
  | 'abilities'
  | 'ai'
  | 'logs'
  | 'studio';

export type CharacterTab =
  | 'specification'
  | 'overview'
  | 'knowledge'
  | 'memory'
  | 'ai'
  | 'logs';

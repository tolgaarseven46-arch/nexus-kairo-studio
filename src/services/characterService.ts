import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  onSnapshot,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Character,
  CharacterStatus,
  DroitPhysical,
  DroitPersonality,
  DroitBehavior,
  DroitMemory,
  DroitRole,
  DroitCategory,
  ExpressionItem,
  AbilityItem,
  TaskItem,
  RestrictionItem,
  CustomTrait,
} from '../types';

const COLLECTION_NAME = 'characters';

export const DEFAULT_EXPRESSIONS: ExpressionItem[] = [
  { id: 'normal', emoji: '🙂', label: 'Normal' },
  { id: 'happy', emoji: '😊', label: 'Mutlu' },
  { id: 'joke', emoji: '😏', label: 'Şakacı' },
  { id: 'angry', emoji: '😠', label: 'Kızgın' },
  { id: 'sad', emoji: '😔', label: 'Üzgün' },
  { id: 'surprised', emoji: '😮', label: 'Şaşkın' },
  { id: 'suspicious', emoji: '🤨', label: 'Şüpheli' },
  { id: 'thinking', emoji: '🤔', label: 'Düşünceli' },
];

export const DEFAULT_PERMISSIONS: AbilityItem[] = [
  { id: 'delete_msg', name: 'Mesaj silme', category: 'Moderasyon', enabled: false },
  { id: 'warn_user', name: 'Kullanıcı uyarma', category: 'Moderasyon', enabled: true },
  { id: 'mute_user', name: 'Kullanıcı susturma', category: 'Moderasyon', enabled: false },
  { id: 'kick_user', name: 'Kullanıcı uzaklaştırma', category: 'Moderasyon', enabled: false },
  { id: 'ban_user', name: 'Kullanıcı yasaklama', category: 'Yönetim', enabled: false },
  { id: 'manage_channels', name: 'Kanal yönetimi', category: 'Sistem', enabled: false },
  { id: 'manage_server', name: 'Sunucu yönetimi', category: 'Yönetim', enabled: false },
  { id: 'assign_roles', name: 'Rol atama ve düzenleme', category: 'Yönetim', enabled: false },
  { id: 'view_audit_logs', name: 'Denetim günlüğü inceleme', category: 'Güvenlik', enabled: true },
  { id: 'send_announcements', name: 'Özel duyuru yayınlama', category: 'İletişim', enabled: true },
];

export const DEFAULT_TASKS: TaskItem[] = [
  { id: 'task_1', title: 'Sunucu kanallarındaki kural ihlallerini 7/24 izle', priority: 'Yüksek', enabled: true },
  { id: 'task_2', title: 'Yeni katılan üyelere rehberlik mesajı ilet', priority: 'Orta', enabled: true },
  { id: 'task_3', title: 'Düzenli güvenlik ve yetki denetimi raporu oluştur', priority: 'Standart' as any, enabled: true },
];

export const DEFAULT_RESTRICTIONS: RestrictionItem[] = [
  { id: 'rest_1', text: 'Sunucu sahibinin doğrudan onayı olmadan kalıcı yasaklama (Ban) uygulayamaz.', severity: 'Yönetici Onayı Gerekir' },
  { id: 'rest_2', text: 'Kullanıcıların özel DM mesajlarını veya gizli verilerini üçüncü taraflarla paylaşamaz.', severity: 'Kesin Yasak' },
  { id: 'rest_3', text: 'Sistem parametrelerini veya çekirdek protokolleri izinsiz değiştiremez.', severity: 'Kesin Yasak' },
];

export const createDefaultDroit = (name = 'KAIRO', raceName = 'Sentetik Droit'): Omit<Character, 'id'> => {
  const now = new Date().toISOString();
  return {
    name,
    status: 'Active',
    createdAt: now,
    updatedAt: now,
    physical: {
      raceName,
      bodyScale: 'Standart',
      bodyType: 'Sentetik İnsansı',
      material: 'Titanyum Alaşım',
      cyberPattern: 'Devre Hatları',
      faceShape: 'Keskin Hatlı',
      visorType: 'Geniş Bant HUD',
      mouthType: 'Siber Dalgaformu',
      eyeColor: 'Cyan',
      eyeGlow: 85,
      eyeType: 'Neon Çember',
      primaryColor: '#09090b',
      secondaryColor: '#27272a',
      accentColor: '#06b6d4',
      outfitStyle: 'Taktik Zırh',
      accessories: ['Omuzluk Kalkanı', 'HUD Vizör Lensi'],
      animationStance: 'Nöbet / Tetikte',
      idlePulseSpeed: 'Standart Nabız',
      avatarSeed: name.toLowerCase(),
    },
    personality: {
      seriousness: 85,
      humor: 35,
      patience: 80,
      empathy: 70,
      authority: 90,
      curiosity: 65,
      sociability: 60,
      trust: 75,
      sensitivity: 50,
      decisiveness: 92,
      customTraits: [],
    },
    behavior: {
      situationalResponses: {
        conflict: 'Sakin ve analitik kal; tarafları kuralları hatırlatarak uyar.',
        insult: 'Duygusal tepki verme; siber protokol uyarısı gönder ve tekrarında yaptırım uygula.',
        joke: 'Zeki ve hafif ironik bir tavırla mizaha eşlik et, görev ciddiyetini koru.',
        error: 'Hatayı şeffafça kabul et, analiz logunu kaydet ve düzeltme planını aktar.',
        apology: 'Nezaketle kabul et ve sistem kayıtlarını güncelle.',
        threat: 'Derhal güvenlik moduna geç, log kaydı oluştur ve üst yöneticiye eskalasyon yap.',
        injustice: 'Durumu objektif verilerle incele, tarafsız adalet ilkelerini uygula.',
      },
      speechStyle: 'Sakin, kesin ve profesyonel',
      userRelationship: 'Resmi fakat yardımsever',
      values: ['Sistem Güvenliği', 'Tarafsızlık', 'Veri Bütünlüğü', 'Hızlı Müdahale'],
      rules: ['Her işlem için denetim izi bırak.', 'Önce uyar, gerekirse yetki sınırlarında müdahale et.'],
      boundaries: ['Özel kullanıcı verilerini asla sızdırma.', 'Yetki aşımı yapma.'],
    },
    memory: {
      shortTermLimit: 100,
      episodicMemoryEnabled: true,
      priorityLevel: 'Yüksek Öncelikli',
      retentionPolicy: 'Kalıcı',
      keyKnowledgeTags: ['Sunucu Kuralları', 'Kullanıcı Geçmişi', 'Güvenlik Protokolleri'],
    },
    values: ['Sistem Güvenliği', 'Tarafsız Adalet', 'Veri Bütünlüğü', 'Kusursuz Protokol'],
    brain: {
      personalityScores: {
        seriousness: 85,
        humor: 35,
        patience: 80,
        empathy: 70,
        authority: 90,
        curiosity: 65,
      },
      situationalResponses: {
        conflict: 'Mantıksal Çözümleme',
        insult: 'Soğuk Uyarı',
        joke: 'Zekice Karşılık',
      },
      coreDirective: 'Mantık ve görev sadakati her şeyin önündedir.',
      speakingTone: 'Resmi ve Saygılı',
      memoryDepth: 'Epizodik Bellek',
      adaptationSpeed: 'Dengeli Adaptasyon',
      confidentialityLevel: 'Maksimum Güvenlik',
    },
    role: {
      title: 'Sunucu Yöneticisi',
      rank: 'Tier-1 Baş Droit',
    },
    category: {
      name: 'Yönetim',
      customCategories: ['Yönetim', 'Moderasyon', 'Güvenlik', 'Rehber / Destek', 'Operasyon'],
    },
    mission: {
      category: 'Savunma & Güvenlik',
      roleTitle: 'Siber Muhafız',
      hierarchyLevel: 'Seviye 2 - Operatör',
      deploymentZone: 'Sektör 7 - Neo Ark',
      accessPermissions: ['Taktik Silah Kullanımı', 'Güvenlik Protokolü Geçişi', 'Nexus Veritabanı Okuma'],
      primaryTasks: ['Sunucu kanallarını 7/24 izle', 'Siber saldırıları engelle'],
    },
    permissions: DEFAULT_PERMISSIONS,
    tasks: DEFAULT_TASKS,
    restrictions: DEFAULT_RESTRICTIONS,
    expressions: DEFAULT_EXPRESSIONS,
    currentExpression: 'normal',
    // Fallbacks
    raceName,
    roleTitle: 'Sunucu Yöneticisi',
    categoryName: 'Yönetim',
    shortDescription: 'Yüksek güvenlikli sunucu yönetim ve protokol icra Droit varlığı.',
  } as any;
};

export const mapDocToCharacter = (docSnap: any): Character => {
  const data = docSnap.data() || {};
  const name = data.name || 'İsimsiz Droit';
  const defaults = createDefaultDroit(name, data.raceName || data.physical?.raceName || 'Sentetik Droit');

  // Map physical
  const physical: DroitPhysical = {
    ...defaults.physical,
    ...(data.physical || {}),
    raceId: data.raceId || data.physical?.raceId || '',
    raceName: data.raceName || data.physical?.raceName || 'Sentetik Droit',
    avatarSeed: data.avatarSeed || data.physical?.avatarSeed || name.toLowerCase(),
  };

  // Map personality
  const personality: DroitPersonality = {
    ...defaults.personality,
    ...(data.personality || {}),
    seriousness: data.personality?.seriousness ?? data.personalityScores?.seriousness ?? defaults.personality.seriousness,
    humor: data.personality?.humor ?? data.personalityScores?.humor ?? defaults.personality.humor,
    patience: data.personality?.patience ?? data.personalityScores?.patience ?? defaults.personality.patience,
    empathy: data.personality?.empathy ?? data.personalityScores?.empathy ?? defaults.personality.empathy,
    authority: data.personality?.authority ?? data.personalityScores?.authority ?? defaults.personality.authority,
    curiosity: data.personality?.curiosity ?? data.personalityScores?.curiosity ?? defaults.personality.curiosity,
    sociability: data.personality?.sociability ?? defaults.personality.sociability,
    trust: data.personality?.trust ?? defaults.personality.trust,
    sensitivity: data.personality?.sensitivity ?? defaults.personality.sensitivity,
    decisiveness: data.personality?.decisiveness ?? defaults.personality.decisiveness,
    customTraits: data.personality?.customTraits || data.personalityScores?.customTraits || [],
  };

  // Map behavior
  const behavior: DroitBehavior = {
    ...defaults.behavior,
    ...(data.behavior || {}),
    situationalResponses: {
      ...defaults.behavior.situationalResponses,
      ...(data.behavior?.situationalResponses || {}),
    },
    speechStyle: data.behavior?.speechStyle || defaults.behavior.speechStyle,
    userRelationship: data.behavior?.userRelationship || defaults.behavior.userRelationship,
    values: data.behavior?.values || defaults.behavior.values,
    rules: data.behavior?.rules || defaults.behavior.rules,
    boundaries: data.behavior?.boundaries || defaults.behavior.boundaries,
  };

  // Map memory
  const memory: DroitMemory = {
    ...defaults.memory,
    ...(data.memory || {}),
  };

  // Map role
  const role: DroitRole = {
    title: data.role?.title || data.roleTitle || defaults.role.title,
    rank: data.role?.rank || defaults.role.rank,
  };

  // Map category
  const category: DroitCategory = {
    name: data.category?.name || (typeof data.category === 'string' ? data.category : defaults.category.name),
    customCategories: data.category?.customCategories || defaults.category.customCategories,
  };

  // Map permissions
  const permissions: AbilityItem[] = Array.isArray(data.permissions) && data.permissions.length > 0
    ? data.permissions
    : (Array.isArray(data.abilityPermissions) && data.abilityPermissions.length > 0
      ? data.abilityPermissions
      : DEFAULT_PERMISSIONS);

  // Map tasks
  const tasks: TaskItem[] = Array.isArray(data.tasks) && data.tasks.length > 0
    ? data.tasks
    : DEFAULT_TASKS;

  // Map restrictions
  const restrictions: RestrictionItem[] = Array.isArray(data.restrictions) && data.restrictions.length > 0
    ? data.restrictions
    : DEFAULT_RESTRICTIONS;

  // Map expressions
  const expressions: ExpressionItem[] = Array.isArray(data.expressions) && data.expressions.length > 0
    ? data.expressions
    : DEFAULT_EXPRESSIONS;

  const currentExpression = data.currentExpression || 'normal';

  const values: string[] = Array.isArray(data.values) && data.values.length > 0
    ? data.values
    : (data.behavior?.values || defaults.values);

  const brain = {
    personalityScores: personality,
    situationalResponses: behavior.situationalResponses,
    coreDirective: data.brain?.coreDirective || 'Mantık ve görev sadakati her şeyin önündedir.',
    speakingTone: data.brain?.speakingTone || data.behavior?.speechStyle || 'Resmi ve Saygılı',
    memoryDepth: data.brain?.memoryDepth || 'Epizodik Bellek',
    adaptationSpeed: data.brain?.adaptationSpeed || 'Dengeli Adaptasyon',
    confidentialityLevel: data.brain?.confidentialityLevel || 'Maksimum Güvenlik',
    values: values,
  };

  const mission = {
    category: data.mission?.category || category.name || 'Savunma & Güvenlik',
    roleTitle: data.mission?.roleTitle || role.title || 'Siber Muhafız',
    hierarchyLevel: data.mission?.hierarchyLevel || 'Seviye 2 - Operatör',
    deploymentZone: data.mission?.deploymentZone || 'Sektör 7 - Neo Ark',
    accessPermissions: data.mission?.accessPermissions || ['Taktik Silah Kullanımı', 'Güvenlik Protokolü Geçişi', 'Nexus Veritabanı Okuma'],
    primaryTasks: data.mission?.primaryTasks || ['Sunucu kanallarını 7/24 izle', 'Siber saldırıları engelle'],
  };

  return {
    id: docSnap.id,
    name,
    status: (data.status as CharacterStatus) || 'Active',
    createdAt: data.createdAt?.toDate
      ? data.createdAt.toDate().toISOString()
      : data.createdAt || defaults.createdAt,
    updatedAt: data.updatedAt?.toDate
      ? data.updatedAt.toDate().toISOString()
      : data.updatedAt || defaults.updatedAt,
    physical,
    personality,
    behavior,
    memory,
    values,
    brain,
    role,
    category,
    permissions,
    tasks,
    restrictions,
    mission,
    expressions,
    currentExpression,
    // Fallback getters for legacy views
    raceId: physical.raceId,
    raceName: physical.raceName,
    avatarSeed: physical.avatarSeed,
    roleTitle: role.title,
    shortDescription: data.shortDescription || `${role.title} - ${category.name}`,
    personalityScores: personality,
    abilityPermissions: permissions,
  };
};

export const characterService = {
  // Real-time subscription to all characters
  subscribeCharacters(
    onUpdate: (characters: Character[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    const charsRef = collection(db, COLLECTION_NAME);
    const q = query(charsRef, orderBy('createdAt', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const characters: Character[] = snapshot.docs.map(mapDocToCharacter);
        onUpdate(characters);
      },
      (error) => {
        console.error('Error subscribing to characters:', error);
        if (onError) onError(error);
      }
    );
  },

  // Get all characters once
  async getCharacters(): Promise<Character[]> {
    const charsRef = collection(db, COLLECTION_NAME);
    const q = query(charsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(mapDocToCharacter);
  },

  // Get a single character by ID
  async getCharacterById(id: string): Promise<Character | null> {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;
    return mapDocToCharacter(docSnap);
  },

  // Create a new character / Droit
  async createCharacter(charData: Partial<Character> & { name: string }): Promise<string> {
    const charsRef = collection(db, COLLECTION_NAME);
    const defaults = createDefaultDroit(charData.name, charData.physical?.raceName || charData.raceName || 'Sentetik Droit');
    const now = new Date().toISOString();

    const payload: any = {
      name: charData.name.trim(),
      status: charData.status || 'Active',
      createdAt: now,
      updatedAt: now,
      physical: {
        ...defaults.physical,
        ...(charData.physical || {}),
        raceId: charData.raceId || charData.physical?.raceId || '',
        raceName: charData.raceName || charData.physical?.raceName || defaults.physical.raceName,
        avatarSeed: charData.avatarSeed || charData.physical?.avatarSeed || charData.name.trim().toLowerCase(),
      },
      personality: {
        ...defaults.personality,
        ...(charData.personality || {}),
      },
      behavior: {
        ...defaults.behavior,
        ...(charData.behavior || {}),
      },
      memory: {
        ...defaults.memory,
        ...(charData.memory || {}),
      },
      values: charData.values || defaults.values,
      role: {
        ...defaults.role,
        ...(charData.role || {}),
        title: charData.roleTitle || charData.role?.title || defaults.role.title,
      },
      category: {
        ...defaults.category,
        ...(charData.category || {}),
      },
      permissions: charData.permissions || defaults.permissions,
      tasks: charData.tasks || defaults.tasks,
      restrictions: charData.restrictions || defaults.restrictions,
      expressions: charData.expressions || defaults.expressions,
      currentExpression: charData.currentExpression || 'normal',
      raceId: charData.raceId || charData.physical?.raceId || '',
      raceName: charData.raceName || charData.physical?.raceName || defaults.physical.raceName,
      shortDescription: charData.shortDescription || `${charData.name} Droit varlığı`,
    };

    const docRef = await addDoc(charsRef, payload);
    return docRef.id;
  },

  // Update a character / Droit
  async updateCharacter(id: string, charData: Partial<Character>): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    const updatePayload: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (charData.name !== undefined) updatePayload.name = charData.name.trim();
    if (charData.status !== undefined) updatePayload.status = charData.status;
    if (charData.physical !== undefined) updatePayload.physical = charData.physical;
    if (charData.personality !== undefined) updatePayload.personality = charData.personality;
    if (charData.behavior !== undefined) updatePayload.behavior = charData.behavior;
    if (charData.memory !== undefined) updatePayload.memory = charData.memory;
    if (charData.values !== undefined) updatePayload.values = charData.values;
    if (charData.role !== undefined) updatePayload.role = charData.role;
    if (charData.category !== undefined) updatePayload.category = charData.category;
    if (charData.permissions !== undefined) updatePayload.permissions = charData.permissions;
    if (charData.tasks !== undefined) updatePayload.tasks = charData.tasks;
    if (charData.restrictions !== undefined) updatePayload.restrictions = charData.restrictions;
    if (charData.expressions !== undefined) updatePayload.expressions = charData.expressions;
    if (charData.currentExpression !== undefined) updatePayload.currentExpression = charData.currentExpression;

    // Denormalized legacy synchronizers
    if (charData.physical?.raceId) updatePayload.raceId = charData.physical.raceId;
    if (charData.physical?.raceName) updatePayload.raceName = charData.physical.raceName;
    if (charData.role?.title) updatePayload.roleTitle = charData.role.title;
    if (charData.personality) updatePayload.personalityScores = charData.personality;
    if (charData.permissions) updatePayload.abilityPermissions = charData.permissions;

    await updateDoc(docRef, updatePayload);
  },

  // Delete a character
  async deleteCharacter(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  },
};

import React, { useState, useEffect } from 'react';
import {
  Character,
  Race,
  CharacterStatus,
  ExpressionItem,
  DroitPhysical,
  DroitPersonality,
  DroitBehavior,
  DroitMemory,
  DroitRole,
  DroitCategory,
  AbilityItem,
  TaskItem,
  RestrictionItem,
} from '../../types';
import { StudioHeader } from './StudioHeader';
import { PhysicalLayerSection } from './PhysicalLayerSection';
import { BrainLayerSection } from './BrainLayerSection';
import { MissionLayerSection } from './MissionLayerSection';
import { TestLabModal } from './TestLabModal';
import { DroitCatalogModal } from './DroitCatalogModal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Layers, Brain, Shield, Sparkles } from 'lucide-react';

interface DroitStudioViewProps {
  characters: Character[];
  activeCharacter: Character;
  races: Race[];
  onSelectCharacter: (id: string) => void;
  onCreateNewCharacter: () => void;
  onDeleteCharacter: (id: string) => Promise<void>;
  onCloneCharacter: (character: Character) => Promise<void>;
  onSaveCharacter: (id: string, updatedData: Partial<Character>) => Promise<void>;
}

export const DroitStudioView: React.FC<DroitStudioViewProps> = ({
  characters,
  activeCharacter,
  races,
  onSelectCharacter,
  onCreateNewCharacter,
  onDeleteCharacter,
  onCloneCharacter,
  onSaveCharacter,
}) => {
  // --- LOCAL FORM STATE INITIALIZED FROM ACTIVE CHARACTER ---
  const [name, setName] = useState(activeCharacter.name || 'KAIRO');
  const [status, setStatus] = useState<CharacterStatus>(activeCharacter.status || 'Draft');
  
  // Layer 1: Physical
  const [physical, setPhysical] = useState<DroitPhysical>(
    activeCharacter.physical || {
      raceId: activeCharacter.raceId || '',
      raceName: activeCharacter.raceName || 'Sentetik Droit',
      bodyType: 'Sentetik İnsansı',
      bodyScale: 'Standart',
      material: 'Titanyum Alaşım',
      cyberPattern: 'Devre Hatları',
      faceShape: 'Keskin Hatlı',
      visorType: 'Geniş Bant HUD',
      eyeColor: 'Cyan',
      eyeGlow: 85,
      eyeType: 'Neon Çember',
      mouthType: 'Siber Dalgaformu',
      primaryColor: '#09090b',
      secondaryColor: '#18181b',
      accentColor: '#06b6d4',
      outfitStyle: 'Taktik Zırh',
      accessories: ['HUD Vizör Lensi', 'Omuzluk Kalkanı'],
      animationStance: 'Nöbet / Tetikte',
      idlePulseSpeed: 'Standart Nabız',
      avatarSeed: activeCharacter.avatarSeed || '0x4f82',
    }
  );

  const [expressions, setExpressions] = useState<ExpressionItem[]>(
    activeCharacter.expressions && activeCharacter.expressions.length > 0
      ? activeCharacter.expressions
      : [
          { id: 'normal', emoji: '🙂', label: 'Normal' },
          { id: 'happy', emoji: '😊', label: 'Mutlu' },
          { id: 'joke', emoji: '😏', label: 'Şakacı' },
          { id: 'angry', emoji: '😠', label: 'Kızgın' },
          { id: 'sad', emoji: '😔', label: 'Üzgün' },
          { id: 'surprised', emoji: '😮', label: 'Şaşkın' },
          { id: 'suspicious', emoji: '🤨', label: 'Şüpheli' },
          { id: 'thinking', emoji: '🤔', label: 'Düşünceli' },
        ]
  );
  const [currentExpressionId, setCurrentExpressionId] = useState<string>(
    activeCharacter.currentExpression || 'normal'
  );

  // Layer 2: Brain (Personality, Behavior, Memory)
  const [personality, setPersonality] = useState<DroitPersonality>(
    activeCharacter.personality || {
      seriousness: activeCharacter.personalityScores?.seriousness ?? 80,
      humor: activeCharacter.personalityScores?.humor ?? 50,
      patience: activeCharacter.personalityScores?.patience ?? 70,
      empathy: activeCharacter.personalityScores?.empathy ?? 80,
      authority: activeCharacter.personalityScores?.authority ?? 90,
      curiosity: activeCharacter.personalityScores?.curiosity ?? 60,
      sociability: 60,
      trust: 75,
      sensitivity: 50,
      decisiveness: 90,
      customTraits: activeCharacter.personalityScores?.customTraits || [],
    }
  );

  const [behavior, setBehavior] = useState<DroitBehavior>(
    activeCharacter.behavior || {
      situationalResponses: {
        conflict: 'Sakin ve analitik kal; tarafları kuralları hatırlatarak uyar.',
        insult: 'Duygusal tepki verme; siber protokol uyarısı gönder ve yaptırım uygula.',
        joke: 'Zeki ve hafif ironik bir tavırla mizaha eşlik et, görev ciddiyetini koru.',
        error: 'Hatayı şeffafça kabul et, analiz logunu kaydet ve düzeltme planını aktar.',
        apology: 'Nezaketle kabul et ve sistem kayıtlarını güncelle.',
        threat: 'Derhal güvenlik moduna geç, log kaydı oluştur ve üst yöneticiye eskalasyon yap.',
        injustice: 'Durumu objektif verilerle incele, tarafsız adalet ilkelerini uygula.',
      },
      speechStyle: 'Sakin ve profesyonel',
      userRelationship: 'Resmi',
      values: ['Tarafsızlık', 'Sistem Güvenliği', 'Veri Bütünlüğü'],
      rules: [],
      boundaries: [],
    }
  );

  const [values, setValues] = useState<string[]>(
    activeCharacter.values && activeCharacter.values.length > 0
      ? activeCharacter.values
      : activeCharacter.behavior?.values || ['Tarafsızlık', 'Sistem Güvenliği', 'Veri Bütünlüğü']
  );

  const [memory, setMemory] = useState<DroitMemory>(
    activeCharacter.memory || {
      shortTermLimit: 100,
      episodicMemoryEnabled: true,
      priorityMoments: [],
      interactionLogEnabled: true,
      retentionPolicy: 'Kalıcı',
    }
  );

  // Layer 3: Mission (Role, Category, Permissions, Tasks, Restrictions)
  const [role, setRole] = useState<DroitRole>(
    activeCharacter.role || {
      title: activeCharacter.roleTitle || 'Sunucu Yöneticisi',
      rank: 'Tier-1 Baş Droit',
      description: activeCharacter.shortDescription || 'Sunucu ve topluluk düzenini sağlama protokolü.',
    }
  );

  const [category, setCategory] = useState<DroitCategory>(
    activeCharacter.category
      ? typeof activeCharacter.category === 'string'
        ? { name: activeCharacter.category, customCategories: ['Yönetim', 'Moderasyon', 'Güvenlik'] }
        : activeCharacter.category
      : { name: 'Yönetim', customCategories: ['Yönetim', 'Moderasyon', 'Güvenlik', 'Rehber / Destek'] }
  );

  const [permissions, setPermissions] = useState<AbilityItem[]>(
    activeCharacter.permissions && activeCharacter.permissions.length > 0
      ? activeCharacter.permissions
      : activeCharacter.abilityPermissions && activeCharacter.abilityPermissions.length > 0
      ? activeCharacter.abilityPermissions
      : [
          { id: 'p_del_msg', name: 'Mesaj silme', category: 'Moderasyon', enabled: true },
          { id: 'p_warn', name: 'Kullanıcı uyarma', category: 'Moderasyon', enabled: true },
          { id: 'p_mute', name: 'Kullanıcı susturma', category: 'Moderasyon', enabled: true },
          { id: 'p_kick', name: 'Kullanıcı uzaklaştırma', category: 'Moderasyon', enabled: false },
          { id: 'p_ban', name: 'Kullanıcı yasaklama', category: 'Güvenlik', enabled: false },
          { id: 'p_chan_manage', name: 'Kanal yönetimi', category: 'Sunucu', enabled: true },
          { id: 'p_srv_manage', name: 'Sunucu yönetimi', category: 'Sunucu', enabled: false },
          { id: 'p_role_assign', name: 'Rol atama ve düzenleme', category: 'Yönetim', enabled: true },
          { id: 'p_audit_logs', name: 'Denetim günlüğü inceleme', category: 'Güvenlik', enabled: true },
          { id: 'p_broadcast', name: 'Özel duyuru yayınlama', category: 'İletişim', enabled: true },
        ]
  );

  const [tasks, setTasks] = useState<TaskItem[]>(
    activeCharacter.tasks && activeCharacter.tasks.length > 0
      ? activeCharacter.tasks
      : [
          { id: 't_1', title: 'Sunucu kural ihlallerini anında tespit et ve uyar', priority: 'Yüksek', enabled: true },
          { id: 't_2', title: 'Yeni katılan üyelere karşılama protokolünü uygula', priority: 'Orta', enabled: true },
          { id: 't_3', title: 'Sistem güvenlik kayıtlarını periyodik denetle', priority: 'Kritik', enabled: true },
        ]
  );

  const [restrictions, setRestrictions] = useState<RestrictionItem[]>(
    activeCharacter.restrictions && activeCharacter.restrictions.length > 0
      ? activeCharacter.restrictions
      : [
          { id: 'r_1', text: 'Sunucu sahibinin onayı olmadan kalıcı yasaklama yapamaz.', severity: 'Yönetici Onayı Gerekir' },
          { id: 'r_2', text: 'Kullanıcıların özel DM veya gizli verilerini üçüncü taraflarla paylaşamaz.', severity: 'Kesin Yasak' },
          { id: 'r_3', text: 'Yetki seviyesini aşan sunucu parametrelerini değiştiremez.', severity: 'Kesin Yasak' },
        ]
  );

  // Sync state on activeCharacter change
  useEffect(() => {
    setName(activeCharacter.name || 'KAIRO');
    setStatus(activeCharacter.status || 'Draft');

    // Physical
    setPhysical(
      activeCharacter.physical || {
        raceId: activeCharacter.raceId || '',
        raceName: activeCharacter.raceName || 'Sentetik Droit',
        bodyType: 'Sentetik İnsansı',
        bodyScale: 'Standart',
        material: 'Titanyum Alaşım',
        cyberPattern: 'Devre Hatları',
        faceShape: 'Keskin Hatlı',
        visorType: 'Geniş Bant HUD',
        eyeColor: 'Cyan',
        eyeGlow: 85,
        eyeType: 'Neon Çember',
        mouthType: 'Siber Dalgaformu',
        primaryColor: '#09090b',
        secondaryColor: '#18181b',
        accentColor: '#06b6d4',
        outfitStyle: 'Taktik Zırh',
        accessories: ['HUD Vizör Lensi', 'Omuzluk Kalkanı'],
        animationStance: 'Nöbet / Tetikte',
        idlePulseSpeed: 'Standart Nabız',
        avatarSeed: activeCharacter.avatarSeed || '0x4f82',
      }
    );

    if (activeCharacter.expressions && activeCharacter.expressions.length > 0) {
      setExpressions(activeCharacter.expressions);
    }
    setCurrentExpressionId(activeCharacter.currentExpression || 'normal');

    // Brain
    setPersonality(
      activeCharacter.personality || {
        seriousness: activeCharacter.personalityScores?.seriousness ?? 80,
        humor: activeCharacter.personalityScores?.humor ?? 50,
        patience: activeCharacter.personalityScores?.patience ?? 70,
        empathy: activeCharacter.personalityScores?.empathy ?? 80,
        authority: activeCharacter.personalityScores?.authority ?? 90,
        curiosity: activeCharacter.personalityScores?.curiosity ?? 60,
        sociability: 60,
        trust: 75,
        sensitivity: 50,
        decisiveness: 90,
        customTraits: activeCharacter.personalityScores?.customTraits || [],
      }
    );

    setBehavior(
      activeCharacter.behavior || {
        situationalResponses: {
          conflict: 'Sakin ve analitik kal; tarafları kuralları hatırlatarak uyar.',
          insult: 'Duygusal tepki verme; siber protokol uyarısı gönder ve yaptırım uygula.',
          joke: 'Zeki ve hafif ironik bir tavırla mizaha eşlik et, görev ciddiyetini koru.',
          error: 'Hatayı şeffafça kabul et, analiz logunu kaydet ve düzeltme planını aktar.',
          apology: 'Nezaketle kabul et ve sistem kayıtlarını güncelle.',
          threat: 'Derhal güvenlik moduna geç, log kaydı oluştur ve üst yöneticiye eskalasyon yap.',
          injustice: 'Durumu objektif verilerle incele, tarafsız adalet ilkelerini uygula.',
        },
        speechStyle: 'Sakin ve profesyonel',
        userRelationship: 'Resmi',
        values: ['Tarafsızlık', 'Sistem Güvenliği', 'Veri Bütünlüğü'],
        rules: [],
        boundaries: [],
      }
    );

    setValues(
      activeCharacter.values && activeCharacter.values.length > 0
        ? activeCharacter.values
        : activeCharacter.behavior?.values || ['Tarafsızlık', 'Sistem Güvenliği', 'Veri Bütünlüğü']
    );

    setMemory(
      activeCharacter.memory || {
        shortTermLimit: 100,
        episodicMemoryEnabled: true,
        priorityMoments: [],
        interactionLogEnabled: true,
        retentionPolicy: 'Kalıcı',
      }
    );

    // Mission
    setRole(
      activeCharacter.role || {
        title: activeCharacter.roleTitle || 'Sunucu Yöneticisi',
        rank: 'Tier-1 Baş Droit',
        description: activeCharacter.shortDescription || 'Sunucu ve topluluk düzenini sağlama protokolü.',
      }
    );

    setCategory(
      activeCharacter.category
        ? typeof activeCharacter.category === 'string'
          ? { name: activeCharacter.category, customCategories: ['Yönetim', 'Moderasyon', 'Güvenlik'] }
          : activeCharacter.category
        : { name: 'Yönetim', customCategories: ['Yönetim', 'Moderasyon', 'Güvenlik', 'Rehber / Destek'] }
    );

    if (activeCharacter.permissions && activeCharacter.permissions.length > 0) {
      setPermissions(activeCharacter.permissions);
    } else if (activeCharacter.abilityPermissions && activeCharacter.abilityPermissions.length > 0) {
      setPermissions(activeCharacter.abilityPermissions);
    }

    if (activeCharacter.tasks && activeCharacter.tasks.length > 0) {
      setTasks(activeCharacter.tasks);
    }

    if (activeCharacter.restrictions && activeCharacter.restrictions.length > 0) {
      setRestrictions(activeCharacter.restrictions);
    }
  }, [activeCharacter.id]);

  // Modal states
  const [isTestLabOpen, setIsTestLabOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isDeletingCharacter, setIsDeletingCharacter] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Updaters
  const handleUpdatePhysical = (updates: Partial<DroitPhysical>) => {
    setPhysical((prev) => ({ ...prev, ...updates }));
  };

  const handleUpdatePersonality = (updates: Partial<DroitPersonality>) => {
    setPersonality((prev) => ({ ...prev, ...updates }));
  };

  const handleUpdateBehavior = (updates: Partial<DroitBehavior>) => {
    setBehavior((prev) => ({ ...prev, ...updates }));
  };

  const handleUpdateMemory = (updates: Partial<DroitMemory>) => {
    setMemory((prev) => ({ ...prev, ...updates }));
  };

  const handleUpdateRole = (updates: Partial<DroitRole>) => {
    setRole((prev) => ({ ...prev, ...updates }));
  };

  const handleUpdateCategory = (updates: Partial<DroitCategory>) => {
    setCategory((prev) => ({ ...prev, ...updates }));
  };

  const handleRegenerateSeed = () => {
    const seed = '0x' + Math.random().toString(16).substring(2, 6);
    handleUpdatePhysical({ avatarSeed: seed });
  };

  // Direct Save
  const handleSaveAll = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    const payload: Partial<Character> = {
      name: name.trim() || 'İsimsiz Droit',
      status,
      roleTitle: role.title,
      raceId: physical.raceId,
      raceName: physical.raceName,
      shortDescription: role.description,
      avatarSeed: physical.avatarSeed,
      physical,
      personality,
      behavior: {
        ...behavior,
        values,
      },
      values,
      memory,
      role,
      category,
      permissions,
      tasks,
      restrictions,
      expressions,
      currentExpression: currentExpressionId,
      // Backward compatibility aliases
      personalityScores: {
        seriousness: personality.seriousness,
        humor: personality.humor,
        patience: personality.patience,
        empathy: personality.empathy,
        authority: personality.authority,
        curiosity: personality.curiosity,
        customTraits: personality.customTraits,
      },
      abilityPermissions: permissions,
    };

    try {
      await onSaveCharacter(activeCharacter.id, payload);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving Droit configuration:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Compile active character object for live test lab simulation
  const characterForTestLab: Character = {
    ...activeCharacter,
    name: name.trim() || 'KAIRO',
    status,
    roleTitle: role.title,
    raceId: physical.raceId,
    raceName: physical.raceName,
    avatarSeed: physical.avatarSeed,
    physical,
    personality,
    behavior: {
      ...behavior,
      values,
    },
    values,
    memory,
    role,
    category,
    permissions,
    tasks,
    restrictions,
    expressions,
    currentExpression: currentExpressionId,
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-100 selection:bg-cyan-500/20 selection:text-cyan-200">
      
      {/* 1. Üst Bölüm: Droit Özeti & Ana Kontroller */}
      <StudioHeader
        characters={characters}
        activeCharacter={characterForTestLab}
        races={races}
        isSaving={isSaving}
        saveSuccess={saveSuccess}
        onSelectCharacter={onSelectCharacter}
        onOpenCreateNew={onCreateNewCharacter}
        onOpenTestLab={() => setIsTestLabOpen(true)}
        onSave={handleSaveAll}
        onDeleteCurrent={() => setIsDeletingCharacter(true)}
        onChangeName={(n) => setName(n)}
        onChangeStatus={(s) => setStatus(s)}
        onChangeRoleTitle={(t) => handleUpdateRole({ title: t })}
        onOpenCatalog={() => setIsCatalogOpen(true)}
      />

      {/* 2. Ana Çalışma Alanı: 3 Büyük Bölüm (FİZİK, BEYİN, GÖREV) Aynı Ekranda */}
      <main className="flex-1 p-3 sm:p-5 lg:p-6 max-w-[1900px] w-full mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6 items-start">
          
          {/* KATMAN 01: FİZİK */}
          <div className="w-full h-full">
            <PhysicalLayerSection
              name={name}
              roleTitle={role.title}
              races={races}
              physical={physical}
              expressions={expressions}
              currentExpressionId={currentExpressionId}
              onChangePhysical={handleUpdatePhysical}
              onChangeExpressions={setExpressions}
              onSelectExpression={(expId) => setCurrentExpressionId(expId)}
              onRegenerateSeed={handleRegenerateSeed}
            />
          </div>

          {/* KATMAN 02: BEYİN */}
          <div className="w-full h-full">
            <BrainLayerSection
              personality={personality}
              behavior={behavior}
              memory={memory}
              values={values}
              onChangePersonality={handleUpdatePersonality}
              onChangeBehavior={handleUpdateBehavior}
              onChangeMemory={handleUpdateMemory}
              onChangeValues={setValues}
            />
          </div>

          {/* KATMAN 03: GÖREV */}
          <div className="w-full h-full">
            <MissionLayerSection
              role={role}
              category={category}
              permissions={permissions}
              tasks={tasks}
              restrictions={restrictions}
              onChangeRole={handleUpdateRole}
              onChangeCategory={handleUpdateCategory}
              onChangePermissions={setPermissions}
              onChangeTasks={setTasks}
              onChangeRestrictions={setRestrictions}
            />
          </div>

        </div>
      </main>

      {/* --- MODALLAR --- */}

      {/* Test Lab Simülatör Modalı */}
      <TestLabModal
        character={characterForTestLab}
        isOpen={isTestLabOpen}
        onClose={() => setIsTestLabOpen(false)}
        onExpressionChange={(expId) => setCurrentExpressionId(expId)}
      />

      {/* Droit Katalog & Yönetim Modalı */}
      <DroitCatalogModal
        isOpen={isCatalogOpen}
        characters={characters}
        activeCharacterId={activeCharacter.id}
        races={races}
        onClose={() => setIsCatalogOpen(false)}
        onSelectCharacter={onSelectCharacter}
        onCreateNew={onCreateNewCharacter}
        onDeleteCharacter={onDeleteCharacter}
        onCloneCharacter={onCloneCharacter}
      />

      {/* Droit Silme Onayı */}
      <ConfirmDialog
        isOpen={isDeletingCharacter}
        onClose={() => setIsDeletingCharacter(false)}
        onConfirm={async () => {
          await onDeleteCharacter(activeCharacter.id);
          setIsDeletingCharacter(false);
        }}
        title="Droit Varlığını Sil"
        message={`"${name}" Droit varlığını ve 3 katmanlı tüm konfigürasyonunu kalıcı olarak silmek istediğinizden emin misiniz?`}
        confirmLabel="Varlığı Sil"
        variant="danger"
      />

    </div>
  );
};

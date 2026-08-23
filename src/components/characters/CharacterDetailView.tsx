import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Trash2,
  Plus,
  Save,
  Check,
  Smile,
  Shield,
  Layers,
  FileText,
  Activity,
  Sliders,
  MessageSquare,
  Sparkles,
  Zap,
  Cpu,
  Database,
  Brain,
  Terminal,
  X,
  RotateCcw,
  Play,
  Flame,
  Radio,
  Tag,
  Lock,
} from 'lucide-react';
import {
  Character,
  Race,
  CharacterStatus,
  ExpressionItem,
  CustomTrait,
  AbilityItem,
  CharacterTab,
} from '../../types';
import { Button } from '../common/Button';
import { CharacterLiveAvatar } from './CharacterLiveAvatar';
import { PersonalityTraitSlider } from './PersonalityTraitSlider';
import { CharacterTestModal } from './CharacterTestModal';

interface CharacterDetailViewProps {
  character: Character;
  races: Race[];
  onBack: () => void;
  onEdit?: (character: Character) => void;
  onDelete: (character: Character) => void;
  onSave?: (updatedData: Partial<Character>) => Promise<void>;
}

export const CharacterDetailView: React.FC<CharacterDetailViewProps> = ({
  character,
  races,
  onBack,
  onDelete,
  onSave,
}) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<CharacterTab>('specification');

  // --- FORM & SPECIFICATION STATE ---
  const [name, setName] = useState(character.name || 'KAIRO');
  const [status, setStatus] = useState<CharacterStatus>(character.status || 'Draft');
  const [roleTitle, setRoleTitle] = useState(character.roleTitle || 'Yönetici Droit');
  const [raceId, setRaceId] = useState(character.raceId || '');
  const [category, setCategory] = useState(character.category || 'Yönetim');
  const [mission, setMission] = useState(character.mission || 'Sunucu Yönetimi');
  const [shortDescription, setShortDescription] = useState(character.shortDescription || '');
  const [avatarSeed, setAvatarSeed] = useState(character.avatarSeed || character.name || 'kairo');

  // Personality sliders (0 - 100)
  const [seriousness, setSeriousness] = useState(character.personalityScores?.seriousness ?? 80);
  const [humor, setHumor] = useState(character.personalityScores?.humor ?? 50);
  const [patience, setPatience] = useState(character.personalityScores?.patience ?? 70);
  const [empathy, setEmpathy] = useState(character.personalityScores?.empathy ?? 80);
  const [authority, setAuthority] = useState(character.personalityScores?.authority ?? 90);
  const [curiosity, setCuriosity] = useState(character.personalityScores?.curiosity ?? 60);
  const [customTraits, setCustomTraits] = useState<CustomTrait[]>(
    character.personalityScores?.customTraits || []
  );

  // New personality trait adder inline state
  const [isAddingTrait, setIsAddingTrait] = useState(false);
  const [newTraitName, setNewTraitName] = useState('');
  const [newTraitValue, setNewTraitValue] = useState(70);

  // Behavior directives (Tepki biçimleri • Değerler • Sınırlar • Kurallar)
  const [speechStyle, setSpeechStyle] = useState(
    character.behavior?.speechStyle || 'Sakin / Profesyonel'
  );
  const [conflictApproach, setConflictApproach] = useState(
    character.behavior?.conflictApproach || 'Önce uyar'
  );
  const [userRelationship, setUserRelationship] = useState(
    character.behavior?.userRelationship || 'Mesafeli'
  );

  // Değerler
  const [values, setValues] = useState<string[]>(
    character.behavior?.values || ['Tarafsızlık', 'Sistem Güvenliği', 'Veri Bütünlüğü', 'Hızlı Yanıt']
  );
  const [newValueInput, setNewValueInput] = useState('');
  const [isAddingValue, setIsAddingValue] = useState(false);

  // Sınırlar
  const [boundaries, setBoundaries] = useState<string[]>(
    character.behavior?.boundaries || [
      'Özel kullanıcı verilerini paylaşmama',
      'Saldırgan ve hakaret içeren dile izin vermeme',
      'Yetkisiz sunucu parametre değişikliklerini reddetme',
    ]
  );
  const [newBoundaryInput, setNewBoundaryInput] = useState('');
  const [isAddingBoundary, setIsAddingBoundary] = useState(false);

  // Kurallar
  const [behaviorRules, setBehaviorRules] = useState<string[]>(
    character.behavior?.rules || [
      'Kullanıcı kural ihlallerinde önce açık ve net şekilde uyar.',
      'Sistem güvenliğini ve veri bütünlüğünü her zaman önceliklendir.',
      'Kritik sunucu müdahalelerinde yönetici onayı iste.',
    ]
  );
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [newRuleText, setNewRuleText] = useState('');

  // Facial expressions
  const defaultExpressions: ExpressionItem[] = [
    { id: 'normal', emoji: '🙂', label: 'Normal' },
    { id: 'happy', emoji: '😊', label: 'Mutlu' },
    { id: 'angry', emoji: '😠', label: 'Kızgın' },
    { id: 'surprised', emoji: '😮', label: 'Şaşkın' },
    { id: 'suspicious', emoji: '🤨', label: 'Şüpheli' },
    { id: 'joke', emoji: '😏', label: 'Şaka' },
    { id: 'sad', emoji: '😔', label: 'Üzgün' },
    { id: 'thinking', emoji: '🤔', label: 'Düşünüyor' },
  ];

  const [expressions, setExpressions] = useState<ExpressionItem[]>(
    character.expressions && character.expressions.length > 0
      ? character.expressions
      : defaultExpressions
  );
  const [currentExpression, setCurrentExpression] = useState<string>(
    character.currentExpression || 'normal'
  );
  const [isAddingExpression, setIsAddingExpression] = useState(false);
  const [newExpEmoji, setNewExpEmoji] = useState('😎');
  const [newExpLabel, setNewExpLabel] = useState('');

  // Abilities checklist (Moderasyon • Sunucu yönetimi • Kullanıcı yönetimi • ...)
  const defaultAbilities: (AbilityItem & { category?: string })[] = [
    { id: 'warn', name: 'Kullanıcı uyarma', enabled: true, category: 'Moderasyon' },
    { id: 'mute', name: 'Susturma', enabled: true, category: 'Moderasyon' },
    { id: 'delete_msg', name: 'Mesaj silme', enabled: true, category: 'Moderasyon' },
    { id: 'ban', name: 'Kullanıcı uzaklaştırma', enabled: false, category: 'Moderasyon' },
    { id: 'lock_channel', name: 'Kanal kilitleme', enabled: true, category: 'Sunucu Yönetimi' },
    { id: 'role_assign', name: 'Rol atama ve yönetimi', enabled: true, category: 'Sunucu Yönetimi' },
    { id: 'audit_logs', name: 'Günlük denetimi inceleme', enabled: true, category: 'Sunucu Yönetimi' },
    { id: 'verify_user', name: 'Kullanıcı profili doğrulama', enabled: true, category: 'Kullanıcı Yönetimi' },
    { id: 'welcome_flow', name: 'Hoş geldin karşılama protokolü', enabled: true, category: 'Kullanıcı Yönetimi' },
  ];

  const [abilities, setAbilities] = useState<AbilityItem[]>(
    character.abilityPermissions && character.abilityPermissions.length > 0
      ? character.abilityPermissions
      : defaultAbilities
  );
  const [isAddingAbility, setIsAddingAbility] = useState(false);
  const [newAbilityName, setNewAbilityName] = useState('');

  // Save & Test Modal states
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

  // Sync state if external character prop changes
  useEffect(() => {
    setName(character.name || 'KAIRO');
    setStatus(character.status || 'Draft');
    setRoleTitle(character.roleTitle || 'Yönetici Droit');
    setRaceId(character.raceId || '');
    setCategory(character.category || 'Yönetim');
    setMission(character.mission || 'Sunucu Yönetimi');
    setShortDescription(character.shortDescription || '');
    setAvatarSeed(character.avatarSeed || character.name || 'kairo');

    setSeriousness(character.personalityScores?.seriousness ?? 80);
    setHumor(character.personalityScores?.humor ?? 50);
    setPatience(character.personalityScores?.patience ?? 70);
    setEmpathy(character.personalityScores?.empathy ?? 80);
    setAuthority(character.personalityScores?.authority ?? 90);
    setCuriosity(character.personalityScores?.curiosity ?? 60);
    setCustomTraits(character.personalityScores?.customTraits || []);

    setSpeechStyle(character.behavior?.speechStyle || 'Sakin / Profesyonel');
    setConflictApproach(character.behavior?.conflictApproach || 'Önce uyar');
    setUserRelationship(character.behavior?.userRelationship || 'Mesafeli');
    setValues(
      character.behavior?.values || [
        'Tarafsızlık',
        'Sistem Güvenliği',
        'Veri Bütünlüğü',
        'Hızlı Yanıt',
      ]
    );
    setBoundaries(
      character.behavior?.boundaries || [
        'Özel kullanıcı verilerini paylaşmama',
        'Saldırgan ve hakaret içeren dile izin vermeme',
        'Yetkisiz sunucu parametre değişikliklerini reddetme',
      ]
    );
    setBehaviorRules(
      character.behavior?.rules || [
        'Kullanıcı kural ihlallerinde önce açık ve net şekilde uyar.',
        'Sistem güvenliğini ve veri bütünlüğünü her zaman önceliklendir.',
        'Kritik sunucu müdahalelerinde yönetici onayı iste.',
      ]
    );

    if (character.expressions && character.expressions.length > 0) {
      setExpressions(character.expressions);
    }
    setCurrentExpression(character.currentExpression || 'normal');

    if (character.abilityPermissions && character.abilityPermissions.length > 0) {
      setAbilities(character.abilityPermissions);
    }
  }, [character]);

  // Handlers for dynamic items
  const handleAddCustomTrait = () => {
    if (!newTraitName.trim()) return;
    const newTrait: CustomTrait = {
      id: `trait_${Date.now()}`,
      name: newTraitName.trim(),
      value: newTraitValue,
    };
    setCustomTraits([...customTraits, newTrait]);
    setNewTraitName('');
    setNewTraitValue(70);
    setIsAddingTrait(false);
  };

  const handleDeleteCustomTrait = (id: string) => {
    setCustomTraits(customTraits.filter((t) => t.id !== id));
  };

  const handleUpdateCustomTrait = (id: string, value: number) => {
    setCustomTraits(customTraits.map((t) => (t.id === id ? { ...t, value } : t)));
  };

  // Behavior Values
  const handleAddValue = () => {
    if (!newValueInput.trim()) return;
    if (!values.includes(newValueInput.trim())) {
      setValues([...values, newValueInput.trim()]);
    }
    setNewValueInput('');
    setIsAddingValue(false);
  };

  const handleDeleteValue = (index: number) => {
    setValues(values.filter((_, idx) => idx !== index));
  };

  // Behavior Boundaries
  const handleAddBoundary = () => {
    if (!newBoundaryInput.trim()) return;
    if (!boundaries.includes(newBoundaryInput.trim())) {
      setBoundaries([...boundaries, newBoundaryInput.trim()]);
    }
    setNewBoundaryInput('');
    setIsAddingBoundary(false);
  };

  const handleDeleteBoundary = (index: number) => {
    setBoundaries(boundaries.filter((_, idx) => idx !== index));
  };

  // Behavior Rules
  const handleAddBehaviorRule = () => {
    if (!newRuleText.trim()) return;
    setBehaviorRules([...behaviorRules, newRuleText.trim()]);
    setNewRuleText('');
    setIsAddingRule(false);
  };

  const handleDeleteBehaviorRule = (index: number) => {
    setBehaviorRules(behaviorRules.filter((_, idx) => idx !== index));
  };

  // Expressions
  const handleAddExpression = () => {
    if (!newExpLabel.trim()) return;
    const newExp: ExpressionItem = {
      id: `exp_${Date.now()}`,
      emoji: newExpEmoji || '🙂',
      label: newExpLabel.trim(),
    };
    setExpressions([...expressions, newExp]);
    setCurrentExpression(newExp.id);
    setNewExpLabel('');
    setIsAddingExpression(false);
  };

  // Abilities
  const handleToggleAbility = (id: string) => {
    setAbilities(
      abilities.map((ab) => (ab.id === id ? { ...ab, enabled: !ab.enabled } : ab))
    );
  };

  const handleAddAbility = () => {
    if (!newAbilityName.trim()) return;
    const newAb: AbilityItem = {
      id: `ab_${Date.now()}`,
      name: newAbilityName.trim(),
      enabled: true,
    };
    setAbilities([...abilities, newAb]);
    setNewAbilityName('');
    setIsAddingAbility(false);
  };

  const handleRegenerateSeed = () => {
    setAvatarSeed(Math.random().toString(36).substring(2, 9));
  };

  // Save handler
  const handleSaveAll = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    const selectedRace = races.find((r) => r.id === raceId);
    const resolvedRaceName = selectedRace ? selectedRace.name : 'Atanmadı';

    const payload: Partial<Character> = {
      name: name.trim(),
      status,
      roleTitle: roleTitle.trim(),
      raceId,
      raceName: resolvedRaceName,
      category: category.trim(),
      mission: mission.trim(),
      shortDescription: shortDescription.trim(),
      avatarSeed,
      personalityScores: {
        seriousness,
        humor,
        patience,
        empathy,
        authority,
        curiosity,
        customTraits,
      },
      behavior: {
        situationalResponses: character.behavior?.situationalResponses || {
          conflict: 'Sakin kal ve kural hatırlat',
          insult: 'Duygusal tepki verme, uyar',
          joke: 'Mizaha eşlik et',
          error: 'Hatayı şeffafça kabul et',
          apology: 'Nezaketle kabul et',
          threat: 'Güvenlik protokolünü başlat',
          injustice: 'Objektif verilerle incele',
        },
        speechStyle,
        conflictApproach,
        userRelationship,
        values,
        boundaries,
        rules: behaviorRules,
      },
      expressions,
      currentExpression,
      abilityPermissions: abilities,
    };

    try {
      if (onSave) {
        await onSave(payload);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving character specification:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const currentCharacterForTest: Character = {
    ...character,
    name: name.trim(),
    status,
    roleTitle,
    raceId,
    category,
    mission,
    shortDescription,
    avatarSeed,
    personalityScores: {
      seriousness,
      humor,
      patience,
      empathy,
      authority,
      curiosity,
      customTraits,
    },
    behavior: {
      situationalResponses: character.behavior?.situationalResponses || {
        conflict: 'Sakin kal ve kural hatırlat',
        insult: 'Duygusal tepki verme, uyar',
        joke: 'Mizaha eşlik et',
        error: 'Hatayı şeffafça kabul et',
        apology: 'Nezaketle kabul et',
        threat: 'Güvenlik protokolünü başlat',
        injustice: 'Objektif verilerle incele',
      },
      speechStyle,
      conflictApproach,
      userRelationship,
      values,
      boundaries,
      rules: behaviorRules,
    },
    expressions,
    currentExpression,
    abilityPermissions: abilities,
  };

  const tabs: { id: CharacterTab; label: string; icon: React.ReactNode; isFunctional: boolean }[] = [
    {
      id: 'specification',
      label: 'Karakter Belirtimi',
      icon: <Sliders className="w-4 h-4" />,
      isFunctional: true,
    },
    {
      id: 'overview',
      label: 'Genel Bakış',
      icon: <Activity className="w-4 h-4" />,
      isFunctional: true,
    },
    {
      id: 'knowledge',
      label: 'Külliyat & Bilgi Deposu',
      icon: <Database className="w-4 h-4" />,
      isFunctional: false,
    },
    {
      id: 'memory',
      label: 'Hafıza Matrisi',
      icon: <Brain className="w-4 h-4" />,
      isFunctional: false,
    },
    {
      id: 'ai',
      label: 'Yapay Zeka Yönergeleri',
      icon: <Cpu className="w-4 h-4" />,
      isFunctional: false,
    },
    {
      id: 'logs',
      label: 'Olay Kayıtları',
      icon: <Terminal className="w-4 h-4" />,
      isFunctional: false,
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Navigation & Fast Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-cyan-300 transition-colors group cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>KARAKTERLER DİZİNİNE DÖN</span>
        </button>

        <div className="flex items-center gap-2.5">
          <Button
            variant="danger"
            size="sm"
            onClick={() => onDelete(character)}
            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
          >
            Varlığı Sil
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsTestModalOpen(true)}
            leftIcon={<Play className="w-3.5 h-3.5 text-cyan-400" />}
          >
            Test Et
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveAll}
            isLoading={isSaving}
            leftIcon={saveSuccess ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Save className="w-3.5 h-3.5" />}
          >
            {saveSuccess ? 'Kaydedildi!' : 'Kaydet'}
          </Button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="border-b border-zinc-800/80 flex overflow-x-auto no-scrollbar gap-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono font-medium border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'border-cyan-500 text-cyan-300 bg-cyan-500/5'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              <span className={isActive ? 'text-cyan-400' : 'text-zinc-400'}>{tab.icon}</span>
              <span>{tab.label}</span>
              {!tab.isFunctional && (
                <span className="text-[9px] uppercase px-1.5 py-0.2 bg-zinc-900 text-zinc-500 rounded border border-zinc-800">
                  Yakında
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* --- TAB: SPECIFICATION (EXACT ASCII WIREFRAME IMPLEMENTATION) --- */}
      {activeTab === 'specification' && (
        <div className="space-y-6">
          {/* MAIN CARD FRAME */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 shadow-2xl overflow-hidden divide-y divide-zinc-800">
            
            {/* 1. HEADER LINE (KAIRO | ● Taslak) */}
            <div className="p-6 sm:p-7 bg-zinc-950/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Karakter Adı"
                    className="text-2xl sm:text-3xl font-bold font-mono text-zinc-100 bg-transparent border-b border-dashed border-zinc-700 hover:border-cyan-400 focus:border-cyan-400 focus:outline-none transition-colors max-w-sm tracking-tight"
                  />
                </div>
                <div className="flex items-center gap-2 pt-0.5">
                  <input
                    type="text"
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    placeholder="Unvan / Rol (örn. Yönetici Droit)"
                    className="text-sm font-mono text-cyan-400/90 bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-cyan-500 focus:outline-none transition-colors w-64"
                  />
                </div>
              </div>

              {/* Status Switcher (e.g. ● Taslak) */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as CharacterStatus)}
                    className="appearance-none bg-zinc-900 border border-zinc-700/80 text-xs font-mono font-bold text-zinc-200 rounded-lg px-3.5 py-1.5 pr-8 focus:outline-none focus:border-cyan-500 shadow-sm cursor-pointer"
                  >
                    <option value="Draft">● Taslak</option>
                    <option value="Active">● Aktif</option>
                    <option value="Standby">● Beklemede</option>
                    <option value="Archived">● Arşivlendi</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-400">
                    <span className="text-[10px]">▼</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. TOP SECTION: [ KARAKTER ÖNİZLEME ] & TEMEL BİLGİLER */}
            <div className="p-6 sm:p-7 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Left Column: [ KARAKTER ÖNİZLEME ] */}
              <div className="md:col-span-5 flex justify-center">
                <CharacterLiveAvatar
                  name={name}
                  seed={avatarSeed}
                  currentExpression={currentExpression}
                  expressions={expressions}
                  roleTitle={roleTitle}
                  onRegenerateSeed={handleRegenerateSeed}
                  className="w-full max-w-sm"
                />
              </div>

              {/* Right Column: TEMEL BİLGİLER */}
              <div className="md:col-span-7 space-y-4">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-200 tracking-wider border-b border-zinc-800 pb-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  TEMEL BİLGİLER
                </div>

                <div className="space-y-3.5 font-mono text-xs">
                  {/* İsim */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
                    <label className="text-zinc-400 sm:text-right pr-2">İsim:</label>
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Karakter İsmi"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* Irk */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
                    <label className="text-zinc-400 sm:text-right pr-2">Irk:</label>
                    <div className="sm:col-span-2">
                      <select
                        value={raceId}
                        onChange={(e) => setRaceId(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500 font-mono cursor-pointer"
                      >
                        <option value="">-- Irk Seçin / Atanmadı --</option>
                        {races.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Kategori */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
                    <label className="text-zinc-400 sm:text-right pr-2">Kategori:</label>
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        placeholder="Yönetim, Güvenlik, Asistan..."
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* Görev */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
                    <label className="text-zinc-400 sm:text-right pr-2">Görev:</label>
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        value={mission}
                        onChange={(e) => setMission(e.target.value)}
                        placeholder="Sunucu Yönetimi, Veri Güvenliği..."
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* Kısa Açıklama */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 items-start gap-2 pt-1">
                    <label className="text-zinc-400 sm:text-right pr-2 pt-1.5">Özet:</label>
                    <div className="sm:col-span-2">
                      <textarea
                        value={shortDescription}
                        onChange={(e) => setShortDescription(e.target.value)}
                        rows={2}
                        placeholder="Karakterin operasyonel kapsamı ve kısa tanımı..."
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500 font-sans resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. KİŞİLİK (Ciddiyet, Mizah, Sabır, Empati, Otorite, Merak + Özel Kişilik Özelliği Ekle) */}
            <div className="p-6 sm:p-7 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-200 tracking-wider">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  KİŞİLİK
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddingTrait(true)}
                  className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Özel kişilik özelliği ekle</span>
                </button>
              </div>

              {/* 2-Column Exact Wireframe Personality Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <PersonalityTraitSlider
                  label="Ciddiyet"
                  value={seriousness}
                  onChange={setSeriousness}
                />
                <PersonalityTraitSlider
                  label="Mizah"
                  value={humor}
                  onChange={setHumor}
                />
                <PersonalityTraitSlider
                  label="Sabır"
                  value={patience}
                  onChange={setPatience}
                />
                <PersonalityTraitSlider
                  label="Empati"
                  value={empathy}
                  onChange={setEmpathy}
                />
                <PersonalityTraitSlider
                  label="Otorite"
                  value={authority}
                  onChange={setAuthority}
                />
                <PersonalityTraitSlider
                  label="Merak"
                  value={curiosity}
                  onChange={setCuriosity}
                />

                {/* Custom User Traits */}
                {customTraits.map((trait) => (
                  <PersonalityTraitSlider
                    key={trait.id}
                    label={trait.name}
                    value={trait.value}
                    onChange={(val) => handleUpdateCustomTrait(trait.id, val)}
                    onDelete={() => handleDeleteCustomTrait(trait.id)}
                    isCustom
                  />
                ))}
              </div>

              {/* Inline Add Trait Form */}
              {isAddingTrait && (
                <div className="p-3.5 rounded-lg bg-zinc-950 border border-cyan-500/40 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <input
                    type="text"
                    value={newTraitName}
                    onChange={(e) => setNewTraitName(e.target.value)}
                    placeholder="Özellik adı (örn. Sadakat, Sezgisellik, Cesaret)..."
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-cyan-500"
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-zinc-400">%{newTraitValue}</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={newTraitValue}
                      onChange={(e) => setNewTraitValue(Number(e.target.value))}
                      className="w-28 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="primary" size="sm" onClick={handleAddCustomTrait}>
                      Ekle
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsAddingTrait(false);
                        setNewTraitName('');
                      }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* 4. DAVRANIŞ (Tepki biçimleri • Değerler • Sınırlar • Kurallar) */}
            <div className="p-6 sm:p-7 space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-200 tracking-wider">
                  <MessageSquare className="w-4 h-4 text-cyan-400" />
                  DAVRANIŞ
                </div>
                <div className="text-[11px] font-mono text-zinc-400 hidden sm:inline">
                  Tepki biçimleri • Değerler • Sınırlar • Kurallar
                </div>
              </div>

              {/* Sub-Section 4A: Tepki Biçimleri (Speech Style, Conflict, Relationships) */}
              <div className="space-y-3">
                <div className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5">
                  <span>•</span>
                  <span>Tepki Biçimleri & İletişim Tarzı</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Konuşma tarzı */}
                  <div className="space-y-1.5 font-mono text-xs">
                    <label className="text-zinc-400 block">Konuşma tarzı:</label>
                    <select
                      value={speechStyle}
                      onChange={(e) => setSpeechStyle(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500 font-mono cursor-pointer"
                    >
                      <option value="Sakin / Profesyonel">Sakin / Profesyonel</option>
                      <option value="Samimi / Esprili">Samimi / Esprili</option>
                      <option value="Mekanik / Doğrudan">Mekanik / Doğrudan</option>
                      <option value="Otoriter / Keskin">Otoriter / Keskin</option>
                      <option value="Diplomatik / Nezaketli">Diplomatik / Nezaketli</option>
                    </select>
                  </div>

                  {/* Çatışma yaklaşımı */}
                  <div className="space-y-1.5 font-mono text-xs">
                    <label className="text-zinc-400 block">Çatışma yaklaşımı:</label>
                    <select
                      value={conflictApproach}
                      onChange={(e) => setConflictApproach(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500 font-mono cursor-pointer"
                    >
                      <option value="Önce uyar">Önce uyar</option>
                      <option value="Anında müdahale">Anında müdahale</option>
                      <option value="Uzlaşmacı ve Yatıştırıcı">Uzlaşmacı ve Yatıştırıcı</option>
                      <option value="Yöneticiye bildir">Yöneticiye bildir</option>
                      <option value="Savunmaya geç">Savunmaya geç</option>
                    </select>
                  </div>

                  {/* Kullanıcılarla ilişki */}
                  <div className="space-y-1.5 font-mono text-xs">
                    <label className="text-zinc-400 block">Kullanıcılarla ilişki:</label>
                    <select
                      value={userRelationship}
                      onChange={(e) => setUserRelationship(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500 font-mono cursor-pointer"
                    >
                      <option value="Mesafeli">Mesafeli</option>
                      <option value="Dostane">Dostane</option>
                      <option value="Hizmetkâr">Hizmetkâr</option>
                      <option value="Korumacı">Korumacı</option>
                      <option value="Resmi ve Ciddi">Resmi ve Ciddi</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Sub-Section 4B: Değerler (Values) */}
              <div className="space-y-2.5 pt-2 border-t border-zinc-800/60">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5">
                    <span>•</span>
                    <span>Değerler ({values.length})</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsAddingValue(true)}
                    className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Değer ekle</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {values.map((val, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-200"
                    >
                      <Tag className="w-3 h-3 text-cyan-400" />
                      <span>{val}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteValue(idx)}
                        className="text-zinc-500 hover:text-rose-400 ml-1 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                {isAddingValue && (
                  <div className="p-2.5 rounded-lg bg-zinc-950 border border-cyan-500/40 flex items-center gap-2">
                    <input
                      type="text"
                      value={newValueInput}
                      onChange={(e) => setNewValueInput(e.target.value)}
                      placeholder="Yeni temel değer (örn. Şeffaflık, Gizlilik, Adalet)..."
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500 font-mono"
                      autoFocus
                    />
                    <Button variant="primary" size="sm" onClick={handleAddValue}>
                      Ekle
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsAddingValue(false);
                        setNewValueInput('');
                      }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Sub-Section 4C: Sınırlar (Boundaries) */}
              <div className="space-y-2.5 pt-2 border-t border-zinc-800/60">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5">
                    <span>•</span>
                    <span>Sınırlar & Kısıtlar ({boundaries.length})</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsAddingBoundary(true)}
                    className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Sınır ekle</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {boundaries.map((boundary, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80 flex items-center justify-between gap-3 text-xs text-zinc-300 font-sans"
                    >
                      <div className="flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        <span>{boundary}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteBoundary(idx)}
                        className="p-1 text-zinc-500 hover:text-rose-400 rounded transition-colors"
                        title="Sınırı sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {isAddingBoundary && (
                  <div className="p-2.5 rounded-lg bg-zinc-950 border border-cyan-500/40 flex items-center gap-2">
                    <input
                      type="text"
                      value={newBoundaryInput}
                      onChange={(e) => setNewBoundaryInput(e.target.value)}
                      placeholder="Yeni sınır tanımı (örn. Kullanıcı şifrelerini asla istememe)..."
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500 font-mono"
                      autoFocus
                    />
                    <Button variant="primary" size="sm" onClick={handleAddBoundary}>
                      Ekle
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsAddingBoundary(false);
                        setNewBoundaryInput('');
                      }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Sub-Section 4D: Kurallar (Rules) */}
              <div className="space-y-2.5 pt-2 border-t border-zinc-800/60">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5">
                    <span>•</span>
                    <span>Kurallar & Protokoller ({behaviorRules.length})</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsAddingRule(true)}
                    className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Kural ekle</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {behaviorRules.map((rule, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80 flex items-center justify-between gap-3 text-xs text-zinc-300 font-sans"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-cyan-400 text-[11px] font-bold">
                          [{idx + 1}]
                        </span>
                        <span>{rule}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteBehaviorRule(idx)}
                        className="p-1 text-zinc-500 hover:text-rose-400 rounded transition-colors"
                        title="Kuralı sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {isAddingRule && (
                  <div className="p-3.5 rounded-lg bg-zinc-950 border border-cyan-500/40 flex items-center gap-3">
                    <input
                      type="text"
                      value={newRuleText}
                      onChange={(e) => setNewRuleText(e.target.value)}
                      placeholder="Yeni davranış kuralı yönergesi girin..."
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500"
                      autoFocus
                    />
                    <Button variant="primary" size="sm" onClick={handleAddBehaviorRule}>
                      Ekle
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsAddingRule(false);
                        setNewRuleText('');
                      }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* 5. YÜZ & İFADELER (Normal │ Mutlu │ Kızgın │ Şaşkın │ Şüpheli │ Şaka │ ... ) */}
            <div className="p-6 sm:p-7 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-200 tracking-wider">
                  <Smile className="w-4 h-4 text-cyan-400" />
                  YÜZ & İFADELER
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddingExpression(true)}
                  className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Yeni ifade ekle</span>
                </button>
              </div>

              {/* Expression Chips Strip */}
              <div className="flex flex-wrap items-center gap-2.5">
                {expressions.map((exp) => {
                  const isSelected =
                    currentExpression === exp.id || currentExpression === exp.label;
                  return (
                    <button
                      key={exp.id}
                      type="button"
                      onClick={() => setCurrentExpression(exp.id)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono font-medium border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-950/70 border-cyan-500 text-cyan-300 ring-2 ring-cyan-500/20 shadow-lg shadow-cyan-950/50'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                      }`}
                    >
                      <span className="text-base">{exp.emoji}</span>
                      <span>{exp.label}</span>
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 ml-1" />}
                    </button>
                  );
                })}
              </div>

              {/* Inline Add Expression Form */}
              {isAddingExpression && (
                <div className="p-3.5 rounded-lg bg-zinc-950 border border-cyan-500/40 flex flex-wrap items-center gap-3">
                  <input
                    type="text"
                    value={newExpEmoji}
                    onChange={(e) => setNewExpEmoji(e.target.value)}
                    placeholder="Emoji (örn. 😎)"
                    className="w-20 text-center bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-sm font-mono text-zinc-200 focus:outline-none focus:border-cyan-500"
                  />
                  <input
                    type="text"
                    value={newExpLabel}
                    onChange={(e) => setNewExpLabel(e.target.value)}
                    placeholder="İfade etiketi (örn. Cesur, Meraklı)..."
                    className="flex-1 min-w-[180px] bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-cyan-500"
                    autoFocus
                  />
                  <Button variant="primary" size="sm" onClick={handleAddExpression}>
                    İfadeyi Ekle
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsAddingExpression(false);
                      setNewExpLabel('');
                    }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>

            {/* 6. YETENEKLER (Moderasyon • Sunucu yönetimi • Kullanıcı yönetimi • ...) */}
            <div className="p-6 sm:p-7 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-200 tracking-wider">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  YETENEKLER
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddingAbility(true)}
                  className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Yeni yetenek ekle</span>
                </button>
              </div>

              {/* Categorized Abilities Overview */}
              <div className="text-[11px] font-mono text-zinc-400 mb-1">
                Moderasyon • Sunucu yönetimi • Kullanıcı yönetimi • Özel Fonksiyonlar
              </div>

              {/* Abilities Checklist Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {abilities.map((ability) => (
                  <label
                    key={ability.id}
                    onClick={() => handleToggleAbility(ability.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer select-none ${
                      ability.enabled
                        ? 'bg-zinc-950 border-cyan-500/50 text-zinc-100 shadow-sm'
                        : 'bg-zinc-950/60 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        ability.enabled
                          ? 'bg-cyan-500 border-cyan-400 text-zinc-950'
                          : 'border-zinc-700 bg-zinc-900'
                      }`}
                    >
                      {ability.enabled && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="text-xs font-mono font-medium truncate">{ability.name}</span>
                  </label>
                ))}
              </div>

              {/* Inline Add Ability Form */}
              {isAddingAbility && (
                <div className="p-3.5 rounded-lg bg-zinc-950 border border-cyan-500/40 flex items-center gap-3">
                  <input
                    type="text"
                    value={newAbilityName}
                    onChange={(e) => setNewAbilityName(e.target.value)}
                    placeholder="Yeni yetenek / yetki adı girin (örn. Otomatik yedek alma)..."
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-cyan-500"
                    autoFocus
                  />
                  <Button variant="primary" size="sm" onClick={handleAddAbility}>
                    Ekle
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsAddingAbility(false);
                      setNewAbilityName('');
                    }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>

            {/* 7. ACTION FOOTER BAR: [ KAYDET ] [ TEST ET ] */}
            <div className="p-6 bg-zinc-950 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs font-mono text-zinc-400">
                {saveSuccess ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <Check className="w-4 h-4" /> Tüm parametreler ve kurallar başarıyla kaydedildi.
                  </span>
                ) : (
                  <span>Tüm kişilik, davranış ve yetenek tanımlarını doğrulayın veya test edin.</span>
                )}
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleSaveAll}
                  disabled={isSaving}
                  className="flex-1 sm:flex-none px-8 py-3 rounded-xl font-mono text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-zinc-950 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      <span>KAYDEDİLİYOR...</span>
                    </>
                  ) : saveSuccess ? (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>KAYDEDİLDİ</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>[ KAYDET ]</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsTestModalOpen(true)}
                  className="flex-1 sm:flex-none px-8 py-3 rounded-xl font-mono text-xs font-bold uppercase tracking-wider bg-zinc-900 hover:bg-zinc-800 text-cyan-400 border border-cyan-500/50 hover:border-cyan-400 shadow-lg shadow-black/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 text-cyan-400" />
                  <span>[ TEST ET ]</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* --- TAB: OVERVIEW --- */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/50 space-y-3">
                <h3 className="text-sm font-semibold font-mono text-zinc-100 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  ÖZET VE GÖREV DETAYLARI
                </h3>
                <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-300 leading-relaxed font-sans min-h-[80px]">
                  {shortDescription || 'Açıklama belirtilmedi.'}
                </div>
              </div>

              <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/50 space-y-3">
                <h3 className="text-sm font-semibold font-mono text-zinc-100 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  IRK ÇERÇEVESİ
                </h3>
                <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1 font-mono text-xs">
                  <div className="text-zinc-200 font-bold">{character.raceName || 'Atanmadı'}</div>
                  <div className="text-zinc-500">ID: {character.raceId || 'N/A'}</div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/50 space-y-3">
                <h3 className="text-xs font-semibold font-mono text-zinc-300 uppercase tracking-wider">
                  METRİKLER VE ZAMAN DAMGASI
                </h3>
                <div className="space-y-2 font-mono text-xs">
                  <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800">
                    <div className="text-zinc-500 text-[11px]">DURUM</div>
                    <div className="text-zinc-200 mt-0.5 font-bold">● {status}</div>
                  </div>
                  <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800">
                    <div className="text-zinc-500 text-[11px]">OLUŞTURULMA</div>
                    <div className="text-zinc-200 mt-0.5">
                      {new Date(character.createdAt).toLocaleString('tr-TR')}
                    </div>
                  </div>
                  <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800">
                    <div className="text-zinc-500 text-[11px]">SON GÜNCELLEME</div>
                    <div className="text-zinc-200 mt-0.5">
                      {new Date(character.updatedAt).toLocaleString('tr-TR')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- PLACEHOLDER TABS --- */}
      {activeTab === 'knowledge' && (
        <div className="p-8 sm:p-12 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 text-cyan-400 flex items-center justify-center mx-auto">
            <Database className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold font-mono text-zinc-100">KÜLLİYAT & BİLGİ DEPOSU // YAKINDA</h3>
          <p className="text-xs text-zinc-400 max-w-lg mx-auto font-sans">
            Alana özel veri kaynakları, evren depoları ve vektörel bilgi aktarımı.
          </p>
        </div>
      )}

      {activeTab === 'memory' && (
        <div className="p-8 sm:p-12 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 text-cyan-400 flex items-center justify-center mx-auto">
            <Brain className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold font-mono text-zinc-100">HAFIZA MATRİSİ // YAKINDA</h3>
          <p className="text-xs text-zinc-400 max-w-lg mx-auto font-sans">
            Bölümsel oturum hafızası, kısa süreli arabellek ve uzun süreli çağrışımsal hatırlama.
          </p>
        </div>
      )}

      {activeTab === 'ai' && (
        <div className="p-8 sm:p-12 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 text-cyan-400 flex items-center justify-center mx-auto">
            <Cpu className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold font-mono text-zinc-100">YAPAY ZEKA YÖNERGELERİ // YAKINDA</h3>
          <p className="text-xs text-zinc-400 max-w-lg mx-auto font-sans">
            Model uç noktası yapılandırması, alt seviye sistem komutları ve çıkarım parametreleri.
          </p>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="p-8 sm:p-12 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 text-cyan-400 flex items-center justify-center mx-auto">
            <Terminal className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold font-mono text-zinc-100">OLAY KAYITLARI & TELEMETRİ // YAKINDA</h3>
          <p className="text-xs text-zinc-400 max-w-lg mx-auto font-sans">
            Bu varlık için denetim izleri, durum geçişleri ve sistem telemetrisi.
          </p>
        </div>
      )}

      {/* --- LIVE INTERACTIVE TEST SIMULATOR MODAL --- */}
      <CharacterTestModal
        character={currentCharacterForTest}
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        onExpressionChange={(expId) => setCurrentExpression(expId)}
      />
    </div>
  );
};

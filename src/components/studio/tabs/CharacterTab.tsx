import React, { useEffect, useMemo, useState } from 'react';
import {
  Brain,
  Check,
  ChevronDown,
  ChevronRight,
  CircleUserRound,
  Compass,
  Laugh,
  Loader2,
  MessageCircleMore,
  Save,
  Scale,
  Shield,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import {
  DroitPersonalityTraits,
  DroitDynamicState,
  DroitExpressionMode,
  DroitExpressionId,
  DroitExpressionAsset,
} from '../../../types/nexus';
import { DroitAvatar } from '../DroitAvatar';

interface CharacterTabProps {
  personality: DroitPersonalityTraits;
  dynamicState?: DroitDynamicState;
  expression: DroitExpressionMode;
  onExpressionChange: (exp: DroitExpressionMode) => void;
  expressionAssets?: Record<DroitExpressionId, DroitExpressionAsset | null>;
  onPersonalityChange: (partial: Partial<DroitPersonalityTraits>) => void;
  onSave: () => void;
  isSaved: boolean;
  isSaving: boolean;
}

type SectionId =
  | 'identity'
  | 'temperament'
  | 'personality'
  | 'motivation'
  | 'values'
  | 'preferences'
  | 'social'
  | 'boundaries'
  | 'expression';

type HumorParameterKey =
  | 'preference'
  | 'generationDrive'
  | 'detectionSensitivity'
  | 'riskTolerance'
  | 'inhibition';

type HumorTypeId =
  | 'absurd'
  | 'irony'
  | 'sarcasm'
  | 'dark'
  | 'affiliative'
  | 'aggressive'
  | 'selfDefeating'
  | 'wordplay';

type HumorParameterSet = Record<HumorParameterKey, number>;
type HumorProfile = Record<HumorTypeId, HumorParameterSet>;

const DEFAULT_IDENTITY = {
  name: 'KAIRA-01',
  type: 'Kaira',
  gender: 'Kadın',
  age: '',
  role: '',
  shortDescription: '',
};

const LAYERS = [
  { id: 'temperament' as const, label: 'Mizaç', subtitle: 'Doğal tepki mekanizmaları', icon: Sparkles },
  { id: 'personality' as const, label: 'Kişilik eğilimleri', subtitle: 'Genel davranış eğilimleri', icon: Brain },
  { id: 'motivation' as const, label: 'Motivasyonlar', subtitle: 'Davranışı ne sürüklüyor?', icon: Target },
  { id: 'values' as const, label: 'Değerler', subtitle: 'Neyi önemli kabul ediyor?', icon: Scale },
  { id: 'preferences' as const, label: 'Tercihler', subtitle: 'Neye yöneliyor?', icon: Compass },
  { id: 'social' as const, label: 'Sosyal yönelim', subtitle: 'İnsanlarla nasıl konumlanıyor?', icon: Users },
  { id: 'boundaries' as const, label: 'Sınırlar', subtitle: 'Nerede duruyor?', icon: Shield },
  { id: 'expression' as const, label: 'İfade tarzı', subtitle: 'Davranışı nasıl dışa vuruyor?', icon: MessageCircleMore },
];

const HUMOR_TYPES: Array<{ id: HumorTypeId; label: string; description: string }> = [
  { id: 'absurd', label: 'Absürt / sürreal', description: 'Mantık kırılması ve beklenmedik bağlantılar' },
  { id: 'irony', label: 'İroni', description: 'Söylenen ile kastedilen arasındaki terslik' },
  { id: 'sarcasm', label: 'Sarkazm', description: 'İğneleyici ve eleştirel ironi' },
  { id: 'dark', label: 'Kara mizah', description: 'Ağır veya tabu konular üzerinden mizah' },
  { id: 'affiliative', label: 'Yakınlaştırıcı', description: 'Bağ kurmak ve ortamı rahatlatmak için mizah' },
  { id: 'aggressive', label: 'Saldırgan', description: 'Alay, küçümseme veya hedefe yönelen mizah' },
  { id: 'selfDefeating', label: 'Kendini hedef alan', description: 'Kendisini şakanın hedefi yapma' },
  { id: 'wordplay', label: 'Kelime mizahı', description: 'Kelime oyunu, çift anlam ve dil oyunları' },
];

const HUMOR_PARAMETERS: Array<{ key: HumorParameterKey; label: string; help: string }> = [
  { key: 'preference', label: 'Hoşlanma', help: 'Bu mizah türünü ne kadar seviyor?' },
  { key: 'generationDrive', label: 'Üretme eğilimi', help: 'Uygun durumda kendiliğinden üretmeye ne kadar yatkın?' },
  { key: 'detectionSensitivity', label: 'Algılama hassasiyeti', help: 'Bu mizah biçimini ne kadar kolay fark ediyor?' },
  { key: 'riskTolerance', label: 'Sosyal risk toleransı', help: 'Yanlış anlaşılma ihtimaline rağmen kullanma eğilimi' },
  { key: 'inhibition', label: 'Baskılama gücü', help: 'Uygunsuz bağlamda kendini ne kadar güçlü frenliyor?' },
];

const DEFAULT_HUMOR_SET: HumorParameterSet = {
  preference: 50,
  generationDrive: 50,
  detectionSensitivity: 50,
  riskTolerance: 50,
  inhibition: 50,
};

const DEFAULT_HUMOR_PROFILE = HUMOR_TYPES.reduce((acc, type) => {
  acc[type.id] = { ...DEFAULT_HUMOR_SET };
  return acc;
}, {} as HumorProfile);

export const CharacterTab: React.FC<CharacterTabProps> = ({
  personality,
  expression,
  onPersonalityChange,
  onSave,
  isSaved,
  isSaving,
}) => {
  const [activeSection, setActiveSection] = useState<SectionId>('expression');
  const [identity, setIdentity] = useState(DEFAULT_IDENTITY);
  const [humorOpen, setHumorOpen] = useState(true);
  const [activeHumorType, setActiveHumorType] = useState<HumorTypeId>('absurd');
  const [humorProfile, setHumorProfile] = useState<HumorProfile>(DEFAULT_HUMOR_PROFILE);

  useEffect(() => {
    try {
      const savedIdentity = localStorage.getItem('kairo_identity_v2');
      const savedHumor = localStorage.getItem('kairo_humor_profile_v1');
      if (savedIdentity) setIdentity({ ...DEFAULT_IDENTITY, ...JSON.parse(savedIdentity) });
      if (savedHumor) setHumorProfile({ ...DEFAULT_HUMOR_PROFILE, ...JSON.parse(savedHumor) });
    } catch {
      // Keep defaults if local data is malformed.
    }
  }, []);

  const updateIdentity = (key: keyof typeof DEFAULT_IDENTITY, value: string) => {
    setIdentity((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem('kairo_identity_v2', JSON.stringify(next));
      return next;
    });
  };

  const updateHumorParameter = (typeId: HumorTypeId, key: HumorParameterKey, value: number) => {
    setHumorProfile((prev) => {
      const next: HumorProfile = {
        ...prev,
        [typeId]: {
          ...prev[typeId],
          [key]: value,
        },
      };
      localStorage.setItem('kairo_humor_profile_v1', JSON.stringify(next));

      const meanGeneration = Math.round(
        HUMOR_TYPES.reduce((sum, type) => sum + next[type.id].generationDrive, 0) / HUMOR_TYPES.length,
      );
      onPersonalityChange({ humor: meanGeneration });
      return next;
    });
  };

  const activeLayer = useMemo(() => LAYERS.find((layer) => layer.id === activeSection), [activeSection]);
  const selectedHumor = humorProfile[activeHumorType];
  const selectedHumorMeta = HUMOR_TYPES.find((type) => type.id === activeHumorType)!;

  return (
    <div className="flex-1 min-h-0 overflow-hidden bg-zinc-950 text-zinc-100">
      <div className="h-full p-3 flex flex-col gap-3">
        <header className="h-14 shrink-0 rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg border border-zinc-700 bg-zinc-950 overflow-hidden shrink-0">
              <DroitAvatar expression={expression} size="sm" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold truncate">{identity.name || 'Kaira-01'}</h1>
              <p className="text-[9px] text-zinc-500 truncate">Başlangıç karakter motoru</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className={`h-8 px-3 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition ${
              isSaved
                ? 'border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                : 'bg-indigo-600 text-white hover:bg-indigo-500'
            }`}
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isSaved ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5" />}
            {isSaving ? 'Kaydediliyor' : isSaved ? 'Kayıtlı' : 'Kaydet'}
          </button>
        </header>

        <div className="flex-1 min-h-0 grid grid-cols-[220px_minmax(0,1fr)] gap-3">
          <aside className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-2 flex flex-col overflow-hidden">
            <button
              type="button"
              onClick={() => setActiveSection('identity')}
              className={`mb-2 h-9 px-2.5 rounded-lg flex items-center gap-2 text-[11px] transition ${
                activeSection === 'identity'
                  ? 'bg-indigo-500/12 border border-indigo-500/25 text-indigo-200'
                  : 'text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200 border border-transparent'
              }`}
            >
              <CircleUserRound className="w-3.5 h-3.5" />
              Kimlik
            </button>

            <div className="border-t border-zinc-800 mb-2" />
            <p className="px-2 pb-2 text-[9px] uppercase tracking-[0.16em] text-zinc-600">Karakter motoru</p>

            <div className="space-y-1 min-h-0 overflow-y-auto pr-0.5">
              {LAYERS.map(({ id, label, subtitle, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveSection(id)}
                  className={`w-full min-h-[46px] px-2.5 py-2 rounded-lg flex items-start gap-2 text-left transition ${
                    activeSection === id
                      ? 'bg-indigo-500/12 border border-indigo-500/25 text-indigo-100'
                      : 'text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200 border border-transparent'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-[10.5px] font-medium">{label}</span>
                    <span className="block text-[8.5px] text-zinc-600 mt-0.5 leading-tight">{subtitle}</span>
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <main className="min-h-0 rounded-xl border border-zinc-800 bg-zinc-900/55 overflow-hidden flex flex-col">
            {activeSection === 'identity' ? (
              <IdentityEditor identity={identity} updateIdentity={updateIdentity} />
            ) : (
              <>
                <div className="h-14 shrink-0 px-5 border-b border-zinc-800 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.16em] text-zinc-600">{activeLayer?.label}</p>
                    <h2 className="text-sm font-semibold mt-0.5">{activeLayer?.subtitle}</h2>
                  </div>
                  <span className="text-[9px] font-mono text-zinc-600">0–100 PARAMETRE</span>
                </div>

                <div className="flex-1 min-h-0 p-4 overflow-y-auto">
                  {activeSection === 'expression' ? (
                    <div className="max-w-[1050px] space-y-2">
                      <button
                        type="button"
                        onClick={() => setHumorOpen((value) => !value)}
                        className="w-full h-11 rounded-lg border border-zinc-800 bg-zinc-950/45 px-3 flex items-center gap-2 text-left hover:border-zinc-700"
                      >
                        {humorOpen ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronRight className="w-4 h-4 text-zinc-500" />}
                        <Laugh className="w-4 h-4 text-indigo-400" />
                        <div>
                          <div className="text-[11px] font-medium">Mizah</div>
                          <div className="text-[8.5px] text-zinc-600">Tür → parametre → matematiksel davranış</div>
                        </div>
                        <span className="ml-auto text-[9px] text-zinc-600">8 alt katman</span>
                      </button>

                      {humorOpen && (
                        <div className="grid grid-cols-[220px_minmax(0,1fr)] gap-3 pt-1">
                          <div className="rounded-lg border border-zinc-800 bg-zinc-950/30 p-1.5 space-y-1">
                            {HUMOR_TYPES.map((type) => (
                              <button
                                key={type.id}
                                type="button"
                                onClick={() => setActiveHumorType(type.id)}
                                className={`w-full px-2.5 py-2 rounded-md text-left transition ${
                                  activeHumorType === type.id
                                    ? 'bg-indigo-500/15 text-indigo-100 border border-indigo-500/25'
                                    : 'border border-transparent text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                                }`}
                              >
                                <span className="block text-[10px] font-medium">{type.label}</span>
                                <span className="block mt-0.5 text-[8px] leading-tight text-zinc-600">{type.description}</span>
                              </button>
                            ))}
                          </div>

                          <div className="rounded-lg border border-zinc-800 bg-zinc-950/30 p-4">
                            <div className="mb-4 flex items-start justify-between gap-3">
                              <div>
                                <h3 className="text-[12px] font-semibold">{selectedHumorMeta.label}</h3>
                                <p className="mt-1 text-[9px] text-zinc-600">{selectedHumorMeta.description}</p>
                              </div>
                              <span className="text-[9px] font-mono text-zinc-700">humor.{activeHumorType}</span>
                            </div>

                            <div className="space-y-3">
                              {HUMOR_PARAMETERS.map((parameter) => (
                                <ParameterSlider
                                  key={parameter.key}
                                  label={parameter.label}
                                  help={parameter.help}
                                  value={selectedHumor[parameter.key]}
                                  onChange={(value) => updateHumorParameter(activeHumorType, parameter.key, value)}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="max-w-[850px] rounded-xl border border-zinc-800 bg-zinc-950/30 p-5">
                      <p className="text-[11px] text-zinc-400">Bu katmanın matematiksel alt parametrelerini sırayla kuracağız.</p>
                      <p className="mt-1 text-[9px] text-zinc-600">Şimdilik yalnızca Mizah katmanı gerçek parametre yapısına geçirildi.</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

function ParameterSlider({
  label,
  help,
  value,
  onChange,
}: {
  label: string;
  help: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/45 px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10.5px] font-medium text-zinc-300">{label}</div>
          <div className="mt-0.5 text-[8.5px] text-zinc-600 truncate">{help}</div>
        </div>
        <input
          type="number"
          min={0}
          max={100}
          value={value}
          onChange={(event) => onChange(Math.max(0, Math.min(100, Number(event.target.value))))}
          className="w-14 h-7 rounded-md border border-zinc-700 bg-zinc-950 text-center text-[10px] font-mono text-zinc-300 outline-none focus:border-indigo-500/60"
        />
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2.5 w-full h-1 accent-indigo-500 cursor-pointer"
      />
      <div className="mt-1 flex justify-between text-[8px] font-mono text-zinc-700">
        <span>0</span>
        <span>{value}</span>
        <span>100</span>
      </div>
    </div>
  );
}

function IdentityEditor({
  identity,
  updateIdentity,
}: {
  identity: typeof DEFAULT_IDENTITY;
  updateIdentity: (key: keyof typeof DEFAULT_IDENTITY, value: string) => void;
}) {
  return (
    <>
      <div className="h-14 shrink-0 px-5 border-b border-zinc-800 flex items-center">
        <div>
          <p className="text-[9px] uppercase tracking-[0.16em] text-zinc-600">KİMLİK</p>
          <h2 className="text-sm font-semibold mt-0.5">Bu birey kim?</h2>
        </div>
      </div>
      <div className="flex-1 min-h-0 p-5 grid grid-cols-2 gap-x-4 gap-y-3 content-start max-w-[900px] overflow-y-auto">
        <Field label="İsim" value={identity.name} onChange={(value) => updateIdentity('name', value)} />
        <Field label="Tür" value={identity.type} onChange={(value) => updateIdentity('type', value)} />
        <Field label="Cinsiyet" value={identity.gender} onChange={(value) => updateIdentity('gender', value)} />
        <Field label="Yaş" value={identity.age} onChange={(value) => updateIdentity('age', value)} />
        <Field label="Rol / uğraş" value={identity.role} onChange={(value) => updateIdentity('role', value)} />
        <div />
        <label className="col-span-2 block">
          <span className="text-[9px] uppercase tracking-[0.12em] text-zinc-600">Kısa tanım</span>
          <textarea
            value={identity.shortDescription}
            onChange={(event) => updateIdentity('shortDescription', event.target.value)}
            className="mt-1.5 w-full h-24 resize-none rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 text-[11px] text-zinc-200 outline-none focus:border-indigo-500/50"
          />
        </label>
      </div>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[9px] uppercase tracking-[0.12em] text-zinc-600">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 w-full h-9 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 text-[11px] text-zinc-200 outline-none focus:border-indigo-500/50"
      />
    </label>
  );
}

import React, { useEffect, useState } from 'react';
import {
  Check,
  CircleUserRound,
  History,
  Laugh,
  Loader2,
  Save,
  Scale,
  Shield,
  Sparkles,
  UserRound,
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

type SectionId = 'identity' | 'origin';

type TraitConfig = {
  key: keyof DroitPersonalityTraits;
  label: string;
  low: string;
  high: string;
};

const STARTING_TRAITS: TraitConfig[] = [
  { key: 'humor', label: 'Mizah eğilimi', low: 'Ciddi', high: 'Esprili' },
  { key: 'empathy', label: 'Empati eğilimi', low: 'Mesafeli', high: 'Destekleyici' },
  { key: 'selfConfidence', label: 'Özgüven', low: 'Çekingen', high: 'Kararlı' },
  { key: 'curiosity', label: 'Merak', low: 'Odaklı', high: 'Araştırmacı' },
  { key: 'authority', label: 'Otorite eğilimi', low: 'Eşitlikçi', high: 'Yönlendirici' },
  { key: 'analyticalThinking', label: 'Analitik düşünme', low: 'Pratik', high: 'Derin' },
  { key: 'patience', label: 'Sabır', low: 'Aceleci', high: 'Hoşgörülü' },
  { key: 'communication', label: 'İletişim yoğunluğu', low: 'Kısa', high: 'Açıklayıcı' },
];

const DEFAULT_IDENTITY = {
  name: 'KAIRA-01',
  type: 'Kaira',
  gender: 'Kadın',
  age: '',
  role: '',
  shortDescription: '',
};

const FUTURE_SECTIONS = [
  { label: 'Geçmiş', icon: History },
  { label: 'Değerler', icon: Scale },
  { label: 'Sınırlar', icon: Shield },
  { label: 'Mizah', icon: Laugh },
  { label: 'İlişkiler', icon: Users },
];

function clamp(value: number | undefined) {
  return Math.max(0, Math.min(100, value ?? 50));
}

export const CharacterTab: React.FC<CharacterTabProps> = ({
  personality,
  expression,
  onPersonalityChange,
  onSave,
  isSaved,
  isSaving,
}) => {
  const [activeSection, setActiveSection] = useState<SectionId>('origin');
  const [identity, setIdentity] = useState(DEFAULT_IDENTITY);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('kairo_identity_v2');
      if (saved) setIdentity({ ...DEFAULT_IDENTITY, ...JSON.parse(saved) });
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

  return (
    <div className="flex-1 min-h-0 overflow-hidden bg-zinc-950 text-zinc-100">
      <div className="h-full p-3 flex flex-col gap-3">
        <header className="h-16 shrink-0 rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-lg border border-zinc-700 bg-zinc-950 overflow-hidden shrink-0">
              <DroitAvatar expression={expression} size="sm" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold truncate">{identity.name || 'Kaira-01'}</h1>
                <span className="text-[9px] px-1.5 py-0.5 rounded border border-zinc-700 text-zinc-500">BİREY TASLAĞI</span>
              </div>
              <p className="text-[10px] text-zinc-500 truncate">
                {[identity.type, identity.gender, identity.age ? `${identity.age} yaş` : null].filter(Boolean).join(' · ')}
              </p>
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
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isSaved ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {isSaving ? 'Kaydediliyor' : isSaved ? 'Kayıtlı' : 'Kaydet'}
          </button>
        </header>

        <div className="flex-1 min-h-0 grid grid-cols-[170px_minmax(0,1fr)] gap-3">
          <aside className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-2 flex flex-col overflow-hidden">
            <p className="px-2 pt-1 pb-2 text-[9px] uppercase tracking-[0.16em] text-zinc-600">Kaira dosyası</p>

            <button
              type="button"
              onClick={() => setActiveSection('identity')}
              className={`h-9 px-2.5 rounded-lg flex items-center gap-2 text-[11px] transition ${
                activeSection === 'identity'
                  ? 'bg-indigo-500/12 border border-indigo-500/25 text-indigo-200'
                  : 'text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200 border border-transparent'
              }`}
            >
              <CircleUserRound className="w-3.5 h-3.5" />
              Kimlik
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('origin')}
              className={`h-9 px-2.5 rounded-lg flex items-center gap-2 text-[11px] transition ${
                activeSection === 'origin'
                  ? 'bg-indigo-500/12 border border-indigo-500/25 text-indigo-200'
                  : 'text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200 border border-transparent'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Başlangıç
            </button>

            <div className="my-2 border-t border-zinc-800" />
            <p className="px-2 pb-1.5 text-[9px] uppercase tracking-[0.14em] text-zinc-700">Sonraki katmanlar</p>

            {FUTURE_SECTIONS.map(({ label, icon: Icon }) => (
              <div key={label} className="h-8 px-2.5 flex items-center gap-2 text-[10px] text-zinc-700 select-none">
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
                <span className="ml-auto text-[8px]">—</span>
              </div>
            ))}
          </aside>

          <main className="min-h-0 rounded-xl border border-zinc-800 bg-zinc-900/55 overflow-hidden flex flex-col">
            {activeSection === 'identity' ? (
              <>
                <div className="h-14 shrink-0 px-5 border-b border-zinc-800 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.16em] text-zinc-600">KİMLİK</p>
                    <h2 className="text-sm font-semibold mt-0.5">Bu birey kim?</h2>
                  </div>
                  <UserRound className="w-4 h-4 text-zinc-700" />
                </div>

                <div className="flex-1 min-h-0 p-5 grid grid-cols-2 gap-x-4 gap-y-3 content-start max-w-[920px]">
                  <Field label="İsim" value={identity.name} onChange={(value) => updateIdentity('name', value)} />
                  <Field label="Tür" value={identity.type} onChange={(value) => updateIdentity('type', value)} />
                  <Field label="Cinsiyet" value={identity.gender} onChange={(value) => updateIdentity('gender', value)} />
                  <Field label="Yaş" value={identity.age} onChange={(value) => updateIdentity('age', value)} placeholder="Henüz belirlenmedi" />
                  <Field label="Rol / uğraş" value={identity.role} onChange={(value) => updateIdentity('role', value)} placeholder="Henüz belirlenmedi" />
                  <div />
                  <label className="col-span-2 block">
                    <span className="text-[9px] uppercase tracking-[0.12em] text-zinc-600">Kısa tanım</span>
                    <textarea
                      value={identity.shortDescription}
                      onChange={(event) => updateIdentity('shortDescription', event.target.value)}
                      placeholder="Kaira-01'i tek paragrafta tanımlayan not. Şimdilik boş kalabilir."
                      className="mt-1.5 w-full h-24 resize-none rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 text-[11px] text-zinc-200 placeholder:text-zinc-700 outline-none focus:border-indigo-500/50"
                    />
                  </label>
                </div>
              </>
            ) : (
              <>
                <div className="h-14 shrink-0 px-5 border-b border-zinc-800 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.16em] text-zinc-600">BAŞLANGIÇ ÖZELLİKLERİ</p>
                    <h2 className="text-sm font-semibold mt-0.5">Kaira-01 yaşam başlamadan önce nasıl bir birey?</h2>
                  </div>
                  <span className="text-[9px] text-amber-500/70 whitespace-nowrap">MODEL GELİŞTİRİLİYOR</span>
                </div>

                <div className="flex-1 min-h-0 p-4 flex flex-col gap-3 overflow-hidden">
                  <div className="shrink-0 rounded-lg border border-amber-500/15 bg-amber-500/[0.04] px-3 py-2 flex items-center gap-2 text-[9.5px] text-zinc-500">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500/60 shrink-0" />
                    Bu alan panel yerleşimini kurar. Aşağıdaki mevcut özellikler nihai bilimsel başlangıç modeli değildir; model netleştikçe burada değişecek.
                  </div>

                  <div className="flex-1 min-h-0 grid grid-cols-2 gap-x-3 gap-y-2 content-start">
                    {STARTING_TRAITS.map((trait) => {
                      const value = clamp(personality[trait.key]);
                      return (
                        <div key={trait.key} className="h-[68px] rounded-lg border border-zinc-800 bg-zinc-950/35 px-3 py-2">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[10.5px] font-medium text-zinc-300 truncate">{trait.label}</span>
                            <span className="text-[10px] font-mono text-zinc-500 shrink-0">{value}</span>
                          </div>
                          <input
                            aria-label={trait.label}
                            type="range"
                            min="0"
                            max="100"
                            value={value}
                            onChange={(event) =>
                              onPersonalityChange({
                                [trait.key]: Number(event.target.value),
                              } as Partial<DroitPersonalityTraits>)
                            }
                            className="mt-2 w-full h-1 accent-indigo-500 cursor-pointer"
                          />
                          <div className="mt-1 flex items-center justify-between text-[8px] text-zinc-700">
                            <span>{trait.low}</span>
                            <span>{trait.high}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[9px] uppercase tracking-[0.12em] text-zinc-600">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full h-9 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 text-[11px] text-zinc-200 placeholder:text-zinc-700 outline-none focus:border-indigo-500/50"
      />
    </label>
  );
}

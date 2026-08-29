import React, { useEffect, useMemo, useState } from 'react';
import {
  Brain,
  Check,
  CircleUserRound,
  Compass,
  HeartHandshake,
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

type ProfileNotes = {
  motivations: string[];
  values: string[];
  likes: string;
  dislikes: string;
  boundaries: string;
  sensitivities: string;
};

const DEFAULT_IDENTITY = {
  name: 'KAIRA-01',
  type: 'Kaira',
  gender: 'Kadın',
  age: '',
  role: '',
  shortDescription: '',
};

const DEFAULT_PROFILE_NOTES: ProfileNotes = {
  motivations: [],
  values: [],
  likes: '',
  dislikes: '',
  boundaries: '',
  sensitivities: '',
};

const MOTIVATION_OPTIONS = ['Bağ kurmak', 'Bağımsızlık', 'Keşfetmek', 'Başarmak', 'Güvenlik', 'Etki yaratmak'];
const VALUE_OPTIONS = ['Dürüstlük', 'Saygı', 'Sadakat', 'Adalet', 'Özgürlük', 'Mahremiyet', 'Şefkat', 'Sorumluluk'];

const LAYERS = [
  { id: 'temperament' as const, label: 'Mizaç', subtitle: 'Doğal tepki eğilimleri', icon: Sparkles },
  { id: 'personality' as const, label: 'Kişilik eğilimleri', subtitle: 'Genel davranış biçimi', icon: Brain },
  { id: 'motivation' as const, label: 'Motivasyonlar', subtitle: 'Neyin peşinden gider?', icon: Target },
  { id: 'values' as const, label: 'Değerler', subtitle: 'Neyi önemli ve doğru bulur?', icon: Scale },
  { id: 'preferences' as const, label: 'Tercihler', subtitle: 'Neyi sever, sevmez?', icon: Compass },
  { id: 'social' as const, label: 'Sosyal yönelim', subtitle: 'İnsanlarla nasıl konumlanır?', icon: Users },
  { id: 'boundaries' as const, label: 'Sınırlar', subtitle: 'Neyi kabul etmez?', icon: Shield },
  { id: 'expression' as const, label: 'İfade tarzı', subtitle: 'Kendini nasıl dışa vurur?', icon: MessageCircleMore },
];

export const CharacterTab: React.FC<CharacterTabProps> = ({
  personality,
  expression,
  onPersonalityChange,
  onSave,
  isSaved,
  isSaving,
}) => {
  const [activeSection, setActiveSection] = useState<SectionId>('temperament');
  const [identity, setIdentity] = useState(DEFAULT_IDENTITY);
  const [notes, setNotes] = useState<ProfileNotes>(DEFAULT_PROFILE_NOTES);

  useEffect(() => {
    try {
      const savedIdentity = localStorage.getItem('kairo_identity_v2');
      const savedNotes = localStorage.getItem('kairo_character_profile_v1');
      if (savedIdentity) setIdentity({ ...DEFAULT_IDENTITY, ...JSON.parse(savedIdentity) });
      if (savedNotes) setNotes({ ...DEFAULT_PROFILE_NOTES, ...JSON.parse(savedNotes) });
    } catch {
      // Keep safe defaults when local data is malformed.
    }
  }, []);

  const updateIdentity = (key: keyof typeof DEFAULT_IDENTITY, value: string) => {
    setIdentity((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem('kairo_identity_v2', JSON.stringify(next));
      return next;
    });
  };

  const updateNotes = (partial: Partial<ProfileNotes>) => {
    setNotes((prev) => {
      const next = { ...prev, ...partial };
      localStorage.setItem('kairo_character_profile_v1', JSON.stringify(next));
      return next;
    });
  };

  const toggleListValue = (key: 'motivations' | 'values', value: string) => {
    const current = notes[key];
    updateNotes({ [key]: current.includes(value) ? current.filter((item) => item !== value) : [...current, value] });
  };

  const activeLayer = useMemo(() => LAYERS.find((layer) => layer.id === activeSection), [activeSection]);

  return (
    <div className="flex-1 min-h-0 overflow-hidden bg-zinc-950 text-zinc-100">
      <div className="h-full p-3 flex flex-col gap-3">
        <header className="h-14 shrink-0 rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg border border-zinc-700 bg-zinc-950 overflow-hidden shrink-0">
              <DroitAvatar expression={expression} size="sm" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold truncate">{identity.name || 'Kaira-01'}</h1>
                <span className="text-[8px] px-1.5 py-0.5 rounded border border-zinc-700 text-zinc-500">BİREY TASLAĞI</span>
              </div>
              <p className="text-[9px] text-zinc-500 truncate">Başlangıç karakter profili</p>
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
            <p className="px-2 pb-2 text-[9px] uppercase tracking-[0.16em] text-zinc-600">Başlangıç karakteri</p>

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
                  <span className="text-[9px] text-zinc-600">Kolay düzenleme</span>
                </div>

                <div className="flex-1 min-h-0 p-5 overflow-y-auto">
                  {activeSection === 'temperament' && (
                    <SimpleTraitGrid
                      items={[
                        { key: 'patience', title: 'Tepki eşiği', description: 'Gerilim ve tekrar karşısında ne kadar çabuk tepki verir?', options: [['Çabuk tepki', 25], ['Dengeli', 50], ['Yüksek tolerans', 80]] },
                        { key: 'curiosity', title: 'Keşif eğilimi', description: 'Yeni şeylere yönelme isteği ne kadar güçlü?', options: [['Odaklı', 30], ['Meraklı', 55], ['Keşifçi', 85]] },
                      ]}
                      personality={personality}
                      onChange={onPersonalityChange}
                    />
                  )}

                  {activeSection === 'personality' && (
                    <SimpleTraitGrid
                      items={[
                        { key: 'selfConfidence', title: 'Kendini ortaya koyma', description: 'Kararlarında ve görüşlerinde ne kadar net durur?', options: [['Temkinli', 30], ['Dengeli', 55], ['Kararlı', 85]] },
                        { key: 'analyticalThinking', title: 'Düşünme tarzı', description: 'Pratik tepki mi, daha derin analiz mi?', options: [['Pratik', 30], ['Dengeli', 55], ['Derin analiz', 85]] },
                      ]}
                      personality={personality}
                      onChange={onPersonalityChange}
                    />
                  )}

                  {activeSection === 'motivation' && (
                    <ChoiceEditor title="Kaira'yı doğal olarak neler çeker?" help="Birden fazlasını seçebilirsin. Bunlar kesin hedef değil, başlangıç yönelimleri." options={MOTIVATION_OPTIONS} selected={notes.motivations} onToggle={(value) => toggleListValue('motivations', value)} />
                  )}

                  {activeSection === 'values' && (
                    <ChoiceEditor title="Kaira için hangi ilkeler özellikle önemli?" help="Değerleri sayı vermeden seçiyoruz. Öncelik ve çatışma kurallarını daha sonra bilimsel modele bağlayacağız." options={VALUE_OPTIONS} selected={notes.values} onToggle={(value) => toggleListValue('values', value)} />
                  )}

                  {activeSection === 'preferences' && (
                    <TwoTextEditor
                      firstLabel="Sevdiği / hoşlandığı şeyler"
                      firstPlaceholder="Örn. absürt mizah, uzun gece sohbetleri, rekabet..."
                      firstValue={notes.likes}
                      onFirst={(value) => updateNotes({ likes: value })}
                      secondLabel="Sevmediği / itici bulduğu şeyler"
                      secondPlaceholder="Örn. yapmacıklık, tekrar, aşırı resmiyet..."
                      secondValue={notes.dislikes}
                      onSecond={(value) => updateNotes({ dislikes: value })}
                    />
                  )}

                  {activeSection === 'social' && (
                    <SimpleTraitGrid
                      items={[
                        { key: 'empathy', title: 'Yakınlık tarzı', description: 'İnsanlara yaklaşırken ne kadar sıcak ve destekleyici?', options: [['Mesafeli', 30], ['Dengeli', 55], ['Sıcak', 85]] },
                        { key: 'authority', title: 'Sosyal duruş', description: 'Eşitlikçi mi, yönlendirici mi?', options: [['Eşitlikçi', 25], ['Dengeli', 50], ['Yönlendirici', 80]] },
                      ]}
                      personality={personality}
                      onChange={onPersonalityChange}
                    />
                  )}

                  {activeSection === 'boundaries' && (
                    <TwoTextEditor
                      firstLabel="Kırmızı çizgiler"
                      firstPlaceholder="Asla normalleştirmeyeceği davranışlar..."
                      firstValue={notes.boundaries}
                      onFirst={(value) => updateNotes({ boundaries: value })}
                      secondLabel="Hassas konular"
                      secondPlaceholder="Bağlama göre daha dikkatli değerlendireceği konular..."
                      secondValue={notes.sensitivities}
                      onSecond={(value) => updateNotes({ sensitivities: value })}
                    />
                  )}

                  {activeSection === 'expression' && (
                    <SimpleTraitGrid
                      items={[
                        { key: 'humor', title: 'Mizah kullanımı', description: 'Konuşmada mizaha ne kadar sık başvurur?', options: [['Nadiren', 25], ['Yerinde', 55], ['Sık', 80]] },
                        { key: 'communication', title: 'Konuşma yoğunluğu', description: 'Kısa mı konuşur, ayrıntılı mı?', options: [['Kısa', 25], ['Dengeli', 50], ['Açıklayıcı', 80]] },
                      ]}
                      personality={personality}
                      onChange={onPersonalityChange}
                    />
                  )}

                  <div className="mt-5 rounded-lg border border-zinc-800 bg-zinc-950/35 px-3 py-2.5 text-[9px] leading-relaxed text-zinc-600">
                    Bu ekran insan tarafından kolay düzenleme içindir. Arkadaki sayısal değerler sadece mevcut motorla uyumluluk için tutuluyor; karakteri tek başına bu sayılar tanımlamayacak.
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

function IdentityEditor({
  identity,
  updateIdentity,
}: {
  identity: typeof DEFAULT_IDENTITY;
  updateIdentity: (key: keyof typeof DEFAULT_IDENTITY, value: string) => void;
}) {
  return (
    <>
      <div className="h-14 shrink-0 px-5 border-b border-zinc-800 flex items-center justify-between">
        <div>
          <p className="text-[9px] uppercase tracking-[0.16em] text-zinc-600">KİMLİK</p>
          <h2 className="text-sm font-semibold mt-0.5">Bu birey kim?</h2>
        </div>
        <CircleUserRound className="w-4 h-4 text-zinc-700" />
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
          <textarea value={identity.shortDescription} onChange={(event) => updateIdentity('shortDescription', event.target.value)} placeholder="Bu bireyi kısa şekilde tanımlayan not." className="mt-1.5 w-full h-24 resize-none rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 text-[11px] text-zinc-200 placeholder:text-zinc-700 outline-none focus:border-indigo-500/50" />
        </label>
      </div>
    </>
  );
}

type TraitItem = {
  key: keyof DroitPersonalityTraits;
  title: string;
  description: string;
  options: Array<[string, number]>;
};

function SimpleTraitGrid({
  items,
  personality,
  onChange,
}: {
  items: TraitItem[];
  personality: DroitPersonalityTraits;
  onChange: (partial: Partial<DroitPersonalityTraits>) => void;
}) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      {items.map((item) => {
        const current = Number(personality[item.key] ?? 50);
        const selectedIndex = item.options.reduce((best, option, index) => Math.abs(option[1] - current) < Math.abs(item.options[best][1] - current) ? index : best, 0);
        return (
          <div key={String(item.key)} className="rounded-xl border border-zinc-800 bg-zinc-950/35 p-4">
            <h3 className="text-[12px] font-semibold text-zinc-200">{item.title}</h3>
            <p className="text-[9.5px] text-zinc-600 mt-1 leading-relaxed">{item.description}</p>
            <div className="grid grid-cols-3 gap-2 mt-4">
              {item.options.map(([label, value], index) => (
                <button key={label} type="button" onClick={() => onChange({ [item.key]: value } as Partial<DroitPersonalityTraits>)} className={`h-9 rounded-lg border text-[10px] transition ${selectedIndex === index ? 'border-indigo-500/40 bg-indigo-500/12 text-indigo-200' : 'border-zinc-800 bg-zinc-900/60 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'}`}>{label}</button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ChoiceEditor({
  title,
  help,
  options,
  selected,
  onToggle,
}: {
  title: string;
  help: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="max-w-[860px]">
      <h3 className="text-[13px] font-semibold text-zinc-200">{title}</h3>
      <p className="text-[9.5px] text-zinc-600 mt-1">{help}</p>
      <div className="flex flex-wrap gap-2 mt-4">
        {options.map((option) => {
          const active = selected.includes(option);
          return <button key={option} type="button" onClick={() => onToggle(option)} className={`h-9 px-3 rounded-lg border text-[10px] transition ${active ? 'border-indigo-500/40 bg-indigo-500/12 text-indigo-200' : 'border-zinc-800 bg-zinc-950/40 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'}`}>{active && <Check className="inline w-3 h-3 mr-1.5" />}{option}</button>;
        })}
      </div>
    </div>
  );
}

function TwoTextEditor({
  firstLabel,
  firstPlaceholder,
  firstValue,
  onFirst,
  secondLabel,
  secondPlaceholder,
  secondValue,
  onSecond,
}: {
  firstLabel: string;
  firstPlaceholder: string;
  firstValue: string;
  onFirst: (value: string) => void;
  secondLabel: string;
  secondPlaceholder: string;
  secondValue: string;
  onSecond: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 max-w-[980px]">
      <TextAreaCard label={firstLabel} placeholder={firstPlaceholder} value={firstValue} onChange={onFirst} icon={<HeartHandshake className="w-4 h-4" />} />
      <TextAreaCard label={secondLabel} placeholder={secondPlaceholder} value={secondValue} onChange={onSecond} icon={<Shield className="w-4 h-4" />} />
    </div>
  );
}

function TextAreaCard({ label, placeholder, value, onChange, icon }: { label: string; placeholder: string; value: string; onChange: (value: string) => void; icon: React.ReactNode }) {
  return (
    <label className="rounded-xl border border-zinc-800 bg-zinc-950/35 p-4 block">
      <span className="flex items-center gap-2 text-[11px] font-medium text-zinc-300">{icon}{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-3 w-full h-28 resize-none rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 text-[10px] text-zinc-300 placeholder:text-zinc-700 outline-none focus:border-indigo-500/50" />
    </label>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-[9px] uppercase tracking-[0.12em] text-zinc-600">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-1.5 w-full h-9 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 text-[11px] text-zinc-200 placeholder:text-zinc-700 outline-none focus:border-indigo-500/50" />
    </label>
  );
}

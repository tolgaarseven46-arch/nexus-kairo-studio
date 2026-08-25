import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  Brain,
  Check,
  Edit3,
  Heart,
  Loader2,
  MessageSquare,
  Save,
  ShieldCheck,
  Smile,
  Sparkles,
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

type TraitConfig = {
  key: keyof DroitPersonalityTraits;
  label: string;
  low: string;
  high: string;
  icon: React.ComponentType<{ className?: string }>;
};

const CORE_TRAITS: TraitConfig[] = [
  { key: 'humor', label: 'Mizah', low: 'Ciddi', high: 'Esprili', icon: Smile },
  { key: 'empathy', label: 'Empati', low: 'Rasyonel', high: 'Destekleyici', icon: Heart },
  { key: 'selfConfidence', label: 'Özgüven', low: 'Mütevazı', high: 'Kararlı', icon: Award },
  { key: 'curiosity', label: 'Merak', low: 'Odaklı', high: 'Araştırmacı', icon: Sparkles },
  { key: 'authority', label: 'Otorite', low: 'Eşitlikçi', high: 'Yönetici', icon: ShieldCheck },
  { key: 'analyticalThinking', label: 'Analitik Mantık', low: 'Pratik', high: 'Derin Mantık', icon: Brain },
  { key: 'patience', label: 'Sabır', low: 'Aceleci', high: 'Hoşgörülü', icon: Heart },
  { key: 'communication', label: 'İletişim', low: 'Kısa & Öz', high: 'Açıklayıcı', icon: MessageSquare },
];

const DEFAULT_IDENTITY = {
  name: 'KAIRA',
  role: 'Nexus Çekirdek Asistanı',
  origin: 'Sentetik Droit • Nexus OS',
  bio: 'Rasyonel, esprili ve duruma göre uyum sağlayan dijital karakter.',
};

const DEFAULT_RULES = [
  'Bilmediği bilgiyi uydurmaz; belirsizliği açıkça belirtir.',
  'Kullanıcıya karşı saygılı kalır fakat gerektiğinde sınır koyar.',
  'Mizahı bağlama göre kullanır; kritik durumlarda ciddiyeti korur.',
  'Kişiliğini korurken konuşmanın bağlamına göre üslubunu değiştirebilir.',
];

const DEFAULT_DYNAMIC_STATE: DroitDynamicState = {
  calmness: 70,
  anger: 15,
  stress: 20,
  happiness: 60,
  confidence: 65,
  surprise: 10,
  lastStatus: 'Sakin ve dengeli.',
};

function clamp(value: number | undefined) {
  return Math.max(0, Math.min(100, value ?? 50));
}

function traitWord(value: number) {
  if (value < 25) return 'Düşük';
  if (value < 45) return 'Temkinli';
  if (value < 65) return 'Dengeli';
  if (value < 85) return 'Belirgin';
  return 'Yüksek';
}

function stateLabel(value: number) {
  if (value < 25) return 'Düşük';
  if (value < 50) return 'Ilımlı';
  if (value < 75) return 'Belirgin';
  return 'Yüksek';
}

export const CharacterTab: React.FC<CharacterTabProps> = ({
  personality,
  dynamicState,
  expression,
  onPersonalityChange,
  onSave,
  isSaved,
  isSaving,
}) => {
  const [identity, setIdentity] = useState(DEFAULT_IDENTITY);
  const [editingIdentity, setEditingIdentity] = useState(false);
  const [rules, setRules] = useState<string[]>(DEFAULT_RULES);
  const [editingRules, setEditingRules] = useState(false);
  const [rulesDraft, setRulesDraft] = useState(DEFAULT_RULES.join('\n'));

  const currentState = dynamicState ?? DEFAULT_DYNAMIC_STATE;

  useEffect(() => {
    try {
      const savedIdentity = localStorage.getItem('kairo_identity');
      const savedRules = localStorage.getItem('kairo_lore_rules');
      if (savedIdentity) setIdentity(JSON.parse(savedIdentity));
      if (savedRules) {
        const parsed = JSON.parse(savedRules);
        if (Array.isArray(parsed)) {
          setRules(parsed);
          setRulesDraft(parsed.join('\n'));
        }
      }
    } catch {
      // Keep safe defaults if old local data is malformed.
    }
  }, []);

  const summary = useMemo(() => {
    const dominant = [...CORE_TRAITS]
      .map((trait) => ({ label: trait.label, value: clamp(personality[trait.key]) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);

    const speech = personality.communication >= 65 ? 'Açıklayıcı' : personality.communication <= 35 ? 'Kısa & Öz' : 'Dengeli';
    const tone = personality.humor >= 65 ? 'Esprili' : personality.seriousness >= 70 ? 'Ciddi' : 'Dengeli';
    const social = personality.empathy >= 65 ? 'Samimi / destekleyici' : 'Mesafeli / rasyonel';

    return { dominant, speech, tone, social };
  }, [personality]);

  const saveIdentity = () => {
    localStorage.setItem('kairo_identity', JSON.stringify(identity));
    setEditingIdentity(false);
  };

  const saveRules = () => {
    const nextRules = rulesDraft.split('\n').map((rule) => rule.trim()).filter(Boolean);
    setRules(nextRules);
    localStorage.setItem('kairo_lore_rules', JSON.stringify(nextRules));
    setEditingRules(false);
  };

  const dynamicMetrics = [
    { key: 'calmness', label: 'Sakinlik', value: currentState.calmness, icon: Heart, low: 'Gergin', high: 'Sakin' },
    { key: 'anger', label: 'Sinirlilik', value: currentState.anger, icon: ShieldCheck, low: 'Sakin', high: 'Tepkili' },
    { key: 'stress', label: 'Stres', value: currentState.stress, icon: Brain, low: 'Rahat', high: 'Baskı altında' },
    { key: 'happiness', label: 'Mutluluk', value: currentState.happiness, icon: Smile, low: 'Keyifsiz', high: 'Mutlu' },
    { key: 'confidence', label: 'Anlık özgüven', value: currentState.confidence, icon: Award, low: 'Çekingen', high: 'Kendinden emin' },
    { key: 'surprise', label: 'Şaşkınlık', value: currentState.surprise, icon: Sparkles, low: 'Beklenen', high: 'Şaşırtıcı' },
  ];

  return (
    <div className="flex-1 min-h-0 overflow-hidden bg-zinc-950 text-zinc-100 font-sans">
      <div className="h-full max-w-[1500px] mx-auto p-3 sm:p-4 flex flex-col gap-3">
        <header className="shrink-0 h-14 rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg border border-indigo-500/30 bg-zinc-950 overflow-hidden shrink-0">
              <DroitAvatar expression={expression} size="sm" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold tracking-wide">Karakter</h1>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">AKTİF</span>
              </div>
              <p className="text-[10px] text-zinc-500 truncate">Kaira'nın sabit karakterini ve anlık durumunu tek ekranda yönet</p>
            </div>
          </div>
          <button type="button" onClick={onSave} disabled={isSaving} className={`h-8 px-3 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition ${isSaved ? 'border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800' : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-900/20'}`}>
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isSaved ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5" />}
            {isSaving ? 'Kaydediliyor' : isSaved ? 'Kayıtlı' : 'Kaydet'}
          </button>
        </header>

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[260px_minmax(420px,1fr)_280px] gap-3 overflow-hidden">
          <section className="min-h-0 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60 flex flex-col">
            <div className="p-4 border-b border-zinc-800/80">
              <div className="flex items-center justify-between mb-3">
                <div><p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Kimlik</p><h2 className="text-sm font-semibold mt-1">Kaira</h2></div>
                <button type="button" onClick={() => setEditingIdentity((v) => !v)} className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800" title="Kimliği düzenle"><Edit3 className="w-3.5 h-3.5" /></button>
              </div>
              <div className="flex justify-center mb-3"><div className="w-24 h-24 rounded-2xl border border-indigo-500/20 bg-zinc-950 overflow-hidden shadow-inner"><DroitAvatar expression={expression} size="lg" /></div></div>
              {editingIdentity ? (
                <div className="space-y-2">
                  {(['name', 'role', 'origin', 'bio'] as const).map((key) => <input key={key} value={identity[key]} onChange={(e) => setIdentity((prev) => ({ ...prev, [key]: e.target.value }))} className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-2 text-[10px] text-zinc-200 outline-none focus:border-indigo-500" placeholder={key} />)}
                  <button type="button" onClick={saveIdentity} className="w-full h-7 rounded-md bg-zinc-800 hover:bg-zinc-700 text-[10px]">Kimliği Kaydet</button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div><p className="text-[9px] text-zinc-500">ROL</p><p className="text-[11px] text-zinc-200 mt-0.5">{identity.role}</p></div>
                  <div><p className="text-[9px] text-zinc-500">KÖKEN</p><p className="text-[10px] text-zinc-400 mt-0.5">{identity.origin}</p></div>
                  <div><p className="text-[9px] text-zinc-500">KISA TANIM</p><p className="text-[10px] leading-relaxed text-zinc-400 mt-0.5">{identity.bio}</p></div>
                </div>
              )}
            </div>
            <div className="p-4 min-h-0 flex-1 overflow-hidden">
              <div className="flex items-center justify-between mb-2"><div><p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Karakter kuralları</p><p className="text-[9px] text-zinc-600 mt-0.5">Değişmemesi gereken temel prensipler</p></div><button type="button" onClick={() => setEditingRules((v) => !v)} className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800" title="Kuralları düzenle"><Edit3 className="w-3.5 h-3.5" /></button></div>
              {editingRules ? (
                <div className="h-[calc(100%-42px)] flex flex-col gap-2"><textarea value={rulesDraft} onChange={(e) => setRulesDraft(e.target.value)} className="flex-1 min-h-0 w-full resize-none rounded-lg border border-zinc-700 bg-zinc-950 p-2.5 text-[10px] leading-relaxed text-zinc-300 outline-none focus:border-indigo-500" /><button type="button" onClick={saveRules} className="h-7 rounded-md bg-zinc-800 hover:bg-zinc-700 text-[10px]">Kuralları Kaydet</button></div>
              ) : (
                <div className="space-y-1.5 overflow-hidden">{rules.slice(0, 5).map((rule, index) => <div key={`${rule}-${index}`} className="flex gap-2 rounded-lg border border-zinc-800/70 bg-zinc-950/40 p-2"><span className="text-[9px] font-mono text-indigo-400/70 mt-0.5">0{index + 1}</span><p className="text-[9.5px] leading-relaxed text-zinc-400">{rule}</p></div>)}</div>
              )}
            </div>
          </section>

          <section className="min-h-0 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60 flex flex-col">
            <div className="px-4 py-3 border-b border-zinc-800/80 flex items-center justify-between"><div><p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Temel kişilik</p><h2 className="text-sm font-semibold mt-1">Kaira'nın davranış eğilimleri</h2></div><span className="text-[9px] text-zinc-600">0 — 100</span></div>
            <div className="flex-1 min-h-0 p-3 overflow-hidden grid grid-cols-1 sm:grid-cols-2 gap-2.5 auto-rows-min content-start">
              {CORE_TRAITS.map((trait) => { const value = clamp(personality[trait.key]); const Icon = trait.icon; return <div key={trait.key} className="rounded-lg border border-zinc-800/90 bg-zinc-950/35 px-3 py-2.5"><div className="flex items-center justify-between gap-2 mb-2"><div className="flex items-center gap-2 min-w-0"><Icon className="w-3.5 h-3.5 text-indigo-400 shrink-0" /><span className="text-[11px] font-medium text-zinc-200 truncate">{trait.label}</span></div><span className="text-[10px] font-mono text-indigo-300">{value}</span></div><input aria-label={trait.label} type="range" min="0" max="100" value={value} onChange={(e) => onPersonalityChange({ [trait.key]: Number(e.target.value) } as Partial<DroitPersonalityTraits>)} className="w-full accent-indigo-500 h-1 cursor-pointer" /><div className="flex justify-between mt-1 text-[8px] text-zinc-600"><span>{trait.low}</span><span>{trait.high}</span></div></div>; })}
            </div>
            <div className="shrink-0 border-t border-zinc-800/80 px-4 py-2.5"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-[9px] text-zinc-600 uppercase tracking-wider">Karakter özeti</p><p className="text-[10px] text-zinc-400 truncate">{summary.dominant.map((item) => item.label).join(' • ')}</p></div><span className="text-[9px] px-2 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 shrink-0">{summary.dominant[0]?.label || 'Dengeli'} baskın</span></div></div>
          </section>

          <section className="min-h-0 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60 flex flex-col">
            <div className="p-4 border-b border-zinc-800/80"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Anlık durum</p><h2 className="text-sm font-semibold mt-1">Kaira şu anda nasıl?</h2></div><span className="text-[9px] px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">CANLI</span></div><p className="mt-3 text-[10px] leading-relaxed text-zinc-400 rounded-lg border border-zinc-800 bg-zinc-950/40 p-2.5">{currentState.lastStatus}</p></div>
            <div className="flex-1 min-h-0 overflow-hidden p-3 space-y-2">
              {dynamicMetrics.map((metric) => { const value = clamp(metric.value); const Icon = metric.icon; return <div key={metric.key} className="rounded-lg border border-zinc-800/80 bg-zinc-950/30 p-2.5"><div className="flex items-center justify-between mb-1.5"><div className="flex items-center gap-1.5"><Icon className="w-3.5 h-3.5 text-indigo-400" /><span className="text-[10px] text-zinc-300">{metric.label}</span></div><span className="text-[9px] font-mono text-zinc-500">{value} • {stateLabel(value)}</span></div><div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden"><div className="h-full rounded-full bg-indigo-500/80 transition-all" style={{ width: `${value}%` }} /></div><div className="flex justify-between text-[7.5px] text-zinc-600 mt-0.5"><span>{metric.low}</span><span>{metric.high}</span></div></div>; })}
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-2.5"><p className="text-[9px] uppercase tracking-wider text-zinc-600">Son olay</p>{currentState.lastEvent ? <><p className="text-[10px] text-zinc-300 mt-1">{currentState.lastEvent.eventTitle}</p><p className="text-[9px] leading-relaxed text-zinc-500 mt-0.5">{currentState.lastEvent.reactionText}</p></> : <p className="text-[9px] text-zinc-600 mt-1">Henüz kaydedilmiş bir olay yok.</p>}</div>
              {currentState.relationship && <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-2.5"><div className="flex items-center gap-1.5 mb-2"><Users className="w-3.5 h-3.5 text-indigo-400" /><p className="text-[9px] uppercase tracking-wider text-zinc-600">İlişki bağlamı</p></div><div className="grid grid-cols-2 gap-1.5 text-[9px]"><div><span className="text-zinc-600">Tanışıklık</span><p className="text-zinc-300 mt-0.5">{currentState.relationship.familiarityDays} gün</p></div><div><span className="text-zinc-600">Etkileşim</span><p className="text-zinc-300 mt-0.5">{currentState.relationship.interactionCount}</p></div><div className="col-span-2"><span className="text-zinc-600">Yakınlık</span><div className="mt-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden"><div className="h-full rounded-full bg-indigo-500/70" style={{ width: `${clamp(currentState.relationship.warmth)}%` }} /></div></div></div></div>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useRef } from 'react';
import {
  Save,
  Check,
  Loader2,
  Upload,
  RotateCcw,
  Sparkles,
  Heart,
  Users,
  Brain,
  Award,
  Sliders,
  MessageSquare,
  ShieldCheck,
  Globe,
  Edit3,
  CheckCircle2,
  Zap,
  Flame,
  Smile,
  Compass,
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

// 8 Duygu İfadesi (Emoji Tabanlı Hızlı Seçici)
const EMOJI_EXPRESSIONS: {
  id: DroitExpressionMode;
  emoji: string;
  label: string;
}[] = [
  { id: 'NEUTRAL', emoji: '😐', label: 'Nötr' },
  { id: 'FRIENDLY', emoji: '🙂', label: 'Dostane' },
  { id: 'CONFIDENT', emoji: '😎', label: 'Özgüvenli' },
  { id: 'ANALYTICAL', emoji: '😏', label: 'İğneleyici' },
  { id: 'ALERT', emoji: '😠', label: 'Tetikte' },
  { id: 'FOCUSED' as any, emoji: '🤔', label: 'Analitik' },
  { id: 'CALM', emoji: '😌', label: 'Sakin' },
  { id: 'ANALYTICAL' as any, emoji: '😲', label: 'Şaşkın' },
];

// Temel 8 Çekirdek Kişilik Özelliği (Görsel olarak öne çıkanlar)
interface CoreTraitConfig {
  key: keyof DroitPersonalityTraits;
  label: string;
  minLabel: string;
  maxLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const CORE_TRAITS: CoreTraitConfig[] = [
  { key: 'humor', label: 'Mizah', minLabel: 'Ciddi', maxLabel: 'Esprili', icon: Smile, color: 'from-purple-500 to-indigo-500' },
  { key: 'empathy', label: 'Empati', minLabel: 'Rasyonel', maxLabel: 'Destekleyici', icon: Heart, color: 'from-pink-500 to-purple-500' },
  { key: 'selfConfidence', label: 'Özgüven', minLabel: 'Mütevazı', maxLabel: 'Kararlı', icon: Award, color: 'from-indigo-500 to-blue-500' },
  { key: 'curiosity', label: 'Merak', minLabel: 'Odaklı', maxLabel: 'Araştırmacı', icon: Compass, color: 'from-cyan-500 to-indigo-500' },
  { key: 'authority', label: 'Otorite', minLabel: 'Eşitlikçi', maxLabel: 'Yönetici', icon: ShieldCheck, color: 'from-amber-500 to-purple-500' },
  { key: 'analyticalThinking', label: 'Analitik Mantık', minLabel: 'Pratik', maxLabel: 'Derin Mantık', icon: Brain, color: 'from-indigo-600 to-purple-600' },
  { key: 'patience', label: 'Sabır', minLabel: 'Aceleci', maxLabel: 'Hoşgörülü', icon: Heart, color: 'from-emerald-500 to-teal-500' },
  { key: 'communication', label: 'İletişim', minLabel: 'Kısa & Öz', maxLabel: 'Açıklayıcı', icon: MessageSquare, color: 'from-purple-500 to-pink-500' },
];

export const CharacterTab: React.FC<CharacterTabProps> = ({
  personality,
  expression,
  onExpressionChange,
  onPersonalityChange,
  onSave,
  isSaved,
  isSaving,
}) => {
  // 1. Profil Fotoğrafı (Kayıtlı görsel veya varsayılan)
  const [customAvatar, setCustomAvatar] = useState<string | null>(() => {
    return localStorage.getItem('kairo_custom_avatar') || null;
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 2. Temel Kimlik Durumu
  const [identity, setIdentity] = useState(() => {
    const saved = localStorage.getItem('kairo_identity');
    return saved
      ? JSON.parse(saved)
      : {
          name: 'KAIRO',
          role: 'Nexus Çekirdek Asistanı',
          origin: 'Nexus OS Protokolü (Sentetik Zekâ)',
          bio: 'Rasyonel mantık, kontrollü nüktedanlık ve durumsal farkındalığa sahip yapay zekâ asistanı.',
        };
  });
  const [isEditingIdentity, setIsEditingIdentity] = useState(false);

  // 3. Evren ve Lore Kuralları (Maddeler Halinde)
  const [loreRules, setLoreRules] = useState<string[]>(() => {
    const saved = localStorage.getItem('kairo_lore_rules');
    return saved
      ? JSON.parse(saved)
      : [
          'Nexus OS çekirdeğinde çalışan rasyonel mantık ve durumsal adaptasyon ünitesidir.',
          "Operatöre 'Komutan' veya 'Yönetici' olarak doğrudan, net ve saygılı hitap eder.",
          'Sistem parametreleri stabilken zeki nükteler yapar; kritik alarmlarda sıfır espri uygular.',
          'Duygusal kışkırtmalara karşı soğukkanlı, rasyonel ve kural odaklı savunma hattını korur.',
          'Her diyalogda kullanıcıyla olan yakınlığı (Warmth skoru) hafızasında günceller.',
        ];
  });
  const [isEditingLore, setIsEditingLore] = useState(false);
  const [loreTextDraft, setLoreTextDraft] = useState(loreRules.join('\n'));

  // Profil Fotoğrafı Yükleme
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Fotoğraf boyutu en fazla 5MB olabilir.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setCustomAvatar(result);
        localStorage.setItem('kairo_custom_avatar', result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetPhoto = () => {
    setCustomAvatar(null);
    localStorage.removeItem('kairo_custom_avatar');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleIdentitySave = () => {
    setIsEditingIdentity(false);
    localStorage.setItem('kairo_identity', JSON.stringify(identity));
  };

  const handleLoreSave = () => {
    const newRules = loreTextDraft
      .split('\n')
      .map((r) => r.trim())
      .filter(Boolean);
    setLoreRules(newRules);
    setIsEditingLore(false);
    localStorage.setItem('kairo_lore_rules', JSON.stringify(newRules));
  };

  // Konuşma Tarzı Özet Spektrum Değerleri
  const speechLength = personality.communication ?? 50; // Kısa (0) ↔ Detaylı (100)
  const speechFormality = 100 - (personality.empathy ?? 50); // Resmî (100) ↔ Samimi (0)
  const speechEnergy = personality.initiative ?? 50; // Sakin (0) ↔ Enerjik (100)
  const speechHumor = personality.humor ?? 50; // Ciddi (0) ↔ Esprili (100)

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-zinc-950 text-zinc-100 overflow-hidden font-sans select-none">
      {/* ─────────────────────────────────────────────────────────────
          1. ÜST KOMPAKT KİMLİK & KONTROL ŞERİDİ (Sıfır Kaydırma Düzeni)
         ───────────────────────────────────────────────────────────── */}
      <header className="px-4 sm:px-6 py-2.5 border-b border-zinc-850/80 bg-zinc-900/40 flex items-center justify-between shrink-0 gap-3">
        {/* Sol: Avatar + Temel Kimlik */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative group shrink-0">
            <div className="w-10 h-10 rounded-xl border border-indigo-500/40 bg-zinc-950 overflow-hidden relative shadow-[0_0_12px_rgba(99,102,241,0.2)] flex items-center justify-center">
              {customAvatar ? (
                <img
                  src={customAvatar}
                  alt="Kairo Profil"
                  className="w-full h-full object-cover"
                />
              ) : (
                <DroitAvatar expression={expression} size="md" />
              )}
            </div>

            {/* Fotoğraf Değiştirme Butonları (Hover ile görünür) */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow cursor-pointer transition-transform hover:scale-110"
              title="Fotoğraf Yükle"
            >
              <Upload className="w-2.5 h-2.5" />
            </button>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-mono font-bold tracking-wider text-zinc-100">
                {identity.name}
              </h1>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-semibold">
                SABİT KİMLİK
              </span>
              <span className="flex items-center gap-1 text-[9.5px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.2 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                AKTİF
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-sans truncate">
              {identity.role} • <span className="text-zinc-500 font-mono text-[10px]">{identity.origin}</span>
            </p>
          </div>
        </div>

        {/* Orta: 8 Hızlı Yüz İfadesi Seçici */}
        <div className="hidden md:flex items-center gap-1 bg-zinc-950/80 px-2 py-1 rounded-xl border border-zinc-850 shrink-0">
          <span className="text-[9.5px] font-mono text-zinc-400 uppercase font-semibold mr-1">İfade:</span>
          {EMOJI_EXPRESSIONS.map((item, idx) => {
            const isSelected = expression === item.id;
            return (
              <button
                key={`${item.id}-${idx}`}
                type="button"
                onClick={() => onExpressionChange(item.id)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600/30 border border-indigo-400 text-white ring-1 ring-indigo-400/40 shadow-[0_0_8px_rgba(99,102,241,0.3)]'
                    : 'bg-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                }`}
                title={item.label}
              >
                {item.emoji}
              </button>
            );
          })}
        </div>

        {/* Sağ: Kaydet Butonu */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider transition-all cursor-pointer shadow-sm ${
              isSaving
                ? 'bg-indigo-700/80 text-indigo-200 cursor-wait'
                : isSaved
                ? 'bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-850 hover:text-zinc-100'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white ring-2 ring-indigo-500/40 animate-pulse shadow-[0_0_12px_rgba(99,102,241,0.3)]'
            }`}
            title="Kişilik ayarlarını kaydet"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Kaydediliyor...</span>
              </>
            ) : isSaved ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Kayıtlı</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Değişiklikleri Kaydet</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. ANA IZGARA (TEK EKRANDA, SIFIR KAYDIRMA İLE 2 SÜTUN)
         ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3.5 p-3.5 sm:p-5 max-w-7xl mx-auto w-full min-h-0 overflow-hidden">
        
        {/* ═══════════════════════════════════════════════════════════
            SOL ALAN (7 SÜTUN): 8 ÇEKİRDEK KİŞİLİK SLIDER'I & GLOW BARLAR
           ═══════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-7 flex flex-col justify-between bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 sm:p-4.5 shadow-sm min-h-0 overflow-hidden">
          
          {/* Başlık */}
          <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800/80 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Sliders className="w-3.5 h-3.5" />
              </div>
              <div>
                <h2 className="text-xs font-mono font-bold tracking-wider text-zinc-100 uppercase">
                  ÇEKİRDEK KİŞİLİK PARAMETRELERİ
                </h2>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30 font-semibold">
              8 Temel Dinamik
            </span>
          </div>

          {/* 8 BÜYÜK VE PARLAK GLOW BAR (2x4 Izgara Şeklinde) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-auto py-1">
            {CORE_TRAITS.map((trait) => {
              const val = personality[trait.key] ?? 50;
              const IconComp = trait.icon;

              return (
                <div
                  key={trait.key}
                  className="bg-zinc-950/80 border border-zinc-850 hover:border-zinc-750 rounded-xl p-2.5 flex flex-col justify-between transition-all group"
                >
                  {/* Başlık & Sayı Değeri */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-md bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                        <IconComp className="w-3 h-3" />
                      </div>
                      <span className="text-xs font-sans font-bold text-zinc-200 group-hover:text-white transition-colors">
                        {trait.label}
                      </span>
                    </div>

                    {/* Parlak Sayı Değeri Rozeti */}
                    <span className="text-xs font-mono font-bold text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded-md border border-indigo-500/30 shadow-[0_0_8px_rgba(99,102,241,0.2)]">
                      %{val}
                    </span>
                  </div>

                  {/* Parlak Dolgulu Yatay Bar & Slider */}
                  <div className="space-y-1">
                    <div className="w-full bg-zinc-900 rounded-full h-2.5 overflow-hidden border border-zinc-800 relative">
                      <div
                        className="bg-gradient-to-r from-purple-600 via-indigo-500 to-purple-400 h-full rounded-full transition-all duration-150 shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                        style={{ width: `${Math.min(100, Math.max(0, val))}%` }}
                      />
                    </div>

                    {/* İnteraktif Slider Kontrolü */}
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={val}
                      onChange={(e) =>
                        onPersonalityChange({
                          [trait.key]: parseInt(e.target.value, 10),
                        })
                      }
                      className="w-full accent-indigo-500 hover:accent-purple-400 cursor-pointer h-1 bg-transparent focus:outline-none"
                    />

                    {/* Min ↔ Max Etiketleri */}
                    <div className="flex justify-between text-[9px] font-mono text-zinc-400">
                      <span>{trait.minLabel}</span>
                      <span>{trait.maxLabel}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 text-[10px] font-mono text-zinc-400 flex items-center justify-between border-t border-zinc-850/80 shrink-0">
            <span>Değişiklikler anında Test ve Beyin simülasyonuna aktarılır</span>
            <span className="text-indigo-400 font-semibold">// KTM DYNAMICS</span>
          </div>

        </div>

        {/* ═══════════════════════════════════════════════════════════
            SAĞ ALAN (5 SÜTUN): EVREN / LORE KURALLARI + İLETİŞİM PROTOKOLÜ
           ═══════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-3.5 min-h-0 overflow-hidden">
          
          {/* KART 1: EVREN VE LORE KURALLARI (MADDELER HALİNDE NET) */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 flex-1 flex flex-col justify-between shadow-sm min-h-0 overflow-hidden">
            <div>
              <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800/80 mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                    <Globe className="w-3.5 h-3.5" />
                  </div>
                  <h2 className="text-xs font-mono font-bold tracking-wider text-zinc-100 uppercase">
                    EVREN & LORE KURALLARI
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (isEditingLore) {
                      handleLoreSave();
                    } else {
                      setLoreTextDraft(loreRules.join('\n'));
                      setIsEditingLore(true);
                    }
                  }}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800 hover:bg-zinc-750 text-[10px] font-mono text-zinc-300 hover:text-white border border-zinc-700 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-2.5 h-2.5 text-purple-400" />
                  <span>{isEditingLore ? 'Kaydet' : 'Düzenle'}</span>
                </button>
              </div>

              {/* Kurallar Listesi (Maddeler) veya Düzenleme Modu */}
              {isEditingLore ? (
                <div className="space-y-2">
                  <textarea
                    value={loreTextDraft}
                    onChange={(e) => setLoreTextDraft(e.target.value)}
                    rows={6}
                    className="w-full p-2.5 bg-zinc-950 border border-purple-500/40 rounded-xl text-xs font-sans text-zinc-100 leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-purple-500"
                    placeholder="Her satıra bir kural yazın..."
                    autoFocus
                  />
                  <p className="text-[9.5px] font-mono text-zinc-500">
                    * Her satır ayrı bir lore kuralı maddesi olarak kaydedilir.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2 text-xs font-sans leading-relaxed text-zinc-300">
                  {loreRules.map((rule, idx) => (
                    <li key={idx} className="flex items-start gap-2 bg-zinc-950/60 p-2 rounded-lg border border-zinc-850/80">
                      <span className="w-4 h-4 rounded bg-purple-500/10 border border-purple-500/30 text-purple-300 flex items-center justify-center font-mono text-[9px] shrink-0 mt-0.5 font-bold">
                        {idx + 1}
                      </span>
                      <span className="text-zinc-200 font-sans text-xs">
                        {rule}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="pt-2 text-[9.5px] font-mono text-zinc-400 border-t border-zinc-850/80">
              Bu kurallar sistem promptuna çekirdek direktif olarak enjekte edilir
            </div>
          </div>

          {/* KART 2: DİYALOG & KONUŞMA SPEKTRUMU (PARLAK ÇİFT YÖNLÜ BARLAR) */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-3.5 shadow-sm shrink-0">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80 mb-2.5">
              <div className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <h3 className="text-xs font-mono font-bold tracking-wider text-zinc-200 uppercase">
                  DİYALOG & ÜSLUP SPEKTRUMU
                </h3>
              </div>
              <span className="text-[9.5px] font-mono text-zinc-400">Canlı Eşleme</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              {/* 1. Kısa ↔ Detaylı */}
              <div className="bg-zinc-950/80 p-2 rounded-lg border border-zinc-850">
                <div className="flex justify-between text-zinc-400 mb-1">
                  <span>Kısa</span>
                  <span className="text-indigo-300 font-bold">%{speechLength}</span>
                  <span>Detaylı</span>
                </div>
                <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full"
                    style={{ width: `${speechLength}%` }}
                  />
                </div>
              </div>

              {/* 2. Resmî ↔ Samimi */}
              <div className="bg-zinc-950/80 p-2 rounded-lg border border-zinc-850">
                <div className="flex justify-between text-zinc-400 mb-1">
                  <span>Resmî</span>
                  <span className="text-purple-300 font-bold">%{100 - speechFormality}</span>
                  <span>Samimi</span>
                </div>
                <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-purple-500 h-full rounded-full"
                    style={{ width: `${100 - speechFormality}%` }}
                  />
                </div>
              </div>

              {/* 3. Sakin ↔ Enerjik */}
              <div className="bg-zinc-950/80 p-2 rounded-lg border border-zinc-850">
                <div className="flex justify-between text-zinc-400 mb-1">
                  <span>Sakin</span>
                  <span className="text-emerald-300 font-bold">%{speechEnergy}</span>
                  <span>Enerjik</span>
                </div>
                <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ width: `${speechEnergy}%` }}
                  />
                </div>
              </div>

              {/* 4. Ciddi ↔ Esprili */}
              <div className="bg-zinc-950/80 p-2 rounded-lg border border-zinc-850">
                <div className="flex justify-between text-zinc-400 mb-1">
                  <span>Ciddi</span>
                  <span className="text-amber-300 font-bold">%{speechHumor}</span>
                  <span>Esprili</span>
                </div>
                <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-amber-400 h-full rounded-full"
                    style={{ width: `${speechHumor}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

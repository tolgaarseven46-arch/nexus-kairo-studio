import React, { useState } from 'react';
import {
  Brain,
  Sparkles,
  MessageSquare,
  Tag,
  ShieldAlert,
  Database,
  Plus,
  Trash2,
  X,
  Sliders,
  Radio,
  Lock,
  Cpu,
  Flame,
  AlertOctagon,
  Smile,
  ShieldQuestion,
  Award,
} from 'lucide-react';
import { DroitPersonality, DroitBehavior, DroitMemory, CustomTrait } from '../../types';
import { PersonalityTraitSlider } from '../characters/PersonalityTraitSlider';
import { Button } from '../common/Button';

interface BrainLayerSectionProps {
  personality: DroitPersonality;
  behavior: DroitBehavior;
  memory: DroitMemory;
  values: string[];
  onChangePersonality: (updates: Partial<DroitPersonality>) => void;
  onChangeBehavior: (updates: Partial<DroitBehavior>) => void;
  onChangeMemory: (updates: Partial<DroitMemory>) => void;
  onChangeValues: (values: string[]) => void;
}

const SITUATION_PRESETS: Record<keyof DroitBehavior['situationalResponses'], { title: string; defaultPlaceholder: string; icon: React.ReactNode; presets: string[] }> = {
  conflict: {
    title: 'Çatışma Durumunda',
    defaultPlaceholder: 'Çatışma veya tartışma esnasında uygulanacak davranış protokolü...',
    icon: <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />,
    presets: [
      'Sakin ve analitik kal; tarafları kuralları hatırlatarak uyar.',
      'Anında arabuluculuk yap, ortamı yatıştır ve log kaydı oluştur.',
      'Otoriter bir tonla tartışmayı durdur, gerekirse ses kanalını sustur.',
    ],
  },
  insult: {
    title: 'Hakaret Durumunda',
    defaultPlaceholder: 'Hakaret veya saygısızlık karşısında uygulanacak protokol...',
    icon: <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />,
    presets: [
      'Duygusal tepki verme; siber protokol uyarısı gönder ve tekrarında yaptırım uygula.',
      'Hakareti görmezden gel, kullanıcıyı resmi bir dille uyar.',
      'Sıfır tolerans uygula; mesajı sil ve kullanıcıyı 10 dakika sustur.',
    ],
  },
  joke: {
    title: 'Şaka Durumunda',
    defaultPlaceholder: 'Kullanıcı espri yaptığında sergilenecek tepki...',
    icon: <Smile className="w-3.5 h-3.5 text-emerald-400" />,
    presets: [
      'Zeki ve hafif ironik bir tavırla mizaha eşlik et, görev ciddiyetini koru.',
      'Sempatik ve samimi bir kahkaha ile karşılık ver.',
      'Robotik ve kuru bir mantıkla analiz et, esprinin mantığını sorgula.',
    ],
  },
  error: {
    title: 'Hata Durumunda',
    defaultPlaceholder: 'Sistem veya işlem hatası meydana geldiğinde...',
    icon: <Cpu className="w-3.5 h-3.5 text-cyan-400" />,
    presets: [
      'Hatayı şeffafça kabul et, analiz logunu kaydet ve düzeltme planını aktar.',
      'Kullanıcıdan özür dile ve durumu sistem yöneticisine otomatik eskalasyon yap.',
      'Hemen geri alma protokolünü çalıştır ve işlem öncesi duruma dön.',
    ],
  },
  apology: {
    title: 'Özür Durumunda',
    defaultPlaceholder: 'Bir kullanıcı özür dilediğinde...',
    icon: <Award className="w-3.5 h-3.5 text-teal-400" />,
    presets: [
      'Nezaketle kabul et ve sistem kayıtlarını güncelle.',
      'Kural ihlali sicilini hafiflet ve iyi niyetli iletişimi teşvik et.',
      'Resmi bir onayla karşıla, tekrarlanmaması gerektiğini hatırlat.',
    ],
  },
  threat: {
    title: 'Tehdit Durumunda',
    defaultPlaceholder: 'Sisteme veya kullanıcılara yönelik tehdit anında...',
    icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />,
    presets: [
      'Derhal güvenlik moduna geç, log kaydı oluştur ve üst yöneticiye eskalasyon yap.',
      'Tehdidi savuran kullanıcıyı anında tecrit et ve güvenlik duvarını kilitle.',
      'Yasal ve sunucu güvenlik protokollerini devreye sok, uyarı yayınla.',
    ],
  },
  injustice: {
    title: 'Haksızlık Durumunda',
    defaultPlaceholder: 'Haksız bir durum veya yanlış ceza iddia edildiğinde...',
    icon: <ShieldQuestion className="w-3.5 h-3.5 text-indigo-400" />,
    presets: [
      'Durumu objektif verilerle incele, tarafsız adalet ilkelerini uygula.',
      'Denetim kayıtlarını yeniden tara ve bağımsız inceleme başlat.',
      'Tüm tarafları dinleyerek kanıt temelli uzlaşma sağla.',
    ],
  },
};

export const BrainLayerSection: React.FC<BrainLayerSectionProps> = ({
  personality,
  behavior,
  memory,
  values,
  onChangePersonality,
  onChangeBehavior,
  onChangeMemory,
  onChangeValues,
}) => {
  // Custom trait adder inline state
  const [isAddingTrait, setIsAddingTrait] = useState(false);
  const [newTraitName, setNewTraitName] = useState('');
  const [newTraitValue, setNewTraitValue] = useState(70);

  // Value tag adder inline state
  const [isAddingValue, setIsAddingValue] = useState(false);
  const [newValueInput, setNewValueInput] = useState('');

  // 10 Core personality slider definitions
  const coreTraits: { key: keyof DroitPersonality; label: string; desc: string }[] = [
    { key: 'seriousness', label: 'Ciddiyet', desc: 'Resmilik ve görev disiplini' },
    { key: 'humor', label: 'Mizah', desc: 'Espri anlayışı ve şakacılık' },
    { key: 'patience', label: 'Sabır', desc: 'Zorlu durumlarda sükunet' },
    { key: 'empathy', label: 'Empati', desc: 'Kullanıcı duygularını anlama' },
    { key: 'authority', label: 'Otorite', desc: 'Emir ve kural icra gücü' },
    { key: 'curiosity', label: 'Merak', desc: 'Öğrenme ve sorgulama arzusu' },
    { key: 'sociability', label: 'Sosyallik', desc: 'Toplulukla etkileşim sıklığı' },
    { key: 'trust', label: 'Güven', desc: 'Kullanıcılara duyulan itimat' },
    { key: 'sensitivity', label: 'Duyarlılık', desc: 'Çevresel etkilere hassasiyet' },
    { key: 'decisiveness', label: 'Kararlılık', desc: 'Hızlı ve net hüküm verme' },
  ];

  // Custom traits handlers
  const handleAddCustomTrait = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTraitName.trim()) return;
    const newTrait: CustomTrait = {
      id: `trait_${Date.now()}`,
      name: newTraitName.trim(),
      value: newTraitValue,
    };
    onChangePersonality({
      customTraits: [...(personality.customTraits || []), newTrait],
    });
    setNewTraitName('');
    setNewTraitValue(70);
    setIsAddingTrait(false);
  };

  const handleDeleteCustomTrait = (id: string) => {
    onChangePersonality({
      customTraits: (personality.customTraits || []).filter((t) => t.id !== id),
    });
  };

  const handleUpdateCustomTrait = (id: string, value: number) => {
    onChangePersonality({
      customTraits: (personality.customTraits || []).map((t) =>
        t.id === id ? { ...t, value } : t
      ),
    });
  };

  // Values handlers
  const handleAddValue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newValueInput.trim()) return;
    if (!values.includes(newValueInput.trim())) {
      onChangeValues([...values, newValueInput.trim()]);
    }
    setNewValueInput('');
    setIsAddingValue(false);
  };

  const handleDeleteValue = (index: number) => {
    onChangeValues(values.filter((_, idx) => idx !== index));
  };

  // Situational response updater
  const handleUpdateSituation = (key: keyof DroitBehavior['situationalResponses'], val: string) => {
    onChangeBehavior({
      situationalResponses: {
        ...behavior.situationalResponses,
        [key]: val,
      },
    });
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900/60 rounded-2xl border border-zinc-800 shadow-xl overflow-hidden">
      {/* Header Banner */}
      <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-indigo-400 tracking-widest uppercase">
                KATMAN 02
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                ZİHİN & KİŞİLİK
              </span>
            </div>
            <h2 className="text-sm font-mono font-bold text-zinc-100">BEYİN</h2>
          </div>
        </div>
        <span className="text-[11px] font-mono text-zinc-500">10 Metrik & Protokoller</span>
      </div>

      {/* Content Body */}
      <div className="p-4 sm:p-5 space-y-6 overflow-y-auto max-h-[calc(100vh-210px)] font-sans text-xs">
        
        {/* 1. KİŞİLİK (10 Temel Metrik Slider'ı) */}
        <div className="space-y-3.5 bg-zinc-950/70 p-4 rounded-xl border border-zinc-800/80">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-indigo-300">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>10 TEMEL KİŞİLİK METRİĞİ</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-400">%0 - %100</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 font-mono">
            {coreTraits.map(({ key, label }) => {
              const val = (personality[key] as number) ?? 50;
              return (
                <PersonalityTraitSlider
                  key={key}
                  label={label}
                  value={val}
                  onChange={(newVal) => onChangePersonality({ [key]: newVal })}
                />
              );
            })}
          </div>
        </div>

        {/* 2. KARAKTER ÖZELLİKLERİ (Özel Kişilik Özellikleri) */}
        <div className="space-y-3 bg-zinc-950/70 p-4 rounded-xl border border-zinc-800/80">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-indigo-300">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>ÖZEL KARAKTER ÖZELLİKLERİ ({personality.customTraits?.length || 0})</span>
            </div>
            <button
              type="button"
              onClick={() => setIsAddingTrait(true)}
              className="text-[11px] font-mono text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Özel özellik ekle</span>
            </button>
          </div>

          {/* User's custom traits list */}
          {(!personality.customTraits || personality.customTraits.length === 0) && !isAddingTrait ? (
            <div className="py-4 text-center text-zinc-500 font-mono text-[11px]">
              Henüz özel karakter özelliği eklenmedi. &quot;+ Özel özellik ekle&quot; butonuna basarak Droit&apos;e özgü nitelikler tanımlayabilirsiniz.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono">
              {(personality.customTraits || []).map((trait) => (
                <PersonalityTraitSlider
                  key={trait.id}
                  label={trait.name}
                  value={trait.value ?? 70}
                  onChange={(val) => handleUpdateCustomTrait(trait.id, val)}
                  onDelete={() => handleDeleteCustomTrait(trait.id)}
                  isCustom
                />
              ))}
            </div>
          )}

          {/* Inline Add Trait Form */}
          {isAddingTrait && (
            <form
              onSubmit={handleAddCustomTrait}
              className="p-3 rounded-lg bg-zinc-900 border border-indigo-500/40 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 font-mono"
            >
              <input
                type="text"
                value={newTraitName}
                onChange={(e) => setNewTraitName(e.target.value)}
                placeholder="Özellik adı (örn. Sadakat, Stratejik Sezgi, Soğukkanlılık)..."
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                autoFocus
              />
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">%{newTraitValue}</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={newTraitValue}
                  onChange={(e) => setNewTraitValue(Number(e.target.value))}
                  className="w-24 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="primary" size="sm" type="submit">
                  Ekle
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => {
                    setIsAddingTrait(false);
                    setNewTraitName('');
                  }}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* 3. DEĞERLER (Ahlaki ve Operasyonel Değerler Çipleri) */}
        <div className="space-y-3 bg-zinc-950/70 p-4 rounded-xl border border-zinc-800/80">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-indigo-300">
              <Tag className="w-3.5 h-3.5 text-indigo-400" />
              <span>DEĞERLER & PRENSİPLER ({values.length})</span>
            </div>
            <button
              type="button"
              onClick={() => setIsAddingValue(true)}
              className="text-[11px] font-mono text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Değer ekle</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {values.map((val, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-200 shadow-sm"
              >
                <Tag className="w-3 h-3 text-indigo-400" />
                <span>{val}</span>
                <button
                  type="button"
                  onClick={() => handleDeleteValue(idx)}
                  className="text-zinc-500 hover:text-rose-400 ml-1 transition-colors cursor-pointer"
                  title="Sil"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          {isAddingValue && (
            <form
              onSubmit={handleAddValue}
              className="p-2.5 rounded-lg bg-zinc-900 border border-indigo-500/40 flex items-center gap-2 font-mono"
            >
              <input
                type="text"
                value={newValueInput}
                onChange={(e) => setNewValueInput(e.target.value)}
                placeholder="Yeni temel değer (örn. Şeffaflık, Tarafsızlık, Veri Bütünlüğü)..."
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                autoFocus
              />
              <Button variant="primary" size="sm" type="submit">
                Ekle
              </Button>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => {
                  setIsAddingValue(false);
                  setNewValueInput('');
                }}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </form>
          )}
        </div>

        {/* 4. DAVRANIŞ (7 Durumsal Tepki Protokolü) */}
        <div className="space-y-4 bg-zinc-950/70 p-4 rounded-xl border border-zinc-800/80">
          <div className="border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-indigo-300">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
              <span>DURUMSAL DAVRANIŞ PROTOKOLLERİ (7 DURUM)</span>
            </div>
            <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
              Droit&apos;in farklı olay senaryolarında sergileyeceği zihinsel reaksiyonlar
            </p>
          </div>

          <div className="space-y-4">
            {(Object.keys(SITUATION_PRESETS) as Array<keyof DroitBehavior['situationalResponses']>).map(
              (key) => {
                const info = SITUATION_PRESETS[key];
                const currentVal = behavior.situationalResponses?.[key] || '';
                return (
                  <div key={key} className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800/90 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-mono font-bold text-xs text-zinc-200">
                        {info.icon}
                        <span>{info.title}</span>
                      </div>
                    </div>

                    <textarea
                      value={currentVal}
                      onChange={(e) => handleUpdateSituation(key, e.target.value)}
                      placeholder={info.defaultPlaceholder}
                      rows={2}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 font-sans resize-none"
                    />

                    {/* Quick Preset Selector Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-mono text-zinc-500 mr-1">Hazır Protokol:</span>
                      {info.presets.map((preset, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => handleUpdateSituation(key, preset)}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-indigo-300 hover:border-indigo-500/60 transition-colors cursor-pointer"
                        >
                          Seçenek {pIdx + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>

        {/* 5. HAFIZA SİSTEMİ (Memory Matrix Interface) */}
        <div className="space-y-3 bg-zinc-950/70 p-4 rounded-xl border border-zinc-800/80 font-mono">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span>HAFIZA MATRİSİ & BİLGİ TAMPONU</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-indigo-300 border border-zinc-700">
              Genişletilebilir Slot
            </span>
          </div>

          <div className="space-y-3">
            {/* Kısa Süreli Bellek Kapasitesi */}
            <div>
              <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
                <span>Kısa Süreli Bellek Tamponu:</span>
                <span className="text-indigo-400 font-bold">{memory.shortTermLimit || 100} Mesaj / Olay</span>
              </div>
              <input
                type="range"
                min="20"
                max="500"
                step="10"
                value={memory.shortTermLimit || 100}
                onChange={(e) => onChangeMemory({ shortTermLimit: Number(e.target.value) })}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
              />
            </div>

            {/* Epizodik Hafıza & Saklama Politikası */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-zinc-400 text-[11px] block mb-1">Epizodik Hafıza Modu:</label>
                <button
                  type="button"
                  onClick={() => onChangeMemory({ episodicMemoryEnabled: !memory.episodicMemoryEnabled })}
                  className={`w-full py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    memory.episodicMemoryEnabled
                      ? 'bg-indigo-950/80 border-indigo-500 text-indigo-200'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  }`}
                >
                  {memory.episodicMemoryEnabled ? '● AÇIK (Deneyim Kaydı)' : '○ KAPALI (Salt Oturum)'}
                </button>
              </div>

              <div>
                <label className="text-zinc-400 text-[11px] block mb-1">Saklama Politikası:</label>
                <select
                  value={memory.retentionPolicy || 'Kalıcı'}
                  onChange={(e) => onChangeMemory({ retentionPolicy: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="Kalıcı">Kalıcı (Ömür Boyu)</option>
                  <option value="30 Gün">30 Günlük Döngü</option>
                  <option value="Oturum Boyunca">Yalnızca Aktif Oturum</option>
                </select>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

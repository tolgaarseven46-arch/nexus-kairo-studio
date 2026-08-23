import React, { useState } from 'react';
import {
  Layers,
  Sparkles,
  Eye,
  Smile,
  Palette,
  Shield,
  Activity,
  Plus,
  Trash2,
  X,
  Radio,
  Sliders,
  Check,
} from 'lucide-react';
import { DroitPhysical, ExpressionItem, Race } from '../../types';
import { HologramPreviewStage } from './HologramPreviewStage';
import { Button } from '../common/Button';

interface PhysicalLayerSectionProps {
  name: string;
  roleTitle: string;
  races: Race[];
  physical: DroitPhysical;
  expressions: ExpressionItem[];
  currentExpressionId: string;
  onChangePhysical: (updates: Partial<DroitPhysical>) => void;
  onChangeExpressions: (expressions: ExpressionItem[]) => void;
  onSelectExpression: (expressionId: string) => void;
  onRegenerateSeed: () => void;
}

const BODY_TYPES = [
  'Sentetik İnsansı',
  'Biyonik Çerçeve',
  'Mekanik Çekirdek',
  'Siber Droit',
  'Kuantum Rezonatör',
];

const BODY_SCALES = ['Kompakt', 'Standart', 'Ağır Zırhlı', 'Devriye Modeli'];

const MATERIALS = [
  'Titanyum Alaşım',
  'Karbon Fiber',
  'Mat Polimer',
  'Sıvı Metal',
  'Seramik Zırh',
];

const CYBER_PATTERNS = [
  'Devre Hatları',
  'Dikey Matris',
  'Minimal Işıma',
  'Hex Izgara',
  'Fotonik Ağ',
];

const FACE_SHAPES = [
  'Keskin Hatlı',
  'Oval Sentetik',
  'Zırhlı Kask',
  'Çift Katman',
];

const VISOR_TYPES = [
  'Geniş Bant HUD',
  'Çift Optik Lens',
  'T-Vizör',
  'Minimal Sensör',
  'Monokl',
];

const EYE_COLORS = [
  { name: 'Cyan', hex: '#06b6d4' },
  { name: 'Kehribar', hex: '#f59e0b' },
  { name: 'Zümrüt Yeşili', hex: '#10b981' },
  { name: 'Safir Mavisi', hex: '#3b82f6' },
  { name: 'Kızıl Kırmızı', hex: '#ef4444' },
  { name: 'Ametist Moru', hex: '#a855f7' },
  { name: 'Buz Beyazı', hex: '#e2e8f0' },
];

const EYE_TYPES = ['Neon Çember', 'Siber Nokta', 'Fotonik Halka', 'Holografik İris'];

const MOUTH_TYPES = [
  'Siber Dalgaformu',
  'Titreşen LED Matrisi',
  'İnsansı Sentetik',
  'Kapalı Koruma Plakası',
];

const OUTFIT_STYLES = [
  'Taktik Zırh',
  'Siber Pelerin',
  'Subay Üniforması',
  'Laboratuvar Cübbesi',
  'Minimal Şasi',
];

const ACCESSORY_OPTIONS = [
  'Omuzluk Kalkanı',
  'HUD Vizör Lensi',
  'Harici Soğutucu',
  'Anten Dizisi',
  'Güç Pelerini',
  'Kuantum Çekirdek Rozeti',
];

const STANCES = [
  'Nöbet / Tetikte',
  'Rahat / Dengeli',
  'Dinamik / Taktiksel',
  'Meditatif',
];

const IDLE_PULSES = [
  'Sakin (Yavaş)',
  'Standart Nabız',
  'Yüksek Hızlı Tarama',
];

export const PhysicalLayerSection: React.FC<PhysicalLayerSectionProps> = ({
  name,
  roleTitle,
  races,
  physical,
  expressions,
  currentExpressionId,
  onChangePhysical,
  onChangeExpressions,
  onSelectExpression,
  onRegenerateSeed,
}) => {
  const [isAddingExpression, setIsAddingExpression] = useState(false);
  const [newExpEmoji, setNewExpEmoji] = useState('😎');
  const [newExpLabel, setNewExpLabel] = useState('');

  // Accessories toggling
  const currentAccessories = physical.accessories || [];
  const handleToggleAccessory = (acc: string) => {
    if (currentAccessories.includes(acc)) {
      onChangePhysical({
        accessories: currentAccessories.filter((item) => item !== acc),
      });
    } else {
      onChangePhysical({
        accessories: [...currentAccessories, acc],
      });
    }
  };

  // Expression addition
  const handleAddExpression = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpLabel.trim()) return;
    const newExp: ExpressionItem = {
      id: `exp_${Date.now()}`,
      emoji: newExpEmoji || '🙂',
      label: newExpLabel.trim(),
      isCustom: true,
    };
    const updated = [...expressions, newExp];
    onChangeExpressions(updated);
    onSelectExpression(newExp.id);
    setNewExpLabel('');
    setIsAddingExpression(false);
  };

  const handleDeleteExpression = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (expressions.length <= 1) return;
    const updated = expressions.filter((exp) => exp.id !== id);
    onChangeExpressions(updated);
    if (currentExpressionId === id) {
      onSelectExpression(updated[0].id);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900/60 rounded-2xl border border-zinc-800 shadow-xl overflow-hidden">
      {/* Header Banner */}
      <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-cyan-400 tracking-widest uppercase">
                KATMAN 01
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                GÖRÜNÜM
              </span>
            </div>
            <h2 className="text-sm font-mono font-bold text-zinc-100">FİZİK</h2>
          </div>
        </div>
        <span className="text-[11px] font-mono text-zinc-500">Morfometri & Optik</span>
      </div>

      {/* Content Body */}
      <div className="p-4 sm:p-5 space-y-6 overflow-y-auto max-h-[calc(100vh-210px)] font-sans text-xs">
        
        {/* 1. Büyük Hologram Önizleme Alanı */}
        <HologramPreviewStage
          name={name}
          roleTitle={roleTitle}
          physical={physical}
          currentExpressionId={currentExpressionId}
          expressions={expressions}
          onSelectExpression={onSelectExpression}
          onRegenerateSeed={onRegenerateSeed}
        />

        {/* 2. Irk & Temel Şasi Seçimi */}
        <div className="space-y-3 bg-zinc-950/70 p-4 rounded-xl border border-zinc-800/80">
          <div className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-1.5">
            <span>•</span>
            <span>Irk ve Şasi Yapısı</span>
          </div>

          <div className="space-y-2.5 font-mono">
            {/* Irk */}
            <div>
              <label className="text-zinc-400 text-[11px] block mb-1">Irk Sınıflandırması:</label>
              <select
                value={physical.raceId || ''}
                onChange={(e) => {
                  const rId = e.target.value;
                  const selectedRace = races.find((r) => r.id === rId);
                  onChangePhysical({
                    raceId: rId,
                    raceName: selectedRace ? selectedRace.name : physical.raceName || 'Sentetik Droit',
                  });
                }}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="">-- Genel / Özel Sentetik Irk --</option>
                {races.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Gövde Tipi */}
            <div>
              <label className="text-zinc-400 text-[11px] block mb-1">Gövde Tipi:</label>
              <select
                value={physical.bodyType || 'Sentetik İnsansı'}
                onChange={(e) => onChangePhysical({ bodyType: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                {BODY_TYPES.map((bt) => (
                  <option key={bt} value={bt}>
                    {bt}
                  </option>
                ))}
              </select>
            </div>

            {/* Boyut ve Ölçek */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-zinc-400 text-[11px] block mb-1">Boyut / Ölçek:</label>
                <select
                  value={physical.bodyScale || 'Standart'}
                  onChange={(e) => onChangePhysical({ bodyScale: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  {BODY_SCALES.map((bs) => (
                    <option key={bs} value={bs}>
                      {bs}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-zinc-400 text-[11px] block mb-1">Kaplama / Malzeme:</label>
                <select
                  value={physical.material || 'Titanyum Alaşım'}
                  onChange={(e) => onChangePhysical({ material: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  {MATERIALS.map((mat) => (
                    <option key={mat} value={mat}>
                      {mat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Siber Hatlar / Işıma Deseni */}
            <div>
              <label className="text-zinc-400 text-[11px] block mb-1">Siber Hatlar & Işıma Deseni:</label>
              <select
                value={physical.cyberPattern || 'Devre Hatları'}
                onChange={(e) => onChangePhysical({ cyberPattern: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                {CYBER_PATTERNS.map((cp) => (
                  <option key={cp} value={cp}>
                    {cp}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 3. Yüz, Vizör ve Göz Optikleri */}
        <div className="space-y-3 bg-zinc-950/70 p-4 rounded-xl border border-zinc-800/80">
          <div className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            <span>Yüz, Vizör ve Optik Lensler</span>
          </div>

          <div className="space-y-3 font-mono">
            {/* Yüz Formu ve Vizör Modülü */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-zinc-400 text-[11px] block mb-1">Yüz Formu:</label>
                <select
                  value={physical.faceShape || 'Keskin Hatlı'}
                  onChange={(e) => onChangePhysical({ faceShape: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  {FACE_SHAPES.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-zinc-400 text-[11px] block mb-1">Vizör / Optik Modül:</label>
                <select
                  value={physical.visorType || 'Geniş Bant HUD'}
                  onChange={(e) => onChangePhysical({ visorType: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  {VISOR_TYPES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Göz Rengi Seçimi */}
            <div>
              <label className="text-zinc-400 text-[11px] block mb-1.5">
                Göz Rengi: <span className="text-zinc-200 font-bold">{physical.eyeColor || 'Cyan'}</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {EYE_COLORS.map((col) => {
                  const isSelected = (physical.eyeColor || 'Cyan') === col.name;
                  return (
                    <button
                      key={col.name}
                      type="button"
                      onClick={() => onChangePhysical({ eyeColor: col.name })}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-zinc-800 text-zinc-100 border border-zinc-600 shadow-sm'
                          : 'bg-zinc-900/90 text-zinc-400 border border-zinc-800/80 hover:text-zinc-200'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shadow-sm"
                        style={{ backgroundColor: col.hex, boxShadow: `0 0 6px ${col.hex}` }}
                      />
                      <span>{col.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Göz Işıma Parlaklığı */}
            <div>
              <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
                <span>Işıma / Parlaklık Yoğunluğu:</span>
                <span className="text-cyan-400 font-bold">%{physical.eyeGlow ?? 85}</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={physical.eyeGlow ?? 85}
                onChange={(e) => onChangePhysical({ eyeGlow: Number(e.target.value) })}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Ağız ve Ses Kanalı */}
            <div>
              <label className="text-zinc-400 text-[11px] block mb-1">Ağız / Akustik Izgara Arayüzü:</label>
              <select
                value={physical.mouthType || 'Siber Dalgaformu'}
                onChange={(e) => onChangePhysical({ mouthType: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                {MOUTH_TYPES.map((mt) => (
                  <option key={mt} value={mt}>
                    {mt}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 4. Kıyafet ve Aksesuar Eklentileri */}
        <div className="space-y-3 bg-zinc-950/70 p-4 rounded-xl border border-zinc-800/80">
          <div className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            <span>Kıyafet & Aksesuar Donanımları</span>
          </div>

          <div className="space-y-3 font-mono">
            {/* Kıyafet Tarzı */}
            <div>
              <label className="text-zinc-400 text-[11px] block mb-1">Kıyafet Tarzı:</label>
              <select
                value={physical.outfitStyle || 'Taktik Zırh'}
                onChange={(e) => onChangePhysical({ outfitStyle: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                {OUTFIT_STYLES.map((os) => (
                  <option key={os} value={os}>
                    {os}
                  </option>
                ))}
              </select>
            </div>

            {/* Aksesuarlar Toggles */}
            <div>
              <label className="text-zinc-400 text-[11px] block mb-1.5">Aksesuar Eklentileri:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ACCESSORY_OPTIONS.map((acc) => {
                  const isActive = currentAccessories.includes(acc);
                  return (
                    <button
                      key={acc}
                      type="button"
                      onClick={() => handleToggleAccessory(acc)}
                      className={`flex items-center justify-between p-2 rounded-lg text-[11px] transition-all cursor-pointer ${
                        isActive
                          ? 'bg-cyan-950/70 border border-cyan-500/60 text-cyan-200'
                          : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <span className="truncate">{acc}</span>
                      <span
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[9px] ${
                          isActive
                            ? 'bg-cyan-500 text-zinc-950 border-cyan-400'
                            : 'border-zinc-700 bg-zinc-950'
                        }`}
                      >
                        {isActive && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 5. Yüz İfadeleri Kartları */}
        <div className="space-y-3 bg-zinc-950/70 p-4 rounded-xl border border-zinc-800/80">
          <div className="flex items-center justify-between">
            <div className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-1.5">
              <Smile className="w-3.5 h-3.5" />
              <span>Yüz İfadeleri Kartları ({expressions.length})</span>
            </div>
            <button
              type="button"
              onClick={() => setIsAddingExpression(true)}
              className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Yeni ifade ekle</span>
            </button>
          </div>

          {/* Grid of expression cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {expressions.map((exp) => {
              const isSelected = exp.id === currentExpressionId;
              return (
                <div
                  key={exp.id}
                  onClick={() => onSelectExpression(exp.id)}
                  className={`group relative p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-950/80 border-cyan-400 text-cyan-100 shadow-md shadow-cyan-500/10'
                      : 'bg-zinc-900 border-zinc-800/80 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <span className="text-2xl filter drop-shadow-sm">{exp.emoji}</span>
                  <span className="text-[11px] font-mono font-bold">{exp.label}</span>
                  {exp.isCustom && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteExpression(exp.id, e)}
                      className="absolute top-1 right-1 p-1 text-zinc-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="İfadeyi Sil"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Inline Add Expression Form */}
          {isAddingExpression && (
            <form
              onSubmit={handleAddExpression}
              className="p-3 rounded-lg bg-zinc-900 border border-cyan-500/40 flex items-center gap-2"
            >
              <input
                type="text"
                value={newExpEmoji}
                onChange={(e) => setNewExpEmoji(e.target.value)}
                className="w-10 text-center bg-zinc-950 border border-zinc-800 rounded py-1 text-base focus:outline-none focus:border-cyan-500"
                placeholder="😎"
              />
              <input
                type="text"
                value={newExpLabel}
                onChange={(e) => setNewExpLabel(e.target.value)}
                placeholder="İfade adı (örn. Odaklanmış, Şüpheci)..."
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500 font-mono"
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
                  setIsAddingExpression(false);
                  setNewExpLabel('');
                }}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </form>
          )}
        </div>

        {/* 6. Animasyonlar & Duruş */}
        <div className="space-y-3 bg-zinc-950/70 p-4 rounded-xl border border-zinc-800/80">
          <div className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" />
            <span>Animasyonlar & Duruş Modu</span>
          </div>

          <div className="grid grid-cols-2 gap-2 font-mono">
            <div>
              <label className="text-zinc-400 text-[11px] block mb-1">Duruş Modu:</label>
              <select
                value={physical.animationStance || 'Nöbet / Tetikte'}
                onChange={(e) => onChangePhysical({ animationStance: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                {STANCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-zinc-400 text-[11px] block mb-1">Boşta Bekleme Nabzı:</label>
              <select
                value={physical.idlePulseSpeed || 'Standart Nabız'}
                onChange={(e) => onChangePhysical({ idlePulseSpeed: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                {IDLE_PULSES.map((ip) => (
                  <option key={ip} value={ip}>
                    {ip}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

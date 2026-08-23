import React, { useState } from 'react';
import { DroitPhysical, ExpressionItem } from '../../types';
import { Sparkles, Palette, Shield, Eye, Smile, User } from 'lucide-react';

export type PhysicalSubTab = 'appearance' | 'hair' | 'eyes' | 'face' | 'outfit' | 'expressions';

interface PhysicalControlsProps {
  physical: DroitPhysical;
  onChangePhysical: (updated: Partial<DroitPhysical>) => void;
  currentExpression?: string;
  onChangeExpression?: (expId: string) => void;
  hairStyle: string;
  onChangeHairStyle: (style: string) => void;
  outfitStyle: string;
  onChangeOutfitStyle: (outfit: string) => void;
}

export const PhysicalControls: React.FC<PhysicalControlsProps> = ({
  physical,
  onChangePhysical,
  currentExpression = 'normal',
  onChangeExpression,
  hairStyle,
  onChangeHairStyle,
  outfitStyle,
  onChangeOutfitStyle,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<PhysicalSubTab>('appearance');

  const subTabs = [
    { id: 'appearance' as PhysicalSubTab, label: 'Görünüş' },
    { id: 'hair' as PhysicalSubTab, label: 'Saç' },
    { id: 'eyes' as PhysicalSubTab, label: 'Gözler' },
    { id: 'face' as PhysicalSubTab, label: 'Yüz' },
    { id: 'outfit' as PhysicalSubTab, label: 'Kıyafet' },
    { id: 'expressions' as PhysicalSubTab, label: 'İfadeler' },
  ];

  const expressionsList: ExpressionItem[] = [
    { id: 'normal', emoji: '🙂', label: 'Normal' },
    { id: 'happy', emoji: '😊', label: 'Mutlu' },
    { id: 'joke', emoji: '😏', label: 'Şakacı' },
    { id: 'angry', emoji: '😠', label: 'Kızgın' },
    { id: 'sad', emoji: '😔', label: 'Üzgün' },
    { id: 'surprised', emoji: '😮', label: 'Şaşkın' },
    { id: 'suspicious', emoji: '🤨', label: 'Şüpheli' },
    { id: 'thinking', emoji: '🤔', label: 'Düşünceli' },
  ];

  const colorPalettes = [
    { name: 'Elektrik Cyan', hex: '#06b6d4' },
    { name: 'Neon Mavi', hex: '#0ea5e9' },
    { name: 'Foton Mor', hex: '#a855f7' },
    { name: 'Zümrüt Yeşil', hex: '#10b981' },
    { name: 'Plazma Kızıl', hex: '#ef4444' },
    { name: 'Kehribar Sarı', hex: '#f59e0b' },
    { name: 'Kutup Beyazı', hex: '#f8fafc' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Sub-Tabs Bar */}
      <div className="flex items-center gap-1.5 px-4 py-2 border-b border-zinc-800/80 bg-zinc-950/60 overflow-x-auto">
        {subTabs.map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-3 py-1 rounded-md text-xs font-mono font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
              }`}
            >
              [ {tab.label} ]
            </button>
          );
        })}
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 p-4 overflow-y-auto">
        {/* 1. GÖRÜNÜŞ (Appearance) */}
        {activeSubTab === 'appearance' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Body Type */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-zinc-400 uppercase">Şasi / Beden Tipi</label>
              <select
                value={physical.bodyType || 'Sentetik İnsansı'}
                onChange={(e) => onChangePhysical({ bodyType: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 focus:outline-hidden focus:border-cyan-500"
              >
                <option value="Sentetik İnsansı">Sentetik İnsansı</option>
                <option value="Biyonik Çerçeve">Biyonik Çerçeve</option>
                <option value="Mekanik Çekirdek">Mekanik Çekirdek</option>
                <option value="Siber Droit">Siber Droit</option>
                <option value="Kuantum Rezonatör">Kuantum Rezonatör</option>
              </select>
            </div>

            {/* Body Scale */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-zinc-400 uppercase">Beden Ölçeği</label>
              <select
                value={physical.bodyScale || 'Standart'}
                onChange={(e) => onChangePhysical({ bodyScale: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 focus:outline-hidden focus:border-cyan-500"
              >
                <option value="Kompakt">Kompakt (İnce Yapı)</option>
                <option value="Standart">Standart (Dengeli)</option>
                <option value="Ağır Zırhlı">Ağır Zırhlı (Kuvvetli)</option>
                <option value="Devriye">Devriye (Çevik)</option>
              </select>
            </div>

            {/* Material */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-zinc-400 uppercase">Materyal Kaplama</label>
              <select
                value={physical.material || 'Karbon Fiber'}
                onChange={(e) => onChangePhysical({ material: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 focus:outline-hidden focus:border-cyan-500"
              >
                <option value="Karbon Fiber">Karbon Fiber Mat</option>
                <option value="Titanyum Alaşım">Titanyum Alaşım</option>
                <option value="Sıvı Metal">Sıvı Metal (Krom)</option>
                <option value="Seramik Zırh">Seramik Zırh</option>
              </select>
            </div>

            {/* Accent Color Swatch */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-zinc-400 uppercase">Vurgu Işıma Rengi</label>
              <div className="flex items-center gap-1.5">
                {colorPalettes.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => onChangePhysical({ accentColor: c.hex, primaryColor: c.hex })}
                    title={c.name}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      physical.accentColor === c.hex
                        ? 'border-white scale-110 shadow-[0_0_8px_currentColor]'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2. SAÇ / ANTEN (Hair / Sensor Pod) */}
        {activeSubTab === 'hair' && (
          <div className="space-y-3">
            <span className="text-[11px] font-mono text-zinc-400 uppercase block">Sensör & Saç Başlığı</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'Cyber Mohawk', label: 'Siber Mohawk', desc: 'Dikey fotonik fırça' },
                { id: 'Fiber Antennas', label: 'Fiber Optik Antenler', desc: 'Çift sinyal kulesi' },
                { id: 'Holo Crown', label: 'Holografik Taç', desc: 'Geometrik ışık halkası' },
                { id: 'Minimalist Shaved', label: 'Pürüzsüz Şasi', desc: 'Zırhlı aerodinamik kubbe' },
              ].map((style) => {
                const isSelected = hairStyle === style.id;
                return (
                  <button
                    key={style.id}
                    onClick={() => onChangeHairStyle(style.id)}
                    className={`p-3 rounded-lg border text-left transition-all font-mono ${
                      isSelected
                        ? 'bg-cyan-500/10 border-cyan-500/60 text-cyan-200'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                    }`}
                  >
                    <div className="text-xs font-bold">{style.label}</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">{style.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. GÖZLER (Eyes) */}
        {activeSubTab === 'eyes' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-zinc-400 uppercase">Optik Göz Tipi</label>
              <select
                value={physical.eyeType || 'Fotonik Halka'}
                onChange={(e) => onChangePhysical({ eyeType: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 focus:outline-hidden focus:border-cyan-500"
              >
                <option value="Fotonik Halka">Fotonik Halka (Çift Lens)</option>
                <option value="Neon Çember">Neon Çember</option>
                <option value="Siber Nokta">Siber Nokta Matrisi</option>
                <option value="Holografik İris">Holografik İris</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-zinc-400 uppercase">Göz Işıma Parlaklığı (%{physical.eyeGlow ?? 85})</label>
              <input
                type="range"
                min="10"
                max="100"
                value={physical.eyeGlow ?? 85}
                onChange={(e) => onChangePhysical({ eyeGlow: Number(e.target.value) })}
                className="w-full accent-cyan-400 bg-zinc-900 cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-zinc-400 uppercase">Lens Spektrum Rengi</label>
              <select
                value={physical.eyeColor || '#22d3ee'}
                onChange={(e) => onChangePhysical({ eyeColor: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 focus:outline-hidden focus:border-cyan-500"
              >
                <option value="#22d3ee">Cyan Turkuaz</option>
                <option value="#38bdf8">Safir Mavisi</option>
                <option value="#a855f7">Ametist Mor</option>
                <option value="#34d399">Zümrüt Yeşil</option>
                <option value="#f43f5e">Kızıl Alarm</option>
                <option value="#fbbf24">Kehribar Sarı</option>
                <option value="#ffffff">Kutup Beyazı</option>
              </select>
            </div>
          </div>
        )}

        {/* 4. YÜZ (Face) */}
        {activeSubTab === 'face' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-zinc-400 uppercase">Vizör Modeli</label>
              <select
                value={physical.visorType || 'Geniş Bant HUD'}
                onChange={(e) => onChangePhysical({ visorType: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 focus:outline-hidden focus:border-cyan-500"
              >
                <option value="Geniş Bant HUD">Geniş Bant HUD Vizör</option>
                <option value="Çift Optik Lens">Çift Optik Lens</option>
                <option value="T-Vizör">T-Vizör Taktik</option>
                <option value="Minimal Sensör">Minimal Sensör Çizgisi</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-zinc-400 uppercase">Yüz / Plaka Geometrisi</label>
              <select
                value={physical.faceShape || 'Keskin Hatlı'}
                onChange={(e) => onChangePhysical({ faceShape: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 focus:outline-hidden focus:border-cyan-500"
              >
                <option value="Keskin Hatlı">Keskin Hatlı (Zırhlı Köşeler)</option>
                <option value="Oval Sentetik">Oval Sentetik (İnsansı Akıcı)</option>
                <option value="Zırhlı Kask">Zırhlı Kask (Tam Koruma)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-zinc-400 uppercase">Ses Sentezleyici Arayüzü</label>
              <select
                value={physical.mouthType || 'Siber Dalgaformu'}
                onChange={(e) => onChangePhysical({ mouthType: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 focus:outline-hidden focus:border-cyan-500"
              >
                <option value="Siber Dalgaformu">Siber Dalgaformu (Dinamik LED)</option>
                <option value="Titreşen LED Matrisi">Titreşen LED Izgarası</option>
                <option value="Kapalı Koruma Plakası">Kapalı Koruma Plakası</option>
              </select>
            </div>
          </div>
        )}

        {/* 5. KIYAFET (Outfit) */}
        {activeSubTab === 'outfit' && (
          <div className="space-y-3">
            <span className="text-[11px] font-mono text-zinc-400 uppercase block">Kıyafet & Dış Zırh Modülü</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'Taktik Zırh', label: 'Taktik Zırh', desc: 'Takviyeli kompozit plakalar' },
                { id: 'Siber Pelerin', label: 'Siber Pelerin', desc: 'Optik kamuflaj kumaşı' },
                { id: 'Subay Üniforması', label: 'Subay Üniforması', desc: 'Resmi askeri sentetik hatlar' },
                { id: 'Minimal Şasi', label: 'Minimal Şasi', desc: 'Hafif endüstriyel iskelet' },
              ].map((item) => {
                const isSelected = outfitStyle === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onChangeOutfitStyle(item.id)}
                    className={`p-3 rounded-lg border text-left transition-all font-mono ${
                      isSelected
                        ? 'bg-cyan-500/10 border-cyan-500/60 text-cyan-200'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                    }`}
                  >
                    <div className="text-xs font-bold">{item.label}</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">{item.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 6. İFADELER (Expressions) */}
        {activeSubTab === 'expressions' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-zinc-400 uppercase">
                Yüz İfadeleri Matrisi (Hızlı Test)
              </span>
              <span className="text-[10px] font-mono text-cyan-400">Aktif: {currentExpression}</span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {expressionsList.map((exp) => {
                const isSelected = currentExpression === exp.id;
                return (
                  <button
                    key={exp.id}
                    onClick={() => onChangeExpression && onChangeExpression(exp.id)}
                    className={`p-2 rounded-lg border flex flex-col items-center justify-center transition-all font-mono ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-500/20'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                    }`}
                  >
                    <span className="text-lg">{exp.emoji}</span>
                    <span className="text-[10px] mt-1 truncate">{exp.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

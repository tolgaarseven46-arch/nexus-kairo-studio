import React, { useState, useRef } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Move, Sparkles, Eye, Shield, Cpu } from 'lucide-react';
import { DroitExpressionMode, DroitDynamicState, DroitPersonalityTraits } from '../../types/nexus';

interface DroitCharacterViewportProps {
  expression: DroitExpressionMode;
  dynamicState: DroitDynamicState;
  personality: DroitPersonalityTraits;
  onChangeExpression: (expression: DroitExpressionMode) => void;
}

export const DroitCharacterViewport: React.FC<DroitCharacterViewportProps> = ({
  expression,
  dynamicState,
  personality,
  onChangeExpression,
}) => {
  const [zoom, setZoom] = useState<number>(100);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [startPanPos, setStartPanPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  // Zoom Helpers
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 15, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 15, 60));
  const handleResetView = () => {
    setZoom(100);
    setPan({ x: 0, y: 0 });
  };

  // Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only pan on middle click or space+click or when clicking background directly
    if (e.button === 0 || e.button === 1) {
      setIsPanning(true);
      setStartPanPos({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({
      x: e.clientX - startPanPos.x,
      y: e.clientY - startPanPos.y,
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Dynamic Visor & Aura Colors based on expression / dynamicState
  const getVisorColor = () => {
    if (dynamicState.anger > 45 || expression === 'ALERT') {
      return {
        glow: 'rgba(239, 68, 68, 0.45)',
        core: '#ef4444',
        border: '#f87171',
        aura: 'from-rose-500/20 to-transparent',
      };
    }
    if (dynamicState.calmness > 70 || expression === 'CALM') {
      return {
        glow: 'rgba(16, 185, 129, 0.35)',
        core: '#10b981',
        border: '#34d399',
        aura: 'from-emerald-500/15 to-transparent',
      };
    }
    if (dynamicState.confidence > 80 || expression === 'CONFIDENT') {
      return {
        glow: 'rgba(99, 102, 241, 0.4)',
        core: '#6366f1',
        border: '#818cf8',
        aura: 'from-indigo-500/20 to-transparent',
      };
    }
    if (expression === 'ANALYTICAL' || dynamicState.surprise > 30) {
      return {
        glow: 'rgba(245, 158, 11, 0.4)',
        core: '#f59e0b',
        border: '#fbbf24',
        aura: 'from-amber-500/20 to-transparent',
      };
    }
    // Default Cyan/Neutral
    return {
      glow: 'rgba(6, 182, 212, 0.4)',
      core: '#06b6d4',
      border: '#38bdf8',
      aura: 'from-cyan-500/20 to-transparent',
    };
  };

  const visorColor = getVisorColor();

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="flex-1 h-full relative overflow-hidden bg-[#090b10] select-none flex items-center justify-center cursor-grab active:cursor-grabbing"
      style={{
        backgroundImage: `
          radial-gradient(circle at center, rgba(30, 35, 50, 0.35) 0%, transparent 70%),
          linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 32px 32px, 32px 32px',
      }}
    >
      {/* Üst Köşe: Görünüm Bilgisi */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 pointer-events-none">
        <div className="px-2.5 py-1 rounded bg-zinc-900/90 border border-zinc-800/80 backdrop-blur-md flex items-center gap-1.5 text-[11px] font-mono text-zinc-400">
          <Cpu className="w-3.5 h-3.5 text-indigo-400" />
          <span>DROIT VIEWPORT // 1:1</span>
        </div>
      </div>

      {/* Sağ Üst: Yakınlaştırma & Kamera Kontrolleri */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-zinc-900/90 border border-zinc-800/80 rounded-lg p-1 shadow-lg backdrop-blur-md">
        <button
          type="button"
          onClick={handleZoomIn}
          className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
          title="Yakınlaştır (+)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <span className="px-2 text-[11px] font-mono text-zinc-400 min-w-[44px] text-center">
          {zoom}%
        </span>
        <button
          type="button"
          onClick={handleZoomOut}
          className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
          title="Uzaklaştır (-)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="h-4 w-[1px] bg-zinc-800 mx-0.5" />
        <button
          type="button"
          onClick={handleResetView}
          className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
          title="Görünümü Sıfırla (Reset View)"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* MERKEZİ DROİT KARAKTER SAHNESİ */}
      <div
        className="transition-transform duration-75 ease-out relative flex flex-col items-center justify-center pointer-events-none"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})`,
        }}
      >
        {/* Arkadaki Holografik Işıma / Halo */}
        <div
          className={`absolute w-80 h-80 rounded-full bg-gradient-to-tr ${visorColor.aura} blur-3xl pointer-events-none opacity-75`}
        />

        {/* Karakter Gövdesi ve Başlığı (High-End Cybernetic SVG Droit Model) */}
        <div className="relative w-72 h-96 flex flex-col items-center justify-center">
          <svg
            viewBox="0 0 280 360"
            className="w-full h-full drop-shadow-[0_12px_32px_rgba(0,0,0,0.85)]"
          >
            <defs>
              {/* Şasi Gradyanları */}
              <linearGradient id="chassisGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e2230" />
                <stop offset="50%" stopColor="#141722" />
                <stop offset="100%" stopColor="#0c0e15" />
              </linearGradient>

              <linearGradient id="armorPlate" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#2a3045" />
                <stop offset="100%" stopColor="#181c2b" />
              </linearGradient>

              <linearGradient id="metallicAccent" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b4258" />
                <stop offset="50%" stopColor="#64748b" />
                <stop offset="100%" stopColor="#3b4258" />
              </linearGradient>

              <filter id="visorGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* 1. Omuzlar ve Göğüs Plakası (Torso) */}
            <path
              d="M 50 280 L 70 230 L 110 220 L 170 220 L 210 230 L 230 280 L 210 340 L 70 340 Z"
              fill="url(#chassisGrad)"
              stroke="#2e354a"
              strokeWidth="2"
            />
            {/* Göğüs Zırh Detayları */}
            <path
              d="M 90 240 L 140 250 L 190 240 L 180 290 L 140 310 L 100 290 Z"
              fill="url(#armorPlate)"
              stroke="#38425d"
              strokeWidth="1.5"
            />
            {/* Göğüs Güç Çekirdeği (Core Reactor Light) */}
            <circle
              cx="140"
              cy="280"
              r="10"
              fill={visorColor.core}
              filter="url(#visorGlowFilter)"
              opacity="0.85"
            />
            <circle cx="140" cy="280" r="4" fill="#ffffff" />

            {/* Omuz Zırh Kanatları */}
            <path d="M 40 260 L 65 235 L 75 255 L 45 285 Z" fill="#181c28" stroke="#333c52" strokeWidth="1.5" />
            <path d="M 240 260 L 215 235 L 205 255 L 235 285 Z" fill="#181c28" stroke="#333c52" strokeWidth="1.5" />

            {/* 2. Boyun Eklemleri ve Kablolar */}
            <rect x="122" y="185" width="36" height="35" rx="3" fill="#11141c" stroke="#252a3a" strokeWidth="1.5" />
            <line x1="130" y1="190" x2="130" y2="215" stroke="#374151" strokeWidth="2" />
            <line x1="140" y1="190" x2="140" y2="215" stroke="#4b5563" strokeWidth="2" />
            <line x1="150" y1="190" x2="150" y2="215" stroke="#374151" strokeWidth="2" />

            {/* 3. Kafa Tabanı & Şasi */}
            <path
              d="M 85 90 C 85 45, 195 45, 195 90 L 195 140 C 195 180, 165 200, 140 200 C 115 200, 85 180, 85 140 Z"
              fill="url(#chassisGrad)"
              stroke="#323b52"
              strokeWidth="2.5"
            />

            {/* Yan Şakak Modülleri / Ses Alıcıları */}
            <rect x="74" y="95" width="12" height="40" rx="3" fill="#181c29" stroke="#3b445f" strokeWidth="1.5" />
            <rect x="194" y="95" width="12" height="40" rx="3" fill="#181c29" stroke="#3b445f" strokeWidth="1.5" />
            <circle cx="80" cy="115" r="2.5" fill={visorColor.core} opacity="0.8" />
            <circle cx="200" cy="115" r="2.5" fill={visorColor.core} opacity="0.8" />

            {/* Kafa Üstü Zırh Plakası & Taç */}
            <path
              d="M 98 60 Q 140 42 182 60 L 175 80 Q 140 70 105 80 Z"
              fill="url(#metallicAccent)"
              stroke="#434e6c"
              strokeWidth="1.5"
            />

            {/* Yanak Plakaları (Cheek Armor) */}
            <path d="M 92 130 L 115 138 L 112 175 L 94 155 Z" fill="#1a1e2c" stroke="#2c344a" strokeWidth="1.5" />
            <path d="M 188 130 L 165 138 L 168 175 L 186 155 Z" fill="#1a1e2c" stroke="#2c344a" strokeWidth="1.5" />

            {/* Çene Plakası (Chin Plate) */}
            <path
              d="M 120 175 L 160 175 L 152 195 L 128 195 Z"
              fill="#22283a"
              stroke="#38435f"
              strokeWidth="1.5"
            />

            {/* 4. OPTİK VİZÖR / YÜZ MATRİSİ (Reaktif Siber Vizör) */}
            {/* Vizör Yuvası */}
            <path
              d="M 96 100 Q 140 92 184 100 L 178 132 Q 140 140 102 132 Z"
              fill="#080a10"
              stroke="#22293b"
              strokeWidth="2"
            />

            {/* Vizör Işıması ve Optik Çizgiler */}
            <path
              d="M 100 104 Q 140 97 180 104 L 175 128 Q 140 134 105 128 Z"
              fill={visorColor.glow}
              filter="url(#visorGlowFilter)"
              opacity="0.9"
            />

            {/* Optik İfade Lensleri / Çift Göz Işıkları */}
            {expression === 'ALERT' ? (
              // Alert / Anger: Keskin açılı gözler
              <g filter="url(#visorGlowFilter)">
                <polygon points="112,110 130,118 126,124 110,116" fill={visorColor.core} />
                <polygon points="168,110 150,118 154,124 170,116" fill={visorColor.core} />
              </g>
            ) : expression === 'CALM' ? (
              // Calm: Yumuşak kavisli yatay göz çizgileri
              <g filter="url(#visorGlowFilter)">
                <path d="M 112 118 Q 124 113 132 118" stroke={visorColor.core} strokeWidth="3.5" strokeLinecap="round" fill="none" />
                <path d="M 148 118 Q 156 113 168 118" stroke={visorColor.core} strokeWidth="3.5" strokeLinecap="round" fill="none" />
              </g>
            ) : expression === 'ANALYTICAL' ? (
              // Analytical: Hedefleme HUD halkaları
              <g filter="url(#visorGlowFilter)">
                <circle cx="122" cy="116" r="6" stroke={visorColor.core} strokeWidth="2" fill="none" />
                <circle cx="122" cy="116" r="2" fill="#ffffff" />
                <line x1="140" y1="110" x2="140" y2="122" stroke={visorColor.core} strokeWidth="1.5" strokeDasharray="2 2" />
                <circle cx="158" cy="116" r="6" stroke={visorColor.core} strokeWidth="2" fill="none" />
                <circle cx="158" cy="116" r="2" fill="#ffffff" />
              </g>
            ) : (
              // Neutral / Standard: Parlak siber lensler
              <g filter="url(#visorGlowFilter)">
                <rect x="114" y="112" width="18" height="7" rx="2" fill={visorColor.core} />
                <rect x="148" y="112" width="18" height="7" rx="2" fill={visorColor.core} />
                <circle cx="123" cy="115.5" r="2" fill="#ffffff" />
                <circle cx="157" cy="115.5" r="2" fill="#ffffff" />
              </g>
            )}

            {/* Ağız / İletişim Vokal Matrisi */}
            <g opacity="0.75">
              <line x1="126" y1="155" x2="154" y2="155" stroke={visorColor.core} strokeWidth="1.5" strokeDasharray="3 2" />
              <line x1="132" y1="160" x2="148" y2="160" stroke="#3e4863" strokeWidth="1.5" />
            </g>

            {/* Alın Devre Hatları (Circuit Accents) */}
            <path
              d="M 140 70 L 140 85 M 130 76 L 140 82 L 150 76"
              stroke="#404c6a"
              strokeWidth="1.5"
              fill="none"
            />
          </svg>
        </div>

        {/* Karakterin Altındaki Durum Etiketi */}
        <div className="mt-4 flex flex-col items-center gap-1 pointer-events-auto">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/90 border border-zinc-800 shadow-xl backdrop-blur-md">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: visorColor.core }}
            />
            <span className="text-[11px] font-mono font-bold tracking-widest text-zinc-200">
              {expression}
            </span>
          </div>

          <span className="text-[10px] font-mono text-zinc-500">
            Droit Sentetik Varlık Modeli #001
          </span>
        </div>
      </div>

      {/* Alt Sol: Hızlı Yüz İfadesi Önizleme Seçici */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-1.5 bg-zinc-900/90 border border-zinc-800/80 rounded-lg p-1.5 shadow-xl backdrop-blur-md">
        <span className="text-[10px] font-mono text-zinc-500 uppercase px-1.5 flex items-center gap-1">
          <Eye className="w-3 h-3 text-zinc-400" />
          <span>Mod:</span>
        </span>
        {(['NEUTRAL', 'CALM', 'ALERT', 'ANALYTICAL', 'CONFIDENT'] as DroitExpressionMode[]).map(
          (mode) => {
            const isActive = expression === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => onChangeExpression(mode)}
                className={`px-2 py-1 rounded text-[10px] font-mono font-medium transition-all ${
                  isActive
                    ? 'bg-zinc-800 text-indigo-300 border border-indigo-500/40 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                }`}
              >
                {mode}
              </button>
            );
          }
        )}
      </div>

      {/* Alt Sağ: Etkileşim İpucu */}
      <div className="absolute bottom-4 right-4 z-10 pointer-events-none hidden md:flex items-center gap-1.5 text-[10px] font-mono text-zinc-600">
        <Move className="w-3 h-3" />
        <span>Sürükle: Gezin | Tekerlek: Yakınlaş</span>
      </div>
    </div>
  );
};

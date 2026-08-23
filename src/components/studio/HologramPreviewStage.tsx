import React from 'react';
import { RefreshCw, Sparkles, Cpu, Eye, Smile, Shield, Radio, Volume2 } from 'lucide-react';
import { DroitPhysical, ExpressionItem } from '../../types';

interface HologramPreviewStageProps {
  name: string;
  roleTitle?: string;
  physical: DroitPhysical;
  currentExpressionId: string;
  expressions: ExpressionItem[];
  onSelectExpression: (expressionId: string) => void;
  onRegenerateSeed: () => void;
}

export const HologramPreviewStage: React.FC<HologramPreviewStageProps> = ({
  name,
  roleTitle = 'Yönetici Droit',
  physical,
  currentExpressionId,
  expressions,
  onSelectExpression,
  onRegenerateSeed,
}) => {
  const currentExp = expressions.find((e) => e.id === currentExpressionId) || expressions[0] || {
    id: 'normal',
    emoji: '🙂',
    label: 'Normal',
  };

  // Color mapping helpers
  const getEyeColorCss = (colorName?: string) => {
    switch (colorName) {
      case 'Cyan':
        return '#06b6d4';
      case 'Kehribar':
        return '#f59e0b';
      case 'Zümrüt Yeşili':
        return '#10b981';
      case 'Safir Mavisi':
        return '#3b82f6';
      case 'Kızıl Kırmızı':
        return '#ef4444';
      case 'Ametist Moru':
        return '#a855f7';
      case 'Buz Beyazı':
        return '#e2e8f0';
      default:
        return '#06b6d4';
    }
  };

  const eyeColorHex = getEyeColorCss(physical.eyeColor);
  const glowOpacity = Math.max(0.3, (physical.eyeGlow ?? 80) / 100);

  return (
    <div className="relative rounded-2xl bg-zinc-950/90 border border-zinc-800/90 overflow-hidden shadow-2xl p-5 flex flex-col items-center">
      {/* Background Holographic Grid and Ambient Rings */}
      <div className="absolute inset-0 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />
      <div
        className="absolute w-72 h-72 rounded-full blur-3xl -top-12 -left-12 pointer-events-none transition-colors duration-500"
        style={{ backgroundColor: `${eyeColorHex}15` }}
      />
      <div
        className="absolute w-72 h-72 rounded-full blur-3xl -bottom-12 -right-12 pointer-events-none transition-colors duration-500"
        style={{ backgroundColor: `${physical.accentColor || '#06b6d4'}15` }}
      />

      {/* Top Stage Bar: Status & Seed Refresh */}
      <div className="w-full flex items-center justify-between pb-3 mb-3 border-b border-zinc-800/80 z-10 text-[11px] font-mono">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ backgroundColor: eyeColorHex }}
            />
            <span
              className="relative inline-flex rounded-full h-2 w-2"
              style={{ backgroundColor: eyeColorHex }}
            />
          </span>
          <span className="text-zinc-400 font-bold tracking-wider uppercase">
            HOLOGRAFİK SAHNE
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-zinc-500 hidden sm:inline">
            Tohum: <span className="text-zinc-300">#{physical.avatarSeed || '0x00'}</span>
          </span>
          <button
            type="button"
            onClick={onRegenerateSeed}
            className="p-1 text-zinc-400 hover:text-cyan-300 hover:bg-zinc-900 rounded transition-colors cursor-pointer"
            title="Tohumu Rastgele Yenile"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Center Hologram Avatar Visualization */}
      <div className="relative my-3 flex flex-col items-center justify-center">
        {/* Orbital Target Rings */}
        <div
          className="relative w-44 h-44 rounded-full border border-dashed flex items-center justify-center p-3 transition-colors duration-500"
          style={{ borderColor: `${eyeColorHex}40` }}
        >
          {/* Outer Pulsing Glow */}
          <div
            className="absolute inset-0 rounded-full animate-spin [animation-duration:30s] opacity-40 border-t-2"
            style={{ borderColor: eyeColorHex }}
          />

          {/* Inner Pod Sphere */}
          <div className="relative w-36 h-36 rounded-full bg-gradient-to-b from-zinc-900 via-zinc-950 to-black border-2 border-zinc-700/80 shadow-2xl flex flex-col items-center justify-center overflow-hidden">
            {/* Cyber Scanline Effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/10 to-transparent animate-pulse pointer-events-none" />

            {/* Expression Emoji / Face */}
            <div className="text-5xl select-none filter drop-shadow-[0_0_12px_rgba(6,182,212,0.4)] transition-transform duration-300 hover:scale-110">
              {currentExp.emoji}
            </div>

            {/* Simulated HUD Visor Line */}
            <div
              className="mt-2.5 px-3 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-widest uppercase transition-all duration-300 flex items-center gap-1 shadow-sm"
              style={{
                backgroundColor: `${eyeColorHex}25`,
                color: eyeColorHex,
                border: `1px solid ${eyeColorHex}60`,
                boxShadow: `0 0 10px ${eyeColorHex}30`,
              }}
            >
              <Eye className="w-2.5 h-2.5" />
              <span>{currentExp.label}</span>
            </div>
          </div>
        </div>

        {/* Name and Designation Overlay */}
        <div className="mt-3 text-center">
          <div className="text-sm font-bold font-mono text-zinc-100 tracking-wider">
            {name || 'İsimsiz Droit'}
          </div>
          <div className="text-xs font-mono text-cyan-400/90 flex items-center justify-center gap-1.5 mt-0.5">
            <span>{roleTitle}</span>
            <span>•</span>
            <span className="text-zinc-400">{physical.bodyType || 'Sentetik'}</span>
          </div>
        </div>
      </div>

      {/* Quick Expression Switcher Carousel */}
      <div className="w-full mt-2 pt-3 border-t border-zinc-800/80">
        <div className="text-[10px] font-mono text-zinc-400 mb-2 flex items-center justify-between">
          <span className="uppercase tracking-wider">Hızlı İfade Seçimi</span>
          <span className="text-cyan-400 font-bold">{currentExp.label}</span>
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {expressions.map((exp) => {
            const isSelected = exp.id === currentExpressionId;
            return (
              <button
                key={exp.id}
                type="button"
                onClick={() => onSelectExpression(exp.id)}
                className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-950 border border-cyan-500 text-cyan-200 shadow-md shadow-cyan-500/20 scale-105'
                    : 'bg-zinc-900/90 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                }`}
              >
                <span>{exp.emoji}</span>
                <span className="text-[11px]">{exp.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Futuristic 2D/3D Engine Ready Indicator */}
      <div className="w-full mt-3 p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/60 flex items-center justify-between text-[10px] font-mono text-zinc-400">
        <div className="flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span>Gelecek 2D / 3D Sahne Motoru Hazır</span>
        </div>
        <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-cyan-300 border border-zinc-700">
          Modüler Slot
        </span>
      </div>
    </div>
  );
};

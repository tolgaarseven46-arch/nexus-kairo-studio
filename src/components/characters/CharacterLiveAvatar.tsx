import React from 'react';
import { RefreshCw, Sparkles, Radio } from 'lucide-react';
import { ExpressionItem } from '../../types';

interface CharacterLiveAvatarProps {
  name: string;
  seed: string;
  currentExpression: string;
  expressions: ExpressionItem[];
  roleTitle?: string;
  onRegenerateSeed?: () => void;
  className?: string;
}

export const CharacterLiveAvatar: React.FC<CharacterLiveAvatarProps> = ({
  name,
  seed,
  currentExpression,
  expressions,
  roleTitle,
  onRegenerateSeed,
  className = '',
}) => {
  const activeExp =
    expressions.find((e) => e.id === currentExpression || e.label === currentExpression) ||
    expressions[0] || {
      id: 'normal',
      emoji: '🙂',
      label: 'Normal',
    };

  // Deterministic mood colors based on expression
  const moodColorMap: Record<
    string,
    { border: string; glow: string; bg: string; text: string; aura: string }
  > = {
    normal: {
      border: 'border-cyan-500/60',
      glow: 'shadow-cyan-500/20',
      bg: 'from-cyan-950/70 via-zinc-950 to-blue-950/70',
      text: 'text-cyan-400',
      aura: 'bg-cyan-500/20',
    },
    joke: {
      border: 'border-amber-500/60',
      glow: 'shadow-amber-500/20',
      bg: 'from-amber-950/70 via-zinc-950 to-orange-950/70',
      text: 'text-amber-400',
      aura: 'bg-amber-500/20',
    },
    angry: {
      border: 'border-rose-500/70',
      glow: 'shadow-rose-500/30',
      bg: 'from-rose-950/80 via-zinc-950 to-red-950/80',
      text: 'text-rose-400',
      aura: 'bg-rose-500/25',
    },
    suspicious: {
      border: 'border-violet-500/60',
      glow: 'shadow-violet-500/20',
      bg: 'from-violet-950/70 via-zinc-950 to-purple-950/70',
      text: 'text-violet-400',
      aura: 'bg-violet-500/20',
    },
    surprised: {
      border: 'border-sky-400/60',
      glow: 'shadow-sky-400/20',
      bg: 'from-sky-950/70 via-zinc-950 to-blue-950/70',
      text: 'text-sky-300',
      aura: 'bg-sky-400/20',
    },
    sad: {
      border: 'border-indigo-400/60',
      glow: 'shadow-indigo-400/20',
      bg: 'from-indigo-950/70 via-zinc-950 to-slate-950/70',
      text: 'text-indigo-300',
      aura: 'bg-indigo-400/20',
    },
    thinking: {
      border: 'border-emerald-400/60',
      glow: 'shadow-emerald-400/20',
      bg: 'from-emerald-950/70 via-zinc-950 to-teal-950/70',
      text: 'text-emerald-400',
      aura: 'bg-emerald-400/20',
    },
  };

  const currentMood = moodColorMap[activeExp.id] || moodColorMap.normal;

  const initials =
    (name || seed)
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0]?.toUpperCase())
      .slice(0, 2)
      .join('') || 'NX';

  return (
    <div
      className={`relative p-5 rounded-xl border ${currentMood.border} bg-zinc-950/90 shadow-xl ${currentMood.glow} overflow-hidden transition-all duration-300 flex flex-col items-center justify-between min-h-[260px] ${className}`}
    >
      {/* Dynamic Aura Background */}
      <div
        className={`absolute -top-12 -left-12 w-44 h-44 rounded-full ${currentMood.aura} blur-3xl pointer-events-none transition-colors duration-500`}
      />
      <div
        className={`absolute -bottom-12 -right-12 w-44 h-44 rounded-full ${currentMood.aura} blur-3xl pointer-events-none transition-colors duration-500`}
      />

      {/* Top HUD Line */}
      <div className="w-full flex items-center justify-between text-[11px] font-mono text-zinc-400 z-10">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900/80 border border-zinc-800">
          <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
          <span className="text-zinc-300 tracking-wider">CANLI ÖNİZLEME</span>
        </div>

        {onRegenerateSeed && (
          <button
            type="button"
            onClick={onRegenerateSeed}
            className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-cyan-300 px-2 py-0.5 rounded bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 transition-colors"
            title="Matris Tohumunu Yeniden Üret"
          >
            <RefreshCw className="w-2.5 h-2.5" />
            <span>Tohum</span>
          </button>
        )}
      </div>

      {/* Main Visual Avatar Circle & Face Matrix */}
      <div className="relative my-4 flex flex-col items-center justify-center z-10">
        {/* Holographic outer ring */}
        <div
          className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-br ${currentMood.bg} border-2 ${currentMood.border} flex flex-col items-center justify-center shadow-inner overflow-hidden transition-all duration-300`}
        >
          {/* Subtle Cyber Grid */}
          <div className="absolute inset-0 opacity-25 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:8px_8px]" />

          {/* Corner brackets */}
          <div className="absolute top-1 left-1 w-2 h-2 border-t-2 border-l-2 border-current opacity-50" />
          <div className="absolute top-1 right-1 w-2 h-2 border-t-2 border-r-2 border-current opacity-50" />
          <div className="absolute bottom-1 left-1 w-2 h-2 border-b-2 border-l-2 border-current opacity-50" />
          <div className="absolute bottom-1 right-1 w-2 h-2 border-b-2 border-r-2 border-current opacity-50" />

          {/* Large Emoji / Expression Glyph */}
          <div className="text-4xl sm:text-5xl transform hover:scale-110 transition-transform duration-200 select-none drop-shadow-md">
            {activeExp.emoji}
          </div>

          {/* Initials & Matrix Tag */}
          <div className="mt-1 text-[10px] font-mono tracking-widest font-bold uppercase opacity-80">
            {initials} // D-MATRİS
          </div>
        </div>

        {/* Floating Expression Badge */}
        <div
          className={`absolute -bottom-2.5 px-3 py-0.5 rounded-full text-[11px] font-mono font-bold bg-zinc-950 border ${currentMood.border} ${currentMood.text} shadow-md flex items-center gap-1.5 whitespace-nowrap`}
        >
          <span>{activeExp.emoji}</span>
          <span className="uppercase">{activeExp.label}</span>
        </div>
      </div>

      {/* Footer Info */}
      <div className="w-full text-center z-10 pt-2 border-t border-zinc-800/80">
        <div className="text-xs font-mono font-bold text-zinc-200 truncate">
          {name || 'İsimsiz Varlık'}
        </div>
        <div className="text-[11px] font-mono text-cyan-400/90 truncate">
          {roleTitle || 'Yönetici Droit'}
        </div>
      </div>
    </div>
  );
};

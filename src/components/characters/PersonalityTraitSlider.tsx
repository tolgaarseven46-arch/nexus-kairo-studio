import React from 'react';
import { Trash2 } from 'lucide-react';

interface PersonalityTraitSliderProps {
  label: string;
  value: number; // 0 - 100
  onChange: (newValue: number) => void;
  onDelete?: () => void;
  isCustom?: boolean;
}

export const PersonalityTraitSlider: React.FC<PersonalityTraitSliderProps> = ({
  label,
  value,
  onChange,
  onDelete,
  isCustom = false,
}) => {
  // Convert 0-100 value to 10-segment ASCII representation: e.g. 80% -> 8 filled, 2 empty
  const totalBlocks = 10;
  const filledBlocks = Math.min(totalBlocks, Math.max(0, Math.round(value / 10)));
  const emptyBlocks = totalBlocks - filledBlocks;

  const filledChar = '█';
  const emptyChar = '░';
  const asciiBar = filledChar.repeat(filledBlocks) + emptyChar.repeat(emptyBlocks);

  return (
    <div className="p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/80 hover:border-zinc-700/80 transition-colors space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-zinc-200">{label}</span>
          {isCustom && (
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800/60">
              Özel
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Visual ASCII Bar Render */}
          <span
            className="font-mono text-xs tracking-wider text-cyan-400 select-none hidden sm:inline"
            title={`Seviye: ${value}%`}
          >
            {asciiBar}
          </span>

          {/* Numerical Percentage */}
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-200 min-w-[44px] text-right">
            %{value}
          </span>

          {/* Delete Action if custom */}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="p-1 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 rounded transition-colors"
              title="Bu özelliği kaldır"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Interactive Cyberpunk Slider */}
      <div className="relative flex items-center gap-3">
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
        />
      </div>
    </div>
  );
};

import React from 'react';
import {
  Undo2,
  Redo2,
  Save,
  LogOut,
  Sparkles,
  Maximize2,
  Sliders,
  Check,
  Layers,
  Cpu,
} from 'lucide-react';

interface EditorTopBarProps {
  droitName: string;
  onDroitNameChange: (name: string) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onExit: () => void;
  isSaving?: boolean;
  lastSavedText?: string;
  zoomLevel: number;
  onResetView: () => void;
}

export const EditorTopBar: React.FC<EditorTopBarProps> = ({
  droitName,
  onDroitNameChange,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onSave,
  onExit,
  isSaving = false,
  lastSavedText,
  zoomLevel,
  onResetView,
}) => {
  return (
    <header className="h-14 bg-zinc-950 border-b border-zinc-800/80 px-4 flex items-center justify-between select-none z-20">
      {/* Left: Droit Identity Name */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-mono">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[11px] text-zinc-500 uppercase">DROİT:</span>
        </div>

        <div className="relative flex items-center group">
          <input
            type="text"
            value={droitName}
            onChange={(e) => onDroitNameChange(e.target.value)}
            placeholder="Droit Adı Girin..."
            className="bg-transparent border border-transparent hover:border-zinc-800 focus:border-cyan-500/50 rounded px-2 py-1 text-sm font-mono font-bold text-zinc-100 placeholder-zinc-600 focus:outline-hidden focus:bg-zinc-900/90 transition-all w-48 sm:w-64"
          />
        </div>

        {lastSavedText && (
          <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-mono text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {lastSavedText}
          </span>
        )}
      </div>

      {/* Middle: Quick Viewport Controls */}
      <div className="hidden lg:flex items-center gap-1 bg-zinc-900/80 border border-zinc-800/80 rounded-lg p-1 text-xs font-mono text-zinc-400">
        <button
          onClick={onResetView}
          className="px-2.5 py-1 rounded hover:bg-zinc-800 text-zinc-300 transition-colors flex items-center gap-1.5"
          title="Görünümü Ortala (%100)"
        >
          <Maximize2 className="w-3 h-3 text-cyan-400" />
          <span>%{Math.round(zoomLevel * 100)}</span>
        </button>
      </div>

      {/* Right: History & Global Actions */}
      <div className="flex items-center gap-2">
        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Geri Al (Ctrl+Z)"
            className="p-1.5 text-zinc-400 hover:text-zinc-100 disabled:opacity-30 disabled:hover:text-zinc-400 rounded hover:bg-zinc-800 transition-colors"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Yinele (Ctrl+Y)"
            className="p-1.5 text-zinc-400 hover:text-zinc-100 disabled:opacity-30 disabled:hover:text-zinc-400 rounded hover:bg-zinc-800 transition-colors"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        <div className="h-5 w-px bg-zinc-800 mx-1" />

        {/* Save */}
        <button
          onClick={onSave}
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-zinc-950 text-xs font-mono font-bold transition-all shadow-md shadow-cyan-500/20"
        >
          {isSaving ? (
            <div className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          <span>Kaydet</span>
        </button>

        {/* Exit */}
        <button
          onClick={onExit}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 border border-zinc-800 transition-colors text-xs font-mono"
          title="Editörden Çık"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Çıkış</span>
        </button>
      </div>
    </header>
  );
};

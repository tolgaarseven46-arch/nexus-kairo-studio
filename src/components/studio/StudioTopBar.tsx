import React from 'react';
import {
  MessageSquare,
  Sliders,
  FlaskConical,
  Settings,
  Save,
  Check,
  Loader2,
  Sparkles,
  Bot,
  Fingerprint,
  Layers,
  Smile,
  Zap,
  Cpu,
  Brain,
} from 'lucide-react';
import { NexusTab, DroitWorkspaceType } from '../../types/nexus';

export interface WorkspaceOption {
  key: DroitWorkspaceType;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const WORKSPACE_OPTIONS: WorkspaceOption[] = [
  {
    key: 'PERSONALITY',
    title: 'KİŞİLİK',
    description: 'Kalıcı karakter özellikleri',
    icon: Fingerprint,
  },
  {
    key: 'PHYSICAL',
    title: 'FİZİKSEL GÖRÜNÜM',
    description: 'Görsel görünüm ve assetler',
    icon: Layers,
  },
  {
    key: 'EXPRESSIONS',
    title: 'YÜZ İFADELERİ',
    description: 'Duygusal yüz ifadeleri',
    icon: Smile,
  },
  {
    key: 'BEHAVIOR',
    title: 'DAVRANIŞ',
    description: 'Tepki kuralları ve eylemler',
    icon: Zap,
  },
  {
    key: 'SPEECH',
    title: 'KONUŞMA',
    description: 'Konuşma tarzı ve tonlama',
    icon: MessageSquare,
  },
  {
    key: 'MEMORY',
    title: 'HAFIZA',
    description: 'Hafıza ve bilgi tabanı',
    icon: Cpu,
  },
];

interface StudioTopBarProps {
  activeTab: NexusTab;
  onSelectTab: (tab: NexusTab) => void;
  onSave: () => void;
  isSaved: boolean;
  isSaving?: boolean;
}

interface TabOption {
  key: NexusTab;
  title: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const TAB_OPTIONS: TabOption[] = [
  {
    key: 'KARAKTER',
    title: 'KARAKTER',
    sub: 'Kimlik & Kişilik',
    icon: Sliders,
  },
  {
    key: 'TEST',
    title: 'TEST',
    sub: 'Chat & Test Lab',
    icon: FlaskConical,
  },
  {
    key: 'BEYIN',
    title: 'BEYİN',
    sub: 'Canlı Muhakeme',
    icon: Brain,
  },
  {
    key: 'AYARLAR',
    title: 'AYARLAR',
    sub: 'Sistem & Altyapı',
    icon: Settings,
  },
];

export const StudioTopBar: React.FC<StudioTopBarProps> = ({
  activeTab,
  onSelectTab,
  onSave,
  isSaved,
  isSaving = false,
}) => {
  return (
    <header className="h-14 border-b border-zinc-800/80 bg-zinc-950 px-4 sm:px-6 flex items-center justify-between select-none z-30 shrink-0">
      {/* SOL: NEXUS LOGOSU & KAIRO ETİKETİ */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-mono font-bold text-xs shadow-md shadow-indigo-600/30">
            N
          </div>
          <div className="flex flex-col">
            <span className="font-mono font-bold tracking-widest text-xs sm:text-sm text-zinc-100 leading-none">
              NEXUS
            </span>
            <span className="text-[10px] font-mono text-zinc-500 leading-none mt-0.5">
              DROIT #001 // KAIRO
            </span>
          </div>
        </div>
      </div>

      {/* ORTA: 4 ANA SEKME BUTONLARI (KAIRO, KARAKTER, TEST, AYARLAR) */}
      <nav className="flex items-center gap-1 sm:gap-2 p-1 rounded-xl bg-zinc-900/80 border border-zinc-800/80 backdrop-blur-xs">
        {TAB_OPTIONS.map((tab) => {
          const IconComp = tab.icon;
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onSelectTab(tab.key)}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 ring-1 ring-indigo-400/30'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <IconComp className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
              <span>{tab.title}</span>
            </button>
          );
        })}
      </nav>

      {/* SAĞ: FIRESTORE SENKRONİZASYON & KAYDET BUTONU */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider transition-all cursor-pointer shadow-sm ${
            isSaving
              ? 'bg-indigo-700/80 text-indigo-200 cursor-wait'
              : isSaved
              ? 'bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800/80 hover:text-zinc-100'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white ring-2 ring-indigo-500/40 animate-pulse'
          }`}
          title="Kişilik ayarlarını Firestore'a kaydet"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="hidden sm:inline">Kaydediliyor...</span>
            </>
          ) : isSaved ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Kayıtlı</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              <span>Kaydet</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};

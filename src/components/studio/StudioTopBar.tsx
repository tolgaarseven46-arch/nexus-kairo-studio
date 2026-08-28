import React from "react";
import {
  Check,
  Cpu,
  Fingerprint,
  FlaskConical,
  Layers,
  Loader2,
  MessageSquare,
  Save,
  Settings,
  Sliders,
  Smile,
  Zap,
} from "lucide-react";
import { DroitWorkspaceType, NexusTab } from "../../types/nexus";

export interface WorkspaceOption {
  key: DroitWorkspaceType;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const WORKSPACE_OPTIONS: WorkspaceOption[] = [
  {
    key: "PERSONALITY",
    title: "KİŞİLİK",
    description: "Kalıcı karakter özellikleri",
    icon: Fingerprint,
  },
  {
    key: "PHYSICAL",
    title: "FİZİKSEL GÖRÜNÜM",
    description: "Görsel görünüm ve assetler",
    icon: Layers,
  },
  {
    key: "EXPRESSIONS",
    title: "YÜZ İFADELERİ",
    description: "Duygusal yüz ifadeleri",
    icon: Smile,
  },
  {
    key: "BEHAVIOR",
    title: "DAVRANIŞ",
    description: "Tepki kuralları ve eylemler",
    icon: Zap,
  },
  {
    key: "SPEECH",
    title: "KONUŞMA",
    description: "Konuşma tarzı ve tonlama",
    icon: MessageSquare,
  },
  {
    key: "MEMORY",
    title: "HAFIZA",
    description: "Hafıza ve bilgi tabanı",
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

const tabs: Array<{
  key: NexusTab;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: "KARAKTER", title: "KARAKTER", icon: Sliders },
  { key: "TEST", title: "TEST & DEBUG", icon: FlaskConical },
  { key: "AYARLAR", title: "SİSTEM", icon: Settings },
];

export const StudioTopBar: React.FC<StudioTopBarProps> = ({
  activeTab,
  onSelectTab,
  onSave,
  isSaved,
  isSaving = false,
}) => (
  <header className="z-30 flex h-14 shrink-0 select-none items-center justify-between border-b border-zinc-800/80 bg-zinc-950 px-4 sm:px-6">
    <div className="flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-xs font-mono font-bold text-white shadow-md shadow-indigo-600/30">
        N
      </div>
      <div className="flex flex-col">
        <span className="text-xs font-mono font-bold leading-none tracking-widest text-zinc-100 sm:text-sm">
          NEXUS
        </span>
        <span className="mt-0.5 text-[10px] font-mono leading-none text-zinc-500">
          DROIT #001 // KAIRA
        </span>
      </div>
    </div>

    <nav className="flex items-center gap-1 rounded-xl border border-zinc-800/80 bg-zinc-900/80 p-1">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onSelectTab(tab.key)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-mono font-bold transition-all ${
              active
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{tab.title}</span>
          </button>
        );
      })}
    </nav>

    <div className="flex min-w-24 justify-end">
      {activeTab === "KARAKTER" && (
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-mono font-bold ${
            isSaving
              ? "bg-indigo-700/80 text-indigo-200"
              : isSaved
                ? "border border-zinc-800 bg-zinc-900 text-zinc-300"
                : "bg-indigo-600 text-white"
          }`}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Kaydediliyor...</span>
            </>
          ) : isSaved ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span>Kayıtlı</span>
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5" />
              <span>Kaydet</span>
            </>
          )}
        </button>
      )}
    </div>
  </header>
);

import React from 'react';
import {
  DroitWorkspaceType,
} from '../../types/nexus';
import { WORKSPACE_OPTIONS } from './StudioTopBar';
import { ArrowLeft } from 'lucide-react';

interface WorkspacePlaceholderPanelProps {
  workspace: DroitWorkspaceType;
  onBackToPersonality: () => void;
}

export const WorkspacePlaceholderPanel: React.FC<WorkspacePlaceholderPanelProps> = ({
  workspace,
  onBackToPersonality,
}) => {
  const currentOption =
    WORKSPACE_OPTIONS.find((opt) => opt.key === workspace) ||
    WORKSPACE_OPTIONS[0];
  const IconComponent = currentOption.icon;

  return (
    <aside className="w-full md:w-80 lg:w-88 h-full bg-zinc-950 border-r border-zinc-800/80 flex flex-col select-none overflow-hidden shrink-0">
      {/* Panel Başlığı */}
      <div className="p-5 border-b border-zinc-800/80 shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-xs font-mono font-bold tracking-widest text-zinc-100 uppercase">
            {currentOption.title}
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            {currentOption.description}
          </p>
        </div>
      </div>

      {/* Placeholder İçerik */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center space-y-4 custom-scrollbar">
        <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-indigo-400 shadow-inner">
          <IconComponent className="w-6 h-6" />
        </div>

        <div className="space-y-1.5 max-w-xs">
          <h3 className="text-sm font-semibold text-zinc-200">
            {currentOption.title} Katmanı
          </h3>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Bu çalışma alanı altyapısı hazırlandı. İlgili yapılandırma araçları sonraki aşamada entegre edilecektir.
          </p>
        </div>

        <button
          type="button"
          onClick={onBackToPersonality}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-zinc-100 border border-zinc-800 text-xs font-medium transition-all shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kişilik Alanına Dön</span>
        </button>
      </div>
    </aside>
  );
};

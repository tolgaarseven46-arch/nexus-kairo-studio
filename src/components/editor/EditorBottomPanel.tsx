import React, { useState } from 'react';
import { ChevronUp, ChevronDown, User, Brain, Cog, SlidersHorizontal } from 'lucide-react';
import { ActiveToolLayer } from './EditorToolSidebar';
import { PhysicalControls } from './PhysicalControls';
import { BrainControls } from './BrainControls';
import { MissionControls } from './MissionControls';
import { Character, DroitPhysical, DroitBrain, DroitMission } from '../../types';

interface EditorBottomPanelProps {
  activeTool: ActiveToolLayer;
  character: Character;
  onChangePhysical: (updated: Partial<DroitPhysical>) => void;
  onChangeBrain: (updated: Partial<DroitBrain>) => void;
  onChangeMission: (updated: Partial<DroitMission>) => void;
  currentExpression?: string;
  onChangeExpression?: (expId: string) => void;
  hairStyle: string;
  onChangeHairStyle: (style: string) => void;
  outfitStyle: string;
  onChangeOutfitStyle: (outfit: string) => void;
}

export const EditorBottomPanel: React.FC<EditorBottomPanelProps> = ({
  activeTool,
  character,
  onChangePhysical,
  onChangeBrain,
  onChangeMission,
  currentExpression,
  onChangeExpression,
  hairStyle,
  onChangeHairStyle,
  outfitStyle,
  onChangeOutfitStyle,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const getToolMeta = () => {
    switch (activeTool) {
      case 'physical':
        return {
          title: 'FİZİK AYARLARI',
          subtitle: 'Görünüş, Şasi, Saç, Gözler, Yüz, Kıyafet & İfadeler',
          icon: User,
          color: 'text-cyan-400',
          badge: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300',
        };
      case 'brain':
        return {
          title: 'BEYİN AYARLARI',
          subtitle: 'Kişilik Puanları, Davranış Protokolleri, Değerler & Hafıza',
          icon: Brain,
          color: 'text-violet-400',
          badge: 'bg-violet-500/10 border-violet-500/30 text-violet-300',
        };
      case 'mission':
        return {
          title: 'GÖREV AYARLARI',
          subtitle: 'Kategori, Rol Unvanı, Sistem Yetkileri & Birincil Görevler',
          icon: Cog,
          color: 'text-amber-400',
          badge: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
        };
    }
  };

  const meta = getToolMeta();
  const Icon = meta.icon;

  return (
    <div
      className={`border-t border-zinc-800/80 bg-zinc-950/95 backdrop-blur-md transition-all duration-300 flex flex-col z-10 ${
        isExpanded ? 'h-64 sm:h-72' : 'h-11'
      }`}
    >
      {/* Panel Header & Collapsing Toggle Bar */}
      <div className="h-11 px-4 border-b border-zinc-800/60 flex items-center justify-between select-none bg-zinc-900/40">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Icon className={`w-4 h-4 ${meta.color}`} />
            <span className="text-xs font-mono font-bold text-zinc-100">{meta.title}</span>
          </div>

          <span className="hidden sm:inline text-zinc-600 font-mono text-xs">|</span>

          <span className="hidden sm:inline text-[11px] font-mono text-zinc-400">{meta.subtitle}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono text-zinc-300 transition-colors"
          >
            <span>{isExpanded ? 'Paneli Küçült' : 'Paneli Aç'}</span>
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Dynamic Content depending on Active Tool */}
      {isExpanded && (
        <div className="flex-1 overflow-hidden bg-zinc-950/80">
          {activeTool === 'physical' && (
            <PhysicalControls
              physical={character.physical}
              onChangePhysical={onChangePhysical}
              currentExpression={currentExpression}
              onChangeExpression={onChangeExpression}
              hairStyle={hairStyle}
              onChangeHairStyle={onChangeHairStyle}
              outfitStyle={outfitStyle}
              onChangeOutfitStyle={onChangeOutfitStyle}
            />
          )}

          {activeTool === 'brain' && (
            <BrainControls
              brain={character.brain || {}}
              onChangeBrain={onChangeBrain}
            />
          )}

          {activeTool === 'mission' && (
            <MissionControls
              mission={character.mission || {}}
              onChangeMission={onChangeMission}
            />
          )}
        </div>
      )}
    </div>
  );
};

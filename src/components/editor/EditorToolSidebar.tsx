import React from 'react';
import { User, Brain, Cog, Layers, Shield, Sparkles } from 'lucide-react';

export type ActiveToolLayer = 'physical' | 'brain' | 'mission';

interface EditorToolSidebarProps {
  activeTool: ActiveToolLayer;
  onSelectTool: (tool: ActiveToolLayer) => void;
}

export const EditorToolSidebar: React.FC<EditorToolSidebarProps> = ({
  activeTool,
  onSelectTool,
}) => {
  const tools = [
    {
      id: 'physical' as ActiveToolLayer,
      name: 'FİZİK',
      icon: User,
      emoji: '👤',
      color: 'text-cyan-400',
      activeBg: 'bg-cyan-500/10 border-cyan-500/50 text-cyan-300',
      description: 'Görünüş, Şasi, Yüz, Kıyafet & İfadeler',
      shortcut: '1',
    },
    {
      id: 'brain' as ActiveToolLayer,
      name: 'BEYİN',
      icon: Brain,
      emoji: '🧠',
      color: 'text-violet-400',
      activeBg: 'bg-violet-500/10 border-violet-500/50 text-violet-300',
      description: 'Kişilik, Davranış, Değerler & Hafıza',
      shortcut: '2',
    },
    {
      id: 'mission' as ActiveToolLayer,
      name: 'GÖREV',
      icon: Cog,
      emoji: '⚙️',
      color: 'text-amber-400',
      activeBg: 'bg-amber-500/10 border-amber-500/50 text-amber-300',
      description: 'Kategori, Rol, Yetkiler & Sınırlar',
      shortcut: '3',
    },
  ];

  return (
    <aside className="w-16 lg:w-20 bg-zinc-950 border-r border-zinc-800/80 flex flex-col items-center py-4 select-none z-10">
      {/* Tool Header / Layer Icon */}
      <div className="mb-4 text-center">
        <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mx-auto">
          <Layers className="w-4 h-4 text-zinc-400" />
        </div>
        <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest mt-1 block">
          KATMAN
        </span>
      </div>

      {/* Vertical Tool Buttons */}
      <div className="flex-1 flex flex-col gap-3 w-full px-2">
        {tools.map((tool) => {
          const isActive = activeTool === tool.id;
          const Icon = tool.icon;

          return (
            <button
              key={tool.id}
              onClick={() => onSelectTool(tool.id)}
              title={`${tool.name} Katmanı (${tool.shortcut})\n${tool.description}`}
              className={`group relative w-full aspect-square rounded-xl flex flex-col items-center justify-center p-1.5 transition-all duration-200 border ${
                isActive
                  ? `${tool.activeBg} shadow-lg shadow-black/40 ring-1 ring-white/10 scale-105`
                  : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 hover:border-zinc-700'
              }`}
            >
              {/* Active Pip Indicator */}
              {isActive && (
                <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-cyan-400 rounded-r-full shadow-[0_0_8px_#22d3ee]" />
              )}

              <span className="text-lg leading-none mb-1 group-hover:scale-110 transition-transform">
                {tool.emoji}
              </span>

              <span className="text-[10px] font-mono font-bold tracking-wider">
                {tool.name}
              </span>

              {/* Tooltip Shortcut */}
              <span className="absolute bottom-1 right-1 text-[8px] font-mono text-zinc-400 opacity-60">
                {tool.shortcut}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bottom Status / Coordinate indicator */}
      <div className="mt-auto text-center px-1">
        <span className="text-[9px] font-mono text-zinc-400 block uppercase">MOD</span>
        <span className="text-[10px] font-mono text-zinc-400 font-semibold">EDT</span>
      </div>
    </aside>
  );
};

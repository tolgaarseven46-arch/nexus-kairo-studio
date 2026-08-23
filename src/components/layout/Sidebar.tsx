import React, { useState } from 'react';
import {
  Plus,
  Edit3,
  ChevronDown,
  ChevronRight,
  FolderKanban,
  FlaskConical,
  Settings,
  PanelLeftClose,
  PanelLeft,
  X,
  Radio,
  Layers,
  Sparkles,
} from 'lucide-react';
import { NavigationSection, Character } from '../../types';

interface SidebarProps {
  activeSection: NavigationSection;
  onSelectSection: (section: NavigationSection) => void;
  charactersCount: number;
  characters?: Character[];
  activeCharacterId?: string;
  onSelectCharacter?: (id: string) => void;
  onTriggerCreateNew?: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  isCollapsedDesktop?: boolean;
  onToggleCollapseDesktop?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  charactersCount,
  characters = [],
  activeCharacterId,
  onSelectCharacter,
  onTriggerCreateNew,
  isOpenMobile,
  onCloseMobile,
  isCollapsedDesktop = false,
  onToggleCollapseDesktop,
}) => {
  const [isDroitCreateOpen, setIsDroitCreateOpen] = useState(true);
  const [isDroitDropdownOpen, setIsDroitDropdownOpen] = useState(false);

  const handleNavClick = (section: NavigationSection) => {
    onSelectSection(section);
    onCloseMobile();
  };

  const handleNewCreateClick = () => {
    if (onTriggerCreateNew) {
      onTriggerCreateNew();
    }
    onSelectSection('create-droit');
    onCloseMobile();
  };

  const handleEditExistingClick = (charId?: string) => {
    if (charId && onSelectCharacter) {
      onSelectCharacter(charId);
    }
    onSelectSection('create-droit');
    onCloseMobile();
  };

  const isCreateDroitActive =
    activeSection === 'create-droit' || activeSection === 'studio' || activeSection === 'dashboard';

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-xs z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 bg-zinc-950 border-r border-zinc-800 flex flex-col transition-all duration-300 ease-in-out select-none ${
          isOpenMobile ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsedDesktop ? 'lg:w-16' : 'lg:w-64'}`}
      >
        {/* Brand Header */}
        <div className="h-14 border-b border-zinc-800/80 px-4 flex items-center justify-between bg-zinc-950">
          {!isCollapsedDesktop ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-500/20">
                <span className="font-mono font-bold text-sm tracking-tighter">NX</span>
              </div>
              <div>
                <span className="font-mono font-bold tracking-widest text-sm text-zinc-100 block leading-tight">
                  NEXUS
                </span>
                <span className="text-[9px] text-zinc-400 font-mono tracking-wide block">
                  DROIT STUDIO
                </span>
              </div>
            </div>
          ) : (
            <div className="mx-auto">
              <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
                <span className="font-mono font-bold text-sm">NX</span>
              </div>
            </div>
          )}

          {/* Collapse/Expand Toggle Button (Desktop) */}
          {onToggleCollapseDesktop && (
            <button
              onClick={onToggleCollapseDesktop}
              className="hidden lg:flex p-1.5 text-zinc-400 hover:text-zinc-200 rounded-md hover:bg-zinc-900 transition-colors"
              title={isCollapsedDesktop ? 'Kenar Çubuğunu Genişlet' : 'Kenar Çubuğunu Daralt'}
            >
              {isCollapsedDesktop ? (
                <PanelLeft className="w-4 h-4 text-cyan-400" />
              ) : (
                <PanelLeftClose className="w-4 h-4 text-zinc-400" />
              )}
            </button>
          )}

          {/* Close button (Mobile) */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-zinc-400 hover:text-zinc-200 rounded-md hover:bg-zinc-900"
            aria-label="Menüyü Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-2.5 py-4 space-y-2">
          {!isCollapsedDesktop && (
            <div className="px-2 text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
              ÇALIŞMA ALANI
            </div>
          )}

          {/* 1. 🧬 DROİT OLUŞTUR */}
          <div className="space-y-1">
            <div
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                isCreateDroitActive
                  ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900/80 border border-transparent'
              }`}
              onClick={() => {
                handleNavClick('create-droit');
                setIsDroitCreateOpen(true);
              }}
              title="Droit Oluştur"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-sm">🧬</span>
                {!isCollapsedDesktop && (
                  <span className="font-semibold tracking-wide">DROİT OLUŞTUR</span>
                )}
              </div>

              {!isCollapsedDesktop && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDroitCreateOpen(!isDroitCreateOpen);
                  }}
                  className="p-1 text-zinc-400 hover:text-zinc-200 rounded"
                >
                  {isDroitCreateOpen ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>

            {/* Sub-items: Yeni Oluştur & Var Olanı Düzenle */}
            {!isCollapsedDesktop && isDroitCreateOpen && (
              <div className="pl-5 pr-1 py-1 space-y-1 border-l border-zinc-800 ml-3.5">
                {/* 1.a. ➕ Yeni Oluştur */}
                <button
                  onClick={handleNewCreateClick}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] font-mono text-zinc-400 hover:text-cyan-300 hover:bg-zinc-900/90 transition-colors group"
                >
                  <Plus className="w-3 h-3 text-cyan-400 group-hover:scale-110 transition-transform" />
                  <span>Yeni Oluştur</span>
                </button>

                {/* 1.b. ✏️ Var Olanı Düzenle */}
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      handleNavClick('create-droit');
                      setIsDroitDropdownOpen(!isDroitDropdownOpen);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-[11px] font-mono text-zinc-400 hover:text-cyan-300 hover:bg-zinc-900/90 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <Edit3 className="w-3 h-3 text-violet-400 group-hover:scale-110 transition-transform" />
                      <span>Var Olanı Düzenle</span>
                    </div>
                    <ChevronDown
                      className={`w-3 h-3 text-zinc-500 transition-transform ${
                        isDroitDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Existing Droits Sub-list */}
                  {isDroitDropdownOpen && characters.length > 0 && (
                    <div className="pl-3 pr-1 py-1 space-y-0.5 border-l border-zinc-800/80 ml-2 max-h-36 overflow-y-auto">
                      {characters.map((c) => {
                        const isCurrent = c.id === activeCharacterId;
                        return (
                          <button
                            key={c.id}
                            onClick={() => handleEditExistingClick(c.id)}
                            className={`w-full text-left px-2 py-1 rounded text-[10px] font-mono truncate transition-colors ${
                              isCurrent
                                ? 'bg-cyan-500/20 text-cyan-200 font-bold'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                            }`}
                          >
                            ● {c.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="h-px bg-zinc-800/60 my-2" />

          {/* 2. 🗂️ Droitler (Visual / Direct List) */}
          <button
            onClick={() => handleNavClick('droits')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono font-medium transition-colors ${
              activeSection === 'droits' || activeSection === 'characters'
                ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 border border-transparent'
            }`}
            title="Droitler Kataloğu"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-sm">🗂️</span>
              {!isCollapsedDesktop && <span>Droitler</span>}
            </div>

            {!isCollapsedDesktop && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 font-mono">
                {charactersCount}
              </span>
            )}
          </button>

          {/* 3. 🧪 Test Laboratuvarı */}
          <button
            onClick={() => handleNavClick('test-lab')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono font-medium transition-colors ${
              activeSection === 'test-lab'
                ? 'bg-violet-500/10 text-violet-300 border border-violet-500/30'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 border border-transparent'
            }`}
            title="Test Laboratuvarı"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-sm">🧪</span>
              {!isCollapsedDesktop && <span>Test Laboratuvarı</span>}
            </div>
          </button>

          {/* 4. ⚙️ Ayarlar */}
          <button
            onClick={() => handleNavClick('settings')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono font-medium transition-colors ${
              activeSection === 'settings'
                ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 border border-transparent'
            }`}
            title="Ayarlar"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-sm">⚙️</span>
              {!isCollapsedDesktop && <span>Ayarlar</span>}
            </div>
          </button>
        </div>

        {/* Footer / System Status */}
        <div className="p-3 border-t border-zinc-800/80 bg-zinc-950">
          {!isCollapsedDesktop ? (
            <div className="flex items-center justify-between px-2 py-1.5 bg-zinc-900/80 rounded-lg border border-zinc-800 text-[10px] font-mono text-zinc-400">
              <span className="text-emerald-400 font-bold">● ONLINE</span>
              <span>v1.0 STUDIO</span>
            </div>
          ) : (
            <div className="flex justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" title="Online" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

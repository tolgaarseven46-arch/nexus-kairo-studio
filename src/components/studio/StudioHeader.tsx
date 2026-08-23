import React, { useState } from 'react';
import {
  Sparkles,
  Play,
  Save,
  Check,
  Plus,
  ChevronDown,
  Layers,
  Shield,
  Eye,
  Trash2,
  Users,
  Radio,
  BookOpen,
} from 'lucide-react';
import { Character, CharacterStatus, Race } from '../../types';
import { Button } from '../common/Button';

interface StudioHeaderProps {
  characters: Character[];
  activeCharacter: Character;
  races: Race[];
  isSaving: boolean;
  saveSuccess: boolean;
  onSelectCharacter: (id: string) => void;
  onOpenCreateNew: () => void;
  onOpenTestLab: () => void;
  onSave: () => void;
  onDeleteCurrent: () => void;
  onChangeName: (name: string) => void;
  onChangeStatus: (status: CharacterStatus) => void;
  onChangeRoleTitle: (roleTitle: string) => void;
  onOpenCatalog: () => void;
}

export const StudioHeader: React.FC<StudioHeaderProps> = ({
  characters,
  activeCharacter,
  races,
  isSaving,
  saveSuccess,
  onSelectCharacter,
  onOpenCreateNew,
  onOpenTestLab,
  onSave,
  onDeleteCurrent,
  onChangeName,
  onChangeStatus,
  onChangeRoleTitle,
  onOpenCatalog,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);

  const currentExp =
    activeCharacter.expressions?.find((e) => e.id === activeCharacter.currentExpression) ||
    activeCharacter.expressions?.[0] || {
      emoji: '🙂',
      label: 'Normal',
    };

  const statusConfig: Record<CharacterStatus, { label: string; dotClass: string; bgClass: string }> = {
    Active: {
      label: 'Aktif',
      dotClass: 'bg-emerald-400',
      bgClass: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80',
    },
    Draft: {
      label: 'Taslak',
      dotClass: 'bg-amber-400',
      bgClass: 'bg-amber-950/60 text-amber-300 border-amber-800/80',
    },
    Standby: {
      label: 'Beklemede',
      dotClass: 'bg-cyan-400',
      bgClass: 'bg-cyan-950/60 text-cyan-300 border-cyan-800/80',
    },
    Archived: {
      label: 'Arşivlendi',
      dotClass: 'bg-zinc-500',
      bgClass: 'bg-zinc-900 text-zinc-400 border-zinc-700',
    },
  };

  const currentStatusObj = statusConfig[activeCharacter.status] || statusConfig.Draft;

  return (
    <header className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/90 shadow-xl px-4 sm:px-6 py-3.5">
      <div className="max-w-[1700px] mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Left: Droit Quick Switcher & Active Droit Summary */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          
          {/* Active Droit Avatar Pod */}
          <div className="relative group">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-cyan-500/50 flex items-center justify-center text-2xl shadow-lg shadow-cyan-500/10">
              <span className="filter drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">
                {currentExp.emoji}
              </span>
            </div>
            <span
              className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-zinc-950 ${currentStatusObj.dotClass}`}
            />
          </div>

          {/* Droit Name & Dropdown Switcher */}
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              {/* Editable Name */}
              <input
                type="text"
                value={activeCharacter.name}
                onChange={(e) => onChangeName(e.target.value)}
                placeholder="Droit Adı"
                className="text-lg sm:text-xl font-bold font-mono text-zinc-100 bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-cyan-400 focus:outline-none transition-colors max-w-[180px] sm:max-w-[240px] tracking-tight"
              />

              {/* Switcher Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="p-1 text-zinc-400 hover:text-cyan-300 hover:bg-zinc-900 rounded-md transition-colors flex items-center cursor-pointer"
                  title="Droit Değiştir"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>

                {isDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsDropdownOpen(false)}
                    />
                    <div className="absolute left-0 mt-2 w-64 rounded-xl bg-zinc-950 border border-zinc-800 shadow-2xl z-50 p-2 space-y-1 font-mono text-xs animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-2.5 py-1.5 text-[10px] text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                        <span>DROIT LİSTESİ ({characters.length})</span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsDropdownOpen(false);
                            onOpenCatalog();
                          }}
                          className="text-cyan-400 hover:underline cursor-pointer"
                        >
                          Tümü
                        </button>
                      </div>

                      <div className="max-h-56 overflow-y-auto space-y-0.5">
                        {characters.map((c) => {
                          const isCur = c.id === activeCharacter.id;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                onSelectCharacter(c.id);
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                                isCur
                                  ? 'bg-cyan-950 text-cyan-200 border border-cyan-500/40'
                                  : 'text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className="text-base">
                                  {c.expressions?.find((e) => e.id === c.currentExpression)?.emoji ||
                                    c.expressions?.[0]?.emoji ||
                                    '🤖'}
                                </span>
                                <span className="truncate font-bold">{c.name}</span>
                              </div>
                              <span className="text-[10px] text-zinc-500 flex-shrink-0">
                                {c.role?.title || c.roleTitle || 'Droit'}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="pt-1.5 border-t border-zinc-800">
                        <button
                          type="button"
                          onClick={() => {
                            setIsDropdownOpen(false);
                            onOpenCreateNew();
                          }}
                          className="w-full py-1.5 px-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-cyan-400 font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Yeni Droit Yarat</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Sub-Badges: Irk, Kategori, Rol */}
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
              <span className="px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800/90">
                Irk: <strong className="text-cyan-400">{activeCharacter.physical?.raceName || activeCharacter.raceName || 'Sentetik'}</strong>
              </span>
              <span className="px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800/90">
                Kategori: <strong className="text-indigo-300">{activeCharacter.category?.name || activeCharacter.category || 'Yönetim'}</strong>
              </span>
              <span className="px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800/90">
                Rol: <strong className="text-emerald-300">{activeCharacter.role?.title || activeCharacter.roleTitle || 'Sunucu Yöneticisi'}</strong>
              </span>
            </div>
          </div>

          {/* Status Picker Pill (e.g. ● Taslak) */}
          <div className="ml-0 sm:ml-2">
            <select
              value={activeCharacter.status}
              onChange={(e) => onChangeStatus(e.target.value as CharacterStatus)}
              className={`px-3 py-1 rounded-full text-xs font-mono font-bold border transition-colors cursor-pointer focus:outline-none ${currentStatusObj.bgClass}`}
            >
              <option value="Draft" className="bg-zinc-950 text-zinc-200">● Taslak</option>
              <option value="Active" className="bg-zinc-950 text-zinc-200">● Aktif</option>
              <option value="Standby" className="bg-zinc-950 text-zinc-200">● Beklemede</option>
              <option value="Archived" className="bg-zinc-950 text-zinc-200">● Arşivlendi</option>
            </select>
          </div>
        </div>

        {/* Right: Fast Actions ("Yeni Droit", "Droit Kataloğu", "Test Et", "Kaydet") */}
        <div className="flex items-center gap-2.5 self-end lg:self-center">
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenCreateNew}
            leftIcon={<Plus className="w-4 h-4 text-cyan-400" />}
            className="hidden sm:inline-flex"
          >
            Yeni Droit
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenCatalog}
            leftIcon={<Users className="w-4 h-4 text-zinc-400" />}
            className="hidden md:inline-flex"
          >
            Katalog ({characters.length})
          </Button>

          {/* Prominent "Test Et" Button */}
          <button
            type="button"
            onClick={onOpenTestLab}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 via-cyan-500 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-zinc-950 font-mono text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all cursor-pointer transform hover:-translate-y-0.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>TEST ET</span>
          </button>

          {/* Prominent "Kaydet" Button */}
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className={`px-4 py-2 rounded-xl font-mono text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              saveSuccess
                ? 'bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/25'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 hover:border-zinc-600'
            }`}
          >
            {isSaving ? (
              <>
                <span className="w-3 h-3 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                <span>Kaydediliyor...</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Kaydedildi!</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Kaydet</span>
              </>
            )}
          </button>

        </div>

      </div>
    </header>
  );
};

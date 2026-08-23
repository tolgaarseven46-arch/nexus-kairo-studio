import React, { useState } from 'react';
import {
  X,
  Plus,
  Search,
  Trash2,
  Copy,
  Users,
  Shield,
  Layers,
  Sparkles,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { Character, CharacterStatus, Race } from '../../types';
import { Button } from '../common/Button';

interface DroitCatalogModalProps {
  isOpen: boolean;
  characters: Character[];
  activeCharacterId: string;
  races: Race[];
  onClose: () => void;
  onSelectCharacter: (id: string) => void;
  onCreateNew: () => void;
  onDeleteCharacter: (id: string) => void;
  onCloneCharacter: (character: Character) => void;
}

export const DroitCatalogModal: React.FC<DroitCatalogModalProps> = ({
  isOpen,
  characters,
  activeCharacterId,
  races,
  onClose,
  onSelectCharacter,
  onCreateNew,
  onDeleteCharacter,
  onCloneCharacter,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  if (!isOpen) return null;

  const filteredCharacters = characters.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.role?.title || c.roleTitle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.category?.name || c.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.physical?.raceName || c.raceName || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-mono font-bold text-zinc-100">DROIT KATALOĞU</h2>
              <p className="text-xs font-mono text-zinc-400">
                Kayıtlı Varlıklar & Karakter Tasarımları ({characters.length})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onCreateNew();
                onClose();
              }}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Yeni Droit Yarat
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 bg-zinc-950 border-b border-zinc-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 font-mono text-xs">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="İsim, rol, kategori veya ırka göre ara..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-zinc-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="ALL">Tüm Durumlar</option>
              <option value="Active">Aktif</option>
              <option value="Draft">Taslak</option>
              <option value="Standby">Beklemede</option>
              <option value="Archived">Arşivlendi</option>
            </select>
          </div>
        </div>

        {/* Droit Cards Grid */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto min-h-0">
          {filteredCharacters.length === 0 ? (
            <div className="py-16 text-center text-zinc-500 font-mono space-y-3">
              <Users className="w-10 h-10 mx-auto text-zinc-600" />
              <p>Aramanızla eşleşen Droit bulunamadı.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCharacters.map((c) => {
                const isActive = c.id === activeCharacterId;
                const currentExp =
                  c.expressions?.find((e) => e.id === c.currentExpression) ||
                  c.expressions?.[0] || { emoji: '🤖', label: 'Normal' };

                return (
                  <div
                    key={c.id}
                    className={`group relative p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                      isActive
                        ? 'bg-cyan-950/30 border-cyan-500/70 shadow-lg shadow-cyan-500/10'
                        : 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform shadow-inner">
                            {currentExp.emoji}
                          </div>
                          <div>
                            <h3 className="font-mono font-bold text-sm text-zinc-100 flex items-center gap-1.5">
                              <span>{c.name}</span>
                              {isActive && (
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500 text-zinc-950 font-bold">
                                  AÇIK
                                </span>
                              )}
                            </h3>
                            <p className="text-xs font-mono text-cyan-400">
                              {c.role?.title || c.roleTitle || 'Yönetici Droit'}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold ${
                            c.status === 'Active'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : c.status === 'Draft'
                              ? 'bg-amber-950 text-amber-300 border-amber-800'
                              : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                          }`}
                        >
                          {c.status}
                        </span>
                      </div>

                      {/* Specs pills */}
                      <div className="mt-3.5 pt-3 border-t border-zinc-800/80 flex flex-wrap gap-1.5 text-[10px] font-mono">
                        <span className="px-2 py-0.5 rounded bg-zinc-950 text-zinc-400 border border-zinc-800">
                          {c.physical?.raceName || c.raceName || 'Sentetik'}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-zinc-950 text-zinc-400 border border-zinc-800">
                          {c.category?.name || c.category || 'Yönetim'}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-zinc-950 text-zinc-400 border border-zinc-800">
                          {c.physical?.bodyType || 'İnsansı'}
                        </span>
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onCloneCharacter(c)}
                          className="p-1.5 text-zinc-400 hover:text-cyan-300 hover:bg-zinc-800 rounded transition-colors"
                          title="Klonla / Kopyala"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        {characters.length > 1 && (
                          <button
                            type="button"
                            onClick={() => onDeleteCharacter(c.id)}
                            className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded transition-colors"
                            title="Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onSelectCharacter(c.id);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-cyan-500 hover:text-zinc-950 text-xs font-mono font-bold text-zinc-200 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <span>Stüdyoda Aç</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

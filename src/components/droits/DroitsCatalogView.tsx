import React, { useState } from 'react';
import { Character, CharacterStatus, Race } from '../../types';
import { CharacterLiveAvatar } from '../characters/CharacterLiveAvatar';
import {
  Search,
  Filter,
  Plus,
  Edit3,
  FlaskConical,
  Copy,
  Trash2,
  Cpu,
  Layers,
  Shield,
  Brain,
  Sparkles,
  CheckCircle2,
  Clock,
  Archive,
  AlertCircle,
  Eye,
} from 'lucide-react';

interface DroitsCatalogViewProps {
  characters: Character[];
  races: Race[];
  activeCharacterId?: string;
  onSelectToEdit: (characterId: string) => void;
  onOpenTestLab: (characterId: string) => void;
  onCreateNew: () => void;
  onCloneCharacter: (character: Character) => Promise<void>;
  onDeleteCharacter: (characterId: string) => void;
}

export const DroitsCatalogView: React.FC<DroitsCatalogViewProps> = ({
  characters,
  races,
  activeCharacterId,
  onSelectToEdit,
  onOpenTestLab,
  onCreateNew,
  onCloneCharacter,
  onDeleteCharacter,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Extract all distinct categories
  const allCategories = Array.from(
    new Set(
      characters
        .map((c) => (typeof c.category === 'string' ? c.category : c.category?.name))
        .filter(Boolean) as string[]
    )
  );

  const filteredCharacters = characters.filter((char) => {
    const matchesSearch =
      char.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (char.role?.title || char.roleTitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (char.physical?.raceName || char.raceName || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || char.status === statusFilter;

    const charCatName = typeof char.category === 'string' ? char.category : char.category?.name;
    const matchesCategory = categoryFilter === 'all' || charCatName === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusBadge = (status: CharacterStatus) => {
    switch (status) {
      case 'Active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Aktif
          </span>
        );
      case 'Draft':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Clock className="w-2.5 h-2.5" />
            Taslak
          </span>
        );
      case 'Standby':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            Beklemede
          </span>
        );
      case 'Archived':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-500/10 text-zinc-400 border border-zinc-500/30">
            <Archive className="w-2.5 h-2.5" />
            Arşiv
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1700px] mx-auto space-y-6">
      
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5 backdrop-blur-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-zinc-100 font-mono tracking-wide">
                🗂️ Droit Kataloğu & Varlık Dizini
              </h1>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-cyan-400 border border-zinc-700">
                {characters.length} Varlık Kayıtlı
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              3 katmanlı (Fizik, Beyin, Görev) tüm sentetik zeka varlıklarının merkezi arşivi.
            </p>
          </div>
        </div>

        <button
          onClick={onCreateNew}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-500 text-zinc-950 text-xs font-mono font-bold hover:bg-cyan-400 transition-colors shadow-lg shadow-cyan-500/20 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Droit Yarat</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Droit adı, rol unvanı veya ırk ara..."
            className="w-full pl-9 pr-3 py-2 bg-zinc-900/90 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 placeholder-zinc-500 focus:outline-hidden focus:border-cyan-500"
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-900/90 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 focus:outline-hidden focus:border-cyan-500"
          >
            <option value="all">Tüm Durumlar (Hepsi)</option>
            <option value="Active">● Aktif</option>
            <option value="Draft">● Taslak</option>
            <option value="Standby">● Beklemede</option>
            <option value="Archived">● Arşivlendi</option>
          </select>
        </div>

        {/* Category filter */}
        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-900/90 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 focus:outline-hidden focus:border-cyan-500"
          >
            <option value="all">Tüm Kategoriler</option>
            {allCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid of Droits */}
      {filteredCharacters.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900/40 border border-zinc-800/80 rounded-xl space-y-3">
          <AlertCircle className="w-8 h-8 text-zinc-600 mx-auto" />
          <p className="text-sm font-mono text-zinc-400">Arama kriterine uygun Droit bulunamadı.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
              setCategoryFilter('all');
            }}
            className="text-xs font-mono text-cyan-400 hover:underline"
          >
            Filtreleri Temizle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5">
          {filteredCharacters.map((char) => {
            const isCurrentActive = char.id === activeCharacterId;
            const categoryName = typeof char.category === 'string' ? char.category : char.category?.name || 'Genel';
            const enabledPermsCount = (char.permissions || char.abilityPermissions || []).filter((p) => p.enabled).length;
            const tasksCount = (char.tasks || []).length;
            const restrictionsCount = (char.restrictions || []).length;

            return (
              <div
                key={char.id}
                className={`group relative flex flex-col justify-between bg-zinc-900/70 border rounded-xl p-4 transition-all duration-200 hover:border-cyan-500/50 hover:bg-zinc-900/90 ${
                  isCurrentActive
                    ? 'border-cyan-500/60 ring-1 ring-cyan-500/30 bg-zinc-900/95'
                    : 'border-zinc-800/80'
                }`}
              >
                <div>
                  {/* Top Bar: Status & Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(char.status)}
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-300 border border-zinc-700/60">
                        {categoryName}
                      </span>
                    </div>

                    <div className="text-[10px] font-mono text-zinc-400">
                      Irk: <span className="text-zinc-200">{char.physical?.raceName || char.raceName || 'Sentetik'}</span>
                    </div>
                  </div>

                  {/* Character Info Card */}
                  <div className="flex items-start gap-3.5 mb-4">
                    <div className="shrink-0 p-1 rounded-lg bg-zinc-950 border border-zinc-800">
                      <CharacterLiveAvatar
                        avatarSeed={char.physical?.avatarSeed || char.avatarSeed || '0x00'}
                        currentExpression={char.currentExpression || 'normal'}
                        size="md"
                        primaryColor={char.physical?.primaryColor}
                        secondaryColor={char.physical?.secondaryColor}
                        accentColor={char.physical?.accentColor}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold font-mono text-zinc-100 truncate group-hover:text-cyan-300 transition-colors">
                        {char.name}
                      </h3>
                      <p className="text-xs font-mono text-cyan-400 truncate">
                        {char.role?.title || char.roleTitle || 'Droit Operatörü'}
                      </p>
                      <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1 font-mono">
                        {char.role?.description || char.shortDescription || 'Tanımlı görev açıklaması bulunmuyor.'}
                      </p>
                    </div>
                  </div>

                  {/* 3-Layer Metrics Preview */}
                  <div className="grid grid-cols-3 gap-2 py-2.5 px-3 bg-zinc-950/60 border border-zinc-800/60 rounded-lg mb-4 text-[10px] font-mono">
                    <div className="space-y-0.5">
                      <div className="text-zinc-400 flex items-center gap-1">
                        <Layers className="w-3 h-3 text-cyan-400" />
                        <span>FİZİK</span>
                      </div>
                      <div className="text-zinc-200 font-semibold truncate">
                        {char.physical?.bodyType || 'İnsansı'}
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <div className="text-zinc-400 flex items-center gap-1">
                        <Brain className="w-3 h-3 text-violet-400" />
                        <span>BEYİN</span>
                      </div>
                      <div className="text-zinc-200 font-semibold truncate">
                        Ciddiyet %{char.personality?.seriousness ?? 80}
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <div className="text-zinc-400 flex items-center gap-1">
                        <Shield className="w-3 h-3 text-emerald-400" />
                        <span>GÖREV</span>
                      </div>
                      <div className="text-zinc-200 font-semibold truncate">
                        {enabledPermsCount} Yetki / {tasksCount} Görev
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onSelectToEdit(char.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-medium transition-colors"
                      title="Stüdyoda Düzenle"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Düzenle</span>
                    </button>

                    <button
                      onClick={() => onOpenTestLab(char.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border border-violet-500/30 text-xs font-mono font-medium transition-colors"
                      title="Test Laboratuvarında Test Et"
                    >
                      <FlaskConical className="w-3.5 h-3.5" />
                      <span>Test Et</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onCloneCharacter(char)}
                      className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                      title="Klonla"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onDeleteCharacter(char.id)}
                      className="p-1.5 rounded-md text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

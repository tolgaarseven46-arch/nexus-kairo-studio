import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  LayoutGrid,
  List,
  Edit3,
  Trash2,
  Eye,
  Filter,
  ArrowUpDown,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Character, Race, CharacterStatus } from '../../types';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { AvatarPlaceholder } from '../common/AvatarPlaceholder';
import { EmptyState } from '../common/EmptyState';

interface CharacterListViewProps {
  characters: Character[];
  races: Race[];
  onOpenCreate: () => void;
  onEdit: (character: Character) => void;
  onDelete: (character: Character) => void;
  onSelectCharacter: (characterId: string) => void;
}

export const CharacterListView: React.FC<CharacterListViewProps> = ({
  characters,
  races,
  onOpenCreate,
  onEdit,
  onDelete,
  onSelectCharacter,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRaceFilter, setSelectedRaceFilter] = useState<string>('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'All' | CharacterStatus>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'createdAt' | 'raceName' | 'status'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filtered & sorted characters
  const filteredCharacters = useMemo(() => {
    return characters
      .filter((char) => {
        const matchesSearch =
          char.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          char.shortDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
          char.raceName.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesRace =
          selectedRaceFilter === 'All' || char.raceId === selectedRaceFilter;

        const matchesStatus =
          selectedStatusFilter === 'All' || char.status === selectedStatusFilter;

        return matchesSearch && matchesRace && matchesStatus;
      })
      .sort((a, b) => {
        let comparison = 0;
        if (sortBy === 'name') {
          comparison = a.name.localeCompare(b.name);
        } else if (sortBy === 'createdAt') {
          comparison =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        } else if (sortBy === 'raceName') {
          comparison = a.raceName.localeCompare(b.raceName);
        } else if (sortBy === 'status') {
          comparison = a.status.localeCompare(b.status);
        }
        return sortOrder === 'desc' ? -comparison : comparison;
      });
  }, [characters, searchQuery, selectedRaceFilter, selectedStatusFilter, sortBy, sortOrder]);

  const toggleSort = (field: 'name' | 'createdAt' | 'raceName' | 'status') => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const statusLabels: Record<CharacterStatus, string> = {
    Active: 'Aktif',
    Standby: 'Beklemede',
    Draft: 'Taslak',
    Archived: 'Arşivlendi',
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100 font-mono flex items-center gap-2.5">
            <Users className="w-6 h-6 text-cyan-400" />
            Karakter Yönetim Rehberi
          </h1>
          <p className="text-xs text-zinc-400 mt-1 font-sans">
            Bireysel dijital varlıkları, sınıflandırmaları ve sistem durumlarını kataloglayın ve yapılandırın.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={onOpenCreate}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Karakter Oluştur
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl border border-zinc-800/90 bg-zinc-900/60 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="İsim, açıklama veya ırka göre karakter ara..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3.5 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Filter by Race dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-500 hidden sm:inline">Irk:</span>
            <select
              value={selectedRaceFilter}
              onChange={(e) => setSelectedRaceFilter(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300 rounded-lg px-2.5 py-2 focus:outline-none focus:border-cyan-500"
            >
              <option value="All">Tüm Irklar ({characters.length})</option>
              {races.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Status */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-500 hidden sm:inline">Durum:</span>
            <select
              value={selectedStatusFilter}
              onChange={(e) =>
                setSelectedStatusFilter(e.target.value as 'All' | CharacterStatus)
              }
              className="bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300 rounded-lg px-2.5 py-2 focus:outline-none focus:border-cyan-500"
            >
              <option value="All">Tüm Durumlar</option>
              <option value="Active">Aktif</option>
              <option value="Standby">Beklemede</option>
              <option value="Draft">Taslak</option>
              <option value="Archived">Arşivlendi</option>
            </select>
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-2 self-end lg:self-auto">
          <div className="flex items-center bg-zinc-950 p-1 rounded-lg border border-zinc-800">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'grid'
                  ? 'bg-zinc-800 text-cyan-400'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Izgara Görünümü"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'table'
                  ? 'bg-zinc-800 text-cyan-400'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Tablo Görünümü"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {characters.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title="HENÜZ KARAKTER OLUŞTURULMADI"
          description="Karakterler; tanımlanmış ırklara, özelliklere ve yaklaşan yapay zeka davranış modellerine sahip belirli dijital varlıkları temsil eder. Başlamak için ilk karakterinizi oluşturun."
          actionLabel="İlk Karakteri Oluştur"
          onAction={onOpenCreate}
        />
      ) : filteredCharacters.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-900/30">
          <p className="text-xs font-mono text-zinc-400">
            Arama veya filtreleme kriterlerinize uygun karakter bulunamadı.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setSelectedRaceFilter('All');
              setSelectedStatusFilter('All');
            }}
            className="mt-3 text-cyan-400"
          >
            Filtreleri Sıfırla
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCharacters.map((char) => (
            <div
              key={char.id}
              className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900/80 transition-all flex flex-col justify-between group space-y-4"
            >
              <div className="space-y-3.5">
                {/* Header with Avatar, Name, and Status */}
                <div className="flex items-start gap-3.5">
                  <AvatarPlaceholder
                    name={char.name}
                    seed={char.avatarSeed}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3
                        onClick={() => onSelectCharacter(char.id)}
                        className="text-base font-bold font-mono text-zinc-100 group-hover:text-cyan-300 transition-colors truncate cursor-pointer"
                      >
                        {char.name}
                      </h3>
                      <Badge status={char.status} size="sm" />
                    </div>

                    <div className="flex items-center gap-1 text-[11px] font-mono text-cyan-400 mt-0.5">
                      <Layers className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{char.raceName}</span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed font-sans min-h-[48px]">
                  {char.shortDescription || 'Açıklama belirtilmedi.'}
                </p>
              </div>

              {/* Card Footer */}
              <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono text-zinc-500">
                <span>
                  {new Date(char.createdAt).toLocaleDateString('tr-TR', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onSelectCharacter(char.id)}
                    className="p-1.5 text-zinc-400 hover:text-cyan-300 hover:bg-zinc-800 rounded transition-colors"
                    title="Karakter Profilini Görüntüle"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onEdit(char)}
                    className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
                    title="Karakteri Düzenle"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(char)}
                    className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors"
                    title="Karakteri Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="border border-zinc-800/90 rounded-xl overflow-hidden bg-zinc-900/40">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-zinc-950/80 border-b border-zinc-800/80 text-zinc-400 font-mono uppercase tracking-wider">
                <tr>
                  <th
                    className="p-4 cursor-pointer hover:text-zinc-200"
                    onClick={() => toggleSort('name')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Karakter</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="p-4 cursor-pointer hover:text-zinc-200"
                    onClick={() => toggleSort('raceName')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Irk</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="p-4">Açıklama</th>
                  <th
                    className="p-4 cursor-pointer hover:text-zinc-200"
                    onClick={() => toggleSort('status')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Durum</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="p-4 cursor-pointer hover:text-zinc-200"
                    onClick={() => toggleSort('createdAt')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Oluşturulma Tarihi</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="p-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {filteredCharacters.map((char) => (
                  <tr
                    key={char.id}
                    className="hover:bg-zinc-800/40 transition-colors group"
                  >
                    <td className="p-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <AvatarPlaceholder
                          name={char.name}
                          seed={char.avatarSeed}
                          size="sm"
                        />
                        <button
                          onClick={() => onSelectCharacter(char.id)}
                          className="font-mono font-bold text-zinc-100 hover:text-cyan-300 transition-colors text-left"
                        >
                          {char.name}
                        </button>
                      </div>
                    </td>
                    <td className="p-4 whitespace-nowrap font-mono text-cyan-400">
                      {char.raceName}
                    </td>
                    <td className="p-4 max-w-xs truncate text-zinc-400">
                      {char.shortDescription || (
                        <span className="text-zinc-600 italic">Açıklama yok</span>
                      )}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <Badge status={char.status} size="sm" />
                    </td>
                    <td className="p-4 whitespace-nowrap font-mono text-zinc-500">
                      {new Date(char.createdAt).toLocaleDateString('tr-TR', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onSelectCharacter(char.id)}
                          className="p-1.5 text-zinc-400 hover:text-cyan-300 hover:bg-zinc-800 rounded transition-colors"
                          title="Profili Görüntüle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEdit(char)}
                          className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
                          title="Karakteri Düzenle"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete(char)}
                          className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors"
                          title="Karakteri Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

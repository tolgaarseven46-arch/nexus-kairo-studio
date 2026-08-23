import React, { useState, useMemo } from 'react';
import {
  Layers,
  Plus,
  Search,
  LayoutGrid,
  List,
  Edit3,
  Trash2,
  Eye,
  Calendar,
  Users,
  Filter,
  ArrowUpDown,
} from 'lucide-react';
import { Race, Character, RaceStatus } from '../../types';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';

interface RaceListViewProps {
  races: Race[];
  characters: Character[];
  onOpenCreate: () => void;
  onEdit: (race: Race) => void;
  onDelete: (race: Race) => void;
  onViewDetails: (race: Race) => void;
}

export const RaceListView: React.FC<RaceListViewProps> = ({
  races,
  characters,
  onOpenCreate,
  onEdit,
  onDelete,
  onViewDetails,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | RaceStatus>('All');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [sortBy, setSortBy] = useState<'name' | 'createdAt' | 'status'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Compute character counts per race
  const raceCharacterCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    characters.forEach((char) => {
      if (char.raceId) {
        counts[char.raceId] = (counts[char.raceId] || 0) + 1;
      }
    });
    return counts;
  }, [characters]);

  // Filter & search
  const filteredRaces = useMemo(() => {
    return races
      .filter((race) => {
        const matchesSearch =
          race.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          race.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus =
          statusFilter === 'All' || race.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        let comparison = 0;
        if (sortBy === 'name') {
          comparison = a.name.localeCompare(b.name);
        } else if (sortBy === 'createdAt') {
          comparison =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        } else if (sortBy === 'status') {
          comparison = a.status.localeCompare(b.status);
        }
        return sortOrder === 'desc' ? -comparison : comparison;
      });
  }, [races, searchQuery, statusFilter, sortBy, sortOrder]);

  const toggleSort = (field: 'name' | 'createdAt' | 'status') => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const statusFilterLabels: Record<'All' | RaceStatus, string> = {
    All: 'Tümü',
    Active: 'Aktif',
    Draft: 'Taslak',
    Archived: 'Arşivlendi',
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100 font-mono flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-cyan-400" />
            Irk Yönetim Rehberi
          </h1>
          <p className="text-xs text-zinc-400 mt-1 font-sans">
            Dijital varlıklar için temel kategorileri ve fizyolojik/mekanik çerçeveleri tanımlayın.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={onOpenCreate}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Irk Oluştur
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl border border-zinc-800/90 bg-zinc-900/60 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="İsim veya açıklamaya göre ırk ara..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3.5 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Status Filter buttons */}
          <div className="hidden sm:flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
            {(['All', 'Active', 'Draft', 'Archived'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
                  statusFilter === st
                    ? 'bg-zinc-800 text-cyan-300 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {statusFilterLabels[st]}
              </button>
            ))}
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <div className="flex items-center bg-zinc-950 p-1 rounded-lg border border-zinc-800">
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
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {races.length === 0 ? (
        <EmptyState
          icon={<Layers className="w-8 h-8" />}
          title="HENÜZ IRK TANIMLANMADI"
          description="Irklar, dijital varlıklar için temel sınıflandırma sağlar. Veritabanında kayıtlı hiçbir ırk bulunmamaktadır."
          actionLabel="İlk Irkı Oluştur"
          onAction={onOpenCreate}
        />
      ) : filteredRaces.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-900/30">
          <p className="text-xs font-mono text-zinc-400">
            Arama veya filtreleme kriterlerinize uygun ırk bulunamadı.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('All');
            }}
            className="mt-3 text-cyan-400"
          >
            Filtreleri Temizle
          </Button>
        </div>
      ) : viewMode === 'table' ? (
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
                      <span>Irk İsmi</span>
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
                  <th className="p-4">Varlıklar</th>
                  <th
                    className="p-4 cursor-pointer hover:text-zinc-200"
                    onClick={() => toggleSort('createdAt')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Oluşturulma Tarihi</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="p-4 cursor-pointer hover:text-zinc-200"
                    onClick={() => toggleSort('createdAt')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Güncellenme Tarihi</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="p-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {filteredRaces.map((race) => {
                  const assignedCount = raceCharacterCounts[race.id] || 0;
                  return (
                    <tr
                      key={race.id}
                      className="hover:bg-zinc-800/40 transition-colors group"
                    >
                      <td className="p-4 font-mono font-semibold text-zinc-100 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-cyan-500/60" />
                          <button
                            onClick={() => onViewDetails(race)}
                            className="hover:text-cyan-300 transition-colors text-left font-medium"
                          >
                            {race.name}
                          </button>
                        </div>
                      </td>
                      <td className="p-4 max-w-xs truncate text-zinc-400">
                        {race.description || (
                          <span className="text-zinc-600 italic">Açıklama yok</span>
                        )}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <Badge status={race.status} size="sm" />
                      </td>
                      <td className="p-4 whitespace-nowrap font-mono text-zinc-300">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-zinc-500" />
                          {assignedCount}
                        </span>
                      </td>
                      <td className="p-4 whitespace-nowrap font-mono text-zinc-400">
                        {new Date(race.createdAt).toLocaleDateString('tr-TR', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="p-4 whitespace-nowrap font-mono text-zinc-400">
                        {new Date(race.updatedAt).toLocaleDateString('tr-TR', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onViewDetails(race)}
                            className="p-1.5 text-zinc-400 hover:text-cyan-300 hover:bg-zinc-800 rounded transition-colors"
                            title="Irk Detaylarını Görüntüle"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onEdit(race)}
                            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
                            title="Irkı Düzenle"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDelete(race)}
                            className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors"
                            title="Irkı Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRaces.map((race) => {
            const assignedCount = raceCharacterCounts[race.id] || 0;
            return (
              <div
                key={race.id}
                className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900/80 transition-all flex flex-col justify-between group space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-bold font-mono text-zinc-100 group-hover:text-cyan-300 transition-colors">
                      {race.name}
                    </h3>
                    <Badge status={race.status} size="sm" />
                  </div>

                  <p className="text-xs text-zinc-400 mt-2 line-clamp-3 leading-relaxed">
                    {race.description || 'Açıklama belirtilmedi.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{assignedCount} Varlık</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onViewDetails(race)}
                      className="p-1.5 text-zinc-400 hover:text-cyan-300 hover:bg-zinc-800 rounded transition-colors"
                      title="Detayları Görüntüle"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEdit(race)}
                      className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
                      title="Irkı Düzenle"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(race)}
                      className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors"
                      title="Irkı Sil"
                    >
                      <Trash2 className="w-4 h-4" />
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

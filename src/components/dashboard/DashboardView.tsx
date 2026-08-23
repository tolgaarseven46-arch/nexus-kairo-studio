import React from 'react';
import {
  Layers,
  Users,
  Activity,
  Plus,
  ArrowRight,
  Shield,
  Clock,
  Sparkles,
  Server,
} from 'lucide-react';
import { Race, Character, NavigationSection } from '../../types';
import { StatCard } from '../common/StatCard';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { AvatarPlaceholder } from '../common/AvatarPlaceholder';
import { EmptyState } from '../common/EmptyState';

interface DashboardViewProps {
  races: Race[];
  characters: Character[];
  onNavigate: (section: NavigationSection) => void;
  onOpenCreateRace: () => void;
  onOpenCreateCharacter: () => void;
  onSelectCharacter: (characterId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  races,
  characters,
  onNavigate,
  onOpenCreateRace,
  onOpenCreateCharacter,
  onSelectCharacter,
}) => {
  const totalRaces = races.length;
  const totalCharacters = characters.length;
  const activeCharacters = characters.filter((c) => c.status === 'Active').length;

  const recentCharacters = [...characters]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const isEmpty = totalRaces === 0 && totalCharacters === 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner / System Status */}
      <div className="relative overflow-hidden rounded-xl border border-zinc-800/90 bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-cyan-500/5 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/30 text-cyan-300">
                KONTROL MERKEZİ
              </span>
              <span className="text-xs font-mono text-zinc-400">
                // SİSTEM HAZIR
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100 font-mono">
              NEXUS KOMUTA MERKEZİ
            </h1>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl font-sans">
              Dijital varlıkları tasarlamak, kategorize etmek ve yönetmek için merkezi platform.
              Temel ırkları tanımlayın ve karakter özelliklerini yapılandırın.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="md"
              onClick={onOpenCreateRace}
              leftIcon={<Layers className="w-4 h-4" />}
            >
              Irk Oluştur
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={onOpenCreateCharacter}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Karakter Oluştur
            </Button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <StatCard
          title="Toplam Irk"
          value={totalRaces}
          subtitle={
            totalRaces > 0
              ? `${races.filter((r) => r.status === 'Active').length} Aktif ırk tanımlı`
              : 'Henüz ırk tanımlanmadı'
          }
          icon={<Layers className="w-5 h-5" />}
          variant="cyan"
          onClick={() => onNavigate('races')}
        />

        <StatCard
          title="Toplam Karakter"
          value={totalCharacters}
          subtitle={
            totalCharacters > 0
              ? `${activeCharacters} karakter Aktif durumda`
              : 'Henüz karakter oluşturulmadı'
          }
          icon={<Users className="w-5 h-5" />}
          variant="indigo"
          onClick={() => onNavigate('characters')}
        />

        <StatCard
          title="Aktif Karakterler"
          value={activeCharacters}
          subtitle="Çalışır durumdaki dijital varlıklar"
          icon={<Activity className="w-5 h-5" />}
          variant="emerald"
        />
      </div>

      {/* Empty State Banner if no data */}
      {isEmpty ? (
        <EmptyState
          icon={<Server className="w-8 h-8" />}
          title="VERİTABANI BAŞLATILDI // HENÜZ VERİ BULUNMUYOR"
          description="NEXUS kontrol merkeziniz hazır. İlk ırk yapınızı tanımlayarak başlayabilir, ardından bu ırklara atanacak dijital varlıkları oluşturabilirsiniz."
          actionLabel="İlk Irkı Oluştur"
          onAction={onOpenCreateRace}
          secondaryActionLabel="İlk Karakteri Oluştur"
          onSecondaryAction={onOpenCreateCharacter}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recently Created Characters Panel (2 Columns) */}
          <div className="lg:col-span-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-zinc-100 font-mono flex items-center gap-2">
                  <span className="w-1.5 h-3.5 bg-cyan-500 rounded-xs" />
                  Son Oluşturulan Karakterler
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Veritabanına en son eklenen dijital varlıklar
                </p>
              </div>

              {characters.length > 0 && (
                <button
                  onClick={() => onNavigate('characters')}
                  className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                >
                  Tümünü gör ({characters.length})
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {recentCharacters.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-zinc-800/80 rounded-lg">
                <p className="text-xs text-zinc-500 font-mono">
                  Henüz veri bulunmuyor.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onOpenCreateCharacter}
                  className="mt-3"
                >
                  Karakter Oluştur
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/60 border border-zinc-800/60 rounded-lg overflow-hidden bg-zinc-950/40">
                {recentCharacters.map((char) => (
                  <div
                    key={char.id}
                    onClick={() => {
                      onNavigate('characters');
                      onSelectCharacter(char.id);
                    }}
                    className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-zinc-900/70 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <AvatarPlaceholder
                        name={char.name}
                        seed={char.avatarSeed}
                        size="md"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-zinc-200 group-hover:text-cyan-300 transition-colors truncate">
                            {char.name}
                          </h4>
                          <span className="text-[11px] font-mono text-zinc-400 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 truncate">
                            {char.raceName}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 truncate mt-0.5 max-w-md">
                          {char.shortDescription || 'Açıklama belirtilmedi.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <Badge status={char.status} size="sm" />
                      <span className="text-[11px] font-mono text-zinc-400 hidden sm:inline">
                        {new Date(char.createdAt).toLocaleDateString('tr-TR', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-300 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick System Status & Overview Panel (1 Column) */}
          <div className="space-y-6">
            {/* System Status Card */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
              <h3 className="text-sm font-semibold text-zinc-200 font-mono flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                SİSTEM MİMARİSİ
              </h3>

              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between p-2.5 rounded bg-zinc-950/60 border border-zinc-800/80">
                  <span className="text-zinc-400">Veritabanı Katmanı</span>
                  <span className="text-emerald-400 font-semibold">Firestore Aktif</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded bg-zinc-950/60 border border-zinc-800/80">
                  <span className="text-zinc-400">Kontrol Modu</span>
                  <span className="text-cyan-300">Yetkili</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded bg-zinc-950/60 border border-zinc-800/80">
                  <span className="text-zinc-400">Yapay Zeka Entegrasyonu</span>
                  <span className="text-zinc-400">Aşama 2 Hazır</span>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-800/80">
                <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                  Kontrol merkezi modüler bir mimariyle çalışır. Kişilikler, hafıza matrisleri ve yetenek setleri modüler uzantılar olarak eklenebilir.
                </p>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-3">
              <h3 className="text-sm font-semibold text-zinc-200 font-mono">
                HIZLI REHBER
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onNavigate('races')}
                  className="p-3 rounded-lg bg-zinc-950/60 hover:bg-zinc-800/60 border border-zinc-800 hover:border-zinc-700 text-left transition-colors"
                >
                  <div className="text-xs font-mono font-semibold text-zinc-200">
                    Irklar ({races.length})
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">Irkları yönet</div>
                </button>

                <button
                  onClick={() => onNavigate('characters')}
                  className="p-3 rounded-lg bg-zinc-950/60 hover:bg-zinc-800/60 border border-zinc-800 hover:border-zinc-700 text-left transition-colors"
                >
                  <div className="text-xs font-mono font-semibold text-zinc-200">
                    Karakterler ({characters.length})
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">Varlıkları yönet</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { Layers, Calendar, Edit3, Trash2, Users, FileText, Info } from 'lucide-react';
import { Race, Character } from '../../types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

interface RaceDetailModalProps {
  race: Race | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (race: Race) => void;
  onDelete: (race: Race) => void;
  associatedCharacters: Character[];
  onSelectCharacter?: (characterId: string) => void;
}

export const RaceDetailModal: React.FC<RaceDetailModalProps> = ({
  race,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  associatedCharacters,
  onSelectCharacter,
}) => {
  if (!race) return null;

  const formattedCreated = new Date(race.createdAt).toLocaleString('tr-TR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const formattedUpdated = new Date(race.updatedAt).toLocaleString('tr-TR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={race.name}
      subtitle={`IRK ÖZELLİKLERİ // KİMLİK: ${race.id}`}
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              onClose();
              onDelete(race);
            }}
            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
          >
            Irkı Sil
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Kapat
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onClose();
                onEdit(race);
              }}
              leftIcon={<Edit3 className="w-3.5 h-3.5" />}
            >
              Irkı Düzenle
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6 font-sans text-sm">
        {/* Status & Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
            <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider mb-1">
              Operasyonel Durum
            </div>
            <Badge status={race.status} size="md" />
          </div>

          <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
            <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider mb-1">
              Atanan Varlıklar
            </div>
            <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-zinc-100">
              <Users className="w-4 h-4 text-cyan-400" />
              <span>{associatedCharacters.length} Karakter</span>
            </div>
          </div>
        </div>

        {/* Description Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 uppercase tracking-wider">
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span>Açıklama ve Karakteristikler</span>
          </div>
          <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800/80 text-zinc-300 leading-relaxed text-sm min-h-[90px] whitespace-pre-wrap font-sans">
            {race.description || (
              <span className="text-zinc-600 italic">Bu ırk için açıklama belirtilmedi.</span>
            )}
          </div>
        </div>

        {/* Associated Characters List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400 uppercase tracking-wider">
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>İlişkili Karakterler ({associatedCharacters.length})</span>
            </div>
          </div>

          {associatedCharacters.length === 0 ? (
            <div className="p-4 rounded-lg bg-zinc-950/40 border border-zinc-800/60 text-center text-xs text-zinc-500 font-mono">
              Bu ırka henüz hiçbir karakter atanmadı.
            </div>
          ) : (
            <div className="max-h-40 overflow-y-auto divide-y divide-zinc-800/60 border border-zinc-800/60 rounded-lg bg-zinc-950">
              {associatedCharacters.map((char) => (
                <div
                  key={char.id}
                  onClick={() => {
                    if (onSelectCharacter) {
                      onClose();
                      onSelectCharacter(char.id);
                    }
                  }}
                  className={`p-2.5 px-3 flex items-center justify-between hover:bg-zinc-900/80 transition-colors ${
                    onSelectCharacter ? 'cursor-pointer' : ''
                  }`}
                >
                  <span className="text-xs font-medium text-zinc-200 truncate">
                    {char.name}
                  </span>
                  <Badge status={char.status} size="sm" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Timestamps Metadata */}
        <div className="p-3 rounded-lg bg-zinc-950/40 border border-zinc-800/60 space-y-1.5 text-xs font-mono text-zinc-400">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-zinc-400">
              <Calendar className="w-3.5 h-3.5" />
              Oluşturulma:
            </span>
            <span className="text-zinc-300">{formattedCreated}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-zinc-400">
              <Info className="w-3.5 h-3.5" />
              Son Güncelleme:
            </span>
            <span className="text-zinc-300">{formattedUpdated}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};

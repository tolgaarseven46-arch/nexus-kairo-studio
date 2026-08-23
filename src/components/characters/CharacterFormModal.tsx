import React, { useState, useEffect } from 'react';
import { Character, CharacterStatus, Race } from '../../types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { AvatarPlaceholder } from '../common/AvatarPlaceholder';
import { Sparkles, RefreshCw } from 'lucide-react';

interface CharacterFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    raceId: string;
    raceName: string;
    shortDescription: string;
    status: CharacterStatus;
    avatarSeed?: string;
  }) => Promise<void>;
  races: Race[];
  initialData?: Character | null;
  isSubmitting?: boolean;
}

export const CharacterFormModal: React.FC<CharacterFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  races,
  initialData,
  isSubmitting = false,
}) => {
  const [name, setName] = useState('');
  const [raceId, setRaceId] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [status, setStatus] = useState<CharacterStatus>('Active');
  const [avatarSeed, setAvatarSeed] = useState('');
  const [errors, setErrors] = useState<{ name?: string }>({});

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setRaceId(initialData.raceId || '');
      setShortDescription(initialData.shortDescription);
      setStatus(initialData.status);
      setAvatarSeed(initialData.avatarSeed || initialData.name);
    } else {
      setName('');
      setRaceId(races.length > 0 ? races[0].id : '');
      setShortDescription('');
      setStatus('Active');
      setAvatarSeed(Math.random().toString(36).substring(2, 9));
    }
    setErrors({});
  }, [initialData, isOpen, races]);

  const statusLabels: Record<CharacterStatus, string> = {
    Active: 'Aktif',
    Draft: 'Taslak',
    Standby: 'Beklemede',
    Archived: 'Arşivlendi',
  };

  const handleRegenerateSeed = () => {
    setAvatarSeed(Math.random().toString(36).substring(2, 9));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrors({ name: 'Karakter adı zorunludur' });
      return;
    }

    const selectedRace = races.find((r) => r.id === raceId);
    const raceName = selectedRace ? selectedRace.name : 'Atanmadı';

    try {
      await onSubmit({
        name: name.trim(),
        raceId: raceId || '',
        raceName,
        shortDescription: shortDescription.trim(),
        status,
        avatarSeed: avatarSeed || name.trim().toLowerCase(),
      });
      onClose();
    } catch (err) {
      console.error('Failed to submit character form:', err);
    }
  };

  const isEdit = Boolean(initialData);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Karakter Varlığını Düzenle' : 'Dijital Varlık Oluştur'}
      subtitle={
        isEdit
          ? `KİMLİK: ${initialData?.id || 'ATANMADI'}`
          : 'NEXUS deposunda yeni bir karakter varlığı tanımlayın'
      }
      maxWidth="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
            İptal
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            isLoading={isSubmitting}
          >
            {isEdit ? 'Varlığı Kaydet' : 'Karakteri Oluştur'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 font-sans text-sm">
        {/* Avatar Glyph Preview & Seed */}
        <div className="flex items-center gap-4 p-3.5 rounded-lg bg-zinc-950 border border-zinc-800/80">
          <AvatarPlaceholder
            name={name || 'Yeni Varlık'}
            seed={avatarSeed || name}
            size="lg"
          />
          <div className="flex-1 space-y-1">
            <div className="text-xs font-mono text-zinc-400 uppercase tracking-wide flex items-center justify-between">
              <span>Avatar Matris Tanımlayıcısı</span>
              <button
                type="button"
                onClick={handleRegenerateSeed}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono"
              >
                <RefreshCw className="w-3 h-3" />
                Yeniden Üret
              </button>
            </div>
            <input
              type="text"
              value={avatarSeed}
              onChange={(e) => setAvatarSeed(e.target.value)}
              placeholder="Benzersiz tohum..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-xs font-mono text-zinc-300 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Character Name */}
        <div>
          <label className="block text-xs font-mono text-zinc-300 uppercase tracking-wide mb-1.5">
            Karakter Adı <span className="text-cyan-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors({});
            }}
            placeholder="Varlık adı veya unvanı..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
            autoFocus
          />
          {errors.name && (
            <p className="text-xs text-rose-400 mt-1 font-mono">{errors.name}</p>
          )}
        </div>

        {/* Race Selector */}
        <div>
          <label className="block text-xs font-mono text-zinc-300 uppercase tracking-wide mb-1.5">
            Atanan Irk
          </label>
          {races.length === 0 ? (
            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 font-mono">
              Dizinde mevcut ırk yok. Varlık <span className="text-cyan-400">Atanmadı</span> olarak işaretlenecektir. İstediğiniz zaman Irklar sekmesinden yeni ırk tanımlayabilirsiniz.
            </div>
          ) : (
            <select
              value={raceId}
              onChange={(e) => setRaceId(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-zinc-100 text-xs font-mono focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="">-- Atanmadı --</option>
              {races.map((race) => (
                <option key={race.id} value={race.id}>
                  {race.name} ({race.status === 'Active' ? 'Aktif' : race.status === 'Draft' ? 'Taslak' : 'Arşivlendi'})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Operational Status */}
        <div>
          <label className="block text-xs font-mono text-zinc-300 uppercase tracking-wide mb-1.5">
            Varlık Durumu
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['Active', 'Draft', 'Standby', 'Archived'] as CharacterStatus[]).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatus(st)}
                className={`py-2 px-2.5 rounded-lg text-xs font-mono font-medium border text-center transition-all ${
                  status === st
                    ? 'bg-zinc-800 border-cyan-500/60 text-cyan-300 shadow-sm'
                    : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                }`}
              >
                {statusLabels[st]}
              </button>
            ))}
          </div>
        </div>

        {/* Short Description */}
        <div>
          <label className="block text-xs font-mono text-zinc-300 uppercase tracking-wide mb-1.5">
            Kısa Açıklama ve Görev
          </label>
          <textarea
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
            rows={3}
            placeholder="Bu dijital varlığın kısa işlevsel özeti veya rolü..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors resize-none"
          />
        </div>
      </form>
    </Modal>
  );
};

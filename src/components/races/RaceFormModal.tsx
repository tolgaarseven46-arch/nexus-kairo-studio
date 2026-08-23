import React, { useState, useEffect } from 'react';
import { Race, RaceStatus } from '../../types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

interface RaceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description: string; status: RaceStatus }) => Promise<void>;
  initialData?: Race | null;
  isSubmitting?: boolean;
}

export const RaceFormModal: React.FC<RaceFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isSubmitting = false,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<RaceStatus>('Active');
  const [errors, setErrors] = useState<{ name?: string }>({});

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description);
      setStatus(initialData.status);
    } else {
      setName('');
      setDescription('');
      setStatus('Active');
    }
    setErrors({});
  }, [initialData, isOpen]);

  const statusLabels: Record<RaceStatus, string> = {
    Active: 'Aktif',
    Draft: 'Taslak',
    Archived: 'Arşivlendi',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrors({ name: 'Irk ismi zorunludur' });
      return;
    }

    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        status,
      });
      onClose();
    } catch (err) {
      console.error('Failed to submit race form:', err);
    }
  };

  const isEdit = Boolean(initialData);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Irk Özelliklerini Düzenle' : 'Yeni Irk Tanımla'}
      subtitle={
        isEdit
          ? `KİMLİK: ${initialData?.id || 'ATANMADI'}`
          : 'Temel bir ırk sınıflandırması oluşturun'
      }
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
            {isEdit ? 'Değişiklikleri Kaydet' : 'Irkı Oluştur'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 font-sans text-sm">
        {/* Race Name */}
        <div>
          <label className="block text-xs font-mono text-zinc-300 uppercase tracking-wide mb-1.5">
            Irk İsmi <span className="text-cyan-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors({});
            }}
            placeholder="Örn. Sibernetik Muhafız, Sentetik Varlık, Arşiv Birimi"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
            autoFocus
          />
          {errors.name && (
            <p className="text-xs text-rose-400 mt-1 font-mono">{errors.name}</p>
          )}
        </div>

        {/* Status Selection */}
        <div>
          <label className="block text-xs font-mono text-zinc-300 uppercase tracking-wide mb-1.5">
            Operasyonel Durum
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['Active', 'Draft', 'Archived'] as RaceStatus[]).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatus(st)}
                className={`py-2 px-3 rounded-lg text-xs font-mono font-medium border text-center transition-all ${
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

        {/* Description */}
        <div>
          <label className="block text-xs font-mono text-zinc-300 uppercase tracking-wide mb-1.5">
            Açıklama ve Özellikler
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Irk özelliklerini, biyolojik/mekanik nitelikleri veya temel parametreleri açıklayın..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors resize-none"
          />
          <p className="text-[11px] text-zinc-400 mt-1">
            Bu ırk grubunun karakteristik özelliklerine ilişkin serbest notlar.
          </p>
        </div>
      </form>
    </Modal>
  );
};

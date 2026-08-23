import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isConfirming?: boolean;
  variant?: 'danger' | 'warning';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Sil',
  cancelLabel = 'İptal',
  isConfirming = false,
  variant = 'danger',
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="md"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isConfirming}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
            isLoading={isConfirming}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-4">
        <div
          className={`p-2.5 rounded-lg shrink-0 ${
            variant === 'danger'
              ? 'bg-rose-950/80 text-rose-400 border border-rose-800/40'
              : 'bg-amber-950/80 text-amber-400 border border-amber-800/40'
          }`}
        >
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="text-sm text-zinc-300 leading-relaxed font-sans">
          {message}
        </div>
      </div>
    </Modal>
  );
};

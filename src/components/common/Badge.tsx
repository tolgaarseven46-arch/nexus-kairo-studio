import React from 'react';
import { RaceStatus, CharacterStatus } from '../../types';

interface BadgeProps {
  status?: RaceStatus | CharacterStatus | string;
  variant?: 'cyan' | 'emerald' | 'amber' | 'indigo' | 'zinc' | 'rose';
  size?: 'sm' | 'md';
  showDot?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  status,
  variant,
  size = 'md',
  showDot = true,
  children,
  className = '',
}) => {
  let resolvedVariant = variant;

  if (!resolvedVariant && status) {
    switch (status) {
      case 'Active':
        resolvedVariant = 'emerald';
        break;
      case 'Standby':
        resolvedVariant = 'indigo';
        break;
      case 'Draft':
        resolvedVariant = 'amber';
        break;
      case 'Archived':
      case 'Deprecated':
        resolvedVariant = 'zinc';
        break;
      default:
        resolvedVariant = 'cyan';
    }
  }

  const variantStyles = {
    emerald: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30',
    cyan: 'bg-cyan-950/60 text-cyan-300 border-cyan-500/30',
    amber: 'bg-amber-950/60 text-amber-300 border-amber-500/30',
    indigo: 'bg-indigo-950/60 text-indigo-300 border-indigo-500/30',
    rose: 'bg-rose-950/60 text-rose-300 border-rose-500/30',
    zinc: 'bg-zinc-800/80 text-zinc-400 border-zinc-700/40',
  }[resolvedVariant || 'cyan'];

  const dotColors = {
    emerald: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]',
    cyan: 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]',
    amber: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]',
    indigo: 'bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.5)]',
    rose: 'bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.5)]',
    zinc: 'bg-zinc-500',
  }[resolvedVariant || 'cyan'];

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 tracking-wider gap-1.5',
    md: 'text-xs px-2.5 py-1 tracking-wide gap-2',
  }[size];

  const statusLabels: Record<string, string> = {
    Active: 'Aktif',
    Standby: 'Beklemede',
    Draft: 'Taslak',
    Archived: 'Arşivlendi',
    Deprecated: 'Kullanım Dışı',
  };

  const displayText = children || (status ? (statusLabels[status] || status) : '');

  return (
    <span
      className={`inline-flex items-center font-mono font-medium rounded-md border whitespace-nowrap uppercase ${variantStyles} ${sizeStyles} ${className}`}
    >
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors}`} />
      )}
      <span>{displayText}</span>
    </span>
  );
};

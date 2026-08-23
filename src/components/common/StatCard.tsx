import React from 'react';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  variant?: 'cyan' | 'emerald' | 'indigo' | 'zinc';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  variant = 'cyan',
  onClick,
}) => {
  const accentBorders = {
    cyan: 'border-zinc-800 hover:border-cyan-500/40 bg-zinc-900/60',
    emerald: 'border-zinc-800 hover:border-emerald-500/40 bg-zinc-900/60',
    indigo: 'border-zinc-800 hover:border-indigo-500/40 bg-zinc-900/60',
    zinc: 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/60',
  }[variant];

  const iconStyles = {
    cyan: 'bg-cyan-950/50 text-cyan-400 border border-cyan-800/40',
    emerald: 'bg-emerald-950/50 text-emerald-400 border border-emerald-800/40',
    indigo: 'bg-indigo-950/50 text-indigo-400 border border-indigo-800/40',
    zinc: 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/40',
  }[variant];

  return (
    <div
      onClick={onClick}
      className={`relative p-5 rounded-xl border ${accentBorders} transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:bg-zinc-900/90 hover:-translate-y-0.5' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
          {title}
        </span>
        <div className={`p-2 rounded-lg ${iconStyles}`}>
          {icon}
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold font-mono text-zinc-100 tracking-tight">
          {value}
        </span>
      </div>
      {subtitle && (
        <p className="mt-1 text-xs text-zinc-500 font-sans">
          {subtitle}
        </p>
      )}
    </div>
  );
};

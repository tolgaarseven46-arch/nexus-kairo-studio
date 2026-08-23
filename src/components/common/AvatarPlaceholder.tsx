import React from 'react';

interface AvatarPlaceholderProps {
  seed?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const AvatarPlaceholder: React.FC<AvatarPlaceholderProps> = ({
  seed = 'nexus',
  name = 'Entity',
  size = 'md',
  className = '',
}) => {
  // Generate deterministic colors and glyph from seed string
  const hash = Array.from(seed + name).reduce(
    (acc, char) => (acc << 5) - acc + char.charCodeAt(0),
    0
  );

  const colors = [
    { bg: 'from-cyan-950/80 to-blue-950/80', border: 'border-cyan-500/40', text: 'text-cyan-300', glow: 'shadow-cyan-500/10' },
    { bg: 'from-indigo-950/80 to-purple-950/80', border: 'border-indigo-500/40', text: 'text-indigo-300', glow: 'shadow-indigo-500/10' },
    { bg: 'from-emerald-950/80 to-teal-950/80', border: 'border-emerald-500/40', text: 'text-emerald-300', glow: 'shadow-emerald-500/10' },
    { bg: 'from-amber-950/80 to-orange-950/80', border: 'border-amber-500/40', text: 'text-amber-300', glow: 'shadow-amber-500/10' },
    { bg: 'from-rose-950/80 to-pink-950/80', border: 'border-rose-500/40', text: 'text-rose-300', glow: 'shadow-rose-500/10' },
    { bg: 'from-violet-950/80 to-sky-950/80', border: 'border-violet-500/40', text: 'text-violet-300', glow: 'shadow-violet-500/10' },
  ];

  const themeIndex = Math.abs(hash) % colors.length;
  const theme = colors[themeIndex];

  const initials = (name || seed)
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase())
    .slice(0, 2)
    .join('') || 'NX';

  const sizeStyles = {
    sm: 'w-8 h-8 text-xs rounded-md',
    md: 'w-10 h-10 text-sm rounded-lg',
    lg: 'w-16 h-16 text-lg rounded-xl',
    xl: 'w-24 h-24 text-2xl rounded-2xl',
  }[size];

  return (
    <div
      className={`relative shrink-0 flex items-center justify-center font-mono font-bold bg-gradient-to-br border ${theme.bg} ${theme.border} ${theme.text} ${theme.glow} shadow-lg ${sizeStyles} ${className} select-none overflow-hidden`}
    >
      {/* Subtle digital grid pattern */}
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:6px_6px]" />
      
      {/* Corner indicators */}
      <div className="absolute top-0.5 left-0.5 w-1 h-1 bg-current opacity-40" />
      <div className="absolute bottom-0.5 right-0.5 w-1 h-1 bg-current opacity-40" />
      
      <span className="relative tracking-wider z-10">{initials}</span>
    </div>
  );
};

import React from 'react';
import { DroitExpressionMode } from '../../types/nexus';

export type DroitAvatarKey =
  | 'droit.avatar.neutral'
  | 'droit.avatar.happy'
  | 'droit.avatar.angry'
  | 'droit.avatar.sad'
  | 'droit.avatar.surprised'
  | 'droit.avatar.alert'
  | 'droit.avatar.confident';

export interface DroitAvatarProps {
  expression?: DroitExpressionMode | string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showGlow?: boolean;
}

// Harita: Expression -> Avatar Asset Key
export const EXPRESSION_TO_AVATAR_KEY: Record<string, DroitAvatarKey> = {
  NEUTRAL: 'droit.avatar.neutral',
  FRIENDLY: 'droit.avatar.happy',
  CALM: 'droit.avatar.neutral',
  ALERT: 'droit.avatar.alert',
  ANALYTICAL: 'droit.avatar.confident',
  CONFIDENT: 'droit.avatar.confident',
  angry: 'droit.avatar.angry',
  sad: 'droit.avatar.sad',
  surprised: 'droit.avatar.surprised',
};

export const DroitAvatar: React.FC<DroitAvatarProps> = ({
  expression = 'NEUTRAL',
  size = 'md',
  className = '',
  showGlow = false,
}) => {
  const normExp = expression.toUpperCase();

  // Boyut ayarları
  const sizeDimensions: Record<string, { container: string; px: number }> = {
    xs: { container: 'w-6 h-6', px: 24 },
    sm: { container: 'w-8 h-8', px: 32 },
    md: { container: 'w-12 h-12', px: 48 },
    lg: { container: 'w-24 h-24 sm:w-28 sm:h-28', px: 112 },
    xl: { container: 'w-32 h-32 sm:w-36 sm:h-36', px: 144 },
  };

  const dim = sizeDimensions[size] || sizeDimensions.md;

  // İfadeye göre duygu aurası ve detay renkleri
  const getTheme = () => {
    switch (normExp) {
      case 'ALERT':
      case 'ANGRY':
        return {
          glow: 'rgba(239, 68, 68, 0.35)',
          border: 'border-rose-500/70',
          accent: '#ef4444',
          earGlow: '#f87171',
          eyeColor: '#fb7185',
          mouthPath: 'M 92 118 Q 100 114 108 118', // Hafif gergin
          eyebrowsLeft: 'M 82 86 L 94 90', // Çatık
          eyebrowsRight: 'M 106 90 L 118 86',
        };
      case 'FRIENDLY':
      case 'HAPPY':
        return {
          glow: 'rgba(16, 185, 129, 0.35)',
          border: 'border-emerald-500/70',
          accent: '#10b981',
          earGlow: '#34d399',
          eyeColor: '#6ee7b7',
          mouthPath: 'M 92 116 Q 100 125 108 116', // Gülümseme
          eyebrowsLeft: 'M 82 85 Q 88 82 94 85',
          eyebrowsRight: 'M 106 85 Q 112 82 118 85',
        };
      case 'CONFIDENT':
      case 'ANALYTICAL':
        return {
          glow: 'rgba(99, 102, 241, 0.35)',
          border: 'border-indigo-500/70',
          accent: '#6366f1',
          earGlow: '#818cf8',
          eyeColor: '#a5b4fc',
          mouthPath: 'M 93 118 Q 100 120 107 118',
          eyebrowsLeft: 'M 82 84 L 94 86',
          eyebrowsRight: 'M 106 85 L 118 83',
        };
      case 'SURPRISED':
        return {
          glow: 'rgba(168, 85, 247, 0.35)',
          border: 'border-purple-500/70',
          accent: '#a855f7',
          earGlow: '#c084fc',
          eyeColor: '#d8b4fe',
          mouthPath: 'M 96 116 A 4 5 0 1 0 104 116 A 4 5 0 1 0 96 116', // Şaşkın O
          eyebrowsLeft: 'M 82 82 Q 88 78 94 82',
          eyebrowsRight: 'M 106 82 Q 112 78 118 82',
        };
      case 'NEUTRAL':
      case 'CALM':
      default:
        return {
          glow: 'rgba(56, 189, 248, 0.25)',
          border: 'border-cyan-500/60',
          accent: '#38bdf8',
          earGlow: '#06b6d4',
          eyeColor: '#7dd3fc',
          mouthPath: 'M 93 118 Q 100 119 107 118', // Sakin nötr çizgi
          eyebrowsLeft: 'M 82 86 Q 88 84 94 86',
          eyebrowsRight: 'M 106 86 Q 112 84 118 86',
        };
    }
  };

  const theme = getTheme();

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full select-none ${dim.container} ${className}`}
    >
      {/* Arka plan yumuşak siber aura */}
      {showGlow && (
        <div
          className="absolute inset-0 rounded-full blur-xl opacity-40 transition-colors duration-500"
          style={{ backgroundColor: theme.accent }}
        />
      )}

      {/* Dış Çerçeve / Ring */}
      <div
        className={`w-full h-full rounded-full border ${theme.border} bg-zinc-950/90 overflow-hidden relative shadow-lg flex items-center justify-center transition-all duration-300`}
      >
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full object-cover"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Ten Gradyanı (İnsan Kadın Droit) */}
            <linearGradient id="skinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#eedacf" />
              <stop offset="60%" stopColor="#debdb0" />
              <stop offset="100%" stopColor="#c59f91" />
            </linearGradient>

            {/* Saç Gradyanı (Siyah / Koyu Kestane şık bob stil) */}
            <linearGradient id="hairGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1a1c24" />
              <stop offset="50%" stopColor="#11131a" />
              <stop offset="100%" stopColor="#08090d" />
            </linearGradient>

            {/* Üniforma / Yaka Gradyanı */}
            <linearGradient id="suitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e2230" />
              <stop offset="100%" stopColor="#0f1118" />
            </linearGradient>

            {/* Neural Earpiece Glow */}
            <filter id="neuralGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Arka Plan Atmosferi */}
          <rect width="200" height="200" fill="#08090f" />
          <circle cx="100" cy="100" r="95" fill="#0d111a" />

          {/* Arka Saç Katmanı */}
          <path
            d="M 50 85 C 45 130, 60 170, 75 180 L 125 180 C 140 170, 155 130, 150 85 C 145 35, 55 35, 50 85 Z"
            fill="url(#hairGrad)"
          />

          {/* Omuzlar ve Yönetici Asistanı Kıyafeti */}
          <path
            d="M 35 200 L 60 155 L 85 148 L 115 148 L 140 155 L 165 200 Z"
            fill="url(#suitGrad)"
            stroke="#2b3345"
            strokeWidth="1.5"
          />
          {/* Yaka Çizgileri */}
          <path
            d="M 85 148 L 100 170 L 115 148"
            fill="#090b10"
            stroke="#3d4760"
            strokeWidth="1.2"
          />
          {/* Kravat/Rozet Işığı */}
          <circle cx="100" cy="178" r="2.5" fill={theme.accent} filter="url(#neuralGlow)" />

          {/* Boyun */}
          <path
            d="M 86 125 L 86 150 L 114 150 L 114 125 Z"
            fill="#debdb0"
          />
          <path
            d="M 86 138 Q 100 148 114 138 L 114 150 L 86 150 Z"
            fill="#c59f91"
            opacity="0.4"
          />

          {/* Yüz Hatları (İnsan Kadın Droit) */}
          <path
            d="M 68 85 C 68 120, 80 142, 100 142 C 120 142, 132 120, 132 85 C 132 55, 68 55, 68 85 Z"
            fill="url(#skinGrad)"
          />

          {/* Kulak ve Neural Arayüz Düğümü (Cyber Earpiece) */}
          <path d="M 66 88 C 64 80, 64 96, 68 98 Z" fill="#d1aba0" />
          <path d="M 132 88 C 134 80, 134 96, 130 98 Z" fill="#d1aba0" />

          {/* Sol Kulak Cyber Neural Düğümü */}
          <circle cx="67" cy="90" r="3" fill="#1e2230" stroke="#3d4760" strokeWidth="1" />
          <circle cx="67" cy="90" r="1.5" fill={theme.earGlow} filter="url(#neuralGlow)" />

          {/* Sağ Kulak Cyber Neural Düğümü */}
          <circle cx="133" cy="90" r="3" fill="#1e2230" stroke="#3d4760" strokeWidth="1" />
          <circle cx="133" cy="90" r="1.5" fill={theme.earGlow} filter="url(#neuralGlow)" />

          {/* Kaşlar */}
          <path
            d={theme.eyebrowsLeft}
            stroke="#2e2523"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d={theme.eyebrowsRight}
            stroke="#2e2523"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
          />

          {/* Gözler */}
          {/* Sol Göz */}
          <ellipse cx="88" cy="94" rx="5" ry="3.5" fill="#ffffff" />
          <circle cx="88.5" cy="94" r="2.8" fill="#1c2331" />
          <circle cx="88.5" cy="94" r="1.6" fill={theme.eyeColor} />
          <circle cx="87.5" cy="93" r="0.8" fill="#ffffff" />
          {/* Üst Kirpik / Göz Kapağı */}
          <path d="M 82 93 Q 88 90 94 93" stroke="#1d1716" strokeWidth="1.6" fill="none" strokeLinecap="round" />

          {/* Sağ Göz */}
          <ellipse cx="112" cy="94" rx="5" ry="3.5" fill="#ffffff" />
          <circle cx="111.5" cy="94" r="2.8" fill="#1c2331" />
          <circle cx="111.5" cy="94" r="1.6" fill={theme.eyeColor} />
          <circle cx="110.5" cy="93" r="0.8" fill="#ffffff" />
          {/* Üst Kirpik */}
          <path d="M 106 93 Q 112 90 118 93" stroke="#1d1716" strokeWidth="1.6" fill="none" strokeLinecap="round" />

          {/* Burun */}
          <path
            d="M 100 96 L 98 107 L 102 107"
            stroke="#ab887b"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />

          {/* Dudaklar / İfade */}
          <path
            d={theme.mouthPath}
            stroke="#b35359"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
          />

          {/* Ön Saç Modeli (Şık, modern kadın asistan kesimi) */}
          <path
            d="M 64 78 C 68 40, 132 40, 136 78 C 130 65, 115 62, 100 68 C 85 62, 70 65, 64 78 Z"
            fill="url(#hairGrad)"
          />
          {/* Sol Kahkül Tutamı */}
          <path
            d="M 64 78 C 65 98, 70 112, 76 118 C 72 105, 70 90, 72 78 Z"
            fill="url(#hairGrad)"
          />
          {/* Sağ Kahkül Tutamı */}
          <path
            d="M 136 78 C 135 98, 130 112, 124 118 C 128 105, 130 90, 128 78 Z"
            fill="url(#hairGrad)"
          />
          {/* Saç Işıltısı */}
          <path
            d="M 78 52 Q 100 46 122 52"
            stroke="#3a4054"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
            opacity="0.6"
          />
        </svg>
      </div>
    </div>
  );
};

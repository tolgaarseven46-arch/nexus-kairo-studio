import React from 'react';
import { DroitPhysicalAppearance, DroitPhysicalAsset, DroitAssetCategory } from '../../../types/nexus';

export interface DroitLayeredAvatarProps {
  appearance: DroitPhysicalAppearance;
  activeAssets?: Partial<Record<DroitAssetCategory, DroitPhysicalAsset | null>>;
  size?: 'sm' | 'md' | 'lg' | 'preview';
  className?: string;
  showAura?: boolean;
}

/**
 * 1. FACE LAYER
 */
export const FaceLayer: React.FC<{
  asset?: DroitPhysicalAsset | null;
  appearance: DroitPhysicalAppearance;
}> = ({ asset, appearance }) => {
  if (asset?.downloadURL) {
    return (
      <img
        src={asset.downloadURL}
        alt={asset.name || 'Face layer'}
        className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10"
      />
    );
  }

  // Fallback: Default SVG Face
  return (
    <>
      <path
        d="M 68 85 C 68 120, 80 142, 100 142 C 120 142, 132 120, 132 85 C 132 55, 68 55, 68 85 Z"
        fill="url(#layerSkinGrad)"
      />
      <path d="M 66 88 C 64 80, 64 96, 68 98 Z" fill="#d1aba0" />
      <path d="M 132 88 C 134 80, 134 96, 130 98 Z" fill="#d1aba0" />
      <path
        d="M 100 96 L 99 107 L 102 108"
        stroke="#c99c8d"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 93 118 Q 100 119 107 118"
        stroke="#b37868"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 95 120 Q 100 123 105 120"
        stroke="#c28b7b"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
    </>
  );
};

/**
 * 2. EYES LAYER
 */
export const EyesLayer: React.FC<{
  asset?: DroitPhysicalAsset | null;
  eyeTheme: { iris: string; glow: string };
}> = ({ asset, eyeTheme }) => {
  if (asset?.downloadURL) {
    return (
      <img
        src={asset.downloadURL}
        alt={asset.name || 'Eyes layer'}
        className="absolute inset-0 w-full h-full object-contain pointer-events-none z-20"
      />
    );
  }

  // Fallback: Default SVG Eyes & Brows
  return (
    <>
      <path
        d="M 82 86 Q 88 84 94 86"
        stroke="#2e2523"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 106 86 Q 112 84 118 86"
        stroke="#2e2523"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      <ellipse cx="88" cy="98" rx="7.5" ry="4.5" fill="#f8fafc" />
      <circle cx="88" cy="98" r="3.8" fill={eyeTheme.iris} />
      <circle cx="88" cy="98" r="1.8" fill="#0f172a" />
      <circle cx="89.2" cy="96.8" r="0.9" fill="#ffffff" />
      <path
        d="M 80 96 Q 88 92 96 96"
        stroke="#2b1810"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
      <ellipse cx="112" cy="98" rx="7.5" ry="4.5" fill="#f8fafc" />
      <circle cx="112" cy="98" r="3.8" fill={eyeTheme.iris} />
      <circle cx="112" cy="98" r="1.8" fill="#0f172a" />
      <circle cx="113.2" cy="96.8" r="0.9" fill="#ffffff" />
      <path
        d="M 104 96 Q 112 92 120 96"
        stroke="#2b1810"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
    </>
  );
};

/**
 * 3. HAIR LAYER
 */
export const HairLayer: React.FC<{
  asset?: DroitPhysicalAsset | null;
  position: 'back' | 'front';
}> = ({ asset, position }) => {
  if (asset?.downloadURL) {
    if (position === 'front') {
      return (
        <img
          src={asset.downloadURL}
          alt={asset.name || 'Hair layer'}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none z-30"
        />
      );
    }
    return null;
  }

  if (position === 'back') {
    return (
      <path
        d="M 50 85 C 45 130, 60 170, 75 180 L 125 180 C 140 170, 155 130, 150 85 C 145 35, 55 35, 50 85 Z"
        fill="url(#layerHairGrad)"
      />
    );
  }

  return (
    <>
      <path
        d="M 68 85 C 68 55, 132 55, 132 85 C 125 72, 115 68, 100 68 C 85 68, 75 72, 68 85 Z"
        fill="url(#layerHairGrad)"
      />
      <path
        d="M 68 85 C 72 102, 76 118, 75 130 C 72 110, 68 95, 68 85 Z"
        fill="url(#layerHairGrad)"
      />
      <path
        d="M 132 85 C 128 102, 124 118, 125 130 C 128 110, 132 95, 132 85 Z"
        fill="url(#layerHairGrad)"
      />
      <path
        d="M 80 64 Q 100 58 120 64"
        stroke="rgba(255, 255, 255, 0.12)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </>
  );
};

/**
 * 4. CLOTHING LAYER
 */
export const ClothingLayer: React.FC<{
  asset?: DroitPhysicalAsset | null;
  clothTheme: { start: string; end: string; accent: string };
}> = ({ asset, clothTheme }) => {
  if (asset?.downloadURL) {
    return (
      <img
        src={asset.downloadURL}
        alt={asset.name || 'Clothing layer'}
        className="absolute inset-0 w-full h-full object-contain pointer-events-none z-15"
      />
    );
  }

  return (
    <>
      <path
        d="M 35 200 L 60 155 L 85 148 L 115 148 L 140 155 L 165 200 Z"
        fill="url(#layerSuitGrad)"
        stroke="#2b3345"
        strokeWidth="1.5"
      />
      <path
        d="M 85 148 L 100 170 L 115 148"
        fill="#090b10"
        stroke="#3d4760"
        strokeWidth="1.2"
      />
      <circle
        cx="100"
        cy="178"
        r="2.5"
        fill={clothTheme.accent}
        filter="url(#layerNeuralGlow)"
      />
      <path d="M 86 125 L 86 150 L 114 150 L 114 125 Z" fill="#debdb0" />
      <path
        d="M 86 138 Q 100 148 114 138 L 114 150 L 86 150 Z"
        fill="#c59f91"
        opacity="0.4"
      />
    </>
  );
};

/**
 * 5. ACCESSORIES LAYER
 */
export const AccessoryLayer: React.FC<{
  asset?: DroitPhysicalAsset | null;
  hasEarpiece: boolean;
  eyeTheme: { iris: string };
}> = ({ asset, hasEarpiece, eyeTheme }) => {
  if (asset?.downloadURL) {
    return (
      <img
        src={asset.downloadURL}
        alt={asset.name || 'Accessory layer'}
        className="absolute inset-0 w-full h-full object-contain pointer-events-none z-40"
      />
    );
  }

  if (!hasEarpiece) return null;

  return (
    <>
      <circle cx="67" cy="90" r="3" fill="#1e2230" stroke="#3d4760" strokeWidth="1" />
      <circle
        cx="67"
        cy="90"
        r="1.5"
        fill={eyeTheme.iris}
        filter="url(#layerNeuralGlow)"
      />
      <circle cx="133" cy="90" r="3" fill="#1e2230" stroke="#3d4760" strokeWidth="1" />
      <circle
        cx="133"
        cy="90"
        r="1.5"
        fill={eyeTheme.iris}
        filter="url(#layerNeuralGlow)"
      />
    </>
  );
};

export const DroitLayeredAvatar: React.FC<DroitLayeredAvatarProps> = ({
  appearance,
  activeAssets,
  size = 'preview',
  className = '',
  showAura = true,
}) => {
  const sizeMap = {
    sm: 'w-12 h-12',
    md: 'w-24 h-24',
    lg: 'w-48 h-48',
    preview: 'w-64 h-64 sm:w-72 sm:h-72 md:w-80 md:h-80',
  };

  const getEyeColorHex = (colorName: string) => {
    switch (colorName.toLowerCase()) {
      case 'siyan':
      case 'cyan':
      case 'mavi':
        return { iris: '#38bdf8', glow: '#0284c7', glowRgba: 'rgba(56, 189, 248, 0.4)' };
      case 'zümrüt':
      case 'yeşil':
      case 'emerald':
        return { iris: '#34d399', glow: '#059669', glowRgba: 'rgba(52, 211, 153, 0.4)' };
      case 'kehribar':
      case 'amber':
      case 'altın':
        return { iris: '#fbbf24', glow: '#d97706', glowRgba: 'rgba(251, 191, 36, 0.4)' };
      case 'mor':
      case 'violet':
        return { iris: '#c084fc', glow: '#9333ea', glowRgba: 'rgba(192, 132, 252, 0.4)' };
      case 'kırmızı':
      case 'rose':
        return { iris: '#fb7185', glow: '#e11d48', glowRgba: 'rgba(251, 113, 133, 0.4)' };
      default:
        return { iris: '#7dd3fc', glow: '#0284c7', glowRgba: 'rgba(125, 211, 252, 0.35)' };
    }
  };

  const getHairGradient = (colorName: string) => {
    switch (colorName.toLowerCase()) {
      case 'kestane':
      case 'kahverengi':
        return { start: '#3d251d', mid: '#251610', end: '#140c09' };
      case 'platin':
      case 'gümüş':
        return { start: '#e2e8f0', mid: '#94a3b8', end: '#475569' };
      case 'gece mavisi':
        return { start: '#1e293b', mid: '#0f172a', end: '#020617' };
      case 'siyah':
      default:
        return { start: '#1e2029', mid: '#12141c', end: '#090a0f' };
    }
  };

  const getClothingGradient = (outfitName: string) => {
    switch (outfitName.toLowerCase()) {
      case 'operasyon zırhı':
      case 'taktik':
        return { start: '#27272a', end: '#09090b', accent: '#6366f1' };
      case 'beyaz laboratuvar':
        return { start: '#334155', end: '#1e293b', accent: '#38bdf8' };
      case 'yönetici üniforması':
      default:
        return { start: '#1e2230', end: '#0f1118', accent: '#6366f1' };
    }
  };

  const eyeTheme = getEyeColorHex(appearance.eyes?.eyeColor || 'cyan');
  const hairTheme = getHairGradient(appearance.hair?.color || 'siyah');
  const clothTheme = getClothingGradient(appearance.clothing?.outfit || 'yönetici üniforması');
  const hasEarpiece =
    appearance.accessories?.item !== 'Yok' &&
    appearance.accessories?.item !== 'Hiçbiri' &&
    appearance.accessories?.item !== '';

  const assets = activeAssets || {};
  const faceAsset = assets.face;
  const eyesAsset = assets.eyes;
  const hairAsset = assets.hair;
  const clothingAsset = assets.clothing;
  const accessoryAsset = assets.accessory;


  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${
        sizeMap[size] || sizeMap.preview
      } ${className}`}
    >
      {/* 1. Dış Arka Plan Aura Efekti */}
      {showAura && (
        <div
          className="absolute inset-0 rounded-full blur-3xl opacity-30 pointer-events-none transition-all duration-700"
          style={{ backgroundColor: eyeTheme.iris }}
        />
      )}

      {/* 2. Dış Çerçeve Container */}
      <div className="w-full h-full rounded-full border-2 border-zinc-800/90 bg-zinc-950/95 overflow-hidden relative shadow-2xl flex items-center justify-center transition-all duration-300">
        {/* Custom Image Layers (Rendered above SVG if present) */}
        {faceAsset?.downloadURL && <FaceLayer asset={faceAsset} appearance={appearance} />}
        {eyesAsset?.downloadURL && <EyesLayer asset={eyesAsset} eyeTheme={eyeTheme} />}
        {hairAsset?.downloadURL && <HairLayer asset={hairAsset} position="front" />}
        {clothingAsset?.downloadURL && (
          <ClothingLayer asset={clothingAsset} clothTheme={clothTheme} />
        )}
        {accessoryAsset?.downloadURL && (
          <AccessoryLayer
            asset={accessoryAsset}
            hasEarpiece={hasEarpiece}
            eyeTheme={eyeTheme}
          />
        )}

        {/* Base Layered SVG Avatar */}
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full object-cover"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="layerSkinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#eedacf" />
              <stop offset="60%" stopColor="#debdb0" />
              <stop offset="100%" stopColor="#c59f91" />
            </linearGradient>

            <linearGradient id="layerHairGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={hairTheme.start} />
              <stop offset="50%" stopColor={hairTheme.mid} />
              <stop offset="100%" stopColor={hairTheme.end} />
            </linearGradient>

            <linearGradient id="layerSuitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={clothTheme.start} />
              <stop offset="100%" stopColor={clothTheme.end} />
            </linearGradient>

            <filter id="layerNeuralGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Arka Plan */}
          <rect width="200" height="200" fill="#08090f" />
          <circle cx="100" cy="100" r="95" fill="#0d111a" />
          <circle
            cx="100"
            cy="100"
            r="82"
            fill="none"
            stroke="#1c2333"
            strokeWidth="0.8"
            strokeDasharray="4 6"
          />

          {/* Arka Saç (Eğer özel saç asset'i yoksa) */}
          {!hairAsset?.downloadURL && <HairLayer asset={null} position="back" />}

          {/* Kıyafet & Boyun (Eğer özel kıyafet asset'i yoksa) */}
          {!clothingAsset?.downloadURL && (
            <ClothingLayer asset={null} clothTheme={clothTheme} />
          )}

          {/* Yüz ve Dermis (Eğer özel yüz asset'i yoksa) */}
          {!faceAsset?.downloadURL && <FaceLayer asset={null} appearance={appearance} />}

          {/* Aksesuar (Eğer özel aksesuar asset'i yoksa) */}
          {!accessoryAsset?.downloadURL && (
            <AccessoryLayer
              asset={null}
              hasEarpiece={hasEarpiece}
              eyeTheme={eyeTheme}
            />
          )}

          {/* Gözler (Eğer özel göz asset'i yoksa ve yüz asset'i gözleri kapsamıyorsa) */}
          {!eyesAsset?.downloadURL && !faceAsset?.downloadURL && (
            <EyesLayer asset={null} eyeTheme={eyeTheme} />
          )}

          {/* Ön Saç / Kahkül (Eğer özel saç asset'i yoksa ve yüz asset'i yoksa) */}
          {!hairAsset?.downloadURL && !faceAsset?.downloadURL && (
            <HairLayer asset={null} position="front" />
          )}
        </svg>
      </div>
    </div>
  );
};

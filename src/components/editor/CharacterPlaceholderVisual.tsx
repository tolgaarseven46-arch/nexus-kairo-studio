import React from 'react';
import { DroitPhysical, ExpressionItem } from '../../types';

interface CharacterPlaceholderVisualProps {
  physical: DroitPhysical;
  currentExpression?: string;
  hairStyle?: string;
  outfitStyle?: string;
  wireframeMode?: boolean;
}

export const CharacterPlaceholderVisual: React.FC<CharacterPlaceholderVisualProps> = ({
  physical,
  currentExpression = 'normal',
  hairStyle = 'Cyber Mohawk',
  outfitStyle = 'Taktik Zırh',
  wireframeMode = false,
}) => {
  const primaryColor = physical.primaryColor || '#0ea5e9';
  const accentColor = physical.accentColor || '#06b6d4';
  const secondaryColor = physical.secondaryColor || '#64748b';
  const eyeColor = physical.eyeColor || '#22d3ee';
  const eyeGlow = physical.eyeGlow ?? 85;

  // Expression mouth & visor curves
  const getExpressionData = () => {
    switch (currentExpression) {
      case 'happy':
        return { mouthD: 'M 188 232 Q 200 242 212 232', visorTilt: 0, glowIntensity: 1 };
      case 'joke':
        return { mouthD: 'M 188 234 Q 204 238 214 228', visorTilt: 2, glowIntensity: 1 };
      case 'angry':
        return { mouthD: 'M 188 236 Q 200 230 212 236', visorTilt: -4, glowIntensity: 1.3 };
      case 'sad':
        return { mouthD: 'M 188 238 Q 200 228 212 238', visorTilt: 0, glowIntensity: 0.7 };
      case 'surprised':
        return { mouthD: 'M 194 230 A 6 6 0 1 0 206 230 A 6 6 0 1 0 194 230', visorTilt: 0, glowIntensity: 1.2 };
      case 'suspicious':
        return { mouthD: 'M 188 233 L 212 233', visorTilt: -3, glowIntensity: 0.9 };
      case 'thinking':
        return { mouthD: 'M 190 234 Q 200 232 210 236', visorTilt: 3, glowIntensity: 0.95 };
      default: // normal
        return { mouthD: 'M 190 233 L 210 233', visorTilt: 0, glowIntensity: 1 };
    }
  };

  const expData = getExpressionData();

  return (
    <div className="relative w-[360px] h-[520px] select-none flex items-center justify-center">
      {/* Background Holographic Glow Field */}
      <div
        className="absolute inset-0 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-700"
        style={{
          background: `radial-gradient(circle, ${accentColor} 0%, ${primaryColor} 50%, transparent 80%)`,
        }}
      />

      <svg
        viewBox="0 0 400 600"
        className="w-full h-full drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)] filter transition-all duration-300"
      >
        <defs>
          {/* Gradients */}
          <linearGradient id="armorGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          <linearGradient id="metalGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="50%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          <linearGradient id="neonCyan" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={accentColor} />
            <stop offset="100%" stopColor={primaryColor} />
          </linearGradient>

          <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="30%" stopColor={accentColor} stopOpacity="0.8" />
            <stop offset="70%" stopColor={primaryColor} stopOpacity="0.4" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>

          {/* Glow Filters */}
          <filter id="neonFilter" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="intenseGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* --- WIREFRAME MATRIX (if enabled) --- */}
        {wireframeMode && (
          <g stroke={accentColor} strokeWidth="0.5" strokeOpacity="0.3" fill="none">
            <ellipse cx="200" cy="200" rx="90" ry="120" strokeDasharray="3 3" />
            <line x1="200" y1="50" x2="200" y2="550" />
            <line x1="80" y1="200" x2="320" y2="200" />
            <circle cx="200" cy="200" r="140" strokeDasharray="4 4" />
            <circle cx="200" cy="350" r="80" strokeDasharray="2 4" />
          </g>
        )}

        {/* --- PEDESTAL / BASE RING --- */}
        <g opacity="0.85">
          <ellipse cx="200" cy="550" rx="140" ry="24" fill="none" stroke="#334155" strokeWidth="1.5" />
          <ellipse
            cx="200"
            cy="550"
            rx="120"
            ry="18"
            fill="none"
            stroke={accentColor}
            strokeWidth="1.5"
            filter="url(#neonFilter)"
            strokeDasharray="16 8"
          />
          <ellipse cx="200" cy="550" rx="80" ry="12" fill={accentColor} fillOpacity="0.08" />
          <line x1="140" y1="550" x2="260" y2="550" stroke={primaryColor} strokeWidth="2" filter="url(#neonFilter)" />
        </g>

        {/* --- LOWER BODY / TORSO EXTENSIONS --- */}
        <g id="torso-legs">
          {/* Lower hips & thighs */}
          <path
            d="M 155 420 L 140 540 L 175 540 L 185 435 L 215 435 L 225 540 L 260 540 L 245 420 Z"
            fill="url(#metalGradient)"
            stroke="#334155"
            strokeWidth="1.5"
          />
          {/* Leg armor plating */}
          <path d="M 148 450 L 142 525 L 170 525 L 178 450 Z" fill="#0f172a" stroke="#1e293b" strokeWidth="1" />
          <path d="M 252 450 L 258 525 L 230 525 L 222 450 Z" fill="#0f172a" stroke="#1e293b" strokeWidth="1" />

          {/* Leg Circuit Lines */}
          <line x1="160" y1="460" x2="155" y2="520" stroke={accentColor} strokeWidth="1.5" filter="url(#neonFilter)" />
          <line x1="240" y1="460" x2="245" y2="520" stroke={accentColor} strokeWidth="1.5" filter="url(#neonFilter)" />
        </g>

        {/* --- MAIN CHEST / BODY ARMOR --- */}
        <g id="chest-armor">
          {/* Upper Torso Base */}
          <path
            d="M 130 270 L 110 320 L 140 420 L 260 420 L 290 320 L 270 270 L 230 260 L 170 260 Z"
            fill="url(#armorGradient)"
            stroke="#334155"
            strokeWidth="2"
          />

          {/* Chest Plates */}
          <path
            d="M 140 280 L 125 330 L 160 380 L 195 380 L 195 275 Z"
            fill="#090d16"
            stroke="#1e293b"
            strokeWidth="1.5"
          />
          <path
            d="M 260 280 L 275 330 L 240 380 L 205 380 L 205 275 Z"
            fill="#090d16"
            stroke="#1e293b"
            strokeWidth="1.5"
          />

          {/* Chest Vent Panels */}
          <line x1="145" y1="300" x2="185" y2="300" stroke="#334155" strokeWidth="1" />
          <line x1="148" y1="310" x2="185" y2="310" stroke="#334155" strokeWidth="1" />
          <line x1="255" y1="300" x2="215" y2="300" stroke="#334155" strokeWidth="1" />
          <line x1="252" y1="310" x2="215" y2="310" stroke="#334155" strokeWidth="1" />

          {/* Glowing Quantum Core (Reactor) */}
          <circle cx="200" cy="335" r="22" fill="#020617" stroke={primaryColor} strokeWidth="2" />
          <circle
            cx="200"
            cy="335"
            r="16"
            fill="url(#coreGlow)"
            filter="url(#intenseGlow)"
          />
          <circle cx="200" cy="335" r="7" fill="#ffffff" />
          <circle
            cx="200"
            cy="335"
            r="20"
            fill="none"
            stroke={accentColor}
            strokeWidth="1.5"
            strokeDasharray="6 4"
            className="animate-spin"
            style={{ transformOrigin: '200px 335px', animationDuration: '8s' }}
          />

          {/* Abdominal Cyber Hydraulics */}
          <rect x="180" y="388" width="40" height="24" rx="3" fill="#090d16" stroke="#1e293b" strokeWidth="1" />
          <line x1="188" y1="394" x2="212" y2="394" stroke={accentColor} strokeWidth="1.5" />
          <line x1="188" y1="402" x2="212" y2="402" stroke={accentColor} strokeWidth="1.5" />
        </g>

        {/* --- SHOULDERS & ARMS --- */}
        <g id="shoulders">
          {/* Left Pauldron */}
          <path
            d="M 125 270 L 80 290 L 70 340 L 115 330 Z"
            fill="url(#metalGradient)"
            stroke="#334155"
            strokeWidth="2"
          />
          <circle cx="95" cy="310" r="6" fill="#020617" stroke={accentColor} strokeWidth="1.5" />

          {/* Right Pauldron */}
          <path
            d="M 275 270 L 320 290 L 330 340 L 285 330 Z"
            fill="url(#metalGradient)"
            stroke="#334155"
            strokeWidth="2"
          />
          <circle cx="305" cy="310" r="6" fill="#020617" stroke={accentColor} strokeWidth="1.5" />

          {/* Left Arm & Cyber Hand */}
          <path d="M 85 340 L 75 440 L 95 440 L 110 340 Z" fill="#0f172a" stroke="#1e293b" strokeWidth="1.5" />
          <circle cx="85" cy="450" r="8" fill="#1e293b" stroke={accentColor} strokeWidth="1" />
          
          {/* Right Arm & Cyber Hand */}
          <path d="M 315 340 L 325 440 L 305 440 L 290 340 Z" fill="#0f172a" stroke="#1e293b" strokeWidth="1.5" />
          <circle cx="315" cy="450" r="8" fill="#1e293b" stroke={accentColor} strokeWidth="1" />
        </g>

        {/* --- NECK CONNECTOR --- */}
        <path
          d="M 180 240 L 175 265 L 225 265 L 220 240 Z"
          fill="#0f172a"
          stroke="#334155"
          strokeWidth="1.5"
        />
        <line x1="188" y1="250" x2="212" y2="250" stroke={accentColor} strokeWidth="1" />

        {/* --- HEAD / HELMET STRUCTURE --- */}
        <g id="head">
          {/* Helmet Base Silhouette */}
          <path
            d="M 150 170 C 150 110, 250 110, 250 170 C 250 200, 240 240, 200 250 C 160 240, 150 200, 150 170 Z"
            fill="url(#armorGradient)"
            stroke="#475569"
            strokeWidth="2"
          />

          {/* Ear / Audio Comms Pods */}
          <rect x="138" y="165" width="14" height="30" rx="3" fill="#090d16" stroke={accentColor} strokeWidth="1.5" />
          <circle cx="145" cy="180" r="3" fill={accentColor} filter="url(#neonFilter)" />
          
          <rect x="248" y="165" width="14" height="30" rx="3" fill="#090d16" stroke={accentColor} strokeWidth="1.5" />
          <circle cx="255" cy="180" r="3" fill={accentColor} filter="url(#neonFilter)" />

          {/* Helmet Brow / Face Plate */}
          <path
            d="M 158 150 L 242 150 L 235 220 L 200 240 L 165 220 Z"
            fill="#030712"
            stroke="#1e293b"
            strokeWidth="1.5"
          />

          {/* --- HAIR / SENSOR FIN (Dynamic based on style) --- */}
          {hairStyle === 'Cyber Mohawk' && (
            <path
              d="M 195 85 L 205 85 L 210 145 L 190 145 Z"
              fill={primaryColor}
              filter="url(#neonFilter)"
              opacity="0.85"
            />
          )}
          {hairStyle === 'Fiber Antennas' && (
            <g stroke={accentColor} strokeWidth="2" filter="url(#neonFilter)">
              <line x1="170" y1="130" x2="150" y2="85" />
              <line x1="230" y1="130" x2="250" y2="85" />
              <circle cx="150" cy="85" r="3" fill="#fff" />
              <circle cx="250" cy="85" r="3" fill="#fff" />
            </g>
          )}
          {hairStyle === 'Holo Crown' && (
            <polygon
              points="160,110 180,85 200,105 220,85 240,110 200,125"
              fill={accentColor}
              fillOpacity="0.25"
              stroke={accentColor}
              strokeWidth="1.5"
              filter="url(#neonFilter)"
            />
          )}

          {/* --- VISOR & OPTICS (Centerpiece) --- */}
          <g id="visor" style={{ transform: `rotate(${expData.visorTilt}deg)`, transformOrigin: '200px 185px' }}>
            {/* Visor Glass Plate */}
            <path
              d="M 162 170 Q 200 162 238 170 L 234 200 Q 200 210 166 200 Z"
              fill="#050b14"
              stroke={primaryColor}
              strokeWidth="2"
            />

            {/* Glowing Optic Wave / Dual Eyes */}
            <g filter="url(#intenseGlow)">
              <ellipse
                cx="182"
                cy="185"
                rx="10"
                ry="5"
                fill={eyeColor}
                opacity={(eyeGlow / 100) * expData.glowIntensity}
              />
              <circle cx="182" cy="185" r="2.5" fill="#ffffff" />

              <ellipse
                cx="218"
                cy="185"
                rx="10"
                ry="5"
                fill={eyeColor}
                opacity={(eyeGlow / 100) * expData.glowIntensity}
              />
              <circle cx="218" cy="185" r="2.5" fill="#ffffff" />
            </g>

            {/* Visor HUD scanline */}
            <line
              x1="168"
              y1="185"
              x2="232"
              y2="185"
              stroke={accentColor}
              strokeWidth="0.8"
              strokeDasharray="4 2"
              opacity="0.6"
            />
          </g>

          {/* Mouth / Voice Synthesizer LED Waveform */}
          <g id="mouth-synthesizer">
            <path
              d={expData.mouthD}
              fill="none"
              stroke={accentColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              filter="url(#neonFilter)"
            />
          </g>

          {/* Forehead Cyber Node */}
          <circle cx="200" cy="138" r="3" fill="#ffffff" filter="url(#neonFilter)" />
        </g>
      </svg>
    </div>
  );
};

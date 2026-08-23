import React from 'react';
import { RefreshCw } from 'lucide-react';
import {
  DroitPhysicalAppearance,
  DroitPhysicalAsset,
  DroitAssetCategory,
} from '../../../types/nexus';
import { DroitLayeredAvatar } from './DroitLayeredAvatar';

interface PhysicalPreviewStageProps {
  appearance: DroitPhysicalAppearance;
  activeAssets?: Partial<Record<DroitAssetCategory, DroitPhysicalAsset | null>>;
  onResetToDefaults?: () => void;
}

export const PhysicalPreviewStage: React.FC<PhysicalPreviewStageProps> = ({
  appearance,
  activeAssets = {},
  onResetToDefaults,
}) => {
  const getLayerLabel = (category: DroitAssetCategory, fallback: string) => {
    const asset = activeAssets[category];
    if (asset) return asset.name;
    return fallback;
  };

  return (
    <main className="flex-1 h-full bg-[#0b0d13] flex flex-col min-w-0 overflow-hidden select-none relative">
      {/* ─────────────────────────────────────────────────────────────
          1. ÜST BİLGİ ÇUBUĞU
         ───────────────────────────────────────────────────────────── */}
      <header className="h-14 px-4 sm:px-6 border-b border-zinc-800/80 bg-zinc-950 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <span className="text-xs font-mono font-bold tracking-widest text-zinc-300 uppercase">
            CANLI GÖRÜNÜM ÖNİZLEME
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
            DROIT // VIZUAL ASSET KATMANI
          </span>
        </div>

        {onResetToDefaults && (
          <button
            type="button"
            onClick={onResetToDefaults}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors border border-transparent hover:border-zinc-800"
            title="Varsayılan assetlere dön"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sıfırla</span>
          </button>
        )}
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. MERKEZİ AVATAR ÖNİZLEME ALANI
         ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 relative overflow-hidden">
        {/* Arka Plan Siber Izgara Deseni */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #6366f1 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Merkez Sahne Kartı / Container */}
        <div className="relative flex flex-col items-center justify-center z-10 max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
          {/* Katmanlı Droit Avatarı */}
          <div className="relative group">
            <DroitLayeredAvatar
              appearance={appearance}
              activeAssets={activeAssets}
              size="preview"
              showAura={true}
            />
          </div>

          {/* Karakter İsmi ve Seri Numarası */}
          <div className="mt-6 text-center space-y-1">
            <h3 className="text-lg font-bold tracking-wide text-zinc-100">
              Kairo
            </h3>
            <p className="text-xs font-mono tracking-wider text-zinc-400">
              Droit #001
            </p>
          </div>

          {/* Aktif Katman Durum Etiketleri */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 max-w-xs">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-900/80 border border-zinc-800 text-zinc-300">
              Yüz: {getLayerLabel('face', appearance.face?.mainFace || 'Mevcut yüz')}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-900/80 border border-zinc-800 text-zinc-300">
              Göz: {getLayerLabel('eyes', appearance.eyes?.eyeColor || 'Mevcut göz')}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-900/80 border border-zinc-800 text-zinc-300">
              Kıyafet: {getLayerLabel('clothing', appearance.clothing?.outfit || 'Mevcut kıyafet')}
            </span>
          </div>
        </div>

        {/* Alt Bilgi İpucu */}
        <div className="absolute bottom-4 text-center">
          <p className="text-[11px] text-zinc-400 font-mono">
            Sol panelden seçilen assetler gerçek zamanlı olarak avatara yansıtılır.
          </p>
        </div>
      </div>
    </main>
  );
};

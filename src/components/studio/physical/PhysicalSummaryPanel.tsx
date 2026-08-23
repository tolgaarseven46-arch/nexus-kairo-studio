import React from 'react';
import { Eye, Smile, Shirt, Sparkles, Scissors, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import {
  DroitPhysicalAppearance,
  DroitPhysicalAsset,
  DroitAppearanceBinding,
} from '../../../types/nexus';

interface PhysicalSummaryPanelProps {
  appearance: DroitPhysicalAppearance;
  physicalAssets?: DroitPhysicalAsset[];
  physicalBindings?: DroitAppearanceBinding;
}

export const PhysicalSummaryPanel: React.FC<PhysicalSummaryPanelProps> = ({
  appearance,
  physicalAssets = [],
  physicalBindings,
}) => {
  const bindings = physicalBindings || {};

  // Aktif asset isimlerini bul
  const getActiveAssetName = (
    assetId: string | null | undefined,
    defaultVal: string
  ) => {
    if (!assetId) return defaultVal;
    const found = physicalAssets.find((a) => a.id === assetId);
    return found ? found.name : defaultVal;
  };

  const getActiveAssetDetail = (
    assetId: string | null | undefined,
    defaultDetail: string
  ) => {
    if (!assetId) return defaultDetail;
    const found = physicalAssets.find((a) => a.id === assetId);
    return found ? 'Özel Asset' : defaultDetail;
  };

  const isCustomAsset = (assetId: string | null | undefined) => {
    return !!assetId && physicalAssets.some((a) => a.id === assetId);
  };

  const summaryItems = [
    {
      label: 'Yüz',
      value: getActiveAssetName(bindings.faceAssetId, appearance.face?.mainFace || 'Mevcut yüz'),
      detail: getActiveAssetDetail(bindings.faceAssetId, appearance.face?.faceShape || 'Standart Dermis'),
      icon: Smile,
      color: 'text-indigo-400',
      custom: isCustomAsset(bindings.faceAssetId),
    },
    {
      label: 'Gözler',
      value: getActiveAssetName(bindings.eyesAssetId, appearance.eyes?.eyeColor || 'Mevcut göz'),
      detail: getActiveAssetDetail(bindings.eyesAssetId, appearance.eyes?.eyeType || 'Siyan Cyber-Optic'),
      icon: Eye,
      color: 'text-cyan-400',
      custom: isCustomAsset(bindings.eyesAssetId),
    },
    {
      label: 'Saç',
      value: getActiveAssetName(bindings.hairAssetId, appearance.hair?.style || 'Mevcut saç'),
      detail: getActiveAssetDetail(
        bindings.hairAssetId,
        appearance.hair?.color ? `${appearance.hair.color} tonu` : 'Gece Siyahı'
      ),
      icon: Scissors,
      color: 'text-amber-400',
      custom: isCustomAsset(bindings.hairAssetId),
    },
    {
      label: 'Kıyafet',
      value: getActiveAssetName(bindings.clothingAssetId, appearance.clothing?.outfit || 'Mevcut kıyafet'),
      detail: getActiveAssetDetail(
        bindings.clothingAssetId,
        appearance.clothing?.style || 'Yönetici Üniforması'
      ),
      icon: Shirt,
      color: 'text-emerald-400',
      custom: isCustomAsset(bindings.clothingAssetId),
    },
    {
      label: 'Aksesuar',
      value: getActiveAssetName(bindings.accessoryAssetId, appearance.accessories?.item || 'Yok'),
      detail: getActiveAssetDetail(
        bindings.accessoryAssetId,
        appearance.accessories?.item !== 'Yok' && appearance.accessories?.item !== ''
          ? 'Aktif Modül'
          : 'Bağlı donanım yok'
      ),
      icon: Sparkles,
      color: 'text-purple-400',
      custom: isCustomAsset(bindings.accessoryAssetId),
    },
  ];


  return (
    <aside className="w-full md:w-80 lg:w-88 h-full bg-zinc-950 border-l border-zinc-800/80 flex flex-col select-none overflow-hidden shrink-0">
      {/* Panel Başlığı */}
      <div className="p-4 sm:p-5 border-b border-zinc-800/80 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono font-bold tracking-widest text-zinc-100 uppercase">
            GÖRÜNÜM ÖZETİ
          </h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/60 text-indigo-300">
            5 KATMAN
          </span>
        </div>
        <p className="text-xs text-zinc-400 mt-1">
          Seçilen fiziksel özelliklerin özeti
        </p>
      </div>

      {/* Özellik Listesi */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {summaryItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <div
              key={index}
              className={`p-3.5 rounded-lg border transition-colors space-y-1.5 ${
                item.custom
                  ? 'border-indigo-800/60 bg-indigo-950/20 hover:bg-indigo-950/30'
                  : 'border-zinc-850 bg-zinc-900/40 hover:bg-zinc-900/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-zinc-800/80 text-zinc-300">
                    <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                  </div>
                  <span className="text-xs font-mono font-medium text-zinc-300">
                    {item.label}
                  </span>
                </div>
                {item.custom ? (
                  <span className="flex items-center gap-1 text-[10px] font-mono text-indigo-300 bg-indigo-900/50 border border-indigo-700/50 px-1.5 py-0.2 rounded">
                    <ImageIcon className="w-2.5 h-2.5" />
                    <span>Özel</span>
                  </span>
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/80" />
                )}
              </div>

              <div className="pl-6 flex items-baseline justify-between gap-2">
                <p className="text-xs font-semibold text-zinc-100 truncate">
                  {item.value}
                </p>
                <span className="text-[11px] font-mono text-zinc-400 shrink-0">
                  {item.detail}
                </span>
              </div>
            </div>
          );
        })}

        {/* Bilgilendirme Notu */}
        <div className="p-3.5 rounded-lg border border-dashed border-zinc-800/80 bg-zinc-950/40 mt-4">
          <p className="text-xs text-zinc-400 leading-relaxed font-mono">
            ◈ Yüklenen tüm görsel assetler Firebase Storage üzerinde saklanır ve Firestore ile Droit profiline kalıcı olarak bağlanır.
          </p>
        </div>
      </div>
    </aside>
  );
};

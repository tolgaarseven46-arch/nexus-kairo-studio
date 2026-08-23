import React, { useState, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Check,
  Trash2,
  Loader2,
  AlertCircle,
  RefreshCw,
  Sliders,
  Sparkles,
} from 'lucide-react';
import {
  DroitExpressionId,
  DroitExpressionAsset,
  DroitAvatarSettings,
} from '../../../types/nexus';
import {
  EXPRESSION_LIST,
  droitExpressionAssetService,
} from '../../../services/droitExpressionAssetService';
import { AvatarAdjustmentModal } from './AvatarAdjustmentModal';

interface CharacterExpressionsWorkspaceProps {
  expressionAssets: Record<DroitExpressionId, DroitExpressionAsset | null>;
  onAssetUpdated: (expressionId: DroitExpressionId, asset: DroitExpressionAsset | null) => void;
}

export const CharacterExpressionsWorkspace: React.FC<CharacterExpressionsWorkspaceProps> = ({
  expressionAssets,
  onAssetUpdated,
}) => {
  const [localAssets, setLocalAssets] = useState<
    Record<DroitExpressionId, DroitExpressionAsset | null>
  >(expressionAssets || {});
  const [uploadingExp, setUploadingExp] = useState<DroitExpressionId | null>(null);
  const [deletingExp, setDeletingExp] = useState<DroitExpressionId | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedForAdjustment, setSelectedForAdjustment] = useState<DroitExpressionId | null>(
    null
  );

  // Sync localAssets whenever parent expressionAssets prop updates
  React.useEffect(() => {
    if (expressionAssets) {
      setLocalAssets((prev) => ({
        ...prev,
        ...expressionAssets,
      }));
    }
  }, [expressionAssets]);

  // Hidden file input refs for each of the 8 cards
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleTriggerUpload = (expId: DroitExpressionId) => {
    setErrorMessage(null);
    const input = fileInputRefs.current[expId];
    if (input) {
      input.value = '';
      input.click();
    }
  };

  const handleFileChange = async (
    expId: DroitExpressionId,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate supported image formats: PNG, WEBP, JPG/JPEG
    const validFormats = ['image/png', 'image/webp', 'image/jpeg', 'image/jpg'];
    if (!validFormats.includes(file.type.toLowerCase())) {
      setErrorMessage(
        `Desteklenmeyen dosya formatı. Lütfen PNG, WEBP veya JPG/JPEG dosyası seçin.`
      );
      event.target.value = '';
      return;
    }

    // Size limit check (e.g. 15MB max)
    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage('Dosya boyutu 15MB sınırını aşamaz.');
      event.target.value = '';
      return;
    }

    try {
      console.log('[1] FILE_SELECTED');
      console.log('- file.name:', file.name);
      console.log('- file.type:', file.type);
      console.log('- file.size:', `${file.size} bytes (${Math.round(file.size / 1024)} KB)`);

      setUploadingExp(expId);
      setErrorMessage(null);

      const savedAsset = await droitExpressionAssetService.uploadExpressionAsset({
        file,
        expressionId: expId,
        characterId: 'kairo',
      });

      console.log('[STATE_UPDATE] Updating state for expression:', expId, savedAsset);

      // 1. Immediately update local state so React re-renders instantly
      setLocalAssets((prev) => ({
        ...prev,
        [expId]: savedAsset,
      }));

      // 2. Notify parent layout
      onAssetUpdated(expId, savedAsset);
    } catch (err: any) {
      console.error('[UPLOAD_ERROR]');
      console.error('- error.code:', err?.code || 'NO_CODE');
      console.error('- error.message:', err?.message || String(err));
      console.error('- error.stack:', err?.stack || 'NO_STACK');
      setErrorMessage(err?.message || 'Görsel yüklenirken bir hata oluştu.');
    } finally {
      setUploadingExp(null);
      event.target.value = '';
    }
  };

  const handleSaveAvatarSettings = async (
    expId: DroitExpressionId,
    avatarSettings: DroitAvatarSettings
  ) => {
    const existing = currentAssets[expId];
    if (!existing) return;

    try {
      await droitExpressionAssetService.saveAvatarSettings({
        expressionId: expId,
        avatarSettings,
        characterId: 'kairo',
      });

      const updatedAsset: DroitExpressionAsset = {
        ...existing,
        avatarSettings,
        updatedAt: new Date().toISOString(),
      };

      setLocalAssets((prev) => ({
        ...prev,
        [expId]: updatedAsset,
      }));

      onAssetUpdated(expId, updatedAsset);
    } catch (err: any) {
      console.error('Error saving avatar settings:', err);
      setErrorMessage('Avatar ayarları kaydedilirken hata oluştu.');
      throw err;
    }
  };

  const handleDelete = async (
    expId: DroitExpressionId,
    existingAsset: DroitExpressionAsset | null,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (!existingAsset) return;

    if (!window.confirm(`${expId} ifadesi görselini kaldırmak istediğinizden emin misiniz?`)) {
      return;
    }

    try {
      setDeletingExp(expId);
      setErrorMessage(null);
      await droitExpressionAssetService.deleteExpressionAsset(expId, existingAsset, 'kairo');

      setLocalAssets((prev) => ({
        ...prev,
        [expId]: null,
      }));

      onAssetUpdated(expId, null);
    } catch (err: any) {
      console.error('Error deleting expression asset:', err);
      setErrorMessage('Görsel silinirken bir hata oluştu.');
    } finally {
      setDeletingExp(null);
    }
  };

  // Merged state representation
  const currentAssets: Record<DroitExpressionId, DroitExpressionAsset | null> = {
    ...expressionAssets,
    ...localAssets,
  };

  // Total loaded count calculation
  const totalLoaded = EXPRESSION_LIST.filter((exp) => {
    const a = currentAssets[exp.id];
    const url = a?.downloadURL || (a as any)?.downloadUrl || (a as any)?.url;
    return Boolean(a && url);
  }).length;

  const activeModalAsset = selectedForAdjustment ? currentAssets[selectedForAdjustment] : null;
  const activeExpConfig = selectedForAdjustment
    ? EXPRESSION_LIST.find((e) => e.id === selectedForAdjustment)
    : null;

  return (
    <div className="flex-1 h-full bg-[#090b10] flex flex-col min-w-0 overflow-hidden select-none">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER (Minimal & Sade Bilgi Alanı)
         ───────────────────────────────────────────────────────────── */}
      <div className="h-14 px-6 sm:px-8 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-indigo-500" />
          <h2 className="text-xs font-mono font-bold tracking-widest text-zinc-100 uppercase">
            KARAKTER İFADELERİ
          </h2>
          <span className="text-[11px] font-mono text-zinc-500">
            // 8 YÜZ İFADESİ & AVATAR ÖNİZLEMESİ
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
            {totalLoaded} / 8 YÜKLENDİ
          </span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. HATA BİLDİRİMİ (Varsa)
         ───────────────────────────────────────────────────────────── */}
      {errorMessage && (
        <div className="px-6 py-2.5 bg-rose-950/40 border-b border-rose-800/60 flex items-center justify-between text-rose-300 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-[11px] font-mono text-rose-400 hover:text-rose-200 underline"
          >
            Kapat
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. 4 SÜTUN × 2 SATIR GRID (8 GÖRSEL KARTI)
         ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
          {EXPRESSION_LIST.map((exp, index) => {
            const asset = currentAssets[exp.id];
            const isUploading = uploadingExp === exp.id;
            const isDeleting = deletingExp === exp.id;
            const imageUrl =
              asset?.downloadURL || (asset as any)?.downloadUrl || (asset as any)?.url;
            const hasImage = Boolean(asset && imageUrl);

            const zoom = asset?.avatarSettings?.zoom ?? 1;
            const posX = asset?.avatarSettings?.positionX ?? 0;
            const posY = asset?.avatarSettings?.positionY ?? 0;

            return (
              <div
                key={exp.id}
                className={`group relative flex flex-col rounded-xl border bg-zinc-950/70 overflow-hidden transition-all duration-200 ${
                  hasImage
                    ? 'border-zinc-800 hover:border-zinc-700 shadow-sm'
                    : 'border-zinc-800/80 hover:border-zinc-700/80'
                }`}
              >
                {/* Hidden File Input for this Expression */}
                <input
                  ref={(el) => (fileInputRefs.current[exp.id] = el)}
                  type="file"
                  accept=".png,.webp,.jpg,.jpeg,image/png,image/webp,image/jpeg"
                  onChange={(e) => handleFileChange(exp.id, e)}
                  className="hidden"
                  disabled={isUploading || isDeleting}
                />

                {/* ── Visual Area ── */}
                <div
                  onClick={() => {
                    if (!hasImage) {
                      handleTriggerUpload(exp.id);
                    } else {
                      setSelectedForAdjustment(exp.id);
                    }
                  }}
                  className={`relative w-full aspect-[4/3] bg-zinc-900/50 flex flex-col items-center justify-center overflow-hidden cursor-pointer ${
                    !hasImage ? 'hover:bg-zinc-900/80' : ''
                  }`}
                >
                  {/* Durum: Yükleniyor */}
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-2 p-4 text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                      <span className="text-[11px] font-mono text-zinc-400">
                        Yükleniyor...
                      </span>
                    </div>
                  ) : hasImage && imageUrl ? (
                    /* Durum: Görsel Yüklendi */
                    <div className="relative w-full h-full overflow-hidden bg-zinc-950 flex items-center justify-center">
                      <img
                        src={imageUrl}
                        alt={exp.name}
                        className="w-full h-full object-contain transition-transform duration-200"
                        style={{
                          transform: `translate(${posX}%, ${posY}%) scale(${zoom})`,
                          transformOrigin: 'center center',
                        }}
                        onError={(e) => {
                          (e.target as HTMLElement).style.opacity = '0.7';
                        }}
                      />

                      {/* Mini Avatar Circle Badge Overlay on bottom-left */}
                      <div
                        className="absolute bottom-2 left-2 w-7 h-7 rounded-full overflow-hidden border border-indigo-500/80 shadow-md bg-zinc-950 flex items-center justify-center"
                        title="Avatar Görünümü"
                      >
                        <img
                          src={imageUrl}
                          alt="Avatar Mini"
                          className="w-full h-full object-contain"
                          style={{
                            transform: `translate(${posX}%, ${posY}%) scale(${zoom})`,
                            transformOrigin: 'center center',
                          }}
                        />
                      </div>

                      {/* Hover Controls Overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-2 backdrop-blur-[2px]">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedForAdjustment(exp.id);
                          }}
                          className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-indigo-600/90 hover:bg-indigo-600 border border-indigo-500 text-[11px] font-mono text-white transition-all shadow-md"
                          title="Önizlemeyi Düzenle"
                        >
                          <Sliders className="w-3 h-3" />
                          <span>Önizleme</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTriggerUpload(exp.id);
                          }}
                          className="p-1.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 hover:text-white transition-all shadow-md"
                          title="Görseli Değiştir"
                        >
                          <RefreshCw className="w-3 h-3" />
                        </button>

                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={(e) => handleDelete(exp.id, asset, e)}
                          className="p-1.5 rounded-lg bg-zinc-900/90 hover:bg-rose-600 border border-zinc-700 hover:border-rose-500 text-zinc-300 hover:text-white transition-all shadow-md"
                          title="Görseli Kaldır"
                        >
                          {isDeleting ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                        </button>
                      </div>

                      {/* Küçük Durum İkonu */}
                      <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-zinc-950/80 border border-zinc-800 text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" />
                      </div>
                    </div>
                  ) : (
                    /* Durum: Görsel Yok (Sade Placeholder) */
                    <div className="flex flex-col items-center justify-center p-4 text-center space-y-2">
                      <div className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-indigo-400 group-hover:border-indigo-800/80 transition-colors">
                        <Upload className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-mono font-medium text-indigo-400 group-hover:text-indigo-300">
                        [ + Görsel Yükle ]
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400">
                        PNG, WEBP, JPG
                      </span>
                    </div>
                  )}
                </div>

                {/* ── Card Footer ── */}
                <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/90 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-zinc-400 font-bold">
                        {String(index + 1).padStart(2, '0')}.
                      </span>
                      <span className="text-xs font-mono font-bold tracking-wider text-zinc-100 uppercase">
                        {exp.name}
                      </span>
                    </div>

                    {hasImage ? (
                      <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-0.5">
                        <Check className="w-2.5 h-2.5" /> Yüklendi
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-zinc-400">
                        Boş
                      </span>
                    )}
                  </div>

                  {hasImage && (
                    <div className="flex items-center justify-between pt-1.5 border-t border-zinc-900">
                      <button
                        type="button"
                        onClick={() => setSelectedForAdjustment(exp.id)}
                        className="flex-1 py-1 rounded bg-zinc-900 hover:bg-indigo-950 border border-zinc-800 hover:border-indigo-800 text-[11px] font-mono text-indigo-300 hover:text-indigo-100 flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Sliders className="w-3 h-3 text-indigo-400" />
                        <span>Önizlemeyi Düzenle</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. AVATAR & PROFİL ÖNİZLEMESİ MODAL
         ───────────────────────────────────────────────────────────── */}
      {selectedForAdjustment && activeModalAsset && activeExpConfig && (
        <AvatarAdjustmentModal
          expressionId={selectedForAdjustment}
          expressionName={activeExpConfig.name}
          asset={activeModalAsset}
          onClose={() => setSelectedForAdjustment(null)}
          onSave={handleSaveAvatarSettings}
        />
      )}
    </div>
  );
};


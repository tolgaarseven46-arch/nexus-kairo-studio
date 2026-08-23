import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  Move,
  RotateCcw,
  Check,
  Loader2,
  Sliders,
  Sparkles,
} from 'lucide-react';
import {
  DroitExpressionId,
  DroitExpressionAsset,
  DroitAvatarSettings,
} from '../../../types/nexus';

interface AvatarAdjustmentModalProps {
  expressionId: DroitExpressionId;
  expressionName: string;
  asset: DroitExpressionAsset;
  onClose: () => void;
  onSave: (expressionId: DroitExpressionId, settings: DroitAvatarSettings) => Promise<void>;
}

type PlatformTab = 'general' | 'instagram' | 'x';

export const AvatarAdjustmentModal: React.FC<AvatarAdjustmentModalProps> = ({
  expressionId,
  expressionName,
  asset,
  onClose,
  onSave,
}) => {
  const initialSettings: DroitAvatarSettings = {
    zoom: asset.avatarSettings?.zoom ?? 1,
    positionX: asset.avatarSettings?.positionX ?? 0,
    positionY: asset.avatarSettings?.positionY ?? 0,
  };

  const [settings, setSettings] = useState<DroitAvatarSettings>(initialSettings);
  const [platform, setPlatform] = useState<PlatformTab>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; startPosX: number; startPosY: number }>({
    x: 0,
    y: 0,
    startPosX: 0,
    startPosY: 0,
  });

  const imageUrl = asset.imageDataUrl || asset.downloadURL;

  // Zoom step controls
  const handleZoomChange = (delta: number) => {
    setSettings((prev) => ({
      ...prev,
      zoom: Math.min(3.0, Math.max(0.5, Number((prev.zoom + delta).toFixed(2)))),
    }));
  };

  // Position step controls
  const handlePositionXChange = (delta: number) => {
    setSettings((prev) => ({
      ...prev,
      positionX: Math.min(50, Math.max(-50, prev.positionX + delta)),
    }));
  };

  const handlePositionYChange = (delta: number) => {
    setSettings((prev) => ({
      ...prev,
      positionY: Math.min(50, Math.max(-50, prev.positionY + delta)),
    }));
  };

  const handleReset = () => {
    setSettings({
      zoom: 1,
      positionX: 0,
      positionY: 0,
    });
  };

  // Mouse / Touch Drag Handlers on Source Area
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startPosX: settings.positionX,
      startPosY: settings.positionY,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    // Convert pixel delta to percentage offset based on 240px container
    const containerSize = 240;
    const percentDeltaX = (deltaX / containerSize) * 100;
    const percentDeltaY = (deltaY / containerSize) * 100;

    const newX = Math.min(
      50,
      Math.max(-50, Math.round(dragStartRef.current.startPosX + percentDeltaX))
    );
    const newY = Math.min(
      50,
      Math.max(-50, Math.round(dragStartRef.current.startPosY + percentDeltaY))
    );

    setSettings((prev) => ({
      ...prev,
      positionX: newX,
      positionY: newY,
    }));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handleSaveClick = async () => {
    try {
      setIsSaving(true);
      await onSave(expressionId, settings);
      onClose();
    } catch (err) {
      console.error('Error saving avatar settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* ── Modal Header ── */}
        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-mono font-bold tracking-wider text-zinc-100 uppercase">
                  AVATAR & PROFİL ÖNİZLEMESİ
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/80">
                  {expressionName}
                </span>
              </div>
              <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
                Sosyal medya avatar kırpma, zoom ve güvenli alan hizalama ayarları
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            title="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Modal Body ── */}
        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
          {/* Upper Section: KAYNAK ALANI vs PROFİL ÖNİZLEMESİ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* 1. KAYNAK ALANI (Source Canvas with Circular Safe-Area Mask & Drag) */}
            <div className="flex flex-col items-center">
              <div className="w-full flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                  <Move className="w-3.5 h-3.5 text-indigo-400" />
                  KAYNAK & GÜVENLİ ALAN
                </span>
                <span className="text-[10px] font-mono text-zinc-500">
                  (Sürükleyerek Konumlandır)
                </span>
              </div>

              <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className={`relative w-[240px] h-[240px] rounded-xl border border-zinc-700/80 bg-zinc-950 overflow-hidden select-none touch-none cursor-grab active:cursor-grabbing shadow-inner flex items-center justify-center`}
              >
                {/* Source Image with Live Transform & object-contain to prevent cutting off top/head */}
                <img
                  src={imageUrl}
                  alt={expressionName}
                  draggable={false}
                  className="w-full h-full object-contain pointer-events-none transition-transform duration-75"
                  style={{
                    transform: `translate(${settings.positionX}%, ${settings.positionY}%) scale(${settings.zoom})`,
                    transformOrigin: 'center center',
                  }}
                />

                {/* Circular Safe-Area Mask Overlay (Dark outside, transparent circle inside) */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    boxShadow: '0 0 0 9999px rgba(9, 11, 16, 0.65)',
                    borderRadius: '50%',
                    width: '220px',
                    height: '220px',
                    top: '10px',
                    left: '10px',
                    border: '2px dashed rgba(99, 102, 241, 0.8)',
                  }}
                >
                  {/* Subtle Crosshair in Center */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-40">
                    <div className="w-4 h-[1px] bg-indigo-300" />
                    <div className="h-4 w-[1px] bg-indigo-300 absolute" />
                  </div>
                </div>

                {/* Badge Indicator */}
                <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-zinc-950/90 border border-zinc-800 text-[10px] font-mono text-zinc-400 backdrop-blur pointer-events-none">
                  {settings.zoom.toFixed(2)}x | {settings.positionX > 0 ? `+${settings.positionX}` : settings.positionX}%,{' '}
                  {settings.positionY > 0 ? `+${settings.positionY}` : settings.positionY}%
                </div>
              </div>
            </div>

            {/* 2. PROFİL ÖNİZLEMESİ (Live Avatar on Platforms) */}
            <div className="flex flex-col items-center">
              {/* Platform Switcher Tabs */}
              <div className="w-full flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  PROFİL ÖNİZLEMESİ
                </span>

                <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-lg border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setPlatform('general')}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
                      platform === 'general'
                        ? 'bg-zinc-800 text-zinc-100 font-bold shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Genel
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlatform('instagram')}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
                      platform === 'instagram'
                        ? 'bg-gradient-to-r from-purple-900/80 to-pink-900/80 text-pink-200 font-bold border border-pink-700/50 shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Instagram
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlatform('x')}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
                      platform === 'x'
                        ? 'bg-zinc-800 text-zinc-100 font-bold border border-zinc-700 shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    X
                  </button>
                </div>
              </div>

              {/* Platform Preview Mockup Box */}
              <div className="w-[240px] h-[240px] rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 flex flex-col items-center justify-center relative overflow-hidden shadow-md">
                {platform === 'general' && (
                  /* Genel Avatar Mockup */
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className="relative w-28 h-28 rounded-full overflow-hidden border-2 border-indigo-500/80 shadow-lg bg-zinc-950 flex items-center justify-center">
                      <img
                        src={imageUrl}
                        alt="Avatar"
                        className="w-full h-full object-contain transition-transform duration-75"
                        style={{
                          transform: `translate(${settings.positionX}%, ${settings.positionY}%) scale(${settings.zoom})`,
                          transformOrigin: 'center center',
                        }}
                      />
                    </div>
                    <div>
                      <div className="text-xs font-mono font-bold text-zinc-100">Kairo</div>
                      <div className="text-[10px] font-mono text-indigo-400">{expressionName} İfadesi</div>
                    </div>
                  </div>
                )}

                {platform === 'instagram' && (
                  /* Instagram Profile Mockup */
                  <div className="flex flex-col items-center text-center space-y-2 w-full">
                    {/* Instagram Story Gradient Ring */}
                    <div className="p-[2.5px] rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 shadow-md">
                      <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-zinc-950 bg-zinc-950 flex items-center justify-center">
                        <img
                          src={imageUrl}
                          alt="Instagram Avatar"
                          className="w-full h-full object-contain transition-transform duration-75"
                          style={{
                            transform: `translate(${settings.positionX}%, ${settings.positionY}%) scale(${settings.zoom})`,
                            transformOrigin: 'center center',
                          }}
                        />
                      </div>
                    </div>
                    <div className="w-full text-center">
                      <div className="text-[11px] font-sans font-bold text-zinc-100 flex items-center justify-center gap-1">
                        <span>kairo.nexus</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                      </div>
                      <div className="text-[9px] font-sans text-zinc-400">Yapay Zeka Karakteri</div>
                    </div>
                  </div>
                )}

                {platform === 'x' && (
                  /* X Profile Mockup */
                  <div className="flex flex-col items-center text-center space-y-2 w-full">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-zinc-700 bg-zinc-950 shadow-md flex items-center justify-center">
                      <img
                        src={imageUrl}
                        alt="X Avatar"
                        className="w-full h-full object-contain transition-transform duration-75"
                        style={{
                          transform: `translate(${settings.positionX}%, ${settings.positionY}%) scale(${settings.zoom})`,
                          transformOrigin: 'center center',
                        }}
                      />
                    </div>
                    <div>
                      <div className="text-[11px] font-sans font-bold text-zinc-100 flex items-center justify-center gap-1">
                        <span>Kairo</span>
                        <span className="text-[10px] text-zinc-500">⚡</span>
                      </div>
                      <div className="text-[10px] font-sans text-zinc-400">@kairo_droid</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── GÖRSEL KONTROLLERİ (Sliders & Steppers) ── */}
          <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60">
              <span className="text-xs font-mono font-bold text-zinc-200 flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                GÖRSEL VE KONUMLANDIRMA KONTROLLERİ
              </span>
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-indigo-300 transition-colors"
                title="Varsayılan değerlere sıfırla"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Sıfırla</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Zoom Control */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-300">
                  <span className="flex items-center gap-1">
                    <ZoomIn className="w-3 h-3 text-indigo-400" />
                    Yakınlaştırma (Zoom)
                  </span>
                  <span className="text-indigo-400 font-bold">{settings.zoom.toFixed(2)}x</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleZoomChange(-0.1)}
                    className="w-7 h-7 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center text-xs font-mono border border-zinc-700"
                  >
                    −
                  </button>
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.05"
                    value={settings.zoom}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, zoom: parseFloat(e.target.value) }))
                    }
                    className="flex-1 accent-indigo-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => handleZoomChange(0.1)}
                    className="w-7 h-7 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center text-xs font-mono border border-zinc-700"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Yatay Konum (Position X) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-300">
                  <span>Yatay Konum (X)</span>
                  <span className="text-indigo-400 font-bold">
                    {settings.positionX > 0 ? `+${settings.positionX}` : settings.positionX}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePositionXChange(-2)}
                    className="w-7 h-7 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center text-xs font-mono border border-zinc-700"
                  >
                    ←
                  </button>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    step="1"
                    value={settings.positionX}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, positionX: parseInt(e.target.value, 10) }))
                    }
                    className="flex-1 accent-indigo-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => handlePositionXChange(2)}
                    className="w-7 h-7 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center text-xs font-mono border border-zinc-700"
                  >
                    →
                  </button>
                </div>
              </div>

              {/* Dikey Konum (Position Y) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-300">
                  <span>Dikey Konum (Y)</span>
                  <span className="text-indigo-400 font-bold">
                    {settings.positionY > 0 ? `+${settings.positionY}` : settings.positionY}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePositionYChange(-2)}
                    className="w-7 h-7 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center text-xs font-mono border border-zinc-700"
                  >
                    ↑
                  </button>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    step="1"
                    value={settings.positionY}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, positionY: parseInt(e.target.value, 10) }))
                    }
                    className="flex-1 accent-indigo-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => handlePositionYChange(2)}
                    className="w-7 h-7 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center text-xs font-mono border border-zinc-700"
                  >
                    ↓
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Modal Footer ── */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between shrink-0">
          <span className="text-[11px] font-mono text-zinc-500">
            * Orijinal görsel korunur, sadece avatar kırpma koordinatları kaydedilir.
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-300 hover:text-white transition-colors"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={handleSaveClick}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-mono font-bold text-white transition-all shadow-lg shadow-indigo-600/30"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Kaydediliyor...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Ayarları Kaydet</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

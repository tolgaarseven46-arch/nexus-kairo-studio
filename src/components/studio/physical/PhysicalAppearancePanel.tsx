import React, { useState, useRef } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Upload,
  Check,
  Trash2,
  Loader2,
  AlertCircle,
  Image as ImageIcon,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  DroitPhysicalAppearance,
  DroitPhysicalAsset,
  DroitAssetCategory,
  DroitAppearanceBinding,
} from '../../../types/nexus';
import { droitPhysicalAssetService } from '../../../services/droitPhysicalAssetService';

interface PhysicalAppearancePanelProps {
  appearance: DroitPhysicalAppearance;
  physicalAssets: DroitPhysicalAsset[];
  physicalBindings: DroitAppearanceBinding;
  onSelectAsset: (category: DroitAssetCategory, asset: DroitPhysicalAsset | null) => void;
  onAssetUploaded: (newAsset: DroitPhysicalAsset) => void;
  onAssetDeleted: (deletedAssetId: string) => void;
  onChangeFallbackAppearance?: (updated: Partial<DroitPhysicalAppearance>) => void;
}

interface CategoryDefinition {
  id: DroitAssetCategory;
  name: string;
  bindingKey: keyof DroitAppearanceBinding;
  description: string;
  defaultLabel: string;
}

const CATEGORIES: CategoryDefinition[] = [
  {
    id: 'face',
    name: 'YÜZ',
    bindingKey: 'faceAssetId',
    description: 'Yüz dermal katmanı, yüz hatları ve portre assetleri',
    defaultLabel: 'Mevcut Yüz (Standart Dermis)',
  },
  {
    id: 'eyes',
    name: 'GÖZLER',
    bindingKey: 'eyesAssetId',
    description: 'Optik iris, göz rengi ve tarayıcı lens assetleri',
    defaultLabel: 'Mevcut Göz (Siyan Cyber-Optic)',
  },
  {
    id: 'hair',
    name: 'SAÇ',
    bindingKey: 'hairAssetId',
    description: 'Saç modelleri, kesim ve stil katmanları',
    defaultLabel: 'Mevcut Saç (Gece Siyahı Bob)',
  },
  {
    id: 'clothing',
    name: 'KIYAFET',
    bindingKey: 'clothingAssetId',
    description: 'Üniforma, operasyonel zırh ve gövde kaplamaları',
    defaultLabel: 'Mevcut Kıyafet (Yönetici Üniforması)',
  },
  {
    id: 'accessory',
    name: 'AKSESUAR',
    bindingKey: 'accessoryAssetId',
    description: 'Neural earpiece, sensör modülleri ve holografik rozetler',
    defaultLabel: 'Aksesuar Yok',
  },
];

export const PhysicalAppearancePanel: React.FC<PhysicalAppearancePanelProps> = ({
  appearance,
  physicalAssets,
  physicalBindings,
  onSelectAsset,
  onAssetUploaded,
  onAssetDeleted,
}) => {
  // Accordion durumları: Varsayılan olarak 'face' açık
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    face: true,
  });

  // Aktif Yükleme Modalı / Formu Durumu
  const [uploadCategory, setUploadCategory] = useState<DroitAssetCategory | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [assetName, setAssetName] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleCategory = (categoryId: string) => {
    setOpenCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const handleOpenUpload = (category: DroitAssetCategory, e: React.MouseEvent) => {
    e.stopPropagation();
    setUploadCategory(category);
    setSelectedFile(null);
    setFilePreview(null);
    setAssetName('');
    setUploadError(null);
    setUploadSuccess(false);
  };

  const handleCloseUpload = () => {
    setUploadCategory(null);
    setSelectedFile(null);
    setFilePreview(null);
    setAssetName('');
    setUploadError(null);
    setUploadSuccess(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Format doğrulaması: PNG, WEBP, JPG/JPEG
    const validTypes = ['image/png', 'image/webp', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setUploadError('Desteklenen formatlar: PNG, WEBP, JPG / JPEG');
      return;
    }

    // Maksimum dosya boyutu kontrolü (örn. 15MB)
    if (file.size > 15 * 1024 * 1024) {
      setUploadError('Dosya boyutu 15MB sınırını aşamaz.');
      return;
    }

    setSelectedFile(file);
    setUploadError(null);

    // Otomatik isim ata
    const defaultName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
    setAssetName(defaultName);

    // Önizleme oluştur
    const reader = new FileReader();
    reader.onload = () => {
      setFilePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !uploadCategory) {
      setUploadError('Lütfen bir görsel dosyası seçin.');
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);

      const newAsset = await droitPhysicalAssetService.uploadPhysicalAsset({
        file: selectedFile,
        characterId: 'kairo',
        category: uploadCategory,
        name: assetName.trim() || selectedFile.name,
      });

      setUploadSuccess(true);
      onAssetUploaded(newAsset);

      // Yüklenen yeni asset'i otomatik olarak seç
      onSelectAsset(uploadCategory, newAsset);

      // 800ms sonra modalı kapat
      setTimeout(() => {
        handleCloseUpload();
      }, 700);
    } catch (err: any) {
      console.error('Asset upload error:', err);
      setUploadError(err?.message || 'Asset yüklenirken bir hata oluştu.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAsset = async (
    asset: DroitPhysicalAsset,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (
      !window.confirm(
        `"${asset.name}" adlı asseti silmek istediğinizden emin misiniz?`
      )
    ) {
      return;
    }

    try {
      setDeletingId(asset.id);
      await droitPhysicalAssetService.deleteAsset(asset);
      onAssetDeleted(asset.id);

      // Eğer silinen asset aktifse, varsayılana dön
      const bindingKey = `${asset.category}AssetId` as keyof DroitAppearanceBinding;
      if (physicalBindings[bindingKey] === asset.id) {
        onSelectAsset(asset.category, null);
      }
    } catch (err) {
      console.error('Error deleting asset:', err);
      alert('Asset silinirken bir hata oluştu.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <aside className="w-full md:w-84 lg:w-92 h-full bg-zinc-950 border-r border-zinc-800/80 flex flex-col select-none overflow-hidden shrink-0 relative">
      {/* ─────────────────────────────────────────────────────────────
          1. PANEL BAŞLIĞI
         ───────────────────────────────────────────────────────────── */}
      <div className="p-4 sm:p-5 border-b border-zinc-800/80 shrink-0 bg-zinc-950/80 backdrop-blur">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono font-bold tracking-widest text-zinc-100 uppercase">
            FİZİKSEL GÖRÜNÜM
          </h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
            ASSET YÖNETİMİ
          </span>
        </div>
        <p className="text-xs text-zinc-400 mt-1">
          Karakterin fiziksel asset ve görsel katmanları
        </p>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. ACCORDION KATEGORİ LİSTESİ
         ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {CATEGORIES.map((category) => {
          const isOpen = !!openCategories[category.id];
          const activeAssetId = physicalBindings[category.bindingKey];
          const categoryAssets = physicalAssets.filter(
            (a) => a.category === category.id
          );
          const activeAsset = categoryAssets.find((a) => a.id === activeAssetId);

          return (
            <div
              key={category.id}
              className="border border-zinc-800/80 rounded-lg bg-zinc-900/40 overflow-hidden transition-all"
            >
              {/* Accordion Başlığı */}
              <button
                type="button"
                onClick={() => toggleCategory(category.id)}
                className="w-full flex items-center justify-between px-3.5 py-3 text-left transition-colors hover:bg-zinc-900/80 focus:outline-none"
                aria-expanded={isOpen}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold tracking-wider text-zinc-100">
                    {category.name}
                  </span>
                  {categoryAssets.length > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
                      {categoryAssets.length}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* + ASSET YÜKLE Butonu */}
                  <button
                    type="button"
                    onClick={(e) => handleOpenUpload(category.id, e)}
                    className="flex items-center gap-1 px-2 py-0.8 rounded text-[11px] font-mono font-medium text-indigo-400 hover:text-indigo-200 bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-800/50 transition-colors"
                    title={`${category.name} kategorisine yeni görsel asset yükle`}
                  >
                    <Plus className="w-3 h-3" />
                    <span>Asset Yükle</span>
                  </button>

                  <span className="text-zinc-500">
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4 text-zinc-300 transition-transform duration-200" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-zinc-500 transition-transform duration-200" />
                    )}
                  </span>
                </div>
              </button>

              {/* Accordion Açılan İçerik */}
              {isOpen && (
                <div className="px-3.5 pt-2 pb-4 border-t border-zinc-850/80 space-y-2.5 animate-in fade-in-50 duration-150">
                  {/* 1. Varsayılan (Mevcut Görünüm) Kartı */}
                  <div
                    onClick={() => onSelectAsset(category.id, null)}
                    className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                      !activeAssetId
                        ? 'border-indigo-600/80 bg-indigo-950/30 text-zinc-100 shadow-sm'
                        : 'border-zinc-800/80 bg-zinc-950/40 hover:bg-zinc-900/60 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                        <ImageIcon className="w-4 h-4 text-zinc-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">
                          {category.defaultLabel}
                        </p>
                        <p className="text-[10px] font-mono text-zinc-400">
                          Varsayılan sistem katmanı
                        </p>
                      </div>
                    </div>

                    {!activeAssetId && (
                      <span className="flex items-center gap-1 text-[11px] font-mono font-medium text-emerald-400 bg-emerald-950/50 border border-emerald-800/40 px-2 py-0.5 rounded shrink-0">
                        <Check className="w-3 h-3" />
                        <span>Aktif</span>
                      </span>
                    )}
                  </div>

                  {/* 2. Yüklenen Gerçek Assetler Listesi */}
                  {categoryAssets.map((asset) => {
                    const isSelected = activeAssetId === asset.id;
                    const isDeleting = deletingId === asset.id;

                    return (
                      <div
                        key={asset.id}
                        onClick={() => onSelectAsset(category.id, asset)}
                        className={`group relative flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-indigo-600/90 bg-indigo-950/40 text-zinc-100 shadow-sm'
                            : 'border-zinc-800/80 bg-zinc-950/50 hover:bg-zinc-900/70 text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Asset Thumbnail */}
                          <div className="w-10 h-10 rounded bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                            {asset.downloadURL ? (
                              <img
                                src={asset.downloadURL}
                                alt={asset.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // Fallback icon if image fails
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <ImageIcon className="w-4 h-4 text-zinc-500" />
                            )}
                          </div>

                          {/* Asset İsim ve Detay */}
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate text-zinc-100">
                              {asset.name}
                            </p>
                            <p className="text-[10px] font-mono text-zinc-400">
                              {new Date(asset.createdAt).toLocaleDateString('tr-TR', {
                                day: '2-digit',
                                month: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>

                        {/* Sağ Eylemler: Aktif Rozeti + Silme */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isSelected ? (
                            <span className="flex items-center gap-1 text-[11px] font-mono font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded">
                              <Check className="w-3 h-3" />
                              <span>Aktif</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectAsset(category.id, asset);
                              }}
                              className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                            >
                              Seç
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={(e) => handleDeleteAsset(asset, e)}
                            className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 opacity-0 group-hover:opacity-100 transition-all"
                            title="Asseti sil"
                          >
                            {isDeleting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Kategori Boş Durum Bilgisi */}
                  {categoryAssets.length === 0 && (
                    <div className="py-2 text-center">
                      <p className="text-[11px] font-mono text-zinc-500">
                        Henüz özel asset yüklenmedi.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. ASSET YÜKLEME MODAL / POPUP DIALOG
         ───────────────────────────────────────────────────────────── */}
      {uploadCategory && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-5 space-y-4">
            {/* Modal Başlığı */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-xs font-mono font-bold tracking-widest text-zinc-100 uppercase">
                  ASSET YÜKLE // {uploadCategory.toUpperCase()}
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  PNG, WEBP veya JPG dosyası seçin
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseUpload}
                disabled={isUploading}
                className="p-1 text-zinc-400 hover:text-zinc-200 rounded hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Dosya Seçim & Önizleme Alanı */}
            <form onSubmit={handleSubmitUpload} className="space-y-3.5">
              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.webp,.jpg,.jpeg,image/png,image/webp,image/jpeg"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isUploading}
              />

              {!filePreview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-zinc-700/80 hover:border-indigo-500/80 bg-zinc-950/60 hover:bg-zinc-950/90 rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors text-center"
                >
                  <div className="p-3 rounded-full bg-zinc-900 border border-zinc-800 text-indigo-400">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-zinc-200">
                      Görsel seçmek için tıklayın
                    </p>
                    <p className="text-[10px] font-mono text-zinc-400 mt-0.5">
                      PNG, WEBP, JPG (Max 15MB)
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative w-full h-36 rounded-lg bg-zinc-950 border border-zinc-800 overflow-hidden flex items-center justify-center p-2">
                    <img
                      src={filePreview}
                      alt="Önizleme"
                      className="max-w-full max-h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setFilePreview(null);
                      }}
                      className="absolute top-2 right-2 p-1 rounded-full bg-zinc-900/90 border border-zinc-700 text-zinc-300 hover:text-white"
                      title="Farklı dosya seç"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Asset İsim Girişi */}
                  <div>
                    <label className="text-[11px] font-mono text-zinc-300 block mb-1">
                      Asset Adı
                    </label>
                    <input
                      type="text"
                      value={assetName}
                      onChange={(e) => setAssetName(e.target.value)}
                      placeholder="Örn: Kairo_Face_01"
                      className="w-full text-xs font-medium bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-md px-3 py-2 focus:outline-none focus:border-indigo-500 transition-colors"
                      disabled={isUploading}
                    />
                  </div>
                </div>
              )}

              {/* Hata Bildirimi */}
              {uploadError && (
                <div className="flex items-center gap-2 p-2.5 rounded bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Başarı Bildirimi */}
              {uploadSuccess && (
                <div className="flex items-center gap-2 p-2.5 rounded bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>Asset başarıyla yüklendi ve aktifleştirildi.</span>
                </div>
              )}

              {/* Modal Eylem Butonları */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={handleCloseUpload}
                  disabled={isUploading}
                  className="px-3 py-1.5 rounded text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile || isUploading || uploadSuccess}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-medium text-white transition-all ${
                    !selectedFile || isUploading || uploadSuccess
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-500 shadow-sm'
                  }`}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Yükleniyor...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Yükle ve Bağla</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};

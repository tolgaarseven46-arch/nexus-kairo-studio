import React, { useState } from 'react';
import { Character, Race } from '../../types';
import {
  Settings,
  Database,
  Download,
  Upload,
  Radio,
  Sliders,
  Sparkles,
  Shield,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Cpu,
  Zap,
} from 'lucide-react';

interface SettingsViewProps {
  characters: Character[];
  races: Race[];
  onImportCharacters?: (importedList: Character[]) => void;
  onClearAllCache?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  characters,
  races,
  onImportCharacters,
  onClearAllCache,
}) => {
  const [audioFeedback, setAudioFeedback] = useState(true);
  const [matrixScanlines, setMatrixScanlines] = useState(true);
  const [autoSaveTelemetry, setAutoSaveTelemetry] = useState(true);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  // JSON Export of all Droits
  const handleExportJSON = () => {
    try {
      const dataStr = JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          version: '1.0',
          droitCount: characters.length,
          droits: characters,
        },
        null,
        2
      );
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NEXUS_Droits_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  // JSON Import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && Array.isArray(parsed.droits)) {
          if (onImportCharacters) {
            onImportCharacters(parsed.droits);
          }
          setImportMessage(`${parsed.droits.length} adet Droit profili başarıyla yüklendi.`);
        } else if (Array.isArray(parsed)) {
          if (onImportCharacters) {
            onImportCharacters(parsed);
          }
          setImportMessage(`${parsed.length} adet Droit profili başarıyla yüklendi.`);
        } else {
          setImportMessage('Geçersiz dosya formatı. Lütfen geçerli bir JSON yedeği yükleyin.');
        }
      } catch (err) {
        setImportMessage('JSON dosyası okunamadı veya biçimi hatalı.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      
      {/* Top Banner */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 backdrop-blur-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-mono text-zinc-100">
              ⚙️ NEXUS Sistem Ayarları & Veritabanı
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Bulut senkronizasyonu, Droit yedekleme/içe aktarma ve sistem parametreleri.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300">
          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>Sistem Sürümü: v1.0.4</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Section 1: Cloud & Firestore Status */}
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold font-mono text-zinc-200">
                Bulut Veritabanı & Firestore
              </h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              ● CANLI BAĞLANTI
            </span>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800/80 flex items-center justify-between">
              <span className="text-zinc-400">Koleksiyon Durumu:</span>
              <span className="text-zinc-200 font-semibold">characters / races</span>
            </div>

            <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800/80 flex items-center justify-between">
              <span className="text-zinc-400">Kayıtlı Droit Sayısı:</span>
              <span className="text-cyan-400 font-bold">{characters.length} Varlık</span>
            </div>

            <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800/80 flex items-center justify-between">
              <span className="text-zinc-400">Kayıtlı Irk / Şasi Türü:</span>
              <span className="text-zinc-200 font-bold">{races.length} Irk</span>
            </div>
          </div>
        </div>

        {/* Section 2: Backup & Export/Import */}
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-violet-400" />
              <h2 className="text-sm font-bold font-mono text-zinc-200">
                Droit Yedekleme & İçe Aktarma
              </h2>
            </div>
            <span className="text-[10px] font-mono text-zinc-400">JSON Portatif</span>
          </div>

          <p className="text-xs font-mono text-zinc-400">
            Tüm Droit şasilerini, kişilik matrislerini ve görev izinlerini tek bir JSON dosyası olarak dışa aktarabilir veya geri yükleyebilirsiniz.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              onClick={handleExportJSON}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-mono font-medium border border-zinc-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Droitleri Dışa Aktar (JSON)</span>
            </button>

            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-mono font-medium border border-zinc-700 transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-violet-400" />
              <span>JSON İçe Aktar</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {exportSuccess && (
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Yedek dosyası başarıyla indirildi.</span>
            </div>
          )}

          {importMessage && (
            <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>{importMessage}</span>
            </div>
          )}
        </div>

        {/* Section 3: Visual & Audio Preferences */}
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold font-mono text-zinc-200">
                Arayüz & Deneyim Tercihleri
              </h2>
            </div>
            <span className="text-[10px] font-mono text-zinc-400">Cyber HUD</span>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <label className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/80 border border-zinc-800/80 cursor-pointer">
              <div>
                <div className="text-zinc-200 font-semibold">Siber Matris Efektleri</div>
                <div className="text-zinc-500 text-[11px]">Hologram ışıması ve tarama çizgileri</div>
              </div>
              <input
                type="checkbox"
                checked={matrixScanlines}
                onChange={(e) => setMatrixScanlines(e.target.checked)}
                className="w-4 h-4 text-cyan-500 rounded border-zinc-700 bg-zinc-900 focus:ring-0"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/80 border border-zinc-800/80 cursor-pointer">
              <div>
                <div className="text-zinc-200 font-semibold">Gerçek Zamanlı Telemetri Günlüğü</div>
                <div className="text-zinc-500 text-[11px]">Droit değişikliklerinde otomatik konsol kaydı</div>
              </div>
              <input
                type="checkbox"
                checked={autoSaveTelemetry}
                onChange={(e) => setAutoSaveTelemetry(e.target.checked)}
                className="w-4 h-4 text-cyan-500 rounded border-zinc-700 bg-zinc-900 focus:ring-0"
              />
            </label>
          </div>
        </div>

        {/* Section 4: System Reset & Storage */}
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-rose-400" />
              <h2 className="text-sm font-bold font-mono text-zinc-200">
                Sistem Bakımı
              </h2>
            </div>
            <span className="text-[10px] font-mono text-rose-400">Önbellek & Reset</span>
          </div>

          <p className="text-xs font-mono text-zinc-400">
            Yerel test laboratuvarı oturumlarını veya geçici simülasyon geçmişlerini sıfırlayın.
          </p>

          <button
            onClick={() => {
              if (onClearAllCache) onClearAllCache();
              alert('Test laboratuvarı ve yerel simülasyon önbelleği temizlendi.');
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-mono font-medium transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Test Önbelleğini Sıfırla</span>
          </button>
        </div>

      </div>

    </div>
  );
};

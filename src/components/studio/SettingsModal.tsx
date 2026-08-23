import React from 'react';
import { X, Settings, Sliders, Monitor, Palette, BellRing, Check } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-indigo-950 border border-indigo-700/50 flex items-center justify-center">
              <Settings className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-100">NEXUS Studio Ayarları</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs text-zinc-300">
          {/* Çalışma Alanı Görünümü */}
          <div>
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-2">
              Çalışma Alanı Görünümü
            </span>
            <div className="space-y-2">
              <label className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 cursor-pointer hover:bg-zinc-900 transition-colors">
                <span>Holografik Izgara Arka Planı</span>
                <input type="checkbox" defaultChecked className="accent-indigo-500 rounded" />
              </label>
              <label className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 cursor-pointer hover:bg-zinc-900 transition-colors">
                <span>Otomatik Yüz İfadesi Reaktivitesi</span>
                <input type="checkbox" defaultChecked className="accent-indigo-500 rounded" />
              </label>
            </div>
          </div>

          {/* Stüdyo Renk Tonu */}
          <div>
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-2">
              Tema Vurgu Rengi
            </span>
            <div className="flex items-center gap-2">
              {[
                { name: 'Siber İndigo', color: 'bg-indigo-500' },
                { name: 'Kuantum Cyan', color: 'bg-cyan-500' },
                { name: 'Zümrüt Yeşili', color: 'bg-emerald-500' },
                { name: 'Ametist Moru', color: 'bg-purple-500' },
              ].map((theme, i) => (
                <button
                  key={i}
                  type="button"
                  className={`flex-1 p-2 rounded-lg bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 flex items-center justify-center gap-1.5 transition-all ${
                    i === 0 ? 'ring-1 ring-indigo-500 border-indigo-500/60' : ''
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${theme.color}`} />
                  <span className="text-[10px] text-zinc-300">{theme.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Bilgi Kutusu */}
          <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/50 text-[11px] text-zinc-400 leading-relaxed">
            <span className="font-semibold text-zinc-200 block mb-0.5">Droit Studio v1.0 UI Prototipi</span>
            Bu ekran, NEXUS Droit karakterlerinin parametrik ve dinamik durumlarını tek bir profesyonel çalışma alanında kişiselleştirmek için tasarlanmıştır.
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-zinc-800 bg-zinc-950/80 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
};

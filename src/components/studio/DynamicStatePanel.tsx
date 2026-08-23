import React from 'react';
import { DroitDynamicState } from '../../types/nexus';

interface DynamicStatePanelProps {
  dynamicState: DroitDynamicState;
}

interface DynamicMeterConfig {
  key: keyof Omit<DroitDynamicState, 'lastStatus' | 'lastEvent'>;
  label: string;
  barColorClass: string;
}

const DYNAMIC_STATE_METERS: DynamicMeterConfig[] = [
  {
    key: 'calmness',
    label: 'Sakinlik',
    barColorClass: 'bg-emerald-500',
  },
  {
    key: 'anger',
    label: 'Öfke',
    barColorClass: 'bg-rose-500',
  },
  {
    key: 'stress',
    label: 'Stres',
    barColorClass: 'bg-amber-500',
  },
  {
    key: 'happiness',
    label: 'Mutluluk',
    barColorClass: 'bg-cyan-500',
  },
  {
    key: 'confidence',
    label: 'Güven',
    barColorClass: 'bg-indigo-500',
  },
  {
    key: 'surprise',
    label: 'Şaşkınlık',
    barColorClass: 'bg-purple-500',
  },
];

export const DynamicStatePanel: React.FC<DynamicStatePanelProps> = ({ dynamicState }) => {
  const lastEvent = dynamicState.lastEvent || {
    eventTitle: 'Kullanıcının mesajını analiz ediyor.',
    reactionText: 'Veri akışını işliyor ve yanıt hazırlıyor.',
    deltas: [
      { label: 'Öfke', key: 'anger', value: 4 },
      { label: 'Stres', key: 'stress', value: 2 },
      { label: 'Sakinlik', key: 'calmness', value: -3 },
    ],
  };

  return (
    <aside className="w-full md:w-80 lg:w-88 h-full bg-zinc-950 border-l border-zinc-800/80 flex flex-col select-none overflow-hidden shrink-0">
      {/* Panel Başlığı */}
      <div className="p-5 border-b border-zinc-800/80 shrink-0">
        <h2 className="text-xs font-mono font-bold tracking-widest text-zinc-100 uppercase">
          DİNAMİK DURUM
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          Anlık duygu ve reaksiyonlar
        </p>
      </div>

      {/* Dinamik Metreler Listesi & Canlı Durum Detayı */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
        {/* Üst Bölüm: Anlık Değerler & Durum Çubukları */}
        <div className="space-y-3.5">
          {DYNAMIC_STATE_METERS.map((meter) => {
            const value = dynamicState[meter.key] ?? 0;

            return (
              <div key={meter.key} className="space-y-1">
                {/* İsim ve Yüzde Değeri */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-300">
                    {meter.label}
                  </span>
                  <span className="text-xs font-mono font-semibold text-zinc-400">
                    {value}%
                  </span>
                </div>

                {/* İnce Durum Çubuğu */}
                <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/60">
                  <div
                    className={`h-full rounded-full ${meter.barColorClass} transition-all duration-500 ease-out`}
                    style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* MEVCUT RUH HALİ */}
        <div className="pt-5 border-t border-zinc-800/80 space-y-2">
          <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase font-semibold block">
            MEVCUT RUH HALİ
          </span>
          <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-zinc-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span>{dynamicState.lastStatus || 'Sakin ve kontrollü'}</span>
          </div>
        </div>

        {/* SON TEPKİ */}
        <div className="pt-4 border-t border-zinc-800/80 space-y-1.5">
          <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase font-semibold block">
            SON TEPKİ
          </span>
          <p className="text-xs text-zinc-300 italic leading-relaxed">
            "{lastEvent.eventTitle}"
          </p>
        </div>

        {/* DUYGUSAL DEĞİŞİM */}
        <div className="pt-4 border-t border-zinc-800/80 space-y-2.5">
          <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase font-semibold block">
            DUYGUSAL DEĞİŞİM
          </span>

          <div className="space-y-1.5">
            {lastEvent.deltas.map((delta) => {
              const isPositive = delta.value >= 0;
              const isNegativeEmotion = delta.key === 'anger' || delta.key === 'stress';

              let colorClass = 'text-emerald-400';
              if (isNegativeEmotion) {
                colorClass = isPositive ? 'text-rose-400' : 'text-emerald-400';
              } else {
                colorClass = isPositive ? 'text-emerald-400' : 'text-rose-400';
              }

              return (
                <div
                  key={delta.label}
                  className="flex items-center justify-between py-1 px-2.5 rounded bg-zinc-900/60 border border-zinc-800/80 text-xs font-mono"
                >
                  <span className="text-zinc-400">{delta.label}</span>
                  <span className={`font-semibold ${colorClass}`}>
                    {delta.value > 0 ? `+${delta.value}` : delta.value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
};

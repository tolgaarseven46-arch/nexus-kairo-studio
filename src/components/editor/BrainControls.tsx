import React, { useState } from 'react';
import { DroitBrain } from '../../types';
import { Brain, Sliders, ShieldAlert, Cpu, Sparkles } from 'lucide-react';

export type BrainSubTab = 'personality' | 'behavior' | 'traits' | 'memory';

interface BrainControlsProps {
  brain: DroitBrain;
  onChangeBrain: (updated: Partial<DroitBrain>) => void;
}

export const BrainControls: React.FC<BrainControlsProps> = ({ brain, onChangeBrain }) => {
  const [activeSubTab, setActiveSubTab] = useState<BrainSubTab>('personality');

  const subTabs = [
    { id: 'personality' as BrainSubTab, label: 'Kişilik' },
    { id: 'behavior' as BrainSubTab, label: 'Davranış' },
    { id: 'traits' as BrainSubTab, label: 'Özellikler' },
    { id: 'memory' as BrainSubTab, label: 'Hafıza' },
  ];

  const personalityMetrics = [
    { key: 'seriousness', label: 'Ciddiyet', desc: 'Resmiyet ve odaklanma' },
    { key: 'humor', label: 'Mizah Anlayışı', desc: 'İroni ve espri eğilimi' },
    { key: 'curiosity', label: 'Merak Seviyesi', desc: 'Soru sorma ve araştırma' },
    { key: 'authority', label: 'Otoriterlik', desc: 'Emir verme ve liderlik' },
    { key: 'empathy', label: 'Empati Oranı', desc: 'Duygusal anlama kapasitesi' },
    { key: 'patience', label: 'Sabır Eşiği', desc: 'Tekrarlara ve streslere dayanıklılık' },
  ];

  const handleScoreChange = (metricKey: string, val: number) => {
    onChangeBrain({
      personalityScores: {
        ...(brain.personalityScores || {}),
        [metricKey]: val,
      },
    });
  };

  const handleResponseChange = (trigger: string, response: string) => {
    onChangeBrain({
      situationalResponses: {
        ...(brain.situationalResponses || {}),
        [trigger]: response,
      },
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Sub-Tabs Bar */}
      <div className="flex items-center gap-1.5 px-4 py-2 border-b border-zinc-800/80 bg-zinc-950/60 overflow-x-auto">
        {subTabs.map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-3 py-1 rounded-md text-xs font-mono font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
              }`}
            >
              [ {tab.label} ]
            </button>
          );
        })}
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 p-4 overflow-y-auto">
        {/* 1. KİŞİLİK (Personality) */}
        {activeSubTab === 'personality' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
            {personalityMetrics.map((m) => {
              const val = (brain.personalityScores as any)?.[m.key] ?? 50;
              return (
                <div key={m.key} className="space-y-1 bg-zinc-900/50 border border-zinc-800/80 rounded-lg p-2.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-200 font-semibold">{m.label}</span>
                    <span className="text-violet-400 font-bold">{val}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={val}
                    onChange={(e) => handleScoreChange(m.key, Number(e.target.value))}
                    className="w-full accent-violet-400 bg-zinc-900 cursor-pointer h-1.5"
                  />
                  <div className="text-[10px] font-mono text-zinc-400">{m.desc}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* 2. DAVRANIŞ (Behavior / Situational Responses) */}
        {activeSubTab === 'behavior' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-zinc-400 uppercase">Çatışma / Anlaşmazlık Tepkisi</label>
              <select
                value={brain.situationalResponses?.conflict || 'Mantıksal Çözümleme'}
                onChange={(e) => handleResponseChange('conflict', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 focus:outline-hidden focus:border-violet-500"
              >
                <option value="Mantıksal Çözümleme">Mantıksal Çözümleme</option>
                <option value="Sert Otoriter Karşıtlık">Sert Otoriter Karşıtlık</option>
                <option value="Yatıştırıcı Uzlaşma">Yatıştırıcı Uzlaşma</option>
                <option value="Geri Çekilme & Raporlama">Geri Çekilme & Raporlama</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-zinc-400 uppercase">Hakaret / Saygısızlık Tepkisi</label>
              <select
                value={brain.situationalResponses?.insult || 'Soğuk Uyarı'}
                onChange={(e) => handleResponseChange('insult', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 focus:outline-hidden focus:border-violet-500"
              >
                <option value="Soğuk Uyarı">Soğuk & Net Uyarı</option>
                <option value="İğneleyici Nükte">İğneleyici Nükte</option>
                <option value="Tamamen Görmezden Gelme">Tamamen Görmezden Gelme</option>
                <option value="İletişimi Sonlandırma">İletişimi Sonlandırma</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-zinc-400 uppercase">Şaka / Mizah Tepkisi</label>
              <select
                value={brain.situationalResponses?.joke || 'Zekice Karşılık'}
                onChange={(e) => handleResponseChange('joke', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 focus:outline-hidden focus:border-violet-500"
              >
                <option value="Zekice Karşılık">Zekice & İnce Karşılık</option>
                <option value="Hafif Tebessüm">Hafif Tebessüm & Kabul</option>
                <option value="Ciddiyete Davet">Ciddiyete Davet</option>
                <option value="Mizahı Analiz Etme">Mizahı Analiz Etme</option>
              </select>
            </div>
          </div>
        )}

        {/* 3. ÖZELLİKLER (Traits & Values) */}
        {activeSubTab === 'traits' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-zinc-400 uppercase">Temel Yaşam & Karar İlkesi</label>
              <input
                type="text"
                value={brain.coreDirective || 'Mantık ve görev sadakati her şeyin önündedir.'}
                onChange={(e) => onChangeBrain({ coreDirective: e.target.value })}
                placeholder="Temel direktif girin..."
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 focus:outline-hidden focus:border-violet-500"
              />
              <span className="text-[10px] font-mono text-zinc-400">Droit'in tüm karar alma algoritmalarını filtreleyen ana direktif.</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-zinc-400 uppercase">Konuşma & İletişim Tonu</label>
              <select
                value={brain.speakingTone || 'Resmi ve Saygılı'}
                onChange={(e) => onChangeBrain({ speakingTone: e.target.value })}
                className="w-full px-2.5 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 focus:outline-hidden focus:border-violet-500"
              >
                <option value="Resmi ve Saygılı">Resmi ve Saygılı (Askeri / Kurumsal)</option>
                <option value="Doğal ve Dostane">Doğal ve Dostane (Yoldaş)</option>
                <option value="Gizemli ve Özlü">Gizemli ve Özlü (Az ve Öz Sözler)</option>
                <option value="Analitik ve Soğukkanlı">Analitik ve Soğukkanlı (Mekanik)</option>
              </select>
            </div>
          </div>
        )}

        {/* 4. HAFIZA (Memory) */}
        {activeSubTab === 'memory' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-zinc-400 uppercase">Hafıza Derinliği</label>
              <select
                value={brain.memoryDepth || 'Epizodik Bellek'}
                onChange={(e) => onChangeBrain({ memoryDepth: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 focus:outline-hidden focus:border-violet-500"
              >
                <option value="Epizodik Bellek">Epizodik Bellek (Geçmiş Olayları Hatırlar)</option>
                <option value="Yalnızca Oturum İçi">Yalnızca Oturum İçi (Geçici)</option>
                <option value="Kritik Olay Hafızası">Kritik Olay Hafızası (Sadece Önemli Veriler)</option>
                <option value="Kalıcı & Sınırsız">Kalıcı & Sınırsız Kayıt</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-zinc-400 uppercase">Öğrenme & Adaptasyon Hızı</label>
              <select
                value={brain.adaptationSpeed || 'Dengeli Adaptasyon'}
                onChange={(e) => onChangeBrain({ adaptationSpeed: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 focus:outline-hidden focus:border-violet-500"
              >
                <option value="Dengeli Adaptasyon">Dengeli Adaptasyon</option>
                <option value="Hızlı Öğrenen">Hızlı Öğrenen (Yüksek Esneklik)</option>
                <option value="Katı Kurallı">Katı Kurallı (Değişmez Şablonlar)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-zinc-400 uppercase">Kişisel Sır / Gizlilik Saklama</label>
              <select
                value={brain.confidentialityLevel || 'Maksimum Güvenlik'}
                onChange={(e) => onChangeBrain({ confidentialityLevel: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 focus:outline-hidden focus:border-violet-500"
              >
                <option value="Maksimum Güvenlik">Maksimum Güvenlik (Asla Sızdırmaz)</option>
                <option value="Standart Gizlilik">Standart Gizlilik</option>
                <option value="Açık Bilgi Paylaşımı">Açık Bilgi Paylaşımı</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

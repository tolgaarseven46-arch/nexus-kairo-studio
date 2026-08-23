import React, { useState } from 'react';
import { DroitMission } from '../../types';
import { Shield, Lock, CheckSquare, Target, Award, ListPlus } from 'lucide-react';

export type MissionSubTab = 'category' | 'role' | 'permissions' | 'tasks';

interface MissionControlsProps {
  mission: DroitMission;
  onChangeMission: (updated: Partial<DroitMission>) => void;
}

export const MissionControls: React.FC<MissionControlsProps> = ({
  mission,
  onChangeMission,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<MissionSubTab>('category');
  const [newTaskInput, setNewTaskInput] = useState('');

  const subTabs = [
    { id: 'category' as MissionSubTab, label: 'Kategori' },
    { id: 'role' as MissionSubTab, label: 'Rol' },
    { id: 'permissions' as MissionSubTab, label: 'Yetkiler' },
    { id: 'tasks' as MissionSubTab, label: 'Görevler' },
  ];

  const operationalCategories = [
    { id: 'Savunma & Güvenlik', desc: 'Taktik koruma ve siber güvenlik devriyesi' },
    { id: 'Keşif & İstihbarat', desc: 'Bilinmeyen sektör haritalama ve veri toplama' },
    { id: 'Lojistik & İkmal', desc: 'Kaynak optimizasyonu ve kargo yönetimi' },
    { id: 'Mühendislik & Onarım', desc: 'Donanım bakımı, çekirdek onarımı ve üretim' },
    { id: 'Tıbbi & Biyo-Destek', desc: 'Biyolojik ve sentetik varlık kurtarma' },
    { id: 'Diplomasi & İdari', desc: 'Protokol yönetimi ve müzakere koordinasyonu' },
  ];

  const handleTogglePermission = (perm: string) => {
    const current = mission.accessPermissions || [];
    if (current.includes(perm)) {
      onChangeMission({ accessPermissions: current.filter((p) => p !== perm) });
    } else {
      onChangeMission({ accessPermissions: [...current, perm] });
    }
  };

  const handleAddTask = () => {
    if (!newTaskInput.trim()) return;
    const current = mission.primaryTasks || [];
    onChangeMission({ primaryTasks: [...current, newTaskInput.trim()] });
    setNewTaskInput('');
  };

  const handleRemoveTask = (index: number) => {
    const current = mission.primaryTasks || [];
    onChangeMission({ primaryTasks: current.filter((_, i) => i !== index) });
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
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
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
        {/* 1. KATEGORİ (Category) */}
        {activeSubTab === 'category' && (
          <div className="space-y-3">
            <span className="text-[11px] font-mono text-zinc-400 uppercase block">Operasyonel Kategori Seçimi</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {operationalCategories.map((cat) => {
                const isSelected = mission.category === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => onChangeMission({ category: cat.id })}
                    className={`p-3 rounded-lg border text-left transition-all font-mono ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/60 text-amber-200 shadow-sm'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                    }`}
                  >
                    <div className="text-xs font-bold truncate">{cat.id}</div>
                    <div className="text-[9px] text-zinc-400 mt-1 line-clamp-2">{cat.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. ROL (Role) */}
        {activeSubTab === 'role' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-zinc-400 uppercase">Rol / Unvan</label>
              <input
                type="text"
                value={mission.roleTitle || 'Siber Muhafız'}
                onChange={(e) => onChangeMission({ roleTitle: e.target.value })}
                placeholder="Örn: Baş Mühendis, Devriye Lideri..."
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-zinc-400 uppercase">Hiyerarşik Kademe</label>
              <select
                value={mission.hierarchyLevel || 'Seviye 2 - Operatör'}
                onChange={(e) => onChangeMission({ hierarchyLevel: e.target.value })}
                className="w-full px-2.5 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 focus:outline-hidden focus:border-amber-500"
              >
                <option value="Seviye 1 - Çaylak Droit">Seviye 1 - Çaylak Droit</option>
                <option value="Seviye 2 - Operatör">Seviye 2 - Operatör</option>
                <option value="Seviye 3 - Kıdemli Uzman">Seviye 3 - Kıdemli Uzman</option>
                <option value="Seviye 4 - Filo Komutanı">Seviye 4 - Filo Komutanı</option>
                <option value="Seviye 5 - Nexus Konseyi Elçisi">Seviye 5 - Nexus Konseyi Elçisi</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-zinc-400 uppercase">Operasyon Bölgesi</label>
              <select
                value={mission.deploymentZone || 'Sektör 7 - Neo Ark'}
                onChange={(e) => onChangeMission({ deploymentZone: e.target.value })}
                className="w-full px-2.5 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 focus:outline-hidden focus:border-amber-500"
              >
                <option value="Sektör 7 - Neo Ark">Sektör 7 - Neo Ark</option>
                <option value="Derin Uzay İstasyonu">Derin Uzay İstasyonu</option>
                <option value="Siber Çekirdek Matrisi">Siber Çekirdek Matrisi</option>
                <option value="Bilinmeyen Dış Sınırlar">Bilinmeyen Dış Sınırlar</option>
              </select>
            </div>
          </div>
        )}

        {/* 3. YETKİLER (Permissions) */}
        {activeSubTab === 'permissions' && (
          <div className="space-y-2">
            <span className="text-[11px] font-mono text-zinc-400 uppercase block">Sistem & Ağ Erişim Yetkileri</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: 'Taktik Silah Kullanımı', desc: 'Savunma ekipmanlarını aktive etme' },
                { id: 'Güvenlik Protokolü Geçişi', desc: 'Kapı ve kilitli terminalleri açma' },
                { id: 'Doğrudan Komuta Yetkisi', desc: 'Alt Droit birimlerine emir verme' },
                { id: 'Nexus Veritabanı Okuma', desc: 'Sınıflandırılmış arşivlere erişim' },
                { id: 'Otonom Karar Alma', desc: 'İnsan onayı olmadan inisiyatif alma' },
                { id: 'Şasi Donanım Modifikasyonu', desc: 'Saha koşullarında parça değiştirme' },
              ].map((perm) => {
                const isAllowed = (mission.accessPermissions || []).includes(perm.id);
                return (
                  <button
                    key={perm.id}
                    onClick={() => handleTogglePermission(perm.id)}
                    className={`p-2.5 rounded-lg border text-left font-mono transition-all flex items-start gap-2 ${
                      isAllowed
                        ? 'bg-amber-500/15 border-amber-400 text-amber-200'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isAllowed}
                      onChange={() => {}}
                      className="mt-0.5 accent-amber-400 pointer-events-none"
                    />
                    <div>
                      <div className="text-xs font-bold leading-tight">{perm.id}</div>
                      <div className="text-[9px] text-zinc-400 mt-0.5">{perm.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. GÖREVLER (Tasks) */}
        {activeSubTab === 'tasks' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newTaskInput}
                onChange={(e) => setNewTaskInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                placeholder="Yeni birincil görev tanımı ekleyin..."
                className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 focus:outline-hidden focus:border-amber-500"
              />
              <button
                onClick={handleAddTask}
                className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-mono font-bold transition-colors"
              >
                Görev Ekle
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {(mission.primaryTasks || ['Çevre Güvenliğini Sağla', 'Siber Saldırıları Engelle']).map((task, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-200"
                >
                  <Target className="w-3.5 h-3.5 text-amber-400" />
                  <span>{task}</span>
                  <button
                    onClick={() => handleRemoveTask(i)}
                    className="ml-1 text-zinc-500 hover:text-rose-400 transition-colors"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

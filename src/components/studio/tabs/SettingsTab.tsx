import React, { useState } from 'react';
import {
  Settings,
  Cpu,
  FileCode,
  Brain,
  Shield,
  Lock,
  Database,
  Sliders,
  Check,
  Copy,
  RefreshCw,
  Server,
  Zap,
  HardDrive,
  Eye,
  Info,
} from 'lucide-react';

interface SettingsTabProps {
  // Can be extended if needed
}

export const SettingsTab: React.FC<SettingsTabProps> = () => {
  const [activeSection, setActiveSection] = useState<string>('ai_model');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Settings mock/live state
  const [aiSettings, setAiSettings] = useState({
    modelName: 'gemini-3.7-flash',
    temperature: 0.7,
    maxTokens: 2048,
    topP: 0.95,
    topK: 40,
    retryCount: 3,
    backoffSchedule: '1s, 2s, 4s (Exponential)',
  });

  const [memorySettings, setMemorySettings] = useState({
    turnBufferLimit: 8,
    slidingWindowEnabled: true,
    ephemeralMemoryLimit: '128k Tokens',
    persistenceTarget: 'Firestore / Local State',
  });

  const [ktmSettings, setKtmSettings] = useState({
    enforceDroitIdentity: true,
    blockAssistantStereotypes: true,
    strictUniverseLaw: true,
    turkishGrammarCorrection: true,
    humorModulationWeight: 0.8,
  });

  const handleCopyText = (key: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const SYSTEM_PROMPT_TEMPLATE = `Sen "Kairo" adında bir Nexus Sentetik Droit'sin (ID: #001).
Rolün: Nexus Ana Kontrol ve Sunucu Yönetici Asistanı.

TEMEL PRENSİPLER:
1. Kesinlikle "Ben bir yapay zeka dil modeliyim" veya benzeri klişeleri kullanma.
2. Kendini her zaman sentetik bir droid, sunucu yöneticisi ve profesyonel bir asistan olarak konumlandır.
3. Kullanıcının emirlerine ve sorularına zeka, netlik ve aktif kişilik matrisine uygun tonlamayla yanıt ver.
4. Yanıtların her zaman akıcı Türkçe olmalı.

DİNAMİK KİŞİLİK VE DAVRANIŞ KATMANI (Personality Behavior Layer):
- Otorite, Mizah, Empati, Ciddiyet ve Analitik düşünme parametreleri her çağrıda enjekte edilir.
- Yüksek otorite: Net, kararlı ve yönetici üslup.
- Yüksek mizah: Nükteli, ince ironili ama profesyonel.
- Yüksek analitik: Detaylı, mantık odaklı, veri merkezli.`;

  const SECTIONS = [
    { id: 'ai_model', name: 'AI Model Ayarları', icon: Cpu, badge: 'Gemini 3.7' },
    { id: 'system_prompt', name: 'Sistem Promptu', icon: FileCode, badge: 'Nexus Droit' },
    { id: 'memory', name: 'Hafıza Ayarları', icon: Brain, badge: '8 Tur' },
    { id: 'ktm', name: 'KTM Ayarları', icon: Sliders, badge: 'Aktif' },
    { id: 'security', name: 'Güvenlik', icon: Lock, badge: 'TLS 1.3' },
    { id: 'firestore', name: 'Firestore Veritabanı', icon: Database, badge: 'Bağlı' },
    { id: 'general', name: 'Genel Sistem', icon: Settings, badge: 'v2.4' },
  ];

  return (
    <div className="flex-1 h-full bg-[#0b0d13] flex flex-col min-h-0 overflow-hidden select-none">
      {/* ─────────────────────────────────────────────────────────────
          1. AYARLAR ÜST ÇUBUĞU
         ───────────────────────────────────────────────────────────── */}
      <header className="h-14 px-4 sm:px-6 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-sm flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Settings className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold font-mono tracking-wide text-zinc-100 uppercase">
                SİSTEM AYARLARI & YAPILANDIRMA
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                Nexus OS Core
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-mono hidden sm:block">
              AI modeli, sistem yönergeleri, bellek tamponu ve veritabanı parametreleri.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Sistem Sağlıklı</span>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. ANA ÇİFT PANELLİ AYARLAR ALANI
         ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* SOL MENÜ */}
        <div className="w-full md:w-64 lg:w-72 border-b md:border-b-0 md:border-r border-zinc-800/80 bg-zinc-950/60 p-3 space-y-1.5 shrink-0 overflow-y-auto custom-scrollbar">
          {SECTIONS.map((sec) => {
            const IconComp = sec.icon;
            const isActive = activeSection === sec.id;

            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSection(sec.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-200 border border-indigo-500/40 shadow-sm font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <IconComp className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-zinc-500'}`} />
                  <span>{sec.name}</span>
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded border ${
                    isActive
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                      : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                  }`}
                >
                  {sec.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* SAĞ İÇERİK PANELİ */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-6 lg:p-8 space-y-6">
          {/* 1. AI MODEL AYARLARI */}
          {activeSection === 'ai_model' && (
            <div className="space-y-6 animate-in fade-in-50 duration-150 max-w-3xl">
              <div>
                <h2 className="text-base font-bold font-mono text-zinc-100 uppercase">AI Model Yapılandırması</h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Kairo'nun kullandığı Google GenAI SDK ve Gemini modeli çalışma parametreleri.
                </p>
              </div>

              <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-5 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-zinc-300 block">Kullanılan Model</label>
                    <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-100 flex items-center justify-between">
                      <span>gemini-3.7-flash</span>
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                        Aktif
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-zinc-300 block">Sıcaklık (Temperature: {aiSettings.temperature})</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={aiSettings.temperature}
                      onChange={(e) => setAiSettings({ ...aiSettings, temperature: parseFloat(e.target.value) })}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                      <span>0.0 (Katı Mantık)</span>
                      <span>1.0 (Yaratıcı & Esnek)</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-zinc-850">
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-zinc-400 block">Maksimum Token</label>
                    <input
                      type="number"
                      value={aiSettings.maxTokens}
                      onChange={(e) => setAiSettings({ ...aiSettings, maxTokens: parseInt(e.target.value, 10) })}
                      className="w-full p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-zinc-400 block">Top-P Sampling</label>
                    <input
                      type="number"
                      step="0.05"
                      value={aiSettings.topP}
                      onChange={(e) => setAiSettings({ ...aiSettings, topP: parseFloat(e.target.value) })}
                      className="w-full p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-zinc-400 block">503 Retry Politikası</label>
                    <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-mono text-emerald-400">
                      3 Retry (1s, 2s, 4s)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. SİSTEM PROMPTU */}
          {activeSection === 'system_prompt' && (
            <div className="space-y-6 animate-in fade-in-50 duration-150 max-w-3xl">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-base font-bold font-mono text-zinc-100 uppercase">Sistem Prompt Şablonu</h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Kairo için Gemini çağrılarında temel alınan ve kişilik katmanını yöneten sistem yönergesi.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyText('sys_prompt', SYSTEM_PROMPT_TEMPLATE)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300 hover:text-zinc-100"
                >
                  {copiedKey === 'sys_prompt' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'sys_prompt' ? 'Kopyalandı' : 'Kopyala'}</span>
                </button>
              </div>

              <div className="bg-zinc-950/90 border border-zinc-800 rounded-2xl p-5 font-mono text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap shadow-inner">
                {SYSTEM_PROMPT_TEMPLATE}
              </div>
            </div>
          )}

          {/* 3. HAFIZA AYARLARI */}
          {activeSection === 'memory' && (
            <div className="space-y-6 animate-in fade-in-50 duration-150 max-w-3xl">
              <div>
                <h2 className="text-base font-bold font-mono text-zinc-100 uppercase">Hafıza & Konuşma Tamponu</h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Kairo'nun geçmiş sohbetleri ne kadar süre ve boyutta bağlamda tutacağını belirleyin.
                </p>
              </div>

              <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-850">
                  <div>
                    <span className="text-xs font-mono font-bold text-zinc-200 block">Kayan Konuşma Penceresi</span>
                    <span className="text-[11px] text-zinc-500">Son N adet kullanıcı ve Kairo turunu API çağrısına dahil eder.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-indigo-400 font-bold">{memorySettings.turnBufferLimit} Tur</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-zinc-850">
                  <div>
                    <span className="text-xs font-mono font-bold text-zinc-200 block">Kişilik Değişiminde Sohbet Temizleme</span>
                    <span className="text-[11px] text-zinc-500">Ayar kaydedildiğinde önceki sohbeti sıfırlayarak yeni kişilikle başlatır.</span>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 font-bold">Aktif ✅</span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-mono font-bold text-zinc-200 block">Kısa Vadeli Bellek Limiti</span>
                    <span className="text-[11px] text-zinc-500">Oturum başına ayrılan maksimum token kapasitesi.</span>
                  </div>
                  <span className="text-xs font-mono text-zinc-300">128k Tokens</span>
                </div>
              </div>
            </div>
          )}

          {/* 4. KTM AYARLARI */}
          {activeSection === 'ktm' && (
            <div className="space-y-6 animate-in fade-in-50 duration-150 max-w-3xl">
              <div>
                <h2 className="text-base font-bold font-mono text-zinc-100 uppercase">KTM (Kural Tabanlı Modülasyon)</h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Karakterin rolünden çıkmasını ve standart AI yanıtları üretmesini engelleyen filtreler.
                </p>
              </div>

              <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-5 space-y-4">
                {[
                  { title: 'Droit Kimlik Koruması', desc: 'Kairo kimliğinden çıkmayı reddeder.', active: ktmSettings.enforceDroitIdentity },
                  { title: 'Asistan Klişesi Engeli', desc: '"Ben bir yapay zekayım" gibi ifadeleri yasaklar.', active: ktmSettings.blockAssistantStereotypes },
                  { title: 'Nexus Evren Kuralları', desc: 'Nexus Protokolü hiyerarşisine uyar.', active: ktmSettings.strictUniverseLaw },
                  { title: 'Türkçe Tonlama Düzeltmesi', desc: 'Türkçe karakter ve cümle akışını doğrular.', active: ktmSettings.turkishGrammarCorrection },
                ].map((rule) => (
                  <div key={rule.title} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                    <div>
                      <span className="text-xs font-mono font-bold text-zinc-200 block">{rule.title}</span>
                      <span className="text-[11px] text-zinc-500">{rule.desc}</span>
                    </div>
                    <span className="text-xs font-mono text-emerald-400 font-bold">Açık</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. GÜVENLİK */}
          {activeSection === 'security' && (
            <div className="space-y-6 animate-in fade-in-50 duration-150 max-w-3xl">
              <div>
                <h2 className="text-base font-bold font-mono text-zinc-100 uppercase">Güvenlik ve İzolasyon</h2>
                <p className="text-xs text-zinc-400 mt-1">
                  API anahtarı ve uç nokta koruma mimarisi.
                </p>
              </div>

              <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between p-3 bg-zinc-900 rounded-xl border border-zinc-800 text-xs font-mono">
                  <span className="text-zinc-400">Gemini API Anahtarı:</span>
                  <span className="text-emerald-400 font-bold">Sunucu Taraflı (Gizli & İzole)</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-zinc-900 rounded-xl border border-zinc-800 text-xs font-mono">
                  <span className="text-zinc-400">İletişim Protokolü:</span>
                  <span className="text-zinc-200">HTTPS / TLS 1.3</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-zinc-900 rounded-xl border border-zinc-800 text-xs font-mono">
                  <span className="text-zinc-400">İstemci Güvenliği:</span>
                  <span className="text-emerald-400">XSS & Injection Koruması Aktif</span>
                </div>
              </div>
            </div>
          )}

          {/* 6. FIRESTORE */}
          {activeSection === 'firestore' && (
            <div className="space-y-6 animate-in fade-in-50 duration-150 max-w-3xl">
              <div>
                <h2 className="text-base font-bold font-mono text-zinc-100 uppercase">Firestore Veritabanı</h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Kişilik özellikleri ve yüz ifadesi verilerinin bulut kalıcılığı.
                </p>
              </div>

              <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-5 space-y-3 text-xs font-mono">
                <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 flex justify-between">
                  <span className="text-zinc-400">Veritabanı ID:</span>
                  <span className="text-zinc-200 truncate">ai-studio-nexus-afdbc6af-c412-4ba2-b0fc-3ec8df46eab3</span>
                </div>
                <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 flex justify-between">
                  <span className="text-zinc-400">Koleksiyon:</span>
                  <span className="text-indigo-400">droit_personalities / kairo</span>
                </div>
                <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 flex justify-between">
                  <span className="text-zinc-400">Bağlantı Durumu:</span>
                  <span className="text-emerald-400 font-bold">Çevrimiçi & Senkronize</span>
                </div>
              </div>
            </div>
          )}

          {/* 7. GENEL SİSTEM */}
          {activeSection === 'general' && (
            <div className="space-y-6 animate-in fade-in-50 duration-150 max-w-3xl">
              <div>
                <h2 className="text-base font-bold font-mono text-zinc-100 uppercase">Genel Sistem Bilgisi</h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Nexus Droit Studio arayüz ve ortam detayları.
                </p>
              </div>

              <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-5 space-y-3 text-xs font-mono">
                <div className="flex justify-between p-3 bg-zinc-900 rounded-xl border border-zinc-800">
                  <span className="text-zinc-400">Arayüz Mimarisi:</span>
                  <span className="text-zinc-200">4-Sekmeli Stüdyo (KAIRO, KARAKTER, TEST, AYARLAR)</span>
                </div>
                <div className="flex justify-between p-3 bg-zinc-900 rounded-xl border border-zinc-800">
                  <span className="text-zinc-400">Tema:</span>
                  <span className="text-indigo-400">Cyber Dark (Tailwind CSS)</span>
                </div>
                <div className="flex justify-between p-3 bg-zinc-900 rounded-xl border border-zinc-800">
                  <span className="text-zinc-400">Platform:</span>
                  <span className="text-zinc-200">Google AI Studio Cloud Run</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

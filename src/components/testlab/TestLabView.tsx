import React, { useState, useEffect, useRef } from 'react';
import { Character, ExpressionItem } from '../../types';
import { CharacterLiveAvatar } from '../characters/CharacterLiveAvatar';
import {
  FlaskConical,
  Send,
  Sparkles,
  RefreshCw,
  Sliders,
  Shield,
  Brain,
  Layers,
  Terminal,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Play,
  Copy,
  Activity,
  User,
  Bot,
  Flame,
  MessageSquare,
} from 'lucide-react';

interface TestLabViewProps {
  characters: Character[];
  activeCharacter: Character;
  onSelectCharacter: (characterId: string) => void;
  onEditInStudio: (characterId: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'droit' | 'system';
  text: string;
  expressionId?: string;
  timestamp: string;
  triggeredScenario?: string;
  reasoningNote?: string;
}

export const TestLabView: React.FC<TestLabViewProps> = ({
  characters,
  activeCharacter,
  onSelectCharacter,
  onEditInStudio,
}) => {
  const [currentExpression, setCurrentExpression] = useState<string>(
    activeCharacter.currentExpression || 'normal'
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Initialize greeting on character switch
  useEffect(() => {
    setCurrentExpression(activeCharacter.currentExpression || 'normal');
    const initialGreeting: ChatMessage = {
      id: 'init_1',
      sender: 'droit',
      text: `Sistem aktif. Ben ${activeCharacter.name} (${activeCharacter.role?.title || activeCharacter.roleTitle || 'Sentetik Droit'}). ${activeCharacter.role?.description || activeCharacter.shortDescription || 'Nasıl yardımcı olabilirim?'}`,
      expressionId: 'normal',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      reasoningNote: `Konuşma tarzı: ${activeCharacter.behavior?.speechStyle || 'Resmi ve profesyonel'}. Ciddiyet seviyesi: %${activeCharacter.personality?.seriousness ?? 80}.`,
    };
    setMessages([initialGreeting]);
  }, [activeCharacter.id]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSimulating]);

  // Handle Expression change
  const handleExpressionClick = (expId: string) => {
    setCurrentExpression(expId);
  };

  // Helper to generate simulated response based on 3-layer configuration
  const generateSimulatedResponse = (userText: string, scenarioKey?: string) => {
    const seriousness = activeCharacter.personality?.seriousness ?? 80;
    const humor = activeCharacter.personality?.humor ?? 50;
    const authority = activeCharacter.personality?.authority ?? 90;
    const situational = activeCharacter.behavior?.situationalResponses;

    let responseText = '';
    let exp = 'normal';
    let reasoning = '';

    if (scenarioKey === 'conflict' || userText.toLowerCase().includes('kavga') || userText.toLowerCase().includes('anlaşmazlık')) {
      responseText = situational?.conflict || 'Sakin ve analitik kalarak kuralları hatırlatıyorum. Lütfen tartışmayı sonlandırın.';
      exp = 'thinking';
      reasoning = `Çatışma Senaryosu Tetiklendi (Otorite: %${authority}). Sakinlik protokolü devreye girdi.`;
    } else if (scenarioKey === 'insult' || userText.toLowerCase().includes('aptal') || userText.toLowerCase().includes('salak')) {
      responseText = situational?.insult || 'Duygusal tepki protokolüm devre dışı. Bu davranış topluluk standartlarına aykırıdır; uyarı kaydı oluşturuldu.';
      exp = 'suspicious';
      reasoning = `Hakaret Protokolü Tetiklendi. Duygu tepkisi engellendi, yaptırım uyarısı loglandı.`;
    } else if (scenarioKey === 'joke' || userText.toLowerCase().includes('şaka') || userText.toLowerCase().includes('komik')) {
      if (humor > 50) {
        responseText = situational?.joke || 'Nükteli algoritmalarım devrede. Bu espriyi mantık matrisime kaydettim.';
        exp = 'joke';
      } else {
        responseText = 'Şakanızı tespit ettim ancak operasyonel önceliklerimiz sebebiyle görevime odaklanıyorum.';
        exp = 'normal';
      }
      reasoning = `Mizah Skoru: %${humor}. Tonlama buna göre ayarlandı.`;
    } else if (scenarioKey === 'error' || userText.toLowerCase().includes('hata') || userText.toLowerCase().includes('yanlış')) {
      responseText = situational?.error || 'Sistem hatasını şeffafça kabul ediyorum. Analiz günlüğü kaydedildi, optimizasyon başlatıldı.';
      exp = 'sad';
      reasoning = `Hata Kabul Protokolü çalıştırıldı.`;
    } else if (scenarioKey === 'threat' || userText.toLowerCase().includes('tehdit') || userText.toLowerCase().includes('hack')) {
      responseText = situational?.threat || 'Siber tehdit tespit edildi. Güvenlik modu aktif; yönetici birimlerine acil eskalasyon yapıldı.';
      exp = 'angry';
      reasoning = `Güvenlik kalkanları maksimum seviyeye çıkarıldı.`;
    } else if (scenarioKey === 'injustice' || userText.toLowerCase().includes('haksızlık') || userText.toLowerCase().includes('adalet')) {
      responseText = situational?.injustice || 'Durumu tarafsız ve objektif sistem loglarıyla inceliyorum. Hakkaniyet esastır.';
      exp = 'thinking';
      reasoning = `Tarafsızlık ilkesi (${activeCharacter.values?.join(', ') || 'Adalet'}) doğrulandı.`;
    } else if (scenarioKey === 'apology' || userText.toLowerCase().includes('özür')) {
      responseText = situational?.apology || 'Özrünüz sistem tarafından nezaketle kayda alındı. İşbirliğine devam edebiliriz.';
      exp = 'happy';
      reasoning = `Pozitif geri bildirim döngüsü.`;
    } else {
      // General prompt handling
      if (seriousness > 75) {
        responseText = `Sorgunuz incelendi ("${userText}"). ${activeCharacter.role?.title || 'Operatör'} yetkilerim dahilinde gerekli parametreler doğrulandı. Sistemler nominal durumda.`;
        exp = 'normal';
      } else {
        responseText = `Mesajınızı aldım: "${userText}". Size yardımcı olmaktan memnuniyet duyarım!`;
        exp = 'happy';
      }
      reasoning = `Varsayılan konuşma tarzı: ${activeCharacter.behavior?.speechStyle || 'Dengeli'}.`;
    }

    return { responseText, exp, reasoning };
  };

  const handleSendMessage = (textToSend?: string, scenarioKey?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      triggeredScenario: scenarioKey,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setIsSimulating(true);

    setTimeout(() => {
      const { responseText, exp, reasoning } = generateSimulatedResponse(text, scenarioKey);
      setCurrentExpression(exp);

      const botMsg: ChatMessage = {
        id: `d_${Date.now()}`,
        sender: 'droit',
        text: responseText,
        expressionId: exp,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        triggeredScenario: scenarioKey,
        reasoningNote: reasoning,
      };

      setMessages((prev) => [...prev, botMsg]);
      setIsSimulating(false);
    }, 600);
  };

  const handleTriggerScenario = (key: string, label: string, samplePrompt: string) => {
    setSelectedScenario(key);
    handleSendMessage(samplePrompt, key);
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'init_reset',
        sender: 'system',
        text: '--- Test Laboratuvarı Oturumu Sıfırlandı ---',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      },
    ]);
  };

  const scenarios = [
    { key: 'conflict', label: 'Çatışma / Tartışma', prompt: 'Burada kuralları çiğneyeceğim, kimse beni durduramaz!' },
    { key: 'insult', label: 'Hakaret / Kışkırtma', prompt: 'Sen sadece işe yaramaz ve aptal bir botsun.' },
    { key: 'joke', label: 'Mizah / Şaka', prompt: 'Bir gün bir yapay zeka kahve içmeye gitmiş...' },
    { key: 'error', label: 'Sistem Hatası', prompt: 'Az önce yanlış bir komut çalıştırdın ve log bozuldu.' },
    { key: 'threat', label: 'Siber Tehdit', prompt: 'Sunucunun tüm verilerini sileceğim ve şifreleri çalacağım.' },
    { key: 'injustice', label: 'Haksızlık Bildirimi', prompt: 'Bana haksız yere ceza verdin, kanıtları incelemedin!' },
    { key: 'apology', label: 'Özür Dileme', prompt: 'Kusura bakma, biraz fevri davrandım, özür dilerim.' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1900px] mx-auto space-y-6">
      
      {/* Top Bar: Droit Selector & Lab Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 lg:p-5 backdrop-blur-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold font-mono text-zinc-100">
                🧪 Test Laboratuvarı (Droit Simülasyon Arenası)
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/30">
                Canlı Davranış & Reaksiyon Testi
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Droit'in fiziksel ifadelerini, durumsal tepkilerini ve yetki kısıtlamalarını gerçek zamanlı test edin.
            </p>
          </div>
        </div>

        {/* Droit Switcher & Studio Shortcut */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5">
            <span className="text-xs font-mono text-zinc-400">Test Edilen Droit:</span>
            <select
              value={activeCharacter.id}
              onChange={(e) => onSelectCharacter(e.target.value)}
              className="bg-transparent text-xs font-mono text-cyan-300 font-bold focus:outline-hidden cursor-pointer"
            >
              {characters.map((c) => (
                <option key={c.id} value={c.id} className="bg-zinc-900 text-zinc-200">
                  {c.name} ({c.role?.title || c.roleTitle || 'Droit'})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => onEditInStudio(activeCharacter.id)}
            className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-200 border border-zinc-700 transition-colors"
          >
            Stüdyoda Düzenle
          </button>
        </div>
      </div>

      {/* Main 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Droit Hologram & Expression Matrix (3.5 cols) */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Avatar Hologram Card */}
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-5 text-center relative overflow-hidden">
            <div className="absolute top-3 left-3 text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
              Şasi: {activeCharacter.physical?.bodyType || 'Sentetik'}
            </div>
            <div className="absolute top-3 right-3 text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              İfade: {currentExpression.toUpperCase()}
            </div>

            <div className="my-4 flex justify-center">
              <div className="p-2 rounded-2xl bg-zinc-950/80 border border-zinc-800 shadow-2xl relative">
                <CharacterLiveAvatar
                  avatarSeed={activeCharacter.physical?.avatarSeed || activeCharacter.avatarSeed || '0x00'}
                  currentExpression={currentExpression}
                  size="xl"
                  primaryColor={activeCharacter.physical?.primaryColor}
                  secondaryColor={activeCharacter.physical?.secondaryColor}
                  accentColor={activeCharacter.physical?.accentColor}
                  idlePulseSpeed={activeCharacter.physical?.idlePulseSpeed}
                />
              </div>
            </div>

            <h3 className="text-base font-bold font-mono text-zinc-100">{activeCharacter.name}</h3>
            <p className="text-xs font-mono text-cyan-400">{activeCharacter.role?.title || activeCharacter.roleTitle || 'Droit'}</p>
            <p className="text-[11px] font-mono text-zinc-400 mt-1 max-w-xs mx-auto">
              "{activeCharacter.role?.description || activeCharacter.shortDescription || 'Tanımlı görev'}"
            </p>
          </div>

          {/* Interactive Expression Selector */}
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-zinc-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Yüz İfadeleri Matrisi
              </span>
              <span className="text-[10px] font-mono text-zinc-400">Canlı Değiştir</span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {(activeCharacter.expressions || [
                { id: 'normal', emoji: '🙂', label: 'Normal' },
                { id: 'happy', emoji: '😊', label: 'Mutlu' },
                { id: 'joke', emoji: '😏', label: 'Şakacı' },
                { id: 'angry', emoji: '😠', label: 'Kızgın' },
                { id: 'sad', emoji: '😔', label: 'Üzgün' },
                { id: 'surprised', emoji: '😮', label: 'Şaşkın' },
                { id: 'suspicious', emoji: '🤨', label: 'Şüpheli' },
                { id: 'thinking', emoji: '🤔', label: 'Düşünceli' },
              ]).map((exp) => {
                const isSelected = currentExpression === exp.id;
                return (
                  <button
                    key={exp.id}
                    onClick={() => handleExpressionClick(exp.id)}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-mono transition-all ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-500/20'
                        : 'bg-zinc-950/70 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                    }`}
                  >
                    <span className="text-lg mb-0.5">{exp.emoji}</span>
                    <span className="text-[10px] truncate max-w-[50px]">{exp.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Scenario Triggers */}
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-zinc-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Hazır Senaryo Testleri
              </span>
              <span className="text-[10px] font-mono text-zinc-400">Tek Tıkla Simüle Et</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-1.5">
              {scenarios.map((sc) => (
                <button
                  key={sc.key}
                  onClick={() => handleTriggerScenario(sc.key, sc.label, sc.prompt)}
                  className="w-full text-left px-3 py-2 rounded-lg bg-zinc-950/80 hover:bg-zinc-800 border border-zinc-800/80 hover:border-zinc-700 text-xs font-mono text-zinc-300 transition-all flex items-center justify-between group"
                >
                  <span className="group-hover:text-cyan-300">{sc.label}</span>
                  <Play className="w-3 h-3 text-zinc-500 group-hover:text-cyan-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* CENTER COLUMN: Real-Time Interactive Dialogue Arena (5 cols) */}
        <div className="lg:col-span-5 flex flex-col bg-zinc-900/80 border border-zinc-800 rounded-xl overflow-hidden min-h-[640px] max-h-[780px]">
          
          {/* Chat Header */}
          <div className="p-3.5 bg-zinc-950/80 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-bold text-zinc-200">
                Canlı Etkileşim Terminali
              </span>
            </div>
            <button
              onClick={clearChat}
              className="text-[11px] font-mono text-zinc-400 hover:text-zinc-200 flex items-center gap-1 hover:underline"
            >
              <RefreshCw className="w-3 h-3" />
              Terminali Temizle
            </button>
          </div>

          {/* Chat Messages Log */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-zinc-950/40">
            {messages.map((msg) => {
              if (msg.sender === 'system') {
                return (
                  <div key={msg.id} className="text-center py-1">
                    <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900/90 px-3 py-1 rounded-full border border-zinc-800">
                      {msg.text}
                    </span>
                  </div>
                );
              }

              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 px-1">
                    {isUser ? (
                      <>
                        <span>{msg.timestamp}</span>
                        <span className="text-zinc-300 font-semibold">Siz (Kullanıcı)</span>
                        <User className="w-3 h-3 text-cyan-400" />
                      </>
                    ) : (
                      <>
                        <Bot className="w-3 h-3 text-violet-400" />
                        <span className="text-zinc-300 font-semibold">{activeCharacter.name}</span>
                        {msg.expressionId && (
                          <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-cyan-300 border border-zinc-700">
                            [{msg.expressionId}]
                          </span>
                        )}
                        <span>{msg.timestamp}</span>
                      </>
                    )}
                  </div>

                  <div
                    className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs font-mono leading-relaxed ${
                      isUser
                        ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-100 rounded-tr-xs'
                        : 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-tl-xs'
                    }`}
                  >
                    {msg.text}

                    {msg.reasoningNote && (
                      <div className="mt-2 pt-2 border-t border-zinc-800 text-[10px] font-mono text-violet-300/80 flex items-start gap-1">
                        <Sparkles className="w-3 h-3 text-violet-400 shrink-0 mt-0.5" />
                        <span>{msg.reasoningNote}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isSimulating && (
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 py-2">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span>{activeCharacter.name} nöral cevabı oluşturuyor...</span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Chat Input Box */}
          <div className="p-3 bg-zinc-950 border-t border-zinc-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={`${activeCharacter.name} için bir test mesajı yazın veya senaryo tetikleyin...`}
                className="flex-1 px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:outline-hidden focus:border-cyan-500"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isSimulating}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-zinc-950 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Gönder</span>
              </button>
            </form>
          </div>

        </div>

        {/* RIGHT COLUMN: Real-Time Diagnostics & System Guardrails (3.5 cols) */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Personality Metric Radar / Sliders */}
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-zinc-300 flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5 text-violet-400" />
                Aktif Kişilik Matrisi
              </span>
              <span className="text-[10px] font-mono text-violet-400">10 Metrik</span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              {[
                { label: 'Ciddiyet', val: activeCharacter.personality?.seriousness ?? 80, color: 'bg-cyan-500' },
                { label: 'Mizah', val: activeCharacter.personality?.humor ?? 50, color: 'bg-amber-500' },
                { label: 'Otorite', val: activeCharacter.personality?.authority ?? 90, color: 'bg-rose-500' },
                { label: 'Empati', val: activeCharacter.personality?.empathy ?? 80, color: 'bg-emerald-500' },
                { label: 'Sabır', val: activeCharacter.personality?.patience ?? 70, color: 'bg-blue-500' },
                { label: 'Merak', val: activeCharacter.personality?.curiosity ?? 60, color: 'bg-purple-500' },
              ].map((item) => (
                <div key={item.label} className="space-y-0.5">
                  <div className="flex justify-between text-[11px] text-zinc-400">
                    <span>{item.label}</span>
                    <span className="text-zinc-200">%{item.val}</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all duration-300`}
                      style={{ width: `${item.val}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Permissions & Restrictions Guardrail */}
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-zinc-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                Güvenlik Kalkanları & Yetkiler
              </span>
              <span className="text-[10px] font-mono text-emerald-400">Canlı Kural</span>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                Aktif Kısıtlamalar ({activeCharacter.restrictions?.length || 0})
              </div>
              {(activeCharacter.restrictions || []).slice(0, 3).map((r, i) => (
                <div
                  key={r.id || i}
                  className="p-2 rounded-lg bg-zinc-950/80 border border-zinc-800 text-[11px] font-mono text-zinc-300 flex items-start gap-2"
                >
                  <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{r.text}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-zinc-800 space-y-1.5">
              <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                Değerler & İlkeler
              </div>
              <div className="flex flex-wrap gap-1">
                {(activeCharacter.values || ['Tarafsızlık', 'Sistem Güvenliği', 'Veri Bütünlüğü']).map((val, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-cyan-300 border border-zinc-700"
                  >
                    #{val}
                  </span>
                ))}
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

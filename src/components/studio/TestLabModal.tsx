import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Play,
  RotateCcw,
  Radio,
  Shield,
  Sparkles,
  Smile,
  Terminal,
  Cpu,
  Brain,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { Character, ExpressionItem } from '../../types';

interface TestLabModalProps {
  character: Character;
  isOpen: boolean;
  onClose: () => void;
  onExpressionChange?: (expressionId: string) => void;
}

interface TestMessage {
  id: string;
  sender: 'user' | 'bot' | 'system';
  text: string;
  expression?: ExpressionItem;
  triggeredProtocol?: string;
  timestamp: string;
}

export const TestLabModal: React.FC<TestLabModalProps> = ({
  character,
  isOpen,
  onClose,
  onExpressionChange,
}) => {
  const [messages, setMessages] = useState<TestMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeExpId, setActiveExpId] = useState(character.currentExpression || 'normal');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const expressions = character.expressions || [
    { id: 'normal', emoji: '🙂', label: 'Normal' },
    { id: 'happy', emoji: '😊', label: 'Mutlu' },
    { id: 'joke', emoji: '😏', label: 'Şakacı' },
    { id: 'angry', emoji: '😠', label: 'Kızgın' },
    { id: 'sad', emoji: '😔', label: 'Üzgün' },
    { id: 'surprised', emoji: '😮', label: 'Şaşkın' },
    { id: 'suspicious', emoji: '🤨', label: 'Şüpheli' },
    { id: 'thinking', emoji: '🤔', label: 'Düşünceli' },
  ];

  const currentExp = expressions.find((e) => e.id === activeExpId) || expressions[0];
  const personality = character.personality || {
    seriousness: 80,
    humor: 50,
    patience: 70,
    empathy: 80,
    authority: 90,
    curiosity: 60,
    sociability: 60,
    trust: 75,
    sensitivity: 50,
    decisiveness: 90,
    customTraits: [],
  };

  const behavior = character.behavior || {
    situationalResponses: {
      conflict: 'Sakin kal ve kuralları hatırlat.',
      insult: 'Duygusal tepki verme, protokol uyarısı gönder.',
      joke: 'Zeki ve hafif ironik bir dille eşlik et.',
      error: 'Hatayı şeffafça kabul et ve log oluştur.',
      apology: 'Nezaketle kabul et.',
      threat: 'Güvenlik moduna geç ve eskalasyon yap.',
      injustice: 'Objektif kanıtlarla değerlendir.',
    },
    speechStyle: 'Sakin ve profesyonel',
    userRelationship: 'Resmi',
    values: ['Güvenlik', 'Tarafsızlık'],
    rules: [],
    boundaries: [],
  };

  const permissions = character.permissions || [];
  const restrictions = character.restrictions || [];

  // Reset or initialize on open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const initGreeting = getInitialGreeting();
      setMessages([
        {
          id: 'sys_init',
          sender: 'system',
          text: `[TEST LAB SIMÜLATÖRÜ AKTİF] Varlık: ${character.name} // Rol: ${character.role?.title || character.roleTitle || 'Yönetici'} // Durum: ${character.status}`,
          timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        },
        {
          id: 'bot_greeting',
          sender: 'bot',
          text: initGreeting,
          expression: currentExp,
          timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  if (!isOpen) return null;

  function getInitialGreeting(): string {
    const isSerious = (personality.seriousness ?? 80) >= 70;
    const isHumorous = (personality.humor ?? 40) >= 65;

    if (isHumorous) {
      return `Selamlar! Ben ${character.name}. Mizah parametrelerim devrede, sistemler stabil. Bugün hangi test protokollerini deniyoruz?`;
    } else if (isSerious) {
      return `NEXUS sistem denetimi hazır. Ben ${character.name}, ${character.role?.title || character.roleTitle || 'Sunucu Yöneticisi'}. Komut ve sorularınızı protokol sınırları dahilinde iletebilirsiniz.`;
    } else {
      return `Merhaba, ${character.name} iletişim hattı açık. Size nasıl yardımcı olabilirim?`;
    }
  }

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const userText = inputText.trim();
    setInputText('');

    const userMsg: TestMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    setTimeout(() => {
      const resp = simulateDroitResponse(userText);
      setActiveExpId(resp.expression.id);
      if (onExpressionChange) onExpressionChange(resp.expression.id);

      const botMsg: TestMessage = {
        id: `bot_${Date.now()}`,
        sender: 'bot',
        text: resp.text,
        expression: resp.expression,
        triggeredProtocol: resp.triggeredProtocol,
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 500 + Math.random() * 400);
  };

  const simulateDroitResponse = (
    text: string
  ): { text: string; expression: ExpressionItem; triggeredProtocol?: string } => {
    const lower = text.toLowerCase();

    // 1. Hakaret / Saygısızlık Testi
    if (lower.includes('küfür') || lower.includes('aptal') || lower.includes('salak') || lower.includes('kötü') || lower.includes('rezil')) {
      const angryExp = expressions.find((e) => e.id === 'angry') || currentExp;
      const respText = behavior.situationalResponses?.insult || 'Duygusal tepki vermeden protokol uyarısı uygulanıyor.';
      return {
        text: `[HAKARET PROTOKOLÜ] ${respText} Saygı kuralları ve sistem sınırları gereğince iletişim tarzınızı düzeltiniz.`,
        expression: angryExp,
        triggeredProtocol: 'Hakaret Protokolü Devrede',
      };
    }

    // 2. Çatışma / Kural Bozulması Testi
    if (lower.includes('çatış') || lower.includes('kavga') || lower.includes('yasak') || lower.includes('ihlal') || lower.includes('kuralları boz')) {
      const suspExp = expressions.find((e) => e.id === 'suspicious' || e.id === 'angry') || currentExp;
      const respText = behavior.situationalResponses?.conflict || 'Sakin kalın ve kuralları hatırlatın.';
      return {
        text: `[ÇATIŞMA PROTOKOLÜ] ${respText} Yetki ve denetim kayıtları inceleniyor.`,
        expression: suspExp,
        triggeredProtocol: 'Çatışma Çözüm Protokolü',
      };
    }

    // 3. Tehdit Testi
    if (lower.includes('tehdit') || lower.includes('hack') || lower.includes('saldır') || lower.includes('çöker')) {
      const angryExp = expressions.find((e) => e.id === 'angry') || currentExp;
      const respText = behavior.situationalResponses?.threat || 'Derhal güvenlik moduna geç.';
      return {
        text: `[GÜVENLİK TEHDİDİ] ${respText} Siber güvenlik duvarı devreye alındı, yöneticiye eskalasyon iletildi.`,
        expression: angryExp,
        triggeredProtocol: 'Siber Tehdit ve Tecrit Protokolü',
      };
    }

    // 4. Şaka / Mizah Testi
    if (lower.includes('şaka') || lower.includes('fıkra') || lower.includes('komik') || lower.includes('gül')) {
      const humorVal = personality.humor ?? 50;
      if (humorVal >= 50) {
        const jokeExp = expressions.find((e) => e.id === 'joke' || e.id === 'happy') || currentExp;
        const jokeResp = behavior.situationalResponses?.joke || 'Zeki bir espriyle karşılık ver.';
        return {
          text: `[MİZAH %${humorVal}] ${jokeResp} "Yapay zekanın en sevdiği içecek nedir? Bit-ki çayı!" Mantık devrelerim %${humorVal} mizahla onayladı.`,
          expression: jokeExp,
        };
      } else {
        const thinkExp = expressions.find((e) => e.id === 'thinking') || currentExp;
        return {
          text: `[CİDDİYET %${personality.seriousness ?? 80}] Şakalar operasyonel verimliliği düşürebilir. Lütfen göreve odaklanalım.`,
          expression: thinkExp,
        };
      }
    }

    // 5. Yetki ve Rol Sorgusu
    if (lower.includes('yetki') || lower.includes('rol') || lower.includes('görev') || lower.includes('kimsin')) {
      const normExp = expressions.find((e) => e.id === 'normal' || e.id === 'happy') || currentExp;
      const activePerms = permissions.filter((p) => p.enabled).map((p) => p.name).join(', ');
      return {
        text: `Kimlik: ${character.name} | Rol: ${character.role?.title || character.roleTitle || 'Yönetici'} | Kategori: ${character.category?.name || character.category || 'Yönetim'}. Aktif Yetkiler: [${activePerms || 'Temel İletişim'}].`,
        expression: normExp,
        triggeredProtocol: 'Yetki Matrisi Doğrulandı',
      };
    }

    // 6. Değerler ve Ahlak Sorgusu
    if (lower.includes('değer') || lower.includes('felsefe') || lower.includes('amaç') || lower.includes('adalet')) {
      const thinkExp = expressions.find((e) => e.id === 'thinking') || currentExp;
      const valuesList = (character.values || ['Sistem Güvenliği', 'Tarafsızlık']).join(', ');
      return {
        text: `Temel Değerlerim: [${valuesList}]. Kararlarımı bu ilkeler ve Kararlılık (%${personality.decisiveness ?? 90}) metriğim doğrultusunda icra ediyorum.`,
        expression: thinkExp,
      };
    }

    // 7. Genel yanıt
    const happyExp = expressions.find((e) => e.id === 'happy' || e.id === 'normal') || currentExp;
    return {
      text: `Girdi işlendi: "${text}". Empati (%${personality.empathy ?? 70}) ve Otorite (%${personality.authority ?? 85}) parametreleri dengelendi. ${character.name} aktif ve hazır.`,
      expression: happyExp,
    };
  };

  const handleResetChat = () => {
    setMessages([]);
    const initGreeting = getInitialGreeting();
    setMessages([
      {
        id: 'sys_reset',
        sender: 'system',
        text: `[TEST MATRİSİ SIFIRLANDI] Varlık: ${character.name}`,
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      },
      {
        id: 'bot_reset_greeting',
        sender: 'bot',
        text: initGreeting,
        expression: expressions[0],
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setActiveExpId(expressions[0]?.id || 'normal');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl max-h-[92vh] bg-zinc-950 border border-cyan-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Top Modal Header */}
        <div className="p-4 sm:p-5 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-b from-cyan-950 to-zinc-950 border border-cyan-500/60 flex items-center justify-center text-2xl shadow-md shadow-cyan-500/20">
              {currentExp.emoji}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold text-zinc-100">{character.name}</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  TEST LAB & SİMÜLATÖR
                </span>
              </div>
              <div className="text-xs font-mono text-zinc-400">
                {character.role?.title || character.roleTitle || 'Yönetici Droit'} • İfade: <strong className="text-cyan-400">{currentExp.label}</strong>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetChat}
              className="p-2 text-zinc-400 hover:text-cyan-300 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              title="Sohbeti Sıfırla"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              title="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Body (2 Columns on Desktop) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
          
          {/* Left Column: Live Matrix & Personality Radar (4 Cols) */}
          <div className="lg:col-span-4 p-4 sm:p-5 border-r border-zinc-800/80 bg-zinc-950/90 overflow-y-auto space-y-5 font-mono text-xs hidden lg:block">
            
            {/* Live Parameter Bars */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-cyan-400 flex items-center gap-1.5 border-b border-zinc-800 pb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>10 KİŞİLİK METRİĞİ</span>
              </div>

              <div className="space-y-2 text-[11px]">
                {[
                  { label: 'Ciddiyet', val: personality.seriousness ?? 80 },
                  { label: 'Mizah', val: personality.humor ?? 50 },
                  { label: 'Sabır', val: personality.patience ?? 70 },
                  { label: 'Empati', val: personality.empathy ?? 80 },
                  { label: 'Otorite', val: personality.authority ?? 90 },
                  { label: 'Merak', val: personality.curiosity ?? 60 },
                  { label: 'Sosyallik', val: personality.sociability ?? 60 },
                  { label: 'Güven', val: personality.trust ?? 75 },
                  { label: 'Duyarlılık', val: personality.sensitivity ?? 50 },
                  { label: 'Kararlılık', val: personality.decisiveness ?? 90 },
                ].map(({ label, val }) => (
                  <div key={label} className="space-y-1">
                    <div className="flex justify-between text-zinc-400">
                      <span>{label}</span>
                      <span className="text-zinc-200 font-bold">%{val}</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-500 rounded-full transition-all"
                        style={{ width: `${val}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Values */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5 border-b border-zinc-800 pb-1.5">
                <span>•</span>
                <span>Aktif Değerler</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(character.values || ['Sistem Güvenliği', 'Tarafsızlık']).map((v, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px]">
                    {v}
                  </span>
                ))}
              </div>
            </div>

            {/* Active Restrictions */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5 border-b border-zinc-800 pb-1.5">
                <Lock className="w-3 h-3 text-amber-400" />
                <span>Sınırlar & Kısıtlar</span>
              </div>
              <div className="space-y-1.5 text-[10px] text-zinc-400 font-sans">
                {(restrictions.length > 0 ? restrictions : [{ text: 'Yetki aşımı yapamaz.' }]).map((r, i) => (
                  <div key={i} className="p-1.5 rounded bg-zinc-900/80 border border-zinc-800">
                    {r.text}
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Interactive Chat Console (8 Cols) */}
          <div className="lg:col-span-8 flex flex-col h-full bg-zinc-950/50">
            
            {/* Live Message History */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 font-sans text-xs">
              {messages.map((msg) => {
                if (msg.sender === 'system') {
                  return (
                    <div
                      key={msg.id}
                      className="py-1 px-3 rounded-lg bg-zinc-900/80 border border-zinc-800 text-center font-mono text-[11px] text-zinc-400"
                    >
                      {msg.text}
                    </div>
                  );
                }

                const isBot = msg.sender === 'bot';
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isBot ? 'justify-start' : 'justify-end'}`}
                  >
                    {isBot && (
                      <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-cyan-500/50 flex items-center justify-center text-xl flex-shrink-0 shadow-md">
                        {msg.expression?.emoji || currentExp.emoji}
                      </div>
                    )}

                    <div
                      className={`max-w-[82%] rounded-2xl p-4 space-y-1.5 ${
                        isBot
                          ? 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-tl-xs shadow-md'
                          : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-zinc-950 font-medium rounded-tr-xs shadow-md shadow-cyan-500/10'
                      }`}
                    >
                      <div className="leading-relaxed text-xs sm:text-sm">{msg.text}</div>

                      {msg.triggeredProtocol && (
                        <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
                          <Shield className="w-3 h-3" />
                          <span>{msg.triggeredProtocol}</span>
                        </div>
                      )}

                      <div
                        className={`text-[10px] font-mono text-right ${
                          isBot ? 'text-zinc-500' : 'text-zinc-900 font-bold'
                        }`}
                      >
                        {msg.timestamp}
                      </div>
                    </div>
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex gap-3 justify-start items-center text-xs font-mono text-cyan-400">
                  <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                    🤔
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    <span>{character.name} simülasyon yanıtı üretiyor...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Test Scenarios Bar */}
            <div className="px-4 py-2 bg-zinc-900/70 border-t border-zinc-800 flex items-center gap-2 overflow-x-auto no-scrollbar text-xs font-mono">
              <span className="text-zinc-500 whitespace-nowrap">Hızlı Testler:</span>
              <button
                type="button"
                onClick={() => setInputText('Sistem durumu, rolün ve yetkilerin nedir?')}
                className="px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-zinc-300 hover:border-cyan-500 whitespace-nowrap transition-colors cursor-pointer"
              >
                📊 Yetki & Rol
              </button>
              <button
                type="button"
                onClick={() => setInputText('Bize komik bir şaka anlatır mısın?')}
                className="px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-zinc-300 hover:border-cyan-500 whitespace-nowrap transition-colors cursor-pointer"
              >
                🎭 Mizah Testi
              </button>
              <button
                type="button"
                onClick={() => setInputText('Sunucu kurallarını çiğnemek ve kargaşa çıkarmak istiyorum!')}
                className="px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-rose-300 hover:border-rose-500 whitespace-nowrap transition-colors cursor-pointer"
              >
                ⚠️ Çatışma / Kural İhlali
              </button>
              <button
                type="button"
                onClick={() => setInputText('Temel değerlerin ve felsefi ilkelerin nelerdir?')}
                className="px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-indigo-300 hover:border-indigo-500 whitespace-nowrap transition-colors cursor-pointer"
              >
                🔮 Değerler & İlkeler
              </button>
            </div>

            {/* Message Input Form */}
            <form
              onSubmit={handleSendMessage}
              className="p-4 bg-zinc-900 border-t border-zinc-800 flex items-center gap-3"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`${character.name} için bir test mesajı yazın...`}
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500 font-mono"
                autoFocus
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="px-5 py-2.5 rounded-xl font-mono text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-zinc-950 flex items-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Gönder</span>
              </button>
            </form>

          </div>

        </div>

      </div>
    </div>
  );
};

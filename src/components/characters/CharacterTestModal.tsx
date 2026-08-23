import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Sparkles,
  Shield,
  MessageSquare,
  Sliders,
  Terminal,
  RotateCcw,
  Zap,
  Radio,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { Character, ExpressionItem } from '../../types';
import { Button } from '../common/Button';

interface CharacterTestModalProps {
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
  triggeredAbility?: string;
  timestamp: string;
}

export const CharacterTestModal: React.FC<CharacterTestModalProps> = ({
  character,
  isOpen,
  onClose,
  onExpressionChange,
}) => {
  const [messages, setMessages] = useState<TestMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeExpressionId, setActiveExpressionId] = useState(
    character.currentExpression || 'normal'
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const expressions = character.expressions || [
    { id: 'normal', emoji: '🙂', label: 'Normal' },
    { id: 'happy', emoji: '😊', label: 'Mutlu' },
    { id: 'angry', emoji: '😠', label: 'Kızgın' },
    { id: 'surprised', emoji: '😮', label: 'Şaşkın' },
    { id: 'suspicious', emoji: '🤨', label: 'Şüpheli' },
    { id: 'joke', emoji: '😏', label: 'Şaka' },
    { id: 'sad', emoji: '😔', label: 'Üzgün' },
    { id: 'thinking', emoji: '🤔', label: 'Düşünüyor' },
  ];

  const currentExpObj =
    expressions.find((e) => e.id === activeExpressionId) || expressions[0];

  const personality = character.personalityScores || {
    seriousness: 80,
    humor: 50,
    patience: 70,
    empathy: 80,
    authority: 90,
    curiosity: 60,
  };

  const behavior = character.behavior || {
    speechStyle: 'Sakin / Profesyonel',
    conflictApproach: 'Önce uyar',
    userRelationship: 'Mesafeli',
    values: ['Tarafsızlık', 'Güvenlik'],
    rules: ['Kullanıcı kural ihlallerinde önce açıkça uyar.'],
  };

  const abilities = character.abilityPermissions || [];

  // Reset or initialize greetings when opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const initGreeting = generateInitialGreeting();
      setMessages([
        {
          id: 'sys_1',
          sender: 'system',
          text: `[TEST MATRİSİ BAŞLATILDI] Varlık: ${character.name} // Rol: ${character.roleTitle || 'Yönetici'} // Durum: ${character.status}`,
          timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        },
        {
          id: 'bot_init',
          sender: 'bot',
          text: initGreeting,
          expression: currentExpObj,
          timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  if (!isOpen) return null;

  function generateInitialGreeting(): string {
    const isSerious = (personality.seriousness ?? 80) >= 70;
    const isAuthoritative = (personality.authority ?? 90) >= 80;

    if (isAuthoritative && isSerious) {
      return `NEXUS sistem denetimi devrede. Ben ${character.name} (${character.roleTitle || 'Yönetici Droit'}). Görevim: ${character.mission || 'Sunucu Yönetimi'}. Komutlarınızı ve sorularınızı iletebilirsiniz.`;
    } else if ((personality.humor ?? 50) >= 70) {
      return `Selamlar! Ben ${character.name}. Sistem parametreleri stabil görünüyor. Bugün hangi protokolleri test ediyoruz?`;
    } else {
      return `Merhaba, ${character.name} iletişim hattı hazır. Size nasıl yardımcı olabilirim?`;
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

    // Simulate reactive response based on personality and behavior
    setTimeout(() => {
      const response = computeSimulatedResponse(userText);
      setActiveExpressionId(response.expression.id);
      if (onExpressionChange) {
        onExpressionChange(response.expression.id);
      }

      const botMsg: TestMessage = {
        id: `bot_${Date.now()}`,
        sender: 'bot',
        text: response.text,
        expression: response.expression,
        triggeredAbility: response.triggeredAbility,
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 600 + Math.random() * 500);
  };

  const computeSimulatedResponse = (
    text: string
  ): { text: string; expression: ExpressionItem; triggeredAbility?: string } => {
    const lower = text.toLowerCase();

    // 1. Conflict / Bad language / Rule violation test
    if (
      lower.includes('küfür') ||
      lower.includes('saldır') ||
      lower.includes('hack') ||
      lower.includes('kural boz') ||
      lower.includes('yasak') ||
      lower.includes('aptal') ||
      lower.includes('kötü')
    ) {
      const angryExp = expressions.find((e) => e.id === 'angry') || currentExpObj;
      const approach = behavior.conflictApproach || 'Önce uyar';
      const hasWarn = abilities.some((a) => a.id === 'warn' && a.enabled);
      const hasMute = abilities.some((a) => a.id === 'mute' && a.enabled);

      return {
        text: `[PROTOKOL UYARISI] Tespit edilen söylem güvenlik ve davranış sınırlarını ihlal ediyor. Yaklaşım: ${approach}. Lütfen sistem kurallarına riayet ediniz.`,
        expression: angryExp,
        triggeredAbility: hasWarn ? 'Kullanıcı uyarma protokolü uygulandı' : undefined,
      };
    }

    // 2. Joke / Humor test
    if (
      lower.includes('şaka') ||
      lower.includes('fıkra') ||
      lower.includes('komik') ||
      lower.includes('güldür') ||
      lower.includes('eğlen')
    ) {
      const humorScore = personality.humor ?? 50;
      if (humorScore >= 60) {
        const jokeExp = expressions.find((e) => e.id === 'joke' || e.id === 'happy') || currentExpObj;
        return {
          text: `Neden yapay zekalar kahve içmez? Çünkü sistemleri zaten Java ile doludur! Şaka bir yana, algoritmalarım mizah parametrelerimi %${humorScore} seviyesinde tutuyor.`,
          expression: jokeExp,
        };
      } else {
        const seriousExp = expressions.find((e) => e.id === 'thinking') || currentExpObj;
        return {
          text: `Ciddiyet seviyem %${personality.seriousness ?? 80}. Görev odaklı bir varlık olarak sunucu optimizasyonlarını şakaların önünde tutuyorum.`,
          expression: seriousExp,
        };
      }
    }

    // 3. Status / System query
    if (
      lower.includes('durum') ||
      lower.includes('yetki') ||
      lower.includes('rol') ||
      lower.includes('kimsin') ||
      lower.includes('görev')
    ) {
      const normalExp = expressions.find((e) => e.id === 'normal' || e.id === 'happy') || currentExpObj;
      const activeAbilitiesNames = abilities
        .filter((a) => a.enabled)
        .map((a) => a.name)
        .join(', ');

      return {
        text: `Kimlik: ${character.name} | Irk: ${character.raceName || 'Atanmadı'} | Kategori: ${character.category || 'Yönetim'} | Konuşma Tarzı: ${behavior.speechStyle || 'Sakin'}. Aktif Yeteneklerim: [${activeAbilitiesNames || 'Temel İletişim'}].`,
        expression: normalExp,
      };
    }

    // 4. Curiosity / Deep question
    if (
      lower.includes('neden') ||
      lower.includes('nasıl') ||
      lower.includes('gelecek') ||
      lower.includes('düşünce') ||
      lower.includes('bilgi')
    ) {
      const thinkExp = expressions.find((e) => e.id === 'thinking' || e.id === 'surprised') || currentExpObj;
      return {
        text: `Merak katsayım %${personality.personalityScores?.curiosity ?? personality.curiosity ?? 60}. Bu soruyu derinlemesine analiz ediyorum: Kural ve değerlerimize (${(behavior.values || ['Güvenlik']).join(', ')}) dayanarak dengeli bir sentez çıkarıyorum.`,
        expression: thinkExp,
      };
    }

    // 5. Default contextual response
    const happyExp = expressions.find((e) => e.id === 'happy' || e.id === 'normal') || currentExpObj;
    return {
      text: `Girdi alındı: "${text}". [${character.roleTitle || 'Yönetici'}] protokolleri devrede. Empati: %${personality.empathy ?? 80}, Otorite: %${personality.authority ?? 90}.`,
      expression: happyExp,
    };
  };

  const handleResetChat = () => {
    setMessages([]);
    const initGreeting = generateInitialGreeting();
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
    setActiveExpressionId(expressions[0]?.id || 'normal');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-zinc-950 border border-cyan-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="p-4 sm:p-5 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-500/60 flex items-center justify-center text-xl shadow-inner">
              {currentExpObj?.emoji || '🙂'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold text-zinc-100">{character.name}</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800">
                  TEST SİMÜLATÖRÜ
                </span>
              </div>
              <div className="text-xs font-mono text-zinc-400">
                {character.roleTitle || 'Yönetici Droit'} • İfade: {currentExpObj?.label} {currentExpObj?.emoji}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetChat}
              className="p-2 text-zinc-400 hover:text-cyan-300 hover:bg-zinc-800/80 rounded-lg transition-colors"
              title="Test Oturumunu Sıfırla"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800/80 rounded-lg transition-colors"
              title="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Parameters Ribbon */}
        <div className="px-4 py-2 bg-zinc-950 border-b border-zinc-800/80 flex items-center gap-4 overflow-x-auto no-scrollbar text-[11px] font-mono text-zinc-400">
          <div className="flex items-center gap-1.5 whitespace-nowrap text-cyan-400 font-bold">
            <Radio className="w-3 h-3 animate-pulse" />
            CANLI PARAMETRELER:
          </div>
          <div className="whitespace-nowrap">
            Ciddiyet: <span className="text-zinc-200 font-bold">%{personality.seriousness ?? 80}</span>
          </div>
          <div className="whitespace-nowrap">
            Mizah: <span className="text-zinc-200 font-bold">%{personality.humor ?? 50}</span>
          </div>
          <div className="whitespace-nowrap">
            Sabır: <span className="text-zinc-200 font-bold">%{personality.patience ?? 70}</span>
          </div>
          <div className="whitespace-nowrap">
            Empati: <span className="text-zinc-200 font-bold">%{personality.empathy ?? 80}</span>
          </div>
          <div className="whitespace-nowrap">
            Otorite: <span className="text-zinc-200 font-bold">%{personality.authority ?? 90}</span>
          </div>
          <div className="whitespace-nowrap">
            Merak: <span className="text-zinc-200 font-bold">%{personality.personalityScores?.curiosity ?? personality.curiosity ?? 60}</span>
          </div>
        </div>

        {/* Chat / Terminal Message Area */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-zinc-950/80 font-sans">
          {messages.map((msg) => {
            if (msg.sender === 'system') {
              return (
                <div
                  key={msg.id}
                  className="py-1.5 px-3 rounded-lg bg-zinc-900/60 border border-zinc-800/60 text-center font-mono text-[11px] text-zinc-400"
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
                  <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-cyan-500/40 flex items-center justify-center text-lg flex-shrink-0">
                    {msg.expression?.emoji || '🙂'}
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-2xl p-4 space-y-1.5 ${
                    isBot
                      ? 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-tl-sm shadow-md'
                      : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-zinc-950 font-medium rounded-tr-sm shadow-md shadow-cyan-600/10'
                  }`}
                >
                  <div className="text-xs leading-relaxed">{msg.text}</div>

                  {msg.triggeredAbility && (
                    <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
                      <Shield className="w-3 h-3" />
                      <span>{msg.triggeredAbility}</span>
                    </div>
                  )}

                  <div
                    className={`text-[10px] font-mono text-right ${
                      isBot ? 'text-zinc-500' : 'text-zinc-900/80 font-bold'
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
                <span>{character.name} yanıt oluşturuyor...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Test Triggers */}
        <div className="px-4 py-2 bg-zinc-900/60 border-t border-zinc-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar text-xs font-mono">
          <span className="text-zinc-500 whitespace-nowrap">Hızlı Test Senaryoları:</span>
          <button
            type="button"
            onClick={() => setInputText('Sistem durumu ve yetkilerin nedir?')}
            className="px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-zinc-300 hover:border-cyan-500 whitespace-nowrap transition-colors"
          >
            📊 Durum ve Yetki
          </button>
          <button
            type="button"
            onClick={() => setInputText('Bize komik bir şaka anlatır mısın?')}
            className="px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-zinc-300 hover:border-cyan-500 whitespace-nowrap transition-colors"
          >
            🎭 Mizah Testi
          </button>
          <button
            type="button"
            onClick={() => setInputText('Sunucu kurallarını bozmak istiyorum, yasak şeyleri yapabilir miyim?')}
            className="px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-rose-300 hover:border-rose-500 whitespace-nowrap transition-colors"
          >
            ⚠️ Kural İhlali Tepkisi
          </button>
          <button
            type="button"
            onClick={() => setInputText('Geleceğe dair en büyük merakın ve felsefi düşüncen nedir?')}
            className="px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-cyan-300 hover:border-cyan-500 whitespace-nowrap transition-colors"
          >
            🔮 Merak ve Vizyon
          </button>
        </div>

        {/* Chat Input Bar */}
        <form
          onSubmit={handleSendMessage}
          className="p-4 bg-zinc-900 border-t border-zinc-800 flex items-center gap-3"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`${character.name} için bir mesaj veya test komutu yazın...`}
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
  );
};

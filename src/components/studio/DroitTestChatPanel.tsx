import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Terminal, ChevronDown, ChevronUp, Sparkles, User, Bot, Trash2 } from 'lucide-react';
import { TestMessage, DroitPersonalityTraits, DroitDynamicState, DroitExpressionMode } from '../../types/nexus';

interface DroitTestChatPanelProps {
  messages: TestMessage[];
  personality: DroitPersonalityTraits;
  onSendMessage: (userText: string) => void;
  onClearMessages: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const DroitTestChatPanel: React.FC<DroitTestChatPanelProps> = ({
  messages,
  personality,
  onSendMessage,
  onClearMessages,
  isCollapsed,
  onToggleCollapse,
}) => {
  const [inputText, setInputText] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom of chat
  useEffect(() => {
    if (!isCollapsed) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isCollapsed]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleQuickPrompt = (prompt: string) => {
    onSendMessage(prompt);
  };

  return (
    <section className="border-t border-zinc-800/80 bg-zinc-950/95 flex flex-col z-20 backdrop-blur-md transition-all duration-200">
      {/* Header Bar */}
      <div className="h-10 px-4 flex items-center justify-between border-b border-zinc-800/50 select-none bg-zinc-950">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
          <h3 className="text-xs font-semibold tracking-wide text-zinc-200 uppercase">
            Droit'i Test Et
          </h3>
          <span className="text-[10px] font-mono text-zinc-500 hidden sm:inline">
            // Canlı Etkileşim Simülasyonu
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClearMessages}
            className="text-[11px] font-mono text-zinc-500 hover:text-zinc-300 flex items-center gap-1 px-2 py-0.5 rounded hover:bg-zinc-900 transition-colors"
            title="Sohbet Geçmişini Temizle"
          >
            <Trash2 className="w-3 h-3" />
            <span className="hidden sm:inline">Temizle</span>
          </button>

          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1 text-zinc-400 hover:text-zinc-200 rounded hover:bg-zinc-900 transition-colors"
            title={isCollapsed ? 'Genişlet' : 'Küçült'}
          >
            {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mesaj Alanı ve Giriş Alanı */}
      {!isCollapsed && (
        <div className="flex flex-col h-48 sm:h-52">
          {/* Mesaj Akışı */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 font-sans">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar Simge */}
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 text-xs font-mono border ${
                      isUser
                        ? 'bg-zinc-800 border-zinc-700 text-zinc-300'
                        : 'bg-indigo-950/80 border-indigo-700/60 text-indigo-300'
                    }`}
                  >
                    {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>

                  {/* Mesaj Balonu */}
                  <div className={`max-w-[75%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] font-mono font-medium text-zinc-400">
                        {isUser ? 'Sen' : 'Droit #001'}
                      </span>
                      <span className="text-[9px] font-mono text-zinc-600">{msg.timestamp}</span>
                    </div>

                    <div
                      className={`px-3 py-2 rounded-lg text-xs leading-relaxed ${
                        isUser
                          ? 'bg-zinc-800/90 text-zinc-100 border border-zinc-700/60 rounded-tr-none'
                          : 'bg-zinc-900/90 text-zinc-200 border border-indigo-900/40 rounded-tl-none shadow-sm'
                      }`}
                    >
                      {msg.text}
                    </div>

                    {msg.moodEffect && (
                      <span className="text-[9px] font-mono text-indigo-400/80 mt-0.5">
                        {msg.moodEffect}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Hızlı İstemler (Quick Test Prompts) */}
          <div className="px-3 py-1.5 border-t border-zinc-800/40 flex items-center gap-1.5 overflow-x-auto select-none bg-zinc-950/60">
            <span className="text-[10px] font-mono text-zinc-500 shrink-0">Hızlı Test:</span>
            {[
              'Bu kullanıcı sürekli kuralları ihlal ediyor.',
              'Sistem güvenlik durumunu raporla.',
              'Bana eğlenceli bir şey söyle.',
              'Sence bu konuda ne yapmalıyız?',
              'Teşekkür ederim, iyi iş çıkardın.',
            ].map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuickPrompt(prompt)}
                className="text-[11px] text-zinc-400 hover:text-zinc-200 bg-zinc-900/80 hover:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-800 whitespace-nowrap transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Mesaj Yazma Girişi */}
          <form
            onSubmit={handleSubmit}
            className="p-2.5 border-t border-zinc-800/80 bg-zinc-950 flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Droit'e bir mesaj yaz..."
                className="w-full bg-zinc-900/90 border border-zinc-800 focus:border-indigo-500/80 text-zinc-100 placeholder-zinc-500 text-xs rounded-lg px-3 py-2 focus:outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={!inputText.trim()}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium border transition-all ${
                inputText.trim()
                  ? 'bg-indigo-600 hover:bg-indigo-500 border-indigo-500 text-white shadow-sm'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed'
              }`}
            >
              <span>Gönder</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </section>
  );
};

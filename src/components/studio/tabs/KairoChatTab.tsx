import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Copy,
  Check,
  Plus,
  Smile,
  Sparkles,
  Shield,
  Activity,
  Bot,
} from 'lucide-react';
import {
  DroitExpressionMode,
  DroitDynamicState,
  TestMessage,
} from '../../../types/nexus';
import { DroitAvatar } from '../DroitAvatar';

interface KairoChatTabProps {
  expression: DroitExpressionMode;
  dynamicState: DroitDynamicState;
  messages: TestMessage[];
  isLoading?: boolean;
  onSendMessage: (text: string) => void;
}

export const KairoChatTab: React.FC<KairoChatTabProps> = ({
  expression,
  dynamicState,
  messages,
  isLoading = false,
  onSendMessage,
}) => {
  const [inputText, setInputText] = useState<string>('');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Otomatik aşağı kaydırma
  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Metin Kopyalama Fonksiyonu (Clipboard API + Fallback)
  const handleCopyText = async (messageId: string, text: string) => {
    try {
      const cleanText = text.trim();
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(cleanText);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = cleanText;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }

      setCopiedMessageId(messageId);
      setTimeout(() => {
        setCopiedMessageId((prev) => (prev === messageId ? null : prev));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  return (
    <div className="flex-1 h-full bg-[#0b0d13] flex flex-col min-w-0 overflow-hidden">
      {/* ─────────────────────────────────────────────────────────────
          1. SOHBET ÜST BAŞLIK ÇUBUĞU (Kairo Durum & Profil Bilgisi)
         ───────────────────────────────────────────────────────────── */}
      <header className="h-14 px-4 sm:px-6 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-sm flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          {/* Kairo Küçük Yuvarlak Profil Görseli & Canlı Rozet */}
          <div className="relative shrink-0">
            <DroitAvatar
              expression={expression}
              size="sm"
              showGlow={false}
              className="ring-1 ring-zinc-700/60"
            />
            {/* Çevrimiçi Yeşil Nokta */}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-zinc-950" />
          </div>

          {/* İsim & Alt Başlık */}
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 leading-tight">
              <span className="text-sm font-semibold text-zinc-100 font-mono tracking-wide">KAIRO</span>
              <span className="text-[10px] font-mono text-zinc-400 px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800">
                #001
              </span>
              <span className="hidden sm:inline-flex text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                {expression}
              </span>
            </div>
            <span className="text-[11px] text-zinc-400 leading-tight mt-0.5 flex items-center gap-1.5">
              <span>Sunucu Yöneticisi & Asistan</span>
              <span className="text-zinc-600">•</span>
              <span className="text-emerald-400 font-medium">Çevrimiçi</span>
            </span>
          </div>
        </div>

        {/* Sağ Taraf: Anlık Durum Rozeti */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900/80 border border-zinc-800 text-zinc-400">
            <Activity className="w-3 h-3 text-indigo-400 animate-pulse" />
            <span className="text-[11px]">{dynamicState.lastStatus || 'Sakin ve kontrollü'}</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Gemini 3.7 Flash
          </span>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. SOHBET MESAJ GEÇMİŞİ
         ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar bg-[#0b0d13]">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-center text-indigo-400 shadow-inner">
              <Bot className="w-6 h-6" />
            </div>
            <div className="max-w-xs space-y-1">
              <p className="text-sm font-semibold text-zinc-300">Yeni Sohbet Oturumu</p>
              <p className="text-xs text-zinc-500">
                Kairo ile konuşmaya başlamak için aşağıya bir mesaj yazın.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const isCopied = copiedMessageId === msg.id;

          if (isUser) {
            // Kullanıcı Mesajı (Sağ tarafta)
            return (
              <div key={msg.id} className="flex flex-col items-end gap-1 max-w-xl ml-auto">
                <div className="flex items-center gap-2 px-1 text-[11px] text-zinc-500">
                  <span className="font-semibold text-zinc-300">Sen</span>
                  <span className="font-mono text-[10px]">{msg.timestamp}</span>
                </div>
                <div className="bg-indigo-600 text-zinc-100 px-4 py-2.5 rounded-2xl rounded-tr-xs text-[13px] sm:text-sm leading-relaxed shadow-sm">
                  {msg.text}
                </div>
              </div>
            );
          }

          // Kairo Mesajı (Sol tarafta, avatar, mesaj ve kopyala butonu)
          return (
            <div key={msg.id} className="flex items-start gap-3 max-w-xl mr-auto group">
              {/* Kairo PP */}
              <div className="shrink-0 mt-0.5">
                <DroitAvatar
                  expression={expression}
                  size="sm"
                  className="ring-1 ring-zinc-800"
                />
              </div>

              {/* Mesaj İçeriği */}
              <div className="flex flex-col items-start gap-1">
                <div className="flex items-center gap-2 px-1 text-[11px] text-zinc-500">
                  <span className="font-semibold text-zinc-200">Kairo</span>
                  <span className="font-mono text-[10px]">{msg.timestamp}</span>
                </div>

                <div className="relative bg-zinc-900 border border-zinc-800/80 text-zinc-200 px-4 py-2.5 rounded-2xl rounded-tl-xs text-[13px] sm:text-sm leading-relaxed shadow-sm">
                  <div className="whitespace-pre-wrap">{msg.text}</div>

                  {/* Kopyala Butonu */}
                  <div className="mt-2 pt-2 border-t border-zinc-800/60 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-indigo-400" />
                      Droit AI
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyText(msg.id, msg.text)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono text-zinc-400 hover:text-zinc-200 bg-zinc-950/60 hover:bg-zinc-800 border border-zinc-800/80 transition-all cursor-pointer"
                      title="Cevabı panoya kopyala"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400 font-semibold">Kopyalandı</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Kopyala</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Düşünüyor Yüklenme Göstergesi */}
        {isLoading && (
          <div className="flex items-start gap-3 max-w-xl mr-auto animate-pulse">
            <div className="shrink-0 mt-0.5">
              <DroitAvatar
                expression={expression}
                size="sm"
                className="ring-1 ring-zinc-800"
              />
            </div>

            <div className="flex flex-col items-start gap-1">
              <div className="flex items-center gap-2 px-1 text-[11px] text-zinc-500">
                <span className="font-semibold text-zinc-200">Kairo</span>
                <span className="font-mono text-[10px] text-indigo-400">düşünüyor...</span>
              </div>
              <div className="bg-zinc-900 border border-zinc-800/80 text-zinc-400 px-4 py-2.5 rounded-2xl rounded-tl-xs text-[13px] sm:text-sm flex items-center gap-2 shadow-sm">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs font-mono text-zinc-400">Kairo düşünüyor...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={chatScrollRef} />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. ALT MESAJ GİRİŞ ALANI
         ───────────────────────────────────────────────────────────── */}
      <footer className="p-3 sm:p-4 border-t border-zinc-800/80 bg-zinc-950 shrink-0">
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 rounded-xl px-3 py-1.5 focus-within:border-zinc-700 transition-colors shadow-inner"
        >
          <button
            type="button"
            className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800/70 transition-colors"
            title="Eklenti"
          >
            <Plus className="w-4 h-4" />
          </button>

          <input
            type="text"
            value={inputText}
            disabled={isLoading}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isLoading ? 'Kairo yanıt yazıyor...' : 'Kairo ile sohbet et...'}
            className="flex-1 bg-transparent border-none text-zinc-100 placeholder-zinc-500 text-xs sm:text-sm px-2 py-1.5 focus:outline-none disabled:opacity-50 select-text"
          />

          <button
            type="button"
            className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800/70 transition-colors"
            title="Emoji"
          >
            <Smile className="w-4 h-4" />
          </button>

          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className={`p-2 rounded-lg transition-all flex items-center justify-center ${
              inputText.trim() && !isLoading
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm cursor-pointer'
                : 'text-zinc-600 hover:text-zinc-500 cursor-not-allowed'
            }`}
            title="Gönder"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </footer>
    </div>
  );
};

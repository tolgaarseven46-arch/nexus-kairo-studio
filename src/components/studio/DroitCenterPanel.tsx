import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Plus, Smile, Send, Copy, Check } from 'lucide-react';
import {
  DroitExpressionMode,
  DroitDynamicState,
  TestMessage,
} from '../../types/nexus';
import { DroitAvatar } from './DroitAvatar';

interface DroitCenterPanelProps {
  expression: DroitExpressionMode;
  dynamicState: DroitDynamicState;
  messages: TestMessage[];
  isLoading?: boolean;
  onSendMessage: (text: string) => void;
}

export const DroitCenterPanel: React.FC<DroitCenterPanelProps> = ({
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
      // Temiz, okunabilir metin formatı
      const cleanText = text.trim();
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(cleanText);
      } else {
        // Fallback for non-secure or iframe environments
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
    <main className="flex-1 h-full bg-[#0b0d13] flex flex-col min-w-0 overflow-hidden select-none">
      {/* ─────────────────────────────────────────────────────────────
          1. SOHBET ÜST BAŞLIK ÇUBUĞU (Modern Sosyal / Sohbet Arayüzü)
          ←  [Kairo Avatarı]  Kairo
                              Yönetici Asistanı • Çevrimiçi
         ───────────────────────────────────────────────────────────── */}
      <header className="h-14 px-4 sm:px-6 border-b border-zinc-800/80 bg-zinc-950 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          {/* Sol Geri / Navigasyon İkonu */}
          <button
            type="button"
            className="text-zinc-400 hover:text-zinc-200 transition-colors p-1 -ml-1 rounded-md hover:bg-zinc-900"
            title="Geri"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

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
              <span className="text-sm font-semibold text-zinc-100">Kairo</span>
              <span className="text-[10px] font-mono text-zinc-400 px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800">
                #001
              </span>
            </div>
            <span className="text-[11px] text-zinc-400 leading-tight mt-0.5">
              Yönetici Asistanı <span className="text-zinc-600 mx-1">•</span> <span className="text-emerald-400/90 font-medium">Çevrimiçi</span>
            </span>
          </div>
        </div>

        {/* Sağ Taraf: Minimalist Rozet / Durum */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-zinc-500">
          <span>{dynamicState.lastStatus}</span>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. SOHBET MESAJ GEÇMİŞİ (Klasik ve Temiz Sohbet Arayüzü)
         ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar bg-[#0b0d13]">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';

          if (isUser) {
            // Kullanıcı Mesajı (Sağ tarafta, kompakt, temiz)
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

          // Kairo Mesajı (Sol tarafta, PP'li, temiz ve modern)
          return (
            <div key={msg.id} className="flex items-start gap-3 max-w-xl mr-auto">
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
                <div className="bg-zinc-900 border border-zinc-800/80 text-zinc-200 px-4 py-2.5 rounded-2xl rounded-tl-xs text-[13px] sm:text-sm leading-relaxed shadow-sm">
                  {msg.text}
                </div>
              </div>
            </div>
          );
        })}
        {isLoading && (
          <div className="flex items-start gap-3 max-w-xl mr-auto animate-pulse">
            {/* Kairo PP */}
            <div className="shrink-0 mt-0.5">
              <DroitAvatar
                expression={expression}
                size="sm"
                className="ring-1 ring-zinc-800"
              />
            </div>

            {/* Düşünüyor Balonu */}
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
          3. ALT MESAJ YAZMA ALANI
          +    Droit'e mesaj yaz...                         😊  ➤
         ───────────────────────────────────────────────────────────── */}
      <footer className="p-3 sm:p-4 border-t border-zinc-800/80 bg-zinc-950 shrink-0">
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 rounded-xl px-3 py-1.5 focus-within:border-zinc-700 transition-colors shadow-inner"
        >
          {/* Sol Artı (+) Eklenti Butonu */}
          <button
            type="button"
            className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800/70 transition-colors"
            title="Ekle"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Mesaj Input */}
          <input
            type="text"
            value={inputText}
            disabled={isLoading}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isLoading ? "Kairo yanıt yazıyor..." : "Droit'e mesaj yaz..."}
            className="flex-1 bg-transparent border-none text-zinc-100 placeholder-zinc-500 text-xs sm:text-sm px-2 py-1.5 focus:outline-none disabled:opacity-50"
          />

          {/* Emoji (😊) Butonu */}
          <button
            type="button"
            className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800/70 transition-colors"
            title="Emoji"
          >
            <Smile className="w-4 h-4" />
          </button>

          {/* Gönder (➤) Butonu */}
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className={`p-2 rounded-lg transition-all flex items-center justify-center ${
              inputText.trim() && !isLoading
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                : 'text-zinc-600 hover:text-zinc-500 cursor-not-allowed'
            }`}
            title="Gönder"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </footer>
    </main>
  );
};

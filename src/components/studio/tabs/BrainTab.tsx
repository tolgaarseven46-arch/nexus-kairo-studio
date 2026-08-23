import React, { useState } from 'react';
import {
  Brain,
  User,
  HeartHandshake,
  Smile,
  Compass,
  Sparkles,
  ArrowRight,
  UserPlus,
  FlaskConical,
  MessageSquare,
  Sparkle,
  Sliders,
  CheckCircle2,
  RefreshCw,
  ShieldAlert,
  Zap,
  Activity,
  Edit3,
  SlidersHorizontal,
} from 'lucide-react';
import {
  DroitPersonalityTraits,
  DroitDynamicState,
  ReasoningTrace,
} from '../../../types/nexus';

interface BrainTabProps {
  reasoningTrace: ReasoningTrace;
  onReasoningTraceChange?: (trace: ReasoningTrace) => void;
  lastAnalysis?: any;
  personality?: DroitPersonalityTraits;
  dynamicState?: DroitDynamicState;
  onDynamicStateChange?: (state: DroitDynamicState) => void;
  isNewUserMode?: boolean;
  onToggleNewUserMode?: () => void;
  userWarmth?: number;
  onUserWarmthChange?: (warmth: number) => void;
  onNavigateToTest?: () => void;
  onNavigateToCharacter?: () => void;
  onResetTrace?: () => void;
}

const PRESET_MOODS = [
  { label: 'Sakin ve dengeli', value: 'Sakin ve dengeli', stress: 15, calmness: 85 },
  { label: 'Neşeli ve oyuncu', value: 'Neşeli ve oyuncu', stress: 8, calmness: 92 },
  { label: 'Stresli ve tetikte', value: 'Stresli ve tetikte', stress: 80, calmness: 20 },
  { label: 'Meraklı ve odaklanmış', value: 'Meraklı ve odaklanmış', stress: 25, calmness: 75 },
  { label: 'Yorgun ve mesafeli', value: 'Yorgun ve mesafeli', stress: 60, calmness: 40 },
  { label: 'Empatik ve şefkatli', value: 'Empatik ve şefkatli', stress: 12, calmness: 88 },
];

export const BrainTab: React.FC<BrainTabProps> = ({
  reasoningTrace,
  onReasoningTraceChange,
  lastAnalysis,
  personality,
  dynamicState,
  onDynamicStateChange,
  isNewUserMode = false,
  onToggleNewUserMode,
  userWarmth = 62,
  onUserWarmthChange,
  onNavigateToTest,
  onNavigateToCharacter,
  onResetTrace,
}) => {
  // Local state for interactive / editable fields
  const [userName, setUserName] = useState<string>(
    reasoningTrace.whoSent.userName || 'Test Operatörü (Sistem)'
  );
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [relationshipNote, setRelationshipNote] = useState<string>(
    reasoningTrace.relationship.note || 'Daha önceki oturumlarda saygılı ve dengeli diyaloglar kuruldu.'
  );
  const [isEditingNote, setIsEditingNote] = useState<boolean>(false);

  // Synchronize values
  const currentWarmth = isNewUserMode ? 0 : userWarmth;
  const warmthDelta = isNewUserMode
    ? (reasoningTrace.memoryUpdate.warmthDelta > 0 ? reasoningTrace.memoryUpdate.warmthDelta : 4)
    : (reasoningTrace.memoryUpdate.warmthDelta ?? 3);
  const warmthAfter = isNewUserMode ? warmthDelta : Math.min(100, currentWarmth + warmthDelta);

  // Dynamic emotional scale
  const calmness = dynamicState?.currentEmotion?.calmness ?? 85;
  const stress = dynamicState?.currentEmotion?.stress ?? 15;

  const currentMoodText = reasoningTrace.currentMood.moodText || 'Sakin ve dengeli';
  const intent = lastAnalysis?.intent || reasoningTrace.messageInterpretation.intent || 'Duygusal Destek';
  const intentConfidence = lastAnalysis?.intentConfidence || 94;
  const sentiment = lastAnalysis?.sentiment || reasoningTrace.messageInterpretation.sentiment || 'Hassas / Destek Arayışı';
  const chosenTone = reasoningTrace.decision.chosenTone || 'Sıcak, destekleyici ve çözüm odaklı';
  const decisionExplanation =
    reasoningTrace.decision.explanation ||
    'Warmth skoru orta-yüksek ve kullanıcı yardım talep ediyor; bu yüzden resmî mesafeyi azaltıp empatik ve yapıcı bir ton seçtim.';

  // Handlers for editable fields
  const handleWarmthSliderChange = (newVal: number) => {
    onUserWarmthChange?.(newVal);
    if (onReasoningTraceChange) {
      onReasoningTraceChange({
        ...reasoningTrace,
        relationship: {
          ...reasoningTrace.relationship,
          warmthScore: newVal,
        },
        memoryUpdate: {
          ...reasoningTrace.memoryUpdate,
          warmthBefore: newVal,
          warmthAfter: Math.min(100, newVal + warmthDelta),
        },
      });
    }
  };

  const handleMoodSelect = (moodVal: string) => {
    const preset = PRESET_MOODS.find((m) => m.value === moodVal);
    if (preset && onDynamicStateChange && dynamicState) {
      onDynamicStateChange({
        ...dynamicState,
        currentEmotion: {
          ...dynamicState.currentEmotion,
          calmness: preset.calmness,
          stress: preset.stress,
        },
      });
    }
    if (onReasoningTraceChange) {
      onReasoningTraceChange({
        ...reasoningTrace,
        currentMood: {
          ...reasoningTrace.currentMood,
          moodText: moodVal,
          reasonText: `Test operatörü tarafından manuel olarak "${moodVal}" moduna ayarlandı.`,
        },
      });
    }
  };

  const handleNameSave = () => {
    setIsEditingName(false);
    if (onReasoningTraceChange) {
      onReasoningTraceChange({
        ...reasoningTrace,
        whoSent: {
          ...reasoningTrace.whoSent,
          userName,
        },
      });
    }
  };

  const handleNoteSave = () => {
    setIsEditingNote(false);
    if (onReasoningTraceChange) {
      onReasoningTraceChange({
        ...reasoningTrace,
        relationship: {
          ...reasoningTrace.relationship,
          note: relationshipNote,
        },
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-zinc-950 text-zinc-100 overflow-hidden select-none">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER (Kompakt ve Bilgilendirici)
         ───────────────────────────────────────────────────────────── */}
      <header className="px-5 py-2.5 border-b border-zinc-850/80 bg-zinc-900/50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.15)]">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xs sm:text-sm font-mono font-bold tracking-wider text-zinc-100">
                BEYİN & CANLI MUHAKEME
              </h1>
              <span className="text-[10px] font-mono text-indigo-400 font-normal">// REASONING & COGNITION</span>
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-mono font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                CANLI TEST SENKRONİZASYONU
              </span>

              {/* Tıklanabilir Aktif Kişilik Rozeti (Karakter Sekmesine Yönlendirir) */}
              {onNavigateToCharacter && (
                <button
                  type="button"
                  onClick={onNavigateToCharacter}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800/70 hover:bg-zinc-800 border border-zinc-750 hover:border-indigo-500/40 text-[10px] font-mono text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer group"
                  title="Karakter sekmesinde kişiliği düzenle"
                >
                  <SlidersHorizontal className="w-2.5 h-2.5 text-zinc-500 group-hover:text-indigo-400 transition-colors" />
                  <span>
                    Aktif Kişilik:{' '}
                    <strong className="text-zinc-300 group-hover:text-indigo-300 font-semibold">
                      {personality?.humor && personality.humor > 60
                        ? 'Mizahi'
                        : personality?.empathy && personality.empathy > 60
                        ? 'Empatik'
                        : personality?.authority && personality.authority > 60
                        ? 'Otoriter'
                        : 'Mizahi'}
                    </strong>
                  </span>
                  <span className="text-zinc-500 group-hover:text-indigo-400 transition-colors">→</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sağ Butonlar */}
        <div className="flex items-center gap-2">
          {onResetTrace && (
            <button
              type="button"
              onClick={onResetTrace}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-[10.5px] font-mono transition-all cursor-pointer"
              title="Varsayılan duruma sıfırla"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Sıfırla</span>
            </button>
          )}

          {onNavigateToTest && (
            <button
              type="button"
              onClick={onNavigateToTest}
              className="flex items-center gap-1.5 px-3 py-1.2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-[11px] font-bold transition-all shadow-sm shadow-indigo-600/30 cursor-pointer"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Test Laboratuvarına Dön</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. TEK EKRAN YERLEŞİMİ (3 BÖLGE + 1 SONUÇ KARTI, SIFIR KAYDIRMA)
         ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-between p-4 sm:p-5 max-w-6xl mx-auto w-full min-h-0 overflow-hidden gap-3.5">
        
        {/* ÜST BAĞLAM ŞERİDİ (Son Etkileşim) */}
        {lastAnalysis?.userText && (
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl px-3.5 py-2 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-2 truncate pr-2">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="font-mono text-[10px] text-zinc-400 uppercase font-semibold shrink-0">Son Girdi:</span>
              <span className="text-zinc-200 font-sans italic truncate text-xs">"{lastAnalysis.userText}"</span>
            </div>
            {lastAnalysis?.latencyMs && (
              <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                Gecikme: <strong className="text-indigo-300">{lastAnalysis.latencyMs}ms</strong>
              </span>
            )}
          </div>
        )}

        {/* 3 BÖLGE GRID (HAFIZA, ALGI, RUH HALİ) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 flex-1 min-h-0">
          
          {/* ─────────────────────────────────────────────────────────
              BÖLGE 1: HAFIZA (DÜZENLENEBİLİR)
             ───────────────────────────────────────────────────────── */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3.5 flex flex-col justify-between shadow-xs">
            <div>
              {/* Başlık */}
              <div className="flex items-center justify-between mb-3 border-b border-zinc-800/60 pb-2">
                <div className="flex items-center gap-1.5 text-purple-400">
                  <HeartHandshake className="w-4 h-4" />
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider">
                    1. HAFIZA & İLİŞKİ
                  </span>
                </div>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                  DÜZENLENEBİLİR
                </span>
              </div>

              {/* Kullanıcı Adı */}
              <div className="mb-3">
                <label className="text-[9.5px] font-mono text-zinc-400 block mb-1 uppercase">
                  Konuşulan Kullanıcı
                </label>
                {isEditingName ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      className="flex-1 bg-zinc-950 border border-indigo-500/50 rounded px-2 py-1 text-xs font-sans text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleNameSave}
                      className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-mono"
                    >
                      Kaydet
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => !isNewUserMode && setIsEditingName(true)}
                    className={`flex items-center justify-between bg-zinc-950/70 px-2.5 py-1.5 rounded-lg border border-zinc-850 ${
                      isNewUserMode ? 'opacity-60 cursor-not-allowed' : 'hover:border-zinc-700 cursor-pointer'
                    }`}
                    title={isNewUserMode ? 'Yeni kullanıcı modunda sabit' : 'Düzenlemek için tıkla'}
                  >
                    <span className="text-xs font-semibold text-zinc-200 truncate font-sans">
                      {isNewUserMode ? 'Bilinmeyen Ziyaretçi (Yeni)' : userName}
                    </span>
                    {!isNewUserMode && <Edit3 className="w-3 h-3 text-zinc-500" />}
                  </div>
                )}
              </div>

              {/* Warmth Skoru (Bar + Sayı + Değişim) */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                  <span className="text-zinc-400">Warmth (Yakınlık) Skoru:</span>
                  <div className="flex items-center gap-1">
                    <strong className="text-purple-300 font-bold text-xs">%{currentWarmth}</strong>
                    <span className="text-[9px] text-emerald-400 font-semibold">
                      → %{warmthAfter} (+{warmthDelta})
                    </span>
                  </div>
                </div>
                {/* Bar */}
                <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-850 relative">
                  <div
                    className="bg-gradient-to-r from-purple-600 to-indigo-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, currentWarmth))}%` }}
                  />
                </div>
                {/* Slider */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={currentWarmth}
                  disabled={isNewUserMode}
                  onChange={(e) => handleWarmthSliderChange(Number(e.target.value))}
                  className="w-full mt-1.5 accent-purple-500 cursor-pointer h-1 bg-zinc-800 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                />
              </div>

              {/* Kısa İlişki Notu */}
              <div className="mb-2">
                <label className="text-[9.5px] font-mono text-zinc-400 block mb-1 uppercase">
                  İlişki Notu
                </label>
                {isEditingNote ? (
                  <div className="flex flex-col gap-1.5">
                    <textarea
                      value={relationshipNote}
                      onChange={(e) => setRelationshipNote(e.target.value)}
                      rows={2}
                      className="bg-zinc-950 border border-indigo-500/50 rounded px-2 py-1 text-xs font-sans text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleNoteSave}
                      className="self-end px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-mono"
                    >
                      Kaydet
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => !isNewUserMode && setIsEditingNote(true)}
                    className={`bg-zinc-950/70 p-2 rounded-lg border border-zinc-850 text-xs text-zinc-300 font-sans leading-relaxed ${
                      isNewUserMode ? 'opacity-60 cursor-not-allowed' : 'hover:border-zinc-700 cursor-pointer'
                    }`}
                    title={isNewUserMode ? 'Yeni kullanıcı modunda sabit' : 'Düzenlemek için tıkla'}
                  >
                    {isNewUserMode
                      ? 'İlk temas, geçmiş diyalog kaydı bulunmuyor.'
                      : relationshipNote}
                  </div>
                )}
              </div>
            </div>

            {/* Yeni Kullanıcı Test Butonu */}
            {onToggleNewUserMode && (
              <button
                type="button"
                onClick={onToggleNewUserMode}
                className={`w-full py-1.5 px-3 rounded-lg text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border mt-2 ${
                  isNewUserMode
                    ? 'bg-amber-500/20 border-amber-400/50 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                    : 'bg-zinc-800/80 hover:bg-zinc-750 border-zinc-700 text-zinc-300 hover:text-white'
                }`}
              >
                <UserPlus className={`w-3.5 h-3.5 ${isNewUserMode ? 'text-amber-400' : 'text-zinc-400'}`} />
                <span>{isNewUserMode ? '✓ Yeni Kullanıcı Modu Aktif (%0 Warmth)' : 'Yeni Kullanıcı Olarak Test Et'}</span>
              </button>
            )}
          </div>

          {/* ─────────────────────────────────────────────────────────
              BÖLGE 2: ALGI (SALT OKUNUR)
             ───────────────────────────────────────────────────────── */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3.5 flex flex-col justify-between shadow-xs">
            <div>
              {/* Başlık */}
              <div className="flex items-center justify-between mb-3 border-b border-zinc-800/60 pb-2">
                <div className="flex items-center gap-1.5 text-amber-400">
                  <Compass className="w-4 h-4" />
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider">
                    2. ANLIK ALGI & ANLAMA
                  </span>
                </div>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                  SALT OKUNUR
                </span>
              </div>

              {/* Niyet (Intent) */}
              <div className="mb-3">
                <label className="text-[9.5px] font-mono text-zinc-400 block mb-1 uppercase">
                  Tespit Edilen Niyet
                </label>
                <div className="bg-zinc-950/70 px-3 py-2 rounded-lg border border-zinc-850 flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 font-sans">
                    {intent}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    %{intentConfidence} Güven
                  </span>
                </div>
              </div>

              {/* Algılanan Duygu & Hassasiyet */}
              <div className="mb-3">
                <label className="text-[9.5px] font-mono text-zinc-400 block mb-1 uppercase">
                  Algılanan Duygu / Durum
                </label>
                <div className="bg-zinc-950/70 px-3 py-2 rounded-lg border border-zinc-850">
                  <span className="text-xs text-zinc-200 font-sans font-medium">
                    {sentiment}
                  </span>
                </div>
              </div>

              {/* Güven Yüzdesi Barı */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                  <span className="text-zinc-400">Model Anlama Güveni:</span>
                  <strong className="text-amber-300">%{intentConfidence}</strong>
                </div>
                <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-850">
                  <div
                    className="bg-amber-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${intentConfidence}%` }}
                  />
                </div>
              </div>

              {/* Algı Açıklaması */}
              <div className="bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-850/80 text-[11px] text-zinc-400 font-sans leading-relaxed">
                {reasoningTrace.messageInterpretation.explanation ||
                  'Kullanıcı mesajındaki dil kalıpları, kelime sıklığı ve geçmiş bağlam taranarak niyet sınıflandırıldı.'}
              </div>
            </div>

            <div className="pt-2 text-[9.5px] font-mono text-zinc-400 text-center border-t border-zinc-850/60">
              Gerçek zamanlı niyet sınıflandırma motoru aktif
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────
              BÖLGE 3: RUH HALİ (DÜZENLENEBİLİR)
             ───────────────────────────────────────────────────────── */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3.5 flex flex-col justify-between shadow-xs">
            <div>
              {/* Başlık */}
              <div className="flex items-center justify-between mb-3 border-b border-zinc-800/60 pb-2">
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <Smile className="w-4 h-4" />
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider">
                    3. ANLIK RUH HALİ
                  </span>
                </div>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  DÜZENLENEBİLİR
                </span>
              </div>

              {/* Ruh Hali Etiketi */}
              <div className="mb-3">
                <label className="text-[9.5px] font-mono text-zinc-400 block mb-1 uppercase">
                  Mevcut Ruh Hali
                </label>
                <div className="bg-zinc-950/70 px-3 py-2 rounded-lg border border-zinc-850 flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-300 font-sans">
                    {currentMoodText}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
              </div>

              {/* Sakinlik ↔ Stres Tek Çizgi Skala */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                  <span className="text-emerald-400 font-semibold">Sakinlik (%{calmness})</span>
                  <span className="text-rose-400 font-semibold">Stres (%{stress})</span>
                </div>
                <div className="w-full bg-zinc-950 rounded-full h-2.5 overflow-hidden border border-zinc-850 flex">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-300"
                    style={{ width: `${calmness}%` }}
                    title={`Sakinlik: %${calmness}`}
                  />
                  <div
                    className="bg-rose-500 h-full transition-all duration-300"
                    style={{ width: `${stress}%` }}
                    title={`Stres: %${stress}`}
                  />
                </div>
                <div className="flex justify-between text-[8.5px] font-mono text-zinc-400 mt-1">
                  <span>← DENGELİ & RAHAT</span>
                  <span>GERGİN / TETİKTE →</span>
                </div>
              </div>

              {/* Ruh Halini Zorla Değiştir (Dropdown) */}
              <div className="mb-2">
                <label className="text-[9.5px] font-mono text-zinc-400 block mb-1 uppercase">
                  Test İçin Ruh Halini Zorla Değiştir
                </label>
                <select
                  value={currentMoodText}
                  onChange={(e) => handleMoodSelect(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs font-sans text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  {PRESET_MOODS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label} (Sakin: %{preset.calmness} / Stres: %{preset.stress})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-zinc-950/40 p-2 rounded-lg border border-zinc-850/80 text-[10.5px] text-zinc-400 font-sans mt-2">
              Seçilen ruh hali, bir sonraki test mesajında ton ve empati ağırlıklarını doğrudan etkiler.
            </div>
          </div>

        </div>

        {/* ─────────────────────────────────────────────────────────────
            4. KARAR (SONUÇ KARTI - SALT OKUNUR, EN DİPTE MERKEZİ)
           ───────────────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-indigo-950/30 via-zinc-900/80 to-purple-950/30 border border-indigo-500/30 rounded-xl p-4 shrink-0 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-indigo-500/20">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-300 block">
                  4. NİHAİ KARAR & ÜSLUP SEÇİMİ
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-zinc-400">Seçilen Yaklaşım Tonu:</span>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-200 text-xs font-mono font-bold">
                {chosenTone}
              </span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-zinc-200 font-sans leading-relaxed">
            "{decisionExplanation}"
          </p>
        </div>

      </div>
    </div>
  );
};

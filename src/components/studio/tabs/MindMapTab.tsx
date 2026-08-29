import React, { useMemo, useState } from "react";
import {
  Activity,
  BrainCircuit,
  Check,
  ChevronDown,
  CircleAlert,
  Clock3,
  Copy,
  Database,
  Gauge,
  HeartHandshake,
  Loader2,
  MessageSquareText,
  MoreHorizontal,
  RotateCcw,
  Send,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import {
  DroitDynamicState,
  DroitPersonalityTraits,
  ReasoningTrace,
  TestMessage,
} from "../../../types/nexus";
import type { KairoTimingMetrics } from "../../../services/droitChatService";
import type { ResponseConsistencyResult } from "../../../services/kairoResponseConsistency";

type RelationshipTestLevel = "new" | "familiar" | "close";
type InspectorTab = "decision" | "relationship" | "memory" | "performance";
type MindMapSendOptions = { relationshipLevel?: RelationshipTestLevel };
type CopyMode = "last" | "all" | null;

type Props = {
  personality: DroitPersonalityTraits;
  dynamicState: DroitDynamicState;
  reasoningTrace: ReasoningTrace;
  messages: TestMessage[];
  isLoading: boolean;
  timings: KairoTimingMetrics | null;
  providerUsed: string | null;
  consistency: ResponseConsistencyResult | null;
  participants: ReadonlyArray<{ id: string; label: string }>;
  selectedParticipantId: string;
  activeSessionId?: string | null;
  isRestoring?: boolean;
  onSelectParticipant: (id: string) => void;
  onSendMessage: (text: string, options?: MindMapSendOptions) => void;
  onResetTestUser: () => void | Promise<void>;
  onClearAllTestData: () => void | Promise<void>;
};

const fmt = (ms: number) =>
  ms >= 1000 ? `${(ms / 1000).toFixed(2)} sn` : `${ms} ms`;

const relationshipLabels: Record<RelationshipTestLevel, string> = {
  new: "Yeni",
  familiar: "Tanıdık",
  close: "Çok yakın",
};

const sourceLabel = (
  providerUsed: string | null,
  timings: KairoTimingMetrics | null,
) => {
  if (providerUsed === "local_language" || timings?.aiMs === 0)
    return "Yerel Dil Motoru";
  if (providerUsed === "gemini") return "Gemini";
  if (providerUsed === "openrouter") return "OpenRouter";
  return "Henüz yanıt yok";
};

const DataRow = ({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: React.ReactNode;
  accent?: boolean;
}) => (
  <div className="flex items-start justify-between gap-4 border-b border-zinc-800/70 py-2.5 last:border-0">
    <span className="text-[10px] font-mono text-zinc-500">{label}</span>
    <span
      className={`max-w-[65%] text-right text-[11px] font-medium ${accent ? "text-violet-300" : "text-zinc-200"}`}
    >
      {value}
    </span>
  </div>
);

const EmptyInspector = () => (
  <div className="flex h-full min-h-52 flex-col items-center justify-center px-8 text-center">
    <BrainCircuit className="mb-3 h-6 w-6 text-zinc-700" />
    <p className="text-xs text-zinc-400">İlk mesajı gönder.</p>
    <p className="mt-1 text-[10px] font-mono leading-5 text-zinc-600">
      KDM kararı, ilişki değişimi, hafıza ve süreler burada görünecek.
    </p>
  </div>
);

export const MindMapTab: React.FC<Props> = ({
  personality,
  dynamicState,
  reasoningTrace,
  messages,
  isLoading,
  timings,
  providerUsed,
  consistency,
  participants,
  selectedParticipantId,
  activeSessionId,
  isRestoring,
  onSelectParticipant,
  onSendMessage,
  onResetTestUser,
  onClearAllTestData,
}) => {
  const [text, setText] = useState("");
  const [lastSubmittedMessage, setLastSubmittedMessage] = useState("");
  const [relationshipLevel, setRelationshipLevel] =
    useState<RelationshipTestLevel>("new");
  const [inspectorTab, setInspectorTab] =
    useState<InspectorTab>("decision");
  const [copied, setCopied] = useState<CopyMode>(null);
  const [showDangerMenu, setShowDangerMenu] = useState(false);
  const [showRawTrace, setShowRawTrace] = useState(false);


  const activeParticipant =
    participants.find((item) => item.id === selectedParticipantId) ??
    participants[0];
  const relationship = dynamicState.relationship;
  const lastUser = useMemo(
    () => [...messages].reverse().find((message) => message.sender === "user"),
    [messages],
  );
  const lastReply = useMemo(
    () => [...messages].reverse().find((message) => message.sender === "droit"),
    [messages],
  );
  const hasResult = Boolean(lastUser && lastReply && timings);
  const responseSource = sourceLabel(providerUsed, timings);

  const submit = () => {
    const submitted = text.trim();
    if (!submitted || isLoading) return;
    setLastSubmittedMessage(submitted);
    onSendMessage(submitted, { relationshipLevel });
    setText("");
  };

  const markCopied = (mode: Exclude<CopyMode, null>) => {
    setCopied(mode);
    window.setTimeout(() => setCopied(null), 1800);
  };

  const copyLastReport = async () => {
    const interactionCount =
      reasoningTrace.relationship.interactionCount ??
      relationship?.interactionCount ??
      0;
    const report = `KAIRA KNT SON TUR RAPORU\nMesaj: ${lastUser?.text || lastSubmittedMessage || "-"}\nKonuşan: ${lastUser?.participantName || activeParticipant?.label || "-"}\nYanıt: ${lastReply?.text || "-"}\nYanıt kaynağı: ${responseSource}\nNiyet: ${reasoningTrace.messageInterpretation.intent}\nDuygu sinyali: ${reasoningTrace.messageInterpretation.sentiment}\nKarar tonu: ${reasoningTrace.decision.chosenTone}\nOturum tur sayısı: ${interactionCount}\nYeni kullanıcı: ${reasoningTrace.whoSent.isNewUser ? "Evet" : "Hayır"}\nİlişki: güven=${relationship?.trust ?? 50}, sıcaklık=${relationship?.warmth ?? reasoningTrace.relationship.warmthScore}, kırgınlık=${relationship?.hurtScore || 0}, çatışma=${relationship?.conflictScore || 0}, tekrar=${relationship?.repeatedNegativeCount || 0}\nDuygu durumu: sakinlik=${dynamicState.calmness}, stres=${dynamicState.stress}, öfke=${dynamicState.anger}, mutluluk=${dynamicState.happiness}\nKDM doğrulaması: ${consistency ? `${consistency.accepted ? "Kabul" : "Sorunlu"} (${consistency.score}/100)${consistency.issues.length ? ` - ${consistency.issues.join("; ")}` : ""}` : "ölçüm yok"}\nSüreler: ${timings ? `istemci=${timings.clientPrepMs}ms, hafıza=${timings.memoryMs}ms, KDM=${timings.kdmMs}ms, AI=${timings.aiMs}ms, kayıt=${timings.postProcessMs}ms, ağ=${timings.networkAndOverheadMs}ms, toplam=${timings.totalMs}ms` : "ölçüm yok"}`;
    try {
      await navigator.clipboard.writeText(report);
      markCopied("last");
    } catch {}
  };

  const copyFullSession = async () => {
    if (!activeSessionId) return;
    try {
      const response = await fetch(
        `/api/test-sessions/${encodeURIComponent(activeSessionId)}`,
      );
      if (!response.ok) throw new Error("Oturum alınamadı");
      const payload = await response.json();
      const session = payload?.session ?? payload;
      await navigator.clipboard.writeText(
        JSON.stringify(
          {
            reportType: "KAIRA_KNT_FULL_SESSION",
            sessionId: activeSessionId,
            exportedAt: new Date().toISOString(),
            session,
          },
          null,
          2,
        ),
      );
      markCopied("all");
    } catch {}
  };

  const inspectorTabs: Array<{
    id: InspectorTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: "decision", label: "Karar", icon: ShieldCheck },
    { id: "relationship", label: "İlişki", icon: HeartHandshake },
    { id: "memory", label: "Hafıza", icon: Database },
    { id: "performance", label: "Süre", icon: Gauge },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-zinc-950">
      <header className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-4 py-2.5">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquareText className="h-4 w-4 text-violet-400" />
            <h1 className="text-xs font-bold tracking-wide text-zinc-100">
              TEST & DEBUG
            </h1>
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[8px] font-mono text-emerald-400">
              ● CANLI KDM
            </span>
            {isRestoring && (
              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[8px] font-mono text-amber-300">
                Oturum Yükleniyor…
              </span>
            )}
            {!isRestoring && messages.length > 0 && (
              <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2 py-0.5 text-[8px] font-mono text-violet-300">
                {activeSessionId ? `Oturum: ${Math.floor(messages.length / 2)} Tur` : `${Math.floor(messages.length / 2)} Tur`}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[9px] font-mono text-zinc-600">
            Mesajı gönder, yanıtı ve gerçek karar izini aynı yerde incele.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copyLastReport}
            disabled={!hasResult}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-[9px] font-mono font-bold text-zinc-300 hover:border-violet-500 hover:text-violet-200 disabled:cursor-not-allowed disabled:opacity-35"
          >
            {copied === "last" ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied === "last" ? "KOPYALANDI" : "SON TURU KOPYALA"}
          </button>
          <button
            type="button"
            onClick={copyFullSession}
            disabled={!activeSessionId || messages.length === 0 || isRestoring}
            className="flex items-center gap-1.5 rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-2 text-[9px] font-mono font-bold text-violet-200 hover:border-violet-400 hover:bg-violet-500/15 disabled:cursor-not-allowed disabled:opacity-35"
          >
            {copied === "all" ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied === "all" ? "KOPYALANDI" : "TÜM OTURUMU KOPYALA"}
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-auto p-3 lg:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.85fr)] lg:overflow-hidden">
        <section className="flex min-h-[560px] flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/35 lg:min-h-0">
          <div className="shrink-0 border-b border-zinc-800 bg-zinc-950/65 px-3 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <UserRound className="h-3.5 w-3.5 text-zinc-500" />
                <span className="text-[9px] font-mono text-zinc-500">
                  KONUŞAN
                </span>
                <div className="flex rounded-lg border border-zinc-800 bg-zinc-900 p-0.5">
                  {participants.map((participant) => {
                    const active = participant.id === selectedParticipantId;
                    return (
                      <button
                        key={participant.id}
                        type="button"
                        onClick={() => onSelectParticipant(participant.id)}
                        disabled={isLoading}
                        className={`rounded-md px-3 py-1.5 text-[10px] font-mono font-bold ${active ? "bg-violet-600 text-white" : "text-zinc-500 hover:text-zinc-200"}`}
                      >
                        {participant.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void onResetTestUser()}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-[9px] font-mono text-zinc-300 hover:border-amber-500 hover:text-amber-300 disabled:opacity-40"
                >
                  <RotateCcw className="h-3 w-3" />
                  YENİ OTURUM
                </button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowDangerMenu((value) => !value)}
                    className="rounded-lg border border-zinc-800 p-1.5 text-zinc-500 hover:text-zinc-200"
                    aria-label="Daha fazla işlem"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {showDangerMenu && (
                    <div className="absolute right-0 top-9 z-20 w-56 rounded-lg border border-zinc-700 bg-zinc-900 p-1.5 shadow-xl">
                      <button
                        type="button"
                        onClick={() => {
                          const approved = window.confirm(
                            "Mert ve Ali'nin tüm test sohbeti, ilişki ve hafıza kayıtları kalıcı olarak silinsin mi?",
                          );
                          if (!approved) return;
                          setShowDangerMenu(false);
                          void onClearAllTestData();
                        }}
                        className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[10px] font-mono text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        TÜM TEST VERİLERİNİ SİL
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-zinc-800/70 pt-2.5">
              <span className="text-[9px] font-mono text-zinc-500">
                OTURUM BAŞLANGICI
              </span>
              {(
                Object.entries(relationshipLabels) as Array<
                  [RelationshipTestLevel, string]
                >
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRelationshipLevel(value)}
                  disabled={isLoading}
                  className={`rounded-md border px-2.5 py-1 text-[9px] font-mono ${relationshipLevel === value ? "border-fuchsia-400/60 bg-fuchsia-500/15 text-fuchsia-200" : "border-zinc-800 text-zinc-500 hover:text-zinc-300"}`}
                >
                  {label}
                </button>
              ))}
              <span className="ml-auto hidden text-[8px] font-mono text-zinc-600 sm:block">
                Yalnızca ilk mesajda başlangıç ilişkisini kurar
              </span>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && !isLoading && (
              <div className="flex h-full min-h-72 flex-col items-center justify-center text-center">
                <MessageSquareText className="mb-3 h-7 w-7 text-zinc-800" />
                <p className="text-xs text-zinc-400">Temiz oturum hazır.</p>
                <p className="mt-1 text-[10px] font-mono text-zinc-600">
                  {activeParticipant?.label} için ilk mesajı gönder.
                </p>
              </div>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 ${message.sender === "user" ? "rounded-br-md border border-violet-500/25 bg-violet-500/15" : "rounded-bl-md border border-zinc-700 bg-zinc-800/80"}`}
                >
                  <div className="mb-1 text-[8px] font-mono text-zinc-500">
                    {message.sender === "user"
                      ? message.participantName || activeParticipant?.label
                      : `KAIRA${message.replyToParticipantName ? ` → ${message.replyToParticipantName}` : ""}`} {" "}
                    · {message.timestamp}
                  </div>
                  <p className="whitespace-pre-wrap text-[13px] leading-5 text-zinc-100">
                    {message.text}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-[10px] font-mono text-violet-300">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                KDM işliyor…
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-zinc-800 bg-zinc-950/65 p-3">
            <div className="flex gap-2">
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    submit();
                  }
                }}
                rows={2}
                placeholder={`${activeParticipant?.label || "Kişi"} olarak yaz…`}
                className="min-h-12 flex-1 resize-none rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-xs text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-violet-500"
              />
              <button
                type="button"
                onClick={submit}
                disabled={!text.trim() || isLoading}
                className="flex w-12 items-center justify-center rounded-xl bg-violet-600 text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-35"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
            <div className="mt-1.5 flex justify-between text-[8px] font-mono text-zinc-600">
              <span>Enter gönderir · Shift+Enter yeni satır</span>
              <span>{relationshipLabels[relationshipLevel]} ilişki testi</span>
            </div>
          </div>
        </section>

        <aside className="flex min-h-[520px] flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/35 lg:min-h-0">
          <div className="shrink-0 border-b border-zinc-800 px-3 pt-3">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <h2 className="text-[11px] font-bold text-zinc-100">
                  SON KARAR İZİ
                </h2>
                <p className="mt-0.5 text-[8px] font-mono text-zinc-600">
                  Yalnızca çalışan motordan gelen değerler
                </p>
              </div>
              {hasResult && (
                <span
                  className={`rounded-full border px-2 py-1 text-[8px] font-mono ${responseSource === "Yerel Dil Motoru" ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300" : "border-orange-500/30 bg-orange-500/10 text-orange-300"}`}
                >
                  {responseSource}
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-1">
              {inspectorTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setInspectorTab(tab.id)}
                    className={`flex flex-col items-center gap-1 rounded-t-lg border-b-2 px-1 py-2 text-[8px] font-mono ${inspectorTab === tab.id ? "border-violet-500 bg-violet-500/10 text-violet-200" : "border-transparent text-zinc-600 hover:text-zinc-300"}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {!hasResult ? (
              <EmptyInspector />
            ) : (
              <>
                {inspectorTab === "decision" && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3">
                      <DataRow label="YANIT KAYNAĞI" value={responseSource} accent />
                      <DataRow label="NİYET" value={reasoningTrace.messageInterpretation.intent} />
                      <DataRow label="DUYGU SİNYALİ" value={reasoningTrace.messageInterpretation.sentiment} />
                      <DataRow label="KARAR TONU" value={reasoningTrace.decision.chosenTone} />
                      <DataRow label="ANLIK RUH HALİ" value={reasoningTrace.currentMood.moodText} />
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[9px] font-mono font-bold text-zinc-300">
                          KDM DOĞRULAMASI
                        </span>
                        {consistency ? (
                          <span
                            className={`flex items-center gap-1 text-[9px] font-mono ${consistency.accepted ? "text-emerald-400" : "text-amber-300"}`}
                          >
                            {consistency.accepted ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <CircleAlert className="h-3 w-3" />
                            )}
                            {consistency.accepted ? "KABUL" : "SORUN VAR"}
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono text-zinc-600">
                            ÖLÇÜM YOK
                          </span>
                        )}
                      </div>
                      {consistency?.issues.length ? (
                        <ul className="space-y-1.5 text-[10px] leading-4 text-amber-200/80">
                          {consistency.issues.map((issue) => (
                            <li key={issue}>• {issue}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[10px] leading-4 text-zinc-500">
                          Deterministik kontrol bildirilen bir sorun bulmadı.
                        </p>
                      )}
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                      <p className="text-[9px] font-mono font-bold text-zinc-300">
                        KARAR AÇIKLAMASI
                      </p>
                      <p className="mt-2 text-[10px] leading-5 text-zinc-500">
                        {reasoningTrace.decision.explanation ||
                          "Açıklama üretilmedi."}
                      </p>
                    </div>
                  </div>
                )}

                {inspectorTab === "relationship" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        [
                          "Güven",
                          relationship?.trust ??
                            reasoningTrace.relationship.trustScore ??
                            50,
                        ],
                        [
                          "Sıcaklık",
                          relationship?.warmth ??
                            reasoningTrace.relationship.warmthScore,
                        ],
                        [
                          "Kırgınlık",
                          relationship?.hurtScore ??
                            reasoningTrace.relationship.hurtScore ??
                            0,
                        ],
                        [
                          "Çatışma",
                          relationship?.conflictScore ??
                            reasoningTrace.relationship.conflictScore ??
                            0,
                        ],
                      ].map(([label, value]) => (
                        <div
                          key={String(label)}
                          className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3"
                        >
                          <div className="text-[8px] font-mono text-zinc-600">
                            {label}
                          </div>
                          <div className="mt-1 text-xl font-mono font-bold text-zinc-100">
                            {value}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3">
                      <DataRow label="KULLANICI" value={reasoningTrace.whoSent.userName} />
                      <DataRow label="YENİ KULLANICI" value={reasoningTrace.whoSent.isNewUser ? "Evet" : "Hayır"} />
                      <DataRow label="ETKİLEŞİM" value={relationship?.interactionCount ?? reasoningTrace.relationship.interactionCount ?? 0} />
                      <DataRow label="TEKRAR EDEN NEGATİF" value={relationship?.repeatedNegativeCount ?? reasoningTrace.relationship.repeatedNegativeCount ?? 0} />
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                      <div className="flex items-center justify-between text-[9px] font-mono">
                        <span className="text-zinc-500">SICAKLIK DEĞİŞİMİ</span>
                        <span
                          className={
                            reasoningTrace.memoryUpdate.warmthDelta >= 0
                              ? "text-emerald-400"
                              : "text-red-300"
                          }
                        >
                          {reasoningTrace.memoryUpdate.warmthBefore} → {reasoningTrace.memoryUpdate.warmthAfter} ({reasoningTrace.memoryUpdate.warmthDelta >= 0 ? "+" : ""}{reasoningTrace.memoryUpdate.warmthDelta})
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {inspectorTab === "memory" && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3">
                      <DataRow label="OTURUM MESAJI" value={reasoningTrace.relationship.interactionCount ?? relationship?.interactionCount ?? 0} />
                      <DataRow label="HAFIZA KARARI" value={reasoningTrace.memoryUpdate.reason || "Açıklama yok"} />
                      <DataRow label="RUH HALİ DEĞİŞİMİ" value={reasoningTrace.memoryUpdate.moodChange || "Stabil"} />
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                      <div className="flex items-center gap-2 text-[9px] font-mono font-bold text-zinc-300">
                        <Activity className="h-3.5 w-3.5 text-cyan-400" />
                        SON MESAJ BAĞLAMI
                      </div>
                      <p className="mt-2 rounded-lg bg-black/25 p-2.5 text-[10px] leading-5 text-zinc-400">
                        {reasoningTrace.messageInterpretation.explanation ||
                          "Bağlam açıklaması üretilmedi."}
                      </p>
                    </div>
                    <p className="text-[9px] font-mono leading-5 text-zinc-600">
                      Bu panel yalnızca sunucunun döndürdüğü hafıza özetini
                      gösterir; tahmini “aktivasyon” puanı üretmez.
                    </p>
                  </div>
                )}

                {inspectorTab === "performance" && timings && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
                      <Clock3 className="mx-auto h-4 w-4 text-emerald-400" />
                      <div className="mt-1 text-2xl font-mono font-bold text-emerald-300">
                        {fmt(timings.totalMs)}
                      </div>
                      <div className="mt-1 text-[8px] font-mono text-zinc-600">
                        TOPLAM YANIT SÜRESİ
                      </div>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3">
                      <DataRow label="İSTEMCİ HAZIRLIK" value={fmt(timings.clientPrepMs)} />
                      <DataRow label="HAFIZA / FIRESTORE" value={fmt(timings.memoryMs)} />
                      <DataRow label="KDM + DİL KİMLİĞİ" value={fmt(timings.kdmMs)} />
                      <DataRow label="AI / MODEL" value={timings.aiMs === 0 ? "Çağrılmadı" : fmt(timings.aiMs)} accent={timings.aiMs === 0} />
                      <DataRow label="KAYIT + DOĞRULAMA" value={fmt(timings.postProcessMs)} />
                      <DataRow label="AĞ / DİĞER" value={fmt(timings.networkAndOverheadMs)} />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="shrink-0 border-t border-zinc-800 bg-zinc-950/50">
            <button
              type="button"
              onClick={() => setShowRawTrace((value) => !value)}
              className="flex w-full items-center justify-between px-4 py-2.5 text-[9px] font-mono text-zinc-500 hover:text-zinc-300"
            >
              <span>HAM KNT İZİ</span>
              {showRawTrace ? (
                <X className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
            {showRawTrace && (
              <pre className="max-h-48 overflow-auto border-t border-zinc-800 p-3 text-[8px] leading-4 text-zinc-500">
                {JSON.stringify(
                  {
                    providerUsed,
                    messageInterpretation:
                      reasoningTrace.messageInterpretation,
                    decision: reasoningTrace.decision,
                    relationship: reasoningTrace.relationship,
                    currentMood: reasoningTrace.currentMood,
                    memoryUpdate: reasoningTrace.memoryUpdate,
                    dynamicState,
                    personality: {
                      patience: personality.patience,
                      empathy: personality.empathy,
                      humor: personality.humor,
                    },
                    consistency,
                    timings,
                  },
                  null,
                  2,
                )}
              </pre>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

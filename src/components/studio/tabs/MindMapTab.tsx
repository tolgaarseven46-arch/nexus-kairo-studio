import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BrainCircuit,
  Send,
  Loader2,
  Activity,
  Gauge,
  Copy,
  Check,
  Trash2,
  RotateCcw,
} from "lucide-react";
import {
  DroitDynamicState,
  DroitPersonalityTraits,
  ReasoningTrace,
  TestMessage,
} from "../../../types/nexus";
import type { KairoTimingMetrics } from "../../../services/droitChatService";
type RelationshipTestLevel = "new" | "familiar" | "close";
type MindMapSendOptions = { relationshipLevel?: RelationshipTestLevel };
type Props = {
  personality: DroitPersonalityTraits;
  dynamicState: DroitDynamicState;
  reasoningTrace: ReasoningTrace;
  messages: TestMessage[];
  isLoading: boolean;
  timings: KairoTimingMetrics | null;
  providerUsed: string | null;
  participants: ReadonlyArray<{ id: string; label: string }>;
  selectedParticipantId: string;
  onSelectParticipant: (id: string) => void;
  onSendMessage: (text: string, options?: MindMapSendOptions) => void;
  onResetTestUser: () => void | Promise<void>;
  onClearAllTestData: () => void | Promise<void>;
};
type TraceScores = {
  input: number;
  intent: number;
  memory: number;
  emotion: number;
  relation: number;
  personality: number;
  decision: number;
  ai: number;
};
type TraceLog = {
  id: string;
  time: string;
  message: string;
  scores: TraceScores;
  intent: string;
  sentiment: string;
  timings?: KairoTimingMetrics;
};
const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
const fmt = (ms: number) =>
  ms >= 1000 ? `${(ms / 1000).toFixed(2)} sn` : `${ms} ms`;
const Node = ({
  label,
  value,
  items,
}: {
  label: string;
  value: number;
  items: string[];
}) => (
  <div
    className={`rounded-xl border bg-zinc-950/80 p-3 ${value >= 80 ? "border-red-500/60 text-red-300" : value >= 60 ? "border-orange-500/50 text-orange-300" : value >= 40 ? "border-yellow-500/40 text-yellow-200" : "border-cyan-500/30 text-cyan-300"}`}
  >
    <div className="flex justify-between text-[10px] font-mono font-bold">
      <span>{label}</span>
      <span className="text-base">{value}</span>
    </div>
    <div className="mt-2 space-y-1">
      {items.map((x, i) => (
        <div key={i} className="text-[9px] font-mono text-zinc-400">
          • {x}
        </div>
      ))}
    </div>
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
  participants,
  selectedParticipantId,
  onSelectParticipant,
  onSendMessage,
  onResetTestUser,
  onClearAllTestData,
}) => {
  const [text, setText] = useState("");
  const [lastSubmittedMessage, setLastSubmittedMessage] = useState("");
  const [relationshipLevel, setRelationshipLevel] =
    useState<RelationshipTestLevel>("new");
  const [copied, setCopied] = useState(false);
  const activeParticipant =
    participants.find(
      (participant) => participant.id === selectedParticipantId,
    ) ?? participants[0];
  const [logs, setLogs] = useState<TraceLog[]>(() => {
    try {
      return JSON.parse(
        localStorage.getItem("kaira_neural_trace_logs") || "[]",
      );
    } catch {
      return [];
    }
  });
  const lastLoggedReply = useRef("");
  const r = dynamicState.relationship;
  const scores = useMemo<TraceScores>(
    () => ({
      input: 35,
      intent: clamp(
        reasoningTrace.messageInterpretation.sentiment === "negatif"
          ? 85
          : reasoningTrace.messageInterpretation.intent === "genel_sohbet"
            ? 35
            : 60,
      ),
      memory: clamp(
        25 +
          (r?.repeatedNegativeCount || 0) * 15 +
          (r?.interactionCount || 0) / 2,
      ),
      emotion: clamp(
        dynamicState.anger * 0.45 +
          dynamicState.stress * 0.25 +
          (100 - dynamicState.calmness) * 0.3,
      ),
      relation: clamp(
        (r?.hurtScore || 0) * 0.35 +
          (r?.conflictScore || 0) * 0.35 +
          (100 - (r?.trust || 50)) * 0.3,
      ),
      personality: clamp(
        (personality.emotionalSensitivity +
          personality.anger +
          (100 - personality.patience)) /
          3,
      ),
      decision: clamp(
        45 + (r?.conflictScore || 0) * 0.35 + (r?.hurtScore || 0) * 0.2,
      ),
      ai: isLoading ? 100 : timings?.aiMs === 0 ? 0 : reasoningTrace ? 75 : 0,
    }),
    [personality, dynamicState, reasoningTrace, isLoading, r, timings],
  );
  useEffect(() => {
    if (isLoading) return;
    const reply = [...messages].reverse().find((m) => m.sender === "droit"),
      idx = reply ? messages.findIndex((m) => m.id === reply.id) : -1;
    if (!reply || idx < 0 || reply.id === lastLoggedReply.current) return;
    const user = [...messages.slice(0, idx)]
      .reverse()
      .find((m) => m.sender === "user");
    if (!user) return;
    lastLoggedReply.current = reply.id;
    const entry: TraceLog = {
      id: reply.id,
      time: reply.timestamp,
      message: user.text,
      scores: { ...scores, ai: timings?.aiMs === 0 ? 0 : 75 },
      intent: reasoningTrace.messageInterpretation.intent,
      sentiment: reasoningTrace.messageInterpretation.sentiment,
      ...(timings ? { timings } : {}),
    };
    setLogs((p) => {
      const n = [entry, ...p].slice(0, 100);
      try {
        localStorage.setItem("kaira_neural_trace_logs", JSON.stringify(n));
      } catch {}
      return n;
    });
  }, [isLoading, messages, reasoningTrace, scores, timings]);
  const submit = () => {
    if (!text.trim() || isLoading) return;
    const submitted = text.trim();
    setLastSubmittedMessage(submitted);
    onSendMessage(submitted, { relationshipLevel });
    setText("");
  };
  const presets = [
    "bugün moralim biraz bozuk ya",
    "yine bütün işi son dakikaya bıraktım hahah",
    "ne anlatıyorsun ya hiçbir şey anlamadım",
    "naber",
  ];
  const timingItems = timings
    ? ([
        ["İstemci hazırlık", timings.clientPrepMs],
        ["Hafıza / Firestore", timings.memoryMs],
        ["KDM + konuşma kimliği", timings.kdmMs],
        ["AI / model", timings.aiMs],
        ["Kayıt + doğrulama", timings.postProcessMs],
        ["Ağ / diğer", timings.networkAndOverheadMs],
      ] as const)
    : [];
  const copyReport = async () => {
    const lastUser = [...messages].reverse().find((m) => m.sender === "user");
    const lastKairo = [...messages].reverse().find((m) => m.sender === "droit");
    const sourceLabel =
      providerUsed === "local_language" ? "Yerel Dil Motoru" : "AI";
    const report = `KAIRA KNT DEBUG RAPORU\nMesaj: ${lastUser?.text || lastSubmittedMessage || "-"}\nKonuşan: ${lastUser?.participantName || activeParticipant?.label || "-"}\nYanıt: ${lastKairo?.text || "-"}\nYanıt kaynağı: ${sourceLabel}\nNiyet: ${reasoningTrace.messageInterpretation.intent}\nDuygu sinyali: ${reasoningTrace.messageInterpretation.sentiment}\nAktivasyonlar: ÖnBeyin=${scores.input}, Niyet=${scores.intent}, Hafıza=${scores.memory}, Duygu=${scores.emotion}, İlişki=${scores.relation}, Kişilik=${scores.personality}, Karar=${scores.decision}, AI=${scores.ai}\nİlişki: güven=${r?.trust ?? 50}, sıcaklık=${r?.warmth ?? 50}, kırgınlık=${r?.hurtScore || 0}, çatışma=${r?.conflictScore || 0}, tekrar=${r?.repeatedNegativeCount || 0}\nSüreler: ${timings ? `istemci=${timings.clientPrepMs}ms, hafıza=${timings.memoryMs}ms, KDM=${timings.kdmMs}ms, AI=${timings.aiMs}ms, kayıt=${timings.postProcessMs}ms, ağ=${timings.networkAndOverheadMs}ms, toplam=${timings.totalMs}ms` : "ölçüm yok"}`;
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };
  return (
    <div className="flex-1 min-h-0 grid grid-cols-[1fr_360px] gap-3 p-3 bg-zinc-950 overflow-hidden">
      <section className="min-h-0 overflow-auto rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
        <div className="flex justify-between mb-3">
          <div className="flex gap-2 items-center">
            <BrainCircuit className="w-4 h-4 text-violet-400" />
            <span className="text-xs font-mono font-bold">
              KAIRA ZİHİN HARİTASI
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyReport}
              className="flex items-center gap-1 rounded border border-zinc-700 px-2 py-1 text-[9px] font-mono text-zinc-300 hover:border-violet-500 hover:text-violet-200"
            >
              {copied ? (
                <Check className="w-3 h-3" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
              {copied ? "KOPYALANDI" : "KNT RAPORUNU KOPYALA"}
            </button>
            <span className="text-[9px] font-mono text-emerald-400">
              ● CANLI KDM
            </span>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <Node
            label="1 · ÖN BEYİN"
            value={scores.input}
            items={["Mesaj alındı", "Ön çözümleme"]}
          />
          <Node
            label="2 · NİYET"
            value={scores.intent}
            items={[
              reasoningTrace.messageInterpretation.intent,
              reasoningTrace.messageInterpretation.sentiment,
            ]}
          />
          <Node
            label="3 · HAFIZA"
            value={scores.memory}
            items={[
              `Etkileşim ${r?.interactionCount || 0}`,
              `Tekrar ${r?.repeatedNegativeCount || 0}`,
            ]}
          />
          <Node
            label="4 · DUYGU"
            value={scores.emotion}
            items={[
              `Öfke ${dynamicState.anger}`,
              `Stres ${dynamicState.stress}`,
            ]}
          />
          <Node
            label="5 · İLİŞKİ"
            value={scores.relation}
            items={[
              `Güven ${r?.trust ?? 50}`,
              `Kırgınlık ${r?.hurtScore || 0}`,
            ]}
          />
          <Node
            label="6 · KİŞİLİK"
            value={scores.personality}
            items={[
              `Sabır ${personality.patience}`,
              `Empati ${personality.empathy}`,
            ]}
          />
          <Node
            label="7 · KARAR"
            value={scores.decision}
            items={[reasoningTrace.decision.chosenTone, "KDM entegrasyonu"]}
          />
          <Node
            label="8 · AI"
            value={scores.ai}
            items={[
              isLoading
                ? "AI işliyor…"
                : timings?.aiMs === 0
                  ? "Yerel dil motoru"
                  : "AI hazır",
              timings?.aiMs === 0 ? "AI çağrısı yok" : "Yanıt üretimi",
            ]}
          />
        </div>
        <div className="mt-4 rounded-xl border border-zinc-800 bg-black/30 p-3">
          <div className="flex items-center gap-2 text-[10px] font-mono font-bold mb-2">
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
            GECİKME EKG'Sİ{" "}
            {timings && (
              <span className="ml-auto text-emerald-400">
                TOPLAM {fmt(timings.totalMs)}
              </span>
            )}
          </div>
          {isLoading ? (
            <div className="text-[10px] font-mono text-violet-300">
              Ölçülüyor…
            </div>
          ) : timings ? (
            <div className="grid grid-cols-3 gap-2">
              {timingItems.map(([name, ms]) => (
                <div key={name} className="rounded border border-zinc-800 p-2">
                  <div className="text-[8px] font-mono text-zinc-500">
                    {name}
                  </div>
                  <div
                    className={`text-sm font-mono font-bold ${ms > 2000 ? "text-red-300" : ms > 700 ? "text-yellow-300" : "text-emerald-300"}`}
                  >
                    {fmt(ms)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[9px] font-mono text-zinc-600">
              Bir mesaj gönder; Kaira'nın nerede beklediğini burada ölçeceğiz.
            </div>
          )}
        </div>
        <div className="mt-4 rounded-xl border border-zinc-800 bg-black/20 overflow-hidden">
          <div className="flex justify-between px-3 py-2 border-b border-zinc-800">
            <div className="flex gap-2 items-center text-[10px] font-mono font-bold">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              NEURAL TRACE LOG
            </div>
            <button
              onClick={() => {
                setLogs([]);
                localStorage.removeItem("kaira_neural_trace_logs");
              }}
              className="text-[9px] text-zinc-500"
            >
              Temizle
            </button>
          </div>
          <div className="max-h-44 overflow-auto divide-y divide-zinc-900">
            {logs.map((l) => (
              <div key={l.id} className="p-2.5">
                <div className="flex justify-between text-[9px] font-mono">
                  <span>“{l.message}”</span>
                  <span className="text-zinc-600">{l.time}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-2 text-[8px] font-mono text-zinc-500">
                  <span>Niyet {l.scores.intent}</span>
                  <span>Hafıza {l.scores.memory}</span>
                  <span>Duygu {l.scores.emotion}</span>
                  <span>Karar {l.scores.decision}</span>
                  {l.timings && (
                    <span className="text-emerald-400">
                      Süre {fmt(l.timings.totalMs)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <aside className="min-h-0 flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <div className="px-3 py-2 border-b border-zinc-800 flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold">
            KAIRO CHAT · CANLI TEST
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                void onResetTestUser();
                setLogs([]);
                localStorage.removeItem("kaira_neural_trace_logs");
              }}
              disabled={isLoading}
              title="İlişki state ve tekrar sayaçlarını sıfırla"
              className="flex items-center gap-1 rounded border border-amber-700/60 px-2 py-1 text-[9px] font-mono text-amber-300 hover:border-amber-400 disabled:opacity-40"
            >
              <RotateCcw className="w-3 h-3" />
              YENİ OTURUM
            </button>
            <button
              onClick={() => {
                const approved = window.confirm(
                  "Mert ve Ali'nin tüm test sohbeti, KDM, KNT, ilişki ve dil hafızası kayıtları kalıcı olarak silinsin mi?",
                );
                if (!approved) return;
                void onClearAllTestData();
                setLogs([]);
                localStorage.removeItem("kaira_neural_trace_logs");
              }}
              disabled={isLoading}
              title="Mert ve Ali test sohbeti, ilişki, hafıza ve KNT kayıtlarını temizle"
              className="flex items-center gap-1 rounded border border-red-800/70 px-2 py-1 text-[9px] font-mono text-red-300 hover:border-red-500 disabled:opacity-40"
            >
              <Trash2 className="w-3 h-3" />
              TÜMÜNÜ SİL
            </button>
          </div>
        </div>
        <div className="border-b border-zinc-800 bg-zinc-950/60 px-3 py-2">
          <div className="mb-1.5 flex items-center justify-between font-mono text-[8px] text-zinc-500">
            <span>KONUŞAN KİŞİ</span>
            <span>AYRI İLİŞKİ + HAFIZA</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {participants.map((participant) => {
              const isActive = participant.id === selectedParticipantId;
              return (
                <button
                  key={participant.id}
                  type="button"
                  onClick={() => onSelectParticipant(participant.id)}
                  disabled={isLoading}
                  className={`rounded-lg border px-3 py-2 text-[10px] font-mono font-bold transition-colors disabled:opacity-40 ${
                    isActive
                      ? "border-violet-400 bg-violet-500/20 text-violet-200"
                      : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                  }`}
                >
                  {isActive ? "● " : ""}
                  {participant.label}
                </button>
              );
            })}
          </div>
          <div className="mt-2 border-t border-zinc-800 pt-2">
            <div className="mb-1.5 flex items-center justify-between font-mono text-[8px] text-zinc-500">
              <span>OTURUM BAŞLANGICI</span>
              <span>SONRAKİ MESAJLAR DEVAM EDER</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {([
                ["new", "Yeni"],
                ["familiar", "Tanıdık"],
                ["close", "Çok yakın"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRelationshipLevel(value)}
                  disabled={isLoading}
                  className={`rounded border px-2 py-1.5 text-[9px] font-mono font-bold ${relationshipLevel === value ? "border-fuchsia-400 bg-fuchsia-500/20 text-fuchsia-200" : "border-zinc-700 bg-zinc-900 text-zinc-500"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-3 space-y-2">
          {messages.slice(-12).map((m) => (
            <div
              key={m.id}
              className={`rounded-lg p-2 text-[11px] ${m.sender === "user" ? "ml-8 bg-indigo-500/15 border border-indigo-500/20" : "mr-8 bg-zinc-800 border border-zinc-700"}`}
            >
              <div className="text-[8px] text-zinc-500">
                {m.sender === "user"
                  ? m.participantName || "SEN"
                  : `KAIRO${m.replyToParticipantName ? ` → ${m.replyToParticipantName}` : ""}`}{" "}
                · {m.timestamp}
              </div>
              {m.text}
            </div>
          ))}
          {messages.length === 0 && !isLoading && (
            <div className="h-full flex items-center justify-center text-center text-[9px] font-mono text-zinc-600 px-6">
              Temiz oturum hazır. İlk mesajdan sonra sohbet geçmişi ve duygu durumu devam eder.
            </div>
          )}
          {isLoading && (
            <div className="flex gap-2 text-[10px] text-violet-300">
              <Loader2 className="w-3 h-3 animate-spin" />
              İşleniyor…
            </div>
          )}
        </div>
        <div className="p-3 border-t border-zinc-800 space-y-2">
          <div className="grid grid-cols-4 gap-1.5">
            {presets.map((preset, index) => (
              <button
                key={preset}
                type="button"
                onClick={() => setText(preset)}
                disabled={isLoading}
                className="rounded border border-zinc-800 bg-zinc-950 px-1 py-1 text-[8px] font-mono text-zinc-400 hover:border-violet-500 hover:text-violet-200 disabled:opacity-40"
              >
                Örnek {index + 1}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder={`${activeParticipant?.label || "Kişi"} · ${relationshipLevel === "new" ? "Yeni" : relationshipLevel === "familiar" ? "Tanıdık" : "Çok yakın"} olarak yaz…`}
              className="flex-1 min-w-0 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs"
            />
            <button
              onClick={submit}
              disabled={isLoading}
              className="rounded-lg bg-violet-600 px-3"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};

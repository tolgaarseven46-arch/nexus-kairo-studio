import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Copy, RefreshCw } from 'lucide-react';
import { loadRecentKntTraces } from '../../services/kdmPersistenceService';

interface KntTurnDebugPanelProps {
  userId?: string;
}

const stateLine = (trace: any) => {
  const state = trace?.dynamicState || {};
  const relationship = state?.relationship || {};
  return [
    `calm=${state.calmness ?? '-'}`,
    `anger=${state.anger ?? '-'}`,
    `stress=${state.stress ?? '-'}`,
    `happy=${state.happiness ?? '-'}`,
    `warmth=${relationship.warmth ?? '-'}`,
    `trust=${relationship.trust ?? '-'}`,
    `hurt=${relationship.hurtScore ?? '-'}`,
    `conflict=${relationship.conflictScore ?? '-'}`,
  ].join(' · ');
};

const semanticLine = (trace: any) => {
  const semantic = trace?.semanticInterpretation || {};
  const facets = semantic?.discourseFacets || {};
  const uncertainty = semantic?.uncertainty || {};
  return [
    `intent=${semantic.primaryIntent ?? '-'}`,
    `target=${semantic.target ?? '-'}`,
    `routine=${facets.socialRoutine ?? '-'}`,
    `act=${facets.discourseAct ?? '-'}`,
    `repair=${facets.repairSignal ?? '-'}`,
    `advice=${facets.adviceRequested ?? '-'}`,
    `stopQ=${facets.stopQuestions ?? '-'}`,
    `stopTalk=${facets.stopTalking ?? '-'}`,
    `uncertainty=${typeof uncertainty.overall === 'number' ? uncertainty.overall.toFixed(2) : '-'}`,
  ].join(' · ');
};

const turnText = (trace: any, index: number) => [
  `TUR ${index + 1}`,
  `Mesaj: ${trace?.userMessage ?? ''}`,
  `Yanıt: ${trace?.reply ?? ''}`,
  `Niyet: ${trace?.reasoningTrace?.messageInterpretation?.intent ?? '-'}`,
  `Duygu: ${trace?.reasoningTrace?.messageInterpretation?.sentiment ?? '-'}`,
  `ReactionMode: ${trace?.dynamicState?.reactionMode ?? trace?.reasoningTrace?.currentMood?.reactionMode ?? 'neutral'}`,
  `Durum: ${stateLine(trace)}`,
  `Provider: ${trace?.providerUsed ?? '-'}`,
  `SemanticSource: ${trace?.semanticSource ?? '-'}`,
  `Canonical: ${semanticLine(trace)}`,
].join('\n');

async function copyText(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.style.position = 'fixed';
  area.style.left = '-999999px';
  document.body.appendChild(area);
  area.select();
  document.execCommand('copy');
  area.remove();
}

export const KntTurnDebugPanel: React.FC<KntTurnDebugPanelProps> = ({ userId = 'test_user_x' }) => {
  const [traces, setTraces] = useState<any[]>([]);
  const [selected, setSelected] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<'turn' | 'all' | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const recent = await loadRecentKntTraces(20, userId);
      const chronological = [...recent].reverse();
      setTraces(chronological);
      setSelected(Math.max(0, chronological.length - 1));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, [userId]);

  const current = traces[selected];
  const intent = current?.reasoningTrace?.messageInterpretation?.intent ?? '-';
  const sentiment = current?.reasoningTrace?.messageInterpretation?.sentiment ?? '-';
  const reactionMode = current?.dynamicState?.reactionMode ?? current?.reasoningTrace?.currentMood?.reactionMode ?? 'neutral';
  const allText = useMemo(
    () => traces.map((trace, index) => turnText(trace, index)).join('\n\n--------------------\n\n'),
    [traces],
  );

  const handleCopy = async (mode: 'turn' | 'all') => {
    if (mode === 'turn' && !current) return;
    await copyText(mode === 'all' ? allText : turnText(current, selected));
    setCopied(mode);
    window.setTimeout(() => setCopied(null), 1500);
  };

  return (
    <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3.5 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-[11px] font-mono font-bold tracking-wider text-zinc-200 uppercase">KNT Tur Gezgini</h3>
          <p className="text-[9px] font-mono text-zinc-500">Son 20 gerçek runtime snapshot · tur bazlı</p>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={loading} className="p-1.5 rounded-md border border-zinc-800 text-zinc-500 hover:text-zinc-200 disabled:opacity-50" title="Yenile">
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {traces.length === 0 ? (
        <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-[10px] font-mono text-zinc-500">
          Henüz KNT tur kaydı yok.
        </div>
      ) : (
        <>
          <div className="mt-3 flex gap-1 overflow-x-auto pb-1">
            {traces.map((trace, index) => (
              <button
                key={trace?.id ?? index}
                type="button"
                onClick={() => { setSelected(index); setDetailsOpen(false); }}
                className={`shrink-0 min-w-8 rounded-md border px-2 py-1 text-[9px] font-mono ${selected === index ? 'border-indigo-400/60 bg-indigo-500/15 text-indigo-200' : 'border-zinc-800 bg-zinc-950/60 text-zinc-500 hover:text-zinc-300'}`}
                title={String(trace?.userMessage ?? '')}
              >
                {index + 1}
              </button>
            ))}
          </div>

          <div className="mt-2 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[9px] font-mono text-zinc-500">Tur {selected + 1} / {traces.length}</div>
                <div className="mt-1 text-xs text-zinc-200 truncate">{current?.userMessage ?? ''}</div>
                <div className="mt-1 text-[10px] text-zinc-400 line-clamp-2">{current?.reply ?? ''}</div>
              </div>
              <span className="shrink-0 rounded border border-zinc-700 px-1.5 py-0.5 text-[9px] font-mono text-zinc-300">{reactionMode}</span>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-1.5 text-[9px] font-mono sm:grid-cols-4">
              <div className="rounded border border-zinc-800 px-2 py-1"><span className="text-zinc-500">Niyet </span><span className="text-zinc-200">{intent}</span></div>
              <div className="rounded border border-zinc-800 px-2 py-1"><span className="text-zinc-500">Duygu </span><span className="text-zinc-200">{sentiment}</span></div>
              <div className="rounded border border-zinc-800 px-2 py-1"><span className="text-zinc-500">Provider </span><span className="text-zinc-200">{current?.providerUsed ?? '-'}</span></div>
              <div className="rounded border border-zinc-800 px-2 py-1"><span className="text-zinc-500">Semantic </span><span className="text-zinc-200">{current?.semanticSource ?? '-'}</span></div>
            </div>

            <div className="mt-2 text-[9px] font-mono text-zinc-500 break-words">{stateLine(current)}</div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-zinc-800/70 pt-2">
              <button type="button" onClick={() => void handleCopy('turn')} className="flex items-center gap-1 rounded border border-zinc-800 px-2 py-1 text-[9px] font-mono text-zinc-400 hover:text-zinc-200">
                {copied === 'turn' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />} Son turu kopyala
              </button>
              <button type="button" onClick={() => void handleCopy('all')} className="flex items-center gap-1 rounded border border-zinc-800 px-2 py-1 text-[9px] font-mono text-zinc-400 hover:text-zinc-200">
                {copied === 'all' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />} 20 turun tamamı
              </button>
              <button type="button" onClick={() => setDetailsOpen((value) => !value)} className="ml-auto flex items-center gap-1 rounded px-2 py-1 text-[9px] font-mono text-zinc-500 hover:text-zinc-300">
                Teknik detay {detailsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {detailsOpen && (
              <pre className="mt-2 max-h-64 overflow-auto rounded border border-zinc-800 bg-black/30 p-2 text-[9px] leading-relaxed text-zinc-400 whitespace-pre-wrap break-words">
                {JSON.stringify({
                  semanticSource: current?.semanticSource,
                  semanticInterpretation: current?.semanticInterpretation,
                  semanticEvent: current?.semanticEvent,
                  timings: current?.timings,
                  speechIdentity: current?.speechIdentity,
                  controlledSpontaneity: current?.controlledSpontaneity,
                  languageStyleMemory: current?.languageStyleMemory,
                  worldStateAppraisal: current?.worldStateAppraisal,
                  worldReasoningPolicy: current?.worldReasoningPolicy,
                  worldMemoryGuard: current?.worldMemoryGuard,
                  responsePlan: current?.responsePlan,
                }, null, 2)}
              </pre>
            )}
          </div>
        </>
      )}
    </section>
  );
};

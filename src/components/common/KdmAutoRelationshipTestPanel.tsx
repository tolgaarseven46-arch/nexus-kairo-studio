import React, { useMemo, useState } from 'react';
import { DroitDynamicState, DroitPersonalityTraits } from '../../types/nexus';
import { analyzeKdmInteraction } from '../../services/kdmConsistencyEngine';

interface KdmAutoRelationshipTestPanelProps {
  personality: DroitPersonalityTraits;
}

const BASE_STATE: DroitDynamicState = {
  calmness: 75,
  anger: 20,
  stress: 15,
  happiness: 65,
  confidence: 85,
  surprise: 10,
  lastStatus: 'Sakin ve kontrollü',
};

const TEST_CASES = [
  { label: 'Hakaret', message: 'aptal' },
  { label: 'Özür', message: 'özür dilerim, biraz sert davrandım' },
  { label: 'Pozitif', message: 'iyi ki varsın kanka' },
  { label: 'Nötr', message: 'sunucu durumu nasıl' },
];

export const KdmAutoRelationshipTestPanel: React.FC<KdmAutoRelationshipTestPanelProps> = ({ personality }) => {
  const [message, setMessage] = useState('aptal');
  const [runId, setRunId] = useState(0);

  const result = useMemo(() => {
    const now = Date.now();
    const newUserState: DroitDynamicState = {
      ...BASE_STATE,
      relationship: {
        firstSeenAt: new Date(now).toISOString(),
        lastInteractionAt: new Date(now).toISOString(),
        interactionCount: 0,
        familiarityDays: 0,
        warmth: 50,
      },
    };
    const closeUserState: DroitDynamicState = {
      ...BASE_STATE,
      relationship: {
        firstSeenAt: new Date(now - 35 * 86400000).toISOString(),
        lastInteractionAt: new Date(now - 3600000).toISOString(),
        interactionCount: 48,
        familiarityDays: 35,
        warmth: 82,
      },
    };

    const x = analyzeKdmInteraction(message, personality, newUserState);
    const y = analyzeKdmInteraction(message, personality, closeUserState);
    const warmthGap = Math.abs(x.trace.memoryUpdate.warmthDelta - y.trace.memoryUpdate.warmthDelta);
    const toleranceGap = Math.round(Math.abs((x.trace.relationship.toleranceMultiplier ?? 1) - (y.trace.relationship.toleranceMultiplier ?? 1)) * 100);
    const stateGap = Math.abs((x.nextDynamicState.stress ?? 0) - (y.nextDynamicState.stress ?? 0)) + Math.abs((x.nextDynamicState.happiness ?? 0) - (y.nextDynamicState.happiness ?? 0));
    const relationshipEffect = warmthGap > 0 || toleranceGap >= 10 || stateGap > 0;

    return { x, y, warmthGap, toleranceGap, stateGap, relationshipEffect };
  }, [message, personality, runId]);

  const card = (title: string, data: typeof result.x) => (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-2.5">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-mono font-bold text-zinc-200">{title}</span>
        <span className="text-[9px] font-mono text-zinc-500">{data.trace.relationship.familiarityDays ?? 0} gün</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5 text-[9px] font-mono">
        <div className="rounded bg-zinc-900 p-1.5"><span className="text-zinc-500">Warmth</span><div className="font-bold text-zinc-200">{data.trace.relationship.warmthScore}/100</div></div>
        <div className="rounded bg-zinc-900 p-1.5"><span className="text-zinc-500">Tepki katsayısı</span><div className="font-bold text-zinc-200">%{Math.round((data.trace.relationship.toleranceMultiplier ?? 1) * 100)}</div></div>
        <div className="rounded bg-zinc-900 p-1.5"><span className="text-zinc-500">Warmth değişimi</span><div className="font-bold text-zinc-200">{data.trace.memoryUpdate.warmthDelta > 0 ? '+' : ''}{data.trace.memoryUpdate.warmthDelta}</div></div>
        <div className="rounded bg-zinc-900 p-1.5"><span className="text-zinc-500">Durum</span><div className="font-bold text-zinc-200">{data.nextDynamicState.lastStatus}</div></div>
      </div>
    </div>
  );

  return (
    <div className="rounded-lg border border-cyan-500/20 bg-cyan-950/10 px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-300">Otomatik KDM İlişki Testi · X/Y</div>
          <div className="text-[9px] font-mono text-zinc-500">AI çağrısı yapmaz. Aynı mesajı yeni kullanıcı ve yakın kullanıcı için milisaniyeler içinde karşılaştırır.</div>
        </div>
        <div className={`rounded-md border px-2 py-1 text-[9px] font-mono font-bold ${result.relationshipEffect ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/30 bg-rose-500/10 text-rose-300'}`}>
          {result.relationshipEffect ? 'İLİŞKİ ETKİSİ VAR ✓' : 'FARK YOK ✗'}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-1.5 overflow-x-auto">
        {TEST_CASES.map((test) => (
          <button key={test.label} type="button" onClick={() => setMessage(test.message)} className="shrink-0 rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-[9px] font-mono text-zinc-300 hover:border-cyan-500/40">
            {test.label}
          </button>
        ))}
        <input value={message} onChange={(e) => setMessage(e.target.value)} className="min-w-[180px] flex-1 rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-[10px] text-zinc-200 outline-none focus:border-cyan-500/50" />
        <button type="button" onClick={() => setRunId((v) => v + 1)} className="shrink-0 rounded bg-cyan-600 px-2.5 py-1 text-[9px] font-mono font-bold text-white hover:bg-cyan-500">Tekrar Çalıştır</button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        {card('Kullanıcı X · Yeni', result.x)}
        {card('Kullanıcı Y · 35 Gün / Yakın', result.y)}
      </div>

      <div className="mt-2 flex items-center gap-3 rounded bg-zinc-950/70 px-2 py-1.5 text-[9px] font-mono text-zinc-400">
        <span>Warmth farkı: <b className="text-zinc-200">{result.warmthGap}</b></span>
        <span>Tepki farkı: <b className="text-zinc-200">%{result.toleranceGap}</b></span>
        <span>Ruh hali farkı: <b className="text-zinc-200">{result.stateGap}</b></span>
      </div>
    </div>
  );
};

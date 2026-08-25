import React, { useMemo, useState } from 'react';
import { DroitDynamicState, DroitPersonalityTraits } from '../../types/nexus';
import { analyzeKdmInteraction } from '../../services/kdmConsistencyEngine';

interface KdmAutoRelationshipTestPanelProps { personality: DroitPersonalityTraits; }

const BASE_STATE: DroitDynamicState = { calmness: 75, anger: 20, stress: 15, happiness: 65, confidence: 85, surprise: 10, lastStatus: 'Sakin ve kontrollü' };
const TEST_CASES = [
  { label: 'Hakaret', message: 'aptal' },
  { label: 'Özür', message: 'özür dilerim, biraz sert davrandım' },
  { label: 'Pozitif', message: 'iyi ki varsın kanka' },
  { label: 'Nötr', message: 'sunucu durumu nasıl' },
];

export const KdmAutoRelationshipTestPanel: React.FC<KdmAutoRelationshipTestPanelProps> = ({ personality }) => {
  const [message, setMessage] = useState('aptal');
  const [expanded, setExpanded] = useState(false);

  const result = useMemo(() => {
    const now = Date.now();
    const xState: DroitDynamicState = { ...BASE_STATE, relationship: { firstSeenAt: new Date(now).toISOString(), lastInteractionAt: new Date(now).toISOString(), interactionCount: 0, familiarityDays: 0, warmth: 50 } };
    const yState: DroitDynamicState = { ...BASE_STATE, relationship: { firstSeenAt: new Date(now - 35 * 86400000).toISOString(), lastInteractionAt: new Date(now - 3600000).toISOString(), interactionCount: 48, familiarityDays: 35, warmth: 82 } };
    const x = analyzeKdmInteraction(message, personality, xState);
    const y = analyzeKdmInteraction(message, personality, yState);
    const warmthGap = Math.abs(x.trace.memoryUpdate.warmthDelta - y.trace.memoryUpdate.warmthDelta);
    const toleranceGap = Math.round(Math.abs((x.trace.relationship.toleranceMultiplier ?? 1) - (y.trace.relationship.toleranceMultiplier ?? 1)) * 100);
    const stateGap = Math.abs((x.nextDynamicState.stress ?? 0) - (y.nextDynamicState.stress ?? 0)) + Math.abs((x.nextDynamicState.happiness ?? 0) - (y.nextDynamicState.happiness ?? 0));
    return { x, y, warmthGap, toleranceGap, stateGap, relationshipEffect: warmthGap > 0 || toleranceGap >= 10 || stateGap > 0 };
  }, [message, personality]);

  return (
    <div className="rounded-md border border-cyan-500/20 bg-cyan-950/10 px-2 py-1">
      <div className="flex min-h-8 items-center gap-1.5 overflow-x-auto">
        <span className="shrink-0 text-[9px] font-mono font-bold text-cyan-300">KDM AUTO v2</span>
        {TEST_CASES.map((test) => (
          <button key={test.label} type="button" onClick={() => setMessage(test.message)} className="shrink-0 rounded border border-zinc-800 bg-zinc-950 px-1.5 py-0.5 text-[8px] font-mono text-zinc-300">{test.label}</button>
        ))}
        <input value={message} onChange={(e) => setMessage(e.target.value)} className="min-w-[130px] flex-1 rounded border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-[9px] text-zinc-200 outline-none" />
        <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[8px] font-mono font-bold ${result.relationshipEffect ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/30 bg-rose-500/10 text-rose-300'}`}>{result.relationshipEffect ? 'ETKİ VAR ✓' : 'FARK YOK ✗'}</span>
        <button type="button" onClick={() => setExpanded((v) => !v)} className="shrink-0 rounded border border-cyan-500/30 px-1.5 py-0.5 text-[8px] font-mono text-cyan-300">{expanded ? 'Kapat' : 'Detay'}</button>
      </div>
      {expanded && (
        <div className="mt-1 grid grid-cols-2 gap-1 border-t border-zinc-800/70 pt-1 text-[8px] font-mono text-zinc-400">
          <div className="rounded bg-zinc-950/70 px-2 py-1">X yeni · warmth <b className="text-zinc-200">{result.x.trace.relationship.warmthScore}</b> · tepki <b className="text-zinc-200">%{Math.round((result.x.trace.relationship.toleranceMultiplier ?? 1) * 100)}</b> · Δ <b className="text-zinc-200">{result.x.trace.memoryUpdate.warmthDelta}</b></div>
          <div className="rounded bg-zinc-950/70 px-2 py-1">Y yakın · warmth <b className="text-zinc-200">{result.y.trace.relationship.warmthScore}</b> · tepki <b className="text-zinc-200">%{Math.round((result.y.trace.relationship.toleranceMultiplier ?? 1) * 100)}</b> · Δ <b className="text-zinc-200">{result.y.trace.memoryUpdate.warmthDelta}</b></div>
        </div>
      )}
    </div>
  );
};

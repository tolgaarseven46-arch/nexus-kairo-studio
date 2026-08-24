import React, { useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, RefreshCw, ShieldCheck, Wrench } from 'lucide-react';
import { loadKdmMetrics, summarizeKdmMetrics, KdmMetricEvent } from '../../services/kdmMetricsService';

interface KdmMetricsPanelProps {
  userId?: string;
  compact?: boolean;
}

export const KdmMetricsPanel: React.FC<KdmMetricsPanelProps> = ({ userId = 'anonymous', compact = false }) => {
  const [events, setEvents] = useState<KdmMetricEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      setEvents(await loadKdmMetrics(userId, 100));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, [userId]);

  const summary = useMemo(() => summarizeKdmMetrics(events), [events]);
  const recent = events.slice(-8);
  const topIssues = Object.entries(summary.issueFrequency)
    .map(([issue, count]) => [issue, Number(count)] as const)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3.5 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-[11px] font-mono font-bold tracking-wider text-zinc-200 uppercase">KDM Metrikleri</h3>
            <p className="text-[9px] font-mono text-zinc-500">Canlı tutarlılık performansı</p>
          </div>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={loading} className="p-1.5 rounded-md border border-zinc-800 text-zinc-500 hover:text-zinc-200 hover:border-zinc-700 disabled:opacity-50" title="Yenile">
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-4'} gap-2`}>
        <Metric label="Ortalama" value={`${summary.averageScore}%`} icon={<BarChart3 className="w-3 h-3" />} />
        <Metric label="Kabul" value={`${summary.acceptanceRate}%`} icon={<ShieldCheck className="w-3 h-3" />} />
        <Metric label="Onarım" value={`${summary.repairRate}%`} icon={<Wrench className="w-3 h-3" />} />
        <Metric label="Analiz" value={`${summary.total}`} icon={<Activity className="w-3 h-3" />} />
      </div>

      {!compact && topIssues.length > 0 && (
        <div className="mt-3 pt-3 border-t border-zinc-800/70">
          <div className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 mb-2">En sık tutarsızlıklar</div>
          <div className="space-y-1.5">
            {topIssues.map(([issue, count]) => (
              <div key={issue} className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-zinc-400 truncate pr-2">{issue}</span>
                <span className="text-amber-300 shrink-0">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!compact && recent.length > 0 && (
        <div className="mt-3 pt-3 border-t border-zinc-800/70">
          <div className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 mb-2">Son skorlar</div>
          <div className="flex items-end gap-1.5 h-10">
            {recent.map((event, index) => (
              <div key={`${event.createdAt}-${index}`} className="flex-1 h-full flex items-end" title={`${event.score}%`}>
                <div className="w-full rounded-sm bg-indigo-500/50" style={{ height: `${Math.max(8, event.score)}%` }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

const Metric: React.FC<{ label: string; value: string; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-2">
    <div className="flex items-center gap-1 text-zinc-500 mb-1">{icon}<span className="text-[8px] font-mono uppercase">{label}</span></div>
    <div className="text-sm font-mono font-bold text-zinc-100">{value}</div>
  </div>
);

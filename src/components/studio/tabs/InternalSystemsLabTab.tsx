import React, { useMemo, useState } from "react";
import { Activity, BrainCircuit, Clock3, RotateCcw, Users, Zap } from "lucide-react";
import { appraiseEventV0, type AppraisalResult } from "../../../services/appraisalEngine";

type Observation = {
  sourceId: string;
  minute: number;
};

const LABELS = {
  novelty: "Yenilik",
  expectedness: "Beklenti",
  prediction: "Pozitif prediction error",
  coordination: "Koordinasyon / troll sinyali",
};

const percent = (value: number) => Math.round(value * 100);

export const InternalSystemsLabTab: React.FC = () => {
  const [sourceId, setSourceId] = useState("Murat");
  const [message, setMessage] = useState("Çok tatlısın Kaira.");
  const [minute, setMinute] = useState(0);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [result, setResult] = useState<AppraisalResult | null>(null);

  const recentWindow = useMemo(
    () => observations.filter((item) => minute - item.minute <= 5),
    [observations, minute],
  );

  const runAppraisal = () => {
    const normalizedSource = sourceId.trim() || "anonim";
    const sameSource = observations.filter((item) => item.sourceId === normalizedSource);
    const lastSimilar = sameSource.at(-1);
    const recentSources = new Set(recentWindow.map((item) => item.sourceId));

    const next = appraiseEventV0(
      {
        kind: "compliment",
        sourceId: normalizedSource,
        targetIsKaira: true,
        valence: "positive",
      },
      {
        relationshipAgeMinutes: Math.max(1, minute + 1),
        interactionCount: observations.length,
        similarEventsFromSource: sameSource.length,
        similarEventsRecentGlobal: recentWindow.length,
        distinctSourcesRecentGlobal: recentSources.size,
        minutesSinceLastSimilarEvent: lastSimilar ? minute - lastSimilar.minute : null,
      },
    );

    setResult(next);
    setObservations((items) => [...items, { sourceId: normalizedSource, minute }]);
  };

  const addCrowd = () => {
    const crowd = Array.from({ length: 8 }, (_, index) => ({
      sourceId: `Kisi-${index + 1}`,
      minute,
    }));
    setObservations((items) => [...items, ...crowd]);
  };

  const reset = () => {
    setSourceId("Murat");
    setMessage("Çok tatlısın Kaira.");
    setMinute(0);
    setObservations([]);
    setResult(null);
  };

  const metrics = result
    ? [
        { key: "novelty", value: result.novelty.value },
        { key: "expectedness", value: result.expectedness.value },
        { key: "prediction", value: result.positivePredictionError },
        { key: "coordination", value: result.coordinationSignal },
      ]
    : [];

  return (
    <div className="flex-1 overflow-auto bg-zinc-950 p-4 sm:p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-400" />
              <h1 className="text-lg font-bold text-zinc-100">KAIRA İÇ SİSTEMLER</h1>
            </div>
            <p className="mt-1 text-xs text-zinc-500">Appraisal Engine v0 · KDM'den izole deney alanı</p>
          </div>
          <button type="button" onClick={reset} className="rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 hover:text-white" title="Sıfırla">
            <RotateCcw className="h-4 w-4" />
          </button>
        </header>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/45 p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold text-zinc-300">
            <BrainCircuit className="h-4 w-4 text-indigo-400" /> APPRAISAL TESTİ
          </div>
          <div className="grid gap-2 md:grid-cols-[160px_1fr_auto]">
            <input value={sourceId} onChange={(event) => setSourceId(event.target.value)} placeholder="Kişi" className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-indigo-500" />
            <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Mesaj" className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-indigo-500" />
            <button type="button" onClick={runAppraisal} className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-400">
              Olayı işle
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setMinute((value) => value + 1)} className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-300">+1 dk</button>
            <button type="button" onClick={() => setMinute((value) => value + 10)} className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-300">+10 dk</button>
            <button type="button" onClick={addCrowd} className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-1.5 text-xs text-amber-200">8 kişi aynı anda yazsın</button>
            <span className="ml-auto font-mono text-xs text-zinc-500"><Clock3 className="mr-1 inline h-3.5 w-3.5" />+{minute} dk · {observations.length} benzer olay</span>
          </div>
        </section>

        {result ? (
          <>
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {metrics.map((metric) => (
                <div key={metric.key} className="rounded-xl border border-zinc-800 bg-zinc-900/45 p-4">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">{LABELS[metric.key as keyof typeof LABELS]}</div>
                  <div className="mt-2 font-mono text-2xl font-bold text-zinc-100">{percent(metric.value)}%</div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${percent(metric.value)}%` }} /></div>
                </div>
              ))}
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/45 p-4">
                <div className="mb-3 flex items-center gap-2 text-xs font-bold text-zinc-300"><Zap className="h-4 w-4" /> NEDEN?</div>
                {[...result.novelty.factors, ...result.expectedness.factors].map((factor) => (
                  <div key={`${factor.id}-${factor.label}`} className="flex items-center justify-between border-b border-zinc-800/70 py-2 text-xs last:border-0">
                    <div><div className="text-zinc-300">{factor.label}</div><div className="text-[10px] text-zinc-600">gözlenen: {factor.observed}</div></div>
                    <span className="font-mono text-zinc-400">{factor.contribution > 0 ? "+" : ""}{factor.contribution.toFixed(3)}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/45 p-4">
                <div className="mb-3 flex items-center gap-2 text-xs font-bold text-zinc-300"><Users className="h-4 w-4" /> BAĞLAM</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-zinc-950 p-3 text-zinc-500">Aynı kişiden <strong className="block text-lg text-zinc-200">{result.context.similarEventsFromSource}</strong></div>
                  <div className="rounded-lg bg-zinc-950 p-3 text-zinc-500">Son 5 dk benzer <strong className="block text-lg text-zinc-200">{result.context.similarEventsRecentGlobal}</strong></div>
                  <div className="rounded-lg bg-zinc-950 p-3 text-zinc-500">Farklı kaynak <strong className="block text-lg text-zinc-200">{result.context.distinctSourcesRecentGlobal}</strong></div>
                  <div className="rounded-lg bg-zinc-950 p-3 text-zinc-500">Son benzer olay <strong className="block text-lg text-zinc-200">{result.context.minutesSinceLastSimilarEvent == null ? "ilk" : `${result.context.minutesSinceLastSimilarEvent} dk`}</strong></div>
                </div>
                {result.notes.length > 0 && <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-5 text-amber-100/80">{result.notes.join(" ")}</div>}
              </div>
            </section>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-600">Bir olay gönder; Appraisal Engine'in hesaplarını burada göreceksin.</div>
        )}

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs leading-5 text-amber-100/70">
          Bu ekran biyolojik ölçüm göstermiyor. Novelty, expectedness ve prediction-error değerleri denetlenebilir Appraisal Engine v0 hesaplarıdır; KDM'ye henüz davranış etkisi vermiyor.
        </div>
      </div>
    </div>
  );
};

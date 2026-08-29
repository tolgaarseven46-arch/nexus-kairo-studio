import React, { useMemo, useState } from "react";
import { Activity, Clock3, RotateCcw, ShieldAlert, Sparkles } from "lucide-react";

type SystemKey =
  | "threat"
  | "arousal"
  | "reward"
  | "socialBond"
  | "trust"
  | "stress";

type SystemState = Record<SystemKey, number>;

type Scenario = {
  id: string;
  title: string;
  message: string;
  explanation: string;
  impulse: Partial<SystemState>;
};

const BASELINE: SystemState = {
  threat: 12,
  arousal: 20,
  reward: 48,
  socialBond: 58,
  trust: 62,
  stress: 18,
};

const HALF_LIFE_HOURS: Record<SystemKey, number> = {
  threat: 2,
  arousal: 0.6,
  reward: 4,
  socialBond: 72,
  trust: 168,
  stress: 6,
};

const LABELS: Record<SystemKey, string> = {
  threat: "Tehdit / Savunma",
  arousal: "Uyarılma",
  reward: "Ödül / Olumluluk",
  socialBond: "Sosyal Bağ",
  trust: "Güven",
  stress: "Stres Yükü",
};

const SCENARIOS: Scenario[] = [
  {
    id: "thanks",
    title: "Değer görme",
    message: "Teşekkür ederim Kaira, bana iyi geliyorsun.",
    explanation: "Sosyal ödül ve bağ güçleniyor; tehdit sistemi baskılanıyor.",
    impulse: { reward: 28, socialBond: 12, trust: 7, threat: -5, stress: -4 },
  },
  {
    id: "mild-insult",
    title: "Hafif hakaret",
    message: "Aptal aptal konuşuyorsun.",
    explanation: "Tehdit, uyarılma ve stres yükseliyor; güven ve bağ zarar görüyor.",
    impulse: { threat: 38, arousal: 30, stress: 24, reward: -20, trust: -10, socialBond: -8 },
  },
  {
    id: "red-line",
    title: "Kırmızı çizgi",
    message: "Orospu.",
    explanation: "Ağır sınır ihlali: hızlı savunma tepkisi + uzun ömürlü güven/bağ hasarı.",
    impulse: { threat: 72, arousal: 55, stress: 48, reward: -42, trust: -38, socialBond: -34 },
  },
  {
    id: "apology",
    title: "Özür / onarım",
    message: "Özür dilerim. Yaptığım yanlıştı.",
    explanation: "Anlık tehdidi azaltır; güven ise daha yavaş ve sınırlı toparlanır.",
    impulse: { threat: -18, stress: -12, arousal: -8, reward: 12, trust: 5, socialBond: 6 },
  },
];

const clamp = (value: number) => Math.max(0, Math.min(100, value));

const applyImpulse = (state: SystemState, impulse: Partial<SystemState>): SystemState => {
  const next = { ...state };
  (Object.keys(next) as SystemKey[]).forEach((key) => {
    next[key] = clamp(next[key] + (impulse[key] ?? 0));
  });
  return next;
};

const decayTowardBaseline = (
  state: SystemState,
  elapsedHours: number,
): SystemState => {
  const next = { ...state };
  (Object.keys(next) as SystemKey[]).forEach((key) => {
    const halfLife = HALF_LIFE_HOURS[key];
    const retention = Math.pow(0.5, elapsedHours / halfLife);
    next[key] = clamp(BASELINE[key] + (state[key] - BASELINE[key]) * retention);
  });
  return next;
};

const formatValue = (value: number) => Math.round(value);

export const InternalSystemsLabTab: React.FC = () => {
  const [state, setState] = useState<SystemState>(BASELINE);
  const [elapsedHours, setElapsedHours] = useState(0);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [history, setHistory] = useState<Array<{ hour: number; state: SystemState }>>([
    { hour: 0, state: BASELINE },
  ]);

  const timeline = useMemo(() => history.slice(-8), [history]);

  const triggerScenario = (scenario: Scenario) => {
    const next = applyImpulse(state, scenario.impulse);
    setState(next);
    setSelectedScenario(scenario);
    setHistory((items) => [...items, { hour: elapsedHours, state: next }]);
  };

  const advanceTime = (hours: number) => {
    const nextHour = elapsedHours + hours;
    const next = decayTowardBaseline(state, hours);
    setElapsedHours(nextHour);
    setState(next);
    setHistory((items) => [...items, { hour: nextHour, state: next }]);
  };

  const reset = () => {
    setState(BASELINE);
    setElapsedHours(0);
    setSelectedScenario(null);
    setHistory([{ hour: 0, state: BASELINE }]);
  };

  return (
    <div className="flex-1 overflow-auto bg-zinc-950 p-4 sm:p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-zinc-100">
              <Activity className="h-5 w-5 text-indigo-400" />
              <h1 className="text-lg font-bold">İÇ SİSTEMLER LAB</h1>
            </div>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-zinc-500">
              Kaira'ya bağlanmamış izole deney alanı. Olayların iç sistemleri nasıl oynattığını ve etkinin zamanla nasıl söndüğünü gözle görmek için.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-xs text-zinc-300">
              <Clock3 className="mr-1.5 inline h-3.5 w-3.5" />
              +{elapsedHours < 24 ? `${elapsedHours.toFixed(1)} saat` : `${(elapsedHours / 24).toFixed(1)} gün`}
            </div>
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 hover:text-zinc-100"
              title="Sıfırla"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.05fr_1.4fr]">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/45 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-bold text-zinc-200">Olay Gönder</h2>
            </div>
            <div className="grid gap-2">
              {SCENARIOS.map((scenario) => (
                <button
                  type="button"
                  key={scenario.id}
                  onClick={() => triggerScenario(scenario)}
                  className={`rounded-xl border p-3 text-left transition ${
                    selectedScenario?.id === scenario.id
                      ? "border-indigo-500/70 bg-indigo-500/10"
                      : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700"
                  }`}
                >
                  <div className="text-xs font-bold text-zinc-200">{scenario.title}</div>
                  <div className="mt-1 text-xs text-zinc-400">“{scenario.message}”</div>
                </button>
              ))}
            </div>

            {selectedScenario && (
              <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
                <div className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Motorun yorumu
                </div>
                <p className="text-xs leading-5 text-zinc-300">{selectedScenario.explanation}</p>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/45 p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-zinc-200">Canlı İç Durum</h2>
                <p className="text-[11px] text-zinc-500">0-100 ölçeği · şimdilik deneysel değerler</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => advanceTime(10 / 60)} className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-[11px] text-zinc-300">+10 dk</button>
                <button onClick={() => advanceTime(1)} className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-[11px] text-zinc-300">+1 saat</button>
                <button onClick={() => advanceTime(6)} className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-[11px] text-zinc-300">+6 saat</button>
                <button onClick={() => advanceTime(24)} className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-[11px] text-zinc-300">+1 gün</button>
                <button onClick={() => advanceTime(24 * 7)} className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-[11px] text-zinc-300">+7 gün</button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {(Object.keys(state) as SystemKey[]).map((key) => {
                const value = formatValue(state[key]);
                const baseline = BASELINE[key];
                const delta = value - baseline;
                return (
                  <div key={key} className="rounded-xl border border-zinc-800 bg-zinc-950/65 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-zinc-300">{LABELS[key]}</span>
                      <span className="font-mono text-sm font-bold text-zinc-100">{value}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
                      <div className="h-full rounded-full bg-indigo-500 transition-all duration-300" style={{ width: `${value}%` }} />
                    </div>
                    <div className="mt-1.5 flex justify-between font-mono text-[10px] text-zinc-600">
                      <span>baz {baseline}</span>
                      <span className={delta === 0 ? "text-zinc-600" : delta > 0 ? "text-amber-400" : "text-sky-400"}>
                        {delta > 0 ? "+" : ""}{delta}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/45 p-4">
          <div className="mb-3">
            <h2 className="text-sm font-bold text-zinc-200">Zaman İzi</h2>
            <p className="text-[11px] text-zinc-500">Her olay ve zaman atlamasından sonra sistemin aldığı değerler.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-[11px]">
              <thead className="text-zinc-500">
                <tr className="border-b border-zinc-800">
                  <th className="px-2 py-2 font-medium">Zaman</th>
                  {(Object.keys(state) as SystemKey[]).map((key) => (
                    <th key={key} className="px-2 py-2 font-medium">{LABELS[key]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeline.map((item, index) => (
                  <tr key={`${item.hour}-${index}`} className="border-b border-zinc-900 text-zinc-300 last:border-0">
                    <td className="whitespace-nowrap px-2 py-2 font-mono text-zinc-500">+{item.hour < 24 ? `${item.hour.toFixed(1)}s` : `${(item.hour / 24).toFixed(1)}g`}</td>
                    {(Object.keys(item.state) as SystemKey[]).map((key) => (
                      <td key={key} className="px-2 py-2 font-mono">{formatValue(item.state[key])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs leading-5 text-amber-100/80">
          Bu ekran final Kaira psikolojisi değil. İlk deney tezgâhı: zaman sabitlerini, olay şiddetini ve hangi iç sistemlerin gerçekten gerekli olduğunu burada gözle ölçüp sonra KDM'ye taşıyacağız.
        </div>
      </div>
    </div>
  );
};

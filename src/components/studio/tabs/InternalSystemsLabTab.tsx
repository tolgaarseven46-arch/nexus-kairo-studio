import React, { useMemo, useState } from "react";
import {
  Activity,
  BrainCircuit,
  ChevronDown,
  ChevronRight,
  Clock3,
  FlaskConical,
  HeartPulse,
  RotateCcw,
  ShieldAlert,
  Users,
  Zap,
} from "lucide-react";

type SystemKey = "threat" | "arousal" | "reward" | "socialBond" | "trust" | "stress";
type SystemState = Record<SystemKey, number>;
type GroupKey = "nervous" | "chemistry" | "internal" | "emotion" | "social";
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

// Deneysel referans sabitleri; biyolojik ölçüm iddiası değildir.
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
  reward: "Ödül sinyali",
  socialBond: "Sosyal bağ",
  trust: "Güven",
  stress: "Stres yükü",
};

const GROUPS: Array<{
  key: GroupKey;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  systems: SystemKey[];
}> = [
  { key: "nervous", title: "SİNİR", subtitle: "Hızlı alarm ve uyarılma", icon: BrainCircuit, systems: ["threat", "arousal"] },
  { key: "chemistry", title: "KİMYA", subtitle: "Yavaş taşıyıcı etkiler", icon: FlaskConical, systems: ["stress", "reward"] },
  { key: "internal", title: "İÇ DÜZENLEME", subtitle: "Dengeye dönüş", icon: Activity, systems: ["arousal", "stress"] },
  { key: "emotion", title: "DUYGU", subtitle: "Üst katman sonucu", icon: HeartPulse, systems: ["threat", "reward", "stress"] },
  { key: "social", title: "SOSYAL / İLİŞKİ", subtitle: "Bağ ve güven izi", icon: Users, systems: ["socialBond", "trust"] },
];

const SCENARIOS: Scenario[] = [
  {
    id: "thanks",
    title: "Değer görme",
    message: "Teşekkür ederim Kaira, bana iyi geliyorsun.",
    explanation: "Sosyal ödül ve bağ yönündeki deneysel olay.",
    impulse: { reward: 28, socialBond: 12, trust: 7, threat: -5, stress: -4 },
  },
  {
    id: "mild-insult",
    title: "Hafif hakaret",
    message: "Aptal aptal konuşuyorsun.",
    explanation: "Alarm, uyarılma ve stres yönündeki deneysel olay.",
    impulse: { threat: 38, arousal: 30, stress: 24, reward: -20, trust: -10, socialBond: -8 },
  },
  {
    id: "red-line",
    title: "Kırmızı çizgi",
    message: "Orospu.",
    explanation: "Hızlı alarm ile daha uzun sosyal izi birlikte izleyen ağır sınır ihlali deneyi.",
    impulse: { threat: 72, arousal: 55, stress: 48, reward: -42, trust: -38, socialBond: -34 },
  },
  {
    id: "apology",
    title: "Özür / onarım",
    message: "Özür dilerim. Yaptığım yanlıştı.",
    explanation: "Anlık alarm ile sosyal izin farklı hızlarda toparlanmasını test eder.",
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

const decayTowardBaseline = (state: SystemState, elapsedHours: number): SystemState => {
  const next = { ...state };
  (Object.keys(next) as SystemKey[]).forEach((key) => {
    const retention = Math.pow(0.5, elapsedHours / HALF_LIFE_HOURS[key]);
    next[key] = clamp(BASELINE[key] + (state[key] - BASELINE[key]) * retention);
  });
  return next;
};

const stateWord = (key: SystemKey, value: number) => {
  const delta = value - BASELINE[key];
  if (Math.abs(delta) < 4) return "bazale yakın";
  if (delta > 20) return "belirgin yükselmiş";
  if (delta > 0) return "yükselmiş";
  if (delta < -20) return "belirgin baskılanmış";
  return "baskılanmış";
};

export const InternalSystemsLabTab: React.FC = () => {
  const [state, setState] = useState<SystemState>(BASELINE);
  const [elapsedHours, setElapsedHours] = useState(0);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [openGroup, setOpenGroup] = useState<GroupKey | null>("nervous");
  const [history, setHistory] = useState<Array<{ hour: number; state: SystemState }>>([
    { hour: 0, state: BASELINE },
  ]);

  const timeline = useMemo(() => history.slice(-6), [history]);
  const activeGroup = GROUPS.find((group) => group.key === openGroup);

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
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-400" />
              <h1 className="text-lg font-bold text-zinc-100">KAIRA İÇ SİSTEMLER</h1>
            </div>
            <p className="mt-1 text-xs text-zinc-500">Tek bakışta üst sistemler. Kartı açınca alt değerleri ve nedeni gör.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-xs text-zinc-300">
              <Clock3 className="mr-1.5 inline h-3.5 w-3.5" />
              {elapsedHours === 0 ? "Şimdi" : elapsedHours < 24 ? `+${elapsedHours.toFixed(1)} saat` : `+${(elapsedHours / 24).toFixed(1)} gün`}
            </div>
            <button type="button" onClick={reset} className="rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 hover:text-white" title="Sıfırla">
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </header>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/45 p-3">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            <Zap className="h-3.5 w-3.5" /> Test olayı
          </div>
          <div className="flex flex-wrap gap-2">
            {SCENARIOS.map((scenario) => (
              <button
                key={scenario.id}
                type="button"
                onClick={() => triggerScenario(scenario)}
                className={`rounded-lg border px-3 py-2 text-left text-xs transition ${selectedScenario?.id === scenario.id ? "border-indigo-500 bg-indigo-500/10 text-indigo-100" : "border-zinc-800 bg-zinc-950/60 text-zinc-300 hover:border-zinc-700"}`}
              >
                <span className="font-bold">{scenario.title}</span>
                <span className="ml-2 hidden text-zinc-500 md:inline">{scenario.message}</span>
              </button>
            ))}
          </div>
          {selectedScenario && <p className="mt-2 text-[11px] text-zinc-500">{selectedScenario.explanation}</p>}
        </section>

        <section className="grid gap-2 md:grid-cols-5">
          {GROUPS.map((group) => {
            const Icon = group.icon;
            const isOpen = openGroup === group.key;
            return (
              <button
                key={group.key}
                type="button"
                onClick={() => setOpenGroup(isOpen ? null : group.key)}
                className={`rounded-xl border p-3 text-left transition ${isOpen ? "border-indigo-500/60 bg-indigo-500/10" : "border-zinc-800 bg-zinc-900/45 hover:border-zinc-700"}`}
              >
                <div className="flex items-center justify-between">
                  <Icon className="h-4 w-4 text-zinc-300" />
                  {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-zinc-500" /> : <ChevronRight className="h-3.5 w-3.5 text-zinc-600" />}
                </div>
                <div className="mt-3 text-xs font-bold text-zinc-200">{group.title}</div>
                <div className="mt-1 text-[10px] leading-4 text-zinc-500">{group.subtitle}</div>
              </button>
            );
          })}
        </section>

        {activeGroup && (
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/45 p-4">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-zinc-100">{activeGroup.title}</h2>
                <p className="mt-1 text-[11px] text-zinc-500">Bu üst sistemin altında şu an izlediğimiz deneysel değişkenler.</p>
              </div>
              <span className="text-[10px] font-mono text-amber-300/80">DENEYSEL MODEL</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {activeGroup.systems.map((key) => {
                const value = Math.round(state[key]);
                const delta = value - BASELINE[key];
                return (
                  <div key={key} className="rounded-xl border border-zinc-800 bg-zinc-950/65 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-medium text-zinc-300">{LABELS[key]}</div>
                        <div className="mt-1 text-[11px] text-zinc-500">{stateWord(key, value)}</div>
                      </div>
                      <div className="text-right font-mono">
                        <div className="text-sm font-bold text-zinc-100">{value}</div>
                        <div className={`text-[10px] ${delta > 0 ? "text-amber-400" : delta < 0 ? "text-sky-400" : "text-zinc-600"}`}>
                          {delta > 0 ? "+" : ""}{delta}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                      <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${value}%` }} />
                    </div>
                    <div className="mt-2 flex justify-between text-[10px] text-zinc-600">
                      <span>referans bazal {BASELINE[key]}</span>
                      <span>t½ {HALF_LIFE_HOURS[key]}s</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-[11px] leading-5 text-zinc-500">
              <span className="font-bold text-zinc-400">Neden değişti? </span>
              {selectedScenario ? selectedScenario.explanation : "Henüz olay uygulanmadı; sistem referans bazal durumda."}
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/45 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-zinc-200">ZAMAN</h2>
              <p className="mt-1 text-[11px] text-zinc-500">İleri sar ve sistemlerin farklı hızlarda toparlanmasını izle.</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => advanceTime(10 / 60)} className="rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-[11px] text-zinc-300">+10 dk</button>
              <button onClick={() => advanceTime(1)} className="rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-[11px] text-zinc-300">+1 saat</button>
              <button onClick={() => advanceTime(6)} className="rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-[11px] text-zinc-300">+6 saat</button>
              <button onClick={() => advanceTime(24)} className="rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-[11px] text-zinc-300">+1 gün</button>
              <button onClick={() => advanceTime(168)} className="rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-[11px] text-zinc-300">+7 gün</button>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-[10px]">
              <thead className="text-zinc-600">
                <tr className="border-b border-zinc-800">
                  <th className="px-2 py-2 font-medium">zaman</th>
                  {(Object.keys(state) as SystemKey[]).map((key) => <th key={key} className="px-2 py-2 font-medium">{LABELS[key]}</th>)}
                </tr>
              </thead>
              <tbody>
                {timeline.map((item, index) => (
                  <tr key={`${item.hour}-${index}`} className="border-b border-zinc-900 text-zinc-400 last:border-0">
                    <td className="whitespace-nowrap px-2 py-2 font-mono">{item.hour === 0 ? "şimdi" : item.hour < 24 ? `+${item.hour.toFixed(1)}s` : `+${(item.hour / 24).toFixed(1)}g`}</td>
                    {(Object.keys(item.state) as SystemKey[]).map((key) => <td key={key} className="px-2 py-2 font-mono">{Math.round(item.state[key])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="flex gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-[11px] leading-5 text-amber-100/75">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>0-100 değerleri ve yarı ömürler biyolojik gerçek olarak kullanılmıyor. Bu panel gözlem altyapısıdır; bilimsel sinir, nöromodülatör ve endokrin modelleri geldikçe bunların yerini tanımlı durumlar ve ölçüler alacak.</span>
        </div>
      </div>
    </div>
  );
};

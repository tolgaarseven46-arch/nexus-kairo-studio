import React, { useMemo, useState } from "react";
import type {
  DroitDynamicState,
  DroitPersonalityTraits,
} from "../../types/nexus";
import { droitChatService } from "../../services/droitChatService";
import type {
  KairoRelationshipLevel,
  KairoSpeechIdentity,
} from "../../services/kairoSpeechIdentity";
import {
  evaluateKairoSpeechRhythm,
  type KairoSpeechRhythmEvaluation,
} from "../../services/kairoSpeechRhythmEvaluator";

interface KairaSpeechMatrixPanelProps {
  personality: DroitPersonalityTraits;
}

interface MatrixProfile {
  id: KairoRelationshipLevel;
  label: string;
  description: string;
  state: DroitDynamicState;
}

interface MatrixResult {
  profile: MatrixProfile;
  reply: string;
  provider: string;
  speech?: KairoSpeechIdentity;
  evaluation: KairoSpeechRhythmEvaluation;
  error?: string;
}

const BASE_STATE = {
  calmness: 75,
  anger: 15,
  stress: 15,
  happiness: 65,
  confidence: 80,
  surprise: 10,
  lastStatus: "Sakin ve kontrollü",
};

const relationshipState = (
  interactionCount: number,
  familiarityDays: number,
  warmth: number,
  trust: number,
): DroitDynamicState => {
  const now = Date.now();
  return {
    ...BASE_STATE,
    relationship: {
      firstSeenAt: new Date(
        now - familiarityDays * 24 * 60 * 60 * 1000,
      ).toISOString(),
      lastInteractionAt: new Date(now - 60_000).toISOString(),
      interactionCount,
      familiarityDays,
      warmth,
      trust,
      positiveEvents: Math.round(interactionCount * 0.35),
      negativeEvents: 0,
      conflictScore: 0,
      hurtScore: 0,
      repairProgress: 0,
      repeatedNegativeCount: 0,
    },
  };
};

const PROFILES: MatrixProfile[] = [
  {
    id: "new",
    label: "Yeni",
    description: "İlk gün · nötr güven",
    state: relationshipState(0, 0, 50, 50),
  },
  {
    id: "familiar",
    label: "Tanıdık",
    description: "14 gün · yerleşen ilişki",
    state: relationshipState(20, 14, 62, 60),
  },
  {
    id: "close",
    label: "Çok yakın",
    description: "90 gün · yüksek güven",
    state: relationshipState(80, 90, 85, 85),
  },
];

const PRESETS = [
  "bugün moralim biraz bozuk ya",
  "yine bütün işi son dakikaya bıraktım hahah",
  "ne anlatıyorsun ya hiçbir şey anlamadım",
  "naber",
];

export const KairaSpeechMatrixPanel: React.FC<
  KairaSpeechMatrixPanelProps
> = ({ personality }) => {
  const [message, setMessage] = useState(PRESETS[0]);
  const [results, setResults] = useState<MatrixResult[]>([]);
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const summary = useMemo(() => {
    if (!results.length) return null;
    const passed = results.filter((result) => result.evaluation.accepted).length;
    const levelsCorrect = results.every(
      (result) => !result.speech || result.speech.relationshipLevel === result.profile.id,
    );
    const wordCounts = results.map((result) => result.evaluation.wordCount);
    const lineCounts = results.map((result) => result.evaluation.lineCount);
    const rhythmStable =
      Math.max(...wordCounts) - Math.min(...wordCounts) <= 20 &&
      Math.max(...lineCounts) - Math.min(...lineCounts) <= 2;
    return {
      passed,
      levelsCorrect,
      rhythmStable,
      allPassed: passed === results.length && levelsCorrect && rhythmStable,
    };
  }, [results]);

  const runMatrix = async () => {
    const input = message.trim();
    if (!input || running) return;
    setRunning(true);
    setResults([]);

    const nextResults: MatrixResult[] = [];
    for (const profile of PROFILES) {
      try {
        const response = await droitChatService.sendMessage({
          userMessage: input,
          userId: `speech_matrix_${profile.id}`,
          userName: `Ritim Testi ${profile.label}`,
          personality,
          dynamicState: profile.state,
          history: [],
          suppressRecentMemory: true,
          characterInfo: {
            name: "KAIRO",
            roleTitle: "Sunucu Yöneticisi",
            raceName: "Sentetik Droit",
          },
        });
        const level = response.speechIdentity?.relationshipLevel ?? profile.id;
        nextResults.push({
          profile,
          reply: response.reply,
          provider: response.providerUsed || "bilinmiyor",
          speech: response.speechIdentity,
          evaluation: evaluateKairoSpeechRhythm(response.reply, level),
        });
      } catch (error: any) {
        nextResults.push({
          profile,
          reply: "",
          provider: "hata",
          evaluation: evaluateKairoSpeechRhythm("", profile.id),
          error: error?.message || "Test çalıştırılamadı",
        });
      }
      setResults([...nextResults]);
    }
    setRunning(false);
    setExpanded(true);
  };

  return (
    <div className="rounded-md border border-violet-500/20 bg-violet-950/10 px-2 py-1">
      <div className="flex min-h-8 items-center gap-1.5 overflow-x-auto">
        <span className="shrink-0 text-[9px] font-mono font-bold text-violet-300">
          YAZI RİTMİ v1
        </span>
        {PRESETS.map((preset, index) => (
          <button
            key={preset}
            type="button"
            onClick={() => setMessage(preset)}
            className="shrink-0 rounded border border-zinc-800 bg-zinc-950 px-1.5 py-0.5 text-[8px] font-mono text-zinc-300"
          >
            Örnek {index + 1}
          </button>
        ))}
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="min-w-[220px] flex-1 rounded border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-[9px] text-zinc-200 outline-none"
        />
        <button
          type="button"
          onClick={runMatrix}
          disabled={running || !message.trim()}
          className="shrink-0 rounded border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[8px] font-mono font-bold text-violet-200 disabled:opacity-40"
        >
          {running ? `${results.length}/3` : "3 SEVİYE TEST"}
        </button>
        {summary && (
          <span
            className={`shrink-0 rounded border px-1.5 py-0.5 text-[8px] font-mono font-bold ${summary.allPassed ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-amber-500/30 bg-amber-500/10 text-amber-300"}`}
          >
            {summary.passed}/3 UYGUN · RİTİM {summary.rhythmStable ? "✓" : "!"}
          </span>
        )}
        {!!results.length && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="shrink-0 rounded border border-violet-500/30 px-1.5 py-0.5 text-[8px] font-mono text-violet-300"
          >
            {expanded ? "Kapat" : "Yanıtlar"}
          </button>
        )}
      </div>

      {expanded && !!results.length && (
        <div className="mt-1 grid grid-cols-1 gap-1 border-t border-zinc-800/70 pt-1 md:grid-cols-3">
          {results.map((result) => (
            <div
              key={result.profile.id}
              className="rounded border border-zinc-800 bg-zinc-950/70 px-2 py-1.5 text-[9px]"
            >
              <div className="flex items-center justify-between gap-2 font-mono">
                <span className="font-bold text-zinc-200">
                  {result.profile.label}
                </span>
                <span
                  className={
                    result.evaluation.accepted
                      ? "text-emerald-300"
                      : "text-amber-300"
                  }
                >
                  {result.evaluation.accepted ? "UYGUN" : "KONTROL"}
                </span>
              </div>
              <div className="mt-0.5 text-[8px] text-zinc-500">
                {result.profile.description} · {result.provider}
              </div>
              <div className="mt-1 whitespace-pre-wrap text-zinc-200">
                {result.error ? `[Hata] ${result.error}` : result.reply}
              </div>
              <div className="mt-1 font-mono text-[8px] text-zinc-500">
                {result.evaluation.wordCount} kelime · {result.evaluation.lineCount} satır · {result.evaluation.emojiCount} emoji · argo %{result.speech?.slangLevel ?? "?"}
              </div>
              {!!result.evaluation.issues.length && (
                <div className="mt-1 text-[8px] text-amber-300">
                  {result.evaluation.issues.join(" · ")}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

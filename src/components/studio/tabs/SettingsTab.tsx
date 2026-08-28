import React, { useCallback, useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  CircleAlert,
  Cpu,
  Database,
  KeyRound,
  Loader2,
  RefreshCw,
  Server,
  Settings,
} from "lucide-react";

type RuntimeInfo = {
  status: string;
  activeProvider: string;
  model: string;
  providers: { openrouter: boolean; gemini: boolean };
  persistence: string;
  recentMemoryLimit: number;
  sessionHistoryLimit: number;
  generatedAt: string;
};

const Status = ({ ok, label }: { ok: boolean; label: string }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[9px] font-mono ${
      ok
        ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
        : "border-zinc-700 bg-zinc-900 text-zinc-500"
    }`}
  >
    {ok ? (
      <CheckCircle2 className="h-3 w-3" />
    ) : (
      <CircleAlert className="h-3 w-3" />
    )}
    {label}
  </span>
);

const InfoCard = ({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) => (
  <section className="rounded-xl border border-zinc-800 bg-zinc-900/35 p-4">
    <div className="mb-4 flex items-center gap-2">
      <Icon className="h-4 w-4 text-violet-400" />
      <h2 className="text-[11px] font-mono font-bold text-zinc-200">
        {title}
      </h2>
    </div>
    {children}
  </section>
);

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-5 border-b border-zinc-800/70 py-2.5 last:border-0">
    <span className="text-[10px] font-mono text-zinc-500">{label}</span>
    <span className="text-right text-[11px] font-medium text-zinc-200">
      {value}
    </span>
  </div>
);

export const SettingsTab: React.FC = () => {
  const [runtime, setRuntime] = useState<RuntimeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRuntime = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/runtime-info");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setRuntime((await response.json()) as RuntimeInfo);
    } catch (reason: any) {
      setRuntime(null);
      setError(reason?.message || "Sistem bilgisi alınamadı");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRuntime();
  }, [loadRuntime]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-zinc-950">
      <header className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-500/25 bg-violet-500/10">
            <Settings className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <h1 className="text-xs font-bold text-zinc-100">SİSTEM</h1>
            <p className="mt-0.5 text-[9px] font-mono text-zinc-600">
              Çalışan sunucudan okunan gerçek yapılandırma
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void loadRuntime()}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-[9px] font-mono text-zinc-300 hover:border-violet-500 disabled:opacity-40"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          YENİLE
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-5xl">
          {loading && !runtime ? (
            <div className="flex min-h-72 items-center justify-center gap-2 text-xs text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Sistem okunuyor…
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-4 text-xs text-red-300">
              Sistem bilgisi alınamadı: {error}
            </div>
          ) : runtime ? (
            <>
              <div className="mb-4 flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-300">
                  <Activity className="h-4 w-4" />
                  SUNUCU ÇALIŞIYOR
                </div>
                <span className="text-[8px] font-mono text-zinc-600">
                  {new Date(runtime.generatedAt).toLocaleTimeString("tr-TR")}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <InfoCard icon={Cpu} title="AI ÇALIŞMA DURUMU">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-3">
                    <Row label="AKTİF SAĞLAYICI" value={runtime.activeProvider} />
                    <Row label="AKTİF MODEL" value={runtime.model} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Status ok={runtime.providers.openrouter} label="OpenRouter anahtarı" />
                    <Status ok={runtime.providers.gemini} label="Gemini anahtarı" />
                  </div>
                </InfoCard>

                <InfoCard icon={Database} title="HAFIZA & KAYIT">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-3">
                    <Row label="KALICI KAYIT" value={runtime.persistence} />
                    <Row label="SON HAFIZA SINIRI" value={`${runtime.recentMemoryLimit} kayıt`} />
                    <Row label="OTURUM GEÇMİŞİ" value={`${runtime.sessionHistoryLimit} mesaj`} />
                  </div>
                </InfoCard>

                <InfoCard icon={Server} title="MİMARİ">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-3">
                    <Row label="KARAR MOTORU" value="KDM" />
                    <Row label="BASİT YANITLAR" value="Yerel Dil Motoru" />
                    <Row label="KARMAŞIK YANITLAR" value={runtime.activeProvider} />
                    <Row label="YANIT SONRASI" value="Doğrulama + kayıt" />
                  </div>
                </InfoCard>

                <InfoCard icon={KeyRound} title="YAPILANDIRMA NOTU">
                  <p className="text-[10px] leading-5 text-zinc-500">
                    Model, sağlayıcı ve anahtarlar deployment ortamından yönetilir.
                    Bu ekran bunları değiştirmez; yalnızca çalışan sunucunun gerçekten
                    kullandığı durumu gösterir.
                  </p>
                </InfoCard>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

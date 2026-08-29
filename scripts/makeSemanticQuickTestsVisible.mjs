import fs from "node:fs";

const path = "src/components/studio/tabs/TestLabTab.tsx";
let source = fs.readFileSync(path, "utf8");

const oldBlock = `          {/* Hızlı Test Şablon Çipleri (Chat İçinde) */}
          <div className="px-2.5 py-1 bg-zinc-900/70 border-t border-zinc-800/70 flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0">
            <span className="text-[8.5px] font-mono text-zinc-500 shrink-0">Hızlı Test:</span>
            {PRESET_TESTS.map((t, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleRunTest(t.prompt)}
                disabled={isAiLoading}
                className="px-1.5 py-0.5 rounded bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-[8.5px] font-mono text-zinc-300 hover:text-white transition-colors shrink-0 cursor-pointer disabled:opacity-50"
              >
                {t.label}
              </button>
            ))}
          </div>`;

const newBlock = `          {/* Semantic Hızlı Testleri */}
          <div className="px-2.5 py-2 bg-indigo-950/20 border-t border-indigo-500/20 shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-mono font-bold tracking-wider text-indigo-300 uppercase">
                Semantic Testler
              </span>
              <span className="text-[8px] font-mono text-zinc-500">
                Tek tıkla gönder
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {PRESET_TESTS.map((t, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleRunTest(t.prompt)}
                  disabled={isAiLoading}
                  title={t.prompt}
                  className="px-2 py-1.5 rounded-md bg-zinc-950 hover:bg-indigo-950/50 border border-indigo-500/25 hover:border-indigo-400/50 text-[9px] font-mono font-semibold text-zinc-200 hover:text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-left"
                >
                  <span className="block text-indigo-300">{t.label}</span>
                  <span className="block mt-0.5 text-[7.5px] font-normal text-zinc-500 truncate">{t.prompt}</span>
                </button>
              ))}
            </div>
          </div>`;

if (source.includes(oldBlock)) {
  source = source.replace(oldBlock, newBlock);
} else if (!source.includes("Semantic Testler")) {
  throw new Error("quick test block not found");
}

fs.writeFileSync(path, source);
console.log("Semantic quick tests made visible");

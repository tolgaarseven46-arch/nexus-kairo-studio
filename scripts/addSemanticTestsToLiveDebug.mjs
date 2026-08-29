import fs from "node:fs";

const path = "src/components/studio/tabs/MindMapTab.tsx";
let source = fs.readFileSync(path, "utf8");

if (source.includes('const semanticQuickTests = [')) {
  console.log("live semantic quick tests already present");
  process.exit(0);
}

const stateAnchor = '  const [showRawTrace, setShowRawTrace] = useState(false);\n';
const stateInsert = `${stateAnchor}\n  const semanticQuickTests = [\n    { label: "Ekli Hakaret", prompt: "Sen dümdüz salaksın" },\n    { label: "Morfoloji", prompt: "Sen malsın" },\n    { label: "Aktarılan Hakaret", prompt: "Mert bana salak dedi" },\n    { label: "Çok Anlamlı Mal", prompt: "Mal aldım" },\n  ] as const;\n\n  const runSemanticQuickTest = (prompt: string) => {\n    if (isLoading) return;\n    setLastSubmittedMessage(prompt);\n    onSendMessage(prompt, { relationshipLevel });\n  };\n`;

if (!source.includes(stateAnchor)) {
  throw new Error("MindMapTab state anchor not found");
}
source = source.replace(stateAnchor, stateInsert);

const composerAnchor = '          <div className="shrink-0 border-t border-zinc-800 bg-zinc-950/65 p-3">\n            <div className="flex gap-2">';
const composerInsert = `          <div className="shrink-0 border-t border-zinc-800 bg-zinc-950/65 p-3">\n            <div className="mb-2.5 rounded-lg border border-violet-500/25 bg-violet-500/5 p-2.5">\n              <div className="mb-2 flex items-center justify-between gap-3">\n                <span className="text-[9px] font-mono font-bold tracking-wide text-violet-300">\n                  SEMANTIC TESTLER\n                </span>\n                <span className="text-[8px] font-mono text-zinc-600">\n                  Yeni dil-anlama hattı\n                </span>\n              </div>\n              <div className="grid grid-cols-2 gap-1.5">\n                {semanticQuickTests.map((test) => (\n                  <button\n                    key={test.label}\n                    type="button"\n                    onClick={() => runSemanticQuickTest(test.prompt)}\n                    disabled={isLoading}\n                    title={test.prompt}\n                    className="rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-left text-[9px] font-mono font-bold text-zinc-300 transition-colors hover:border-violet-500/60 hover:bg-violet-500/10 hover:text-violet-200 disabled:cursor-not-allowed disabled:opacity-35"\n                  >\n                    {test.label}\n                  </button>\n                ))}\n              </div>\n            </div>\n            <div className="flex gap-2">`;

if (!source.includes(composerAnchor)) {
  throw new Error("MindMapTab composer anchor not found");
}
source = source.replace(composerAnchor, composerInsert);

fs.writeFileSync(path, source);
console.log("added semantic quick tests to live TEST & DEBUG screen");

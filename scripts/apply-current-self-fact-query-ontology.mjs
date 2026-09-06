import fs from "node:fs";

const providerPath = "src/services/llmSemanticUnderstandingProvider.ts";
let provider = fs.readFileSync(providerPath, "utf8");
const oldLine = "selfMemoryQuery = null veya {surface, scope:self_fact|autobiographical_memory|any, factKey?, retrievalMode:targeted|broad, confidence}; yalnız Kaira'nın kendi özelliği/geçmişi/anısı soruluyorsa";
const newBlock = `selfMemoryQuery = null veya {surface, scope:self_fact|autobiographical_memory|any, factKey?, retrievalMode:targeted|broad, confidence}; yalnız Kaira'nın kendi self gerçeği/geçmişi/anısı soruluyorsa. Scope mevcut memory ontology ile aynı anlamı taşır:
- self_fact = Kaira'nın mevcut/şimdiki self gerçeği veya durable attribute/value gerçeği. Mevcut ilişki durumu, tercih, kimlik özelliği ve kanıtla revize edilebilen güncel self state burada kalır.
- autobiographical_memory = Kaira'nın geçmişte gerçekten yaşadığı olay/anı veya o yaşanmış geçmişi geri çağırma isteği. Bu scope append-only lived history içindir.
- any = yalnız current-vs-historical scope gerçekten çözülemiyorsa; varsayılan kaçış yolu değildir.
- Kaira'nın şu anki ilişki durumunu autobiographical_memory yapma; kişisel konu olması geçmiş anı olduğu anlamına gelmez.
- Geçmişte yaşanmış bir olayı self_fact yapma; Kaira'nın özne olması tek başına current self fact anlamına gelmez.`;
if (!provider.includes(oldLine)) throw new Error("selfMemoryQuery provider-contract anchor missing");
provider = provider.replace(oldLine, newBlock);
fs.writeFileSync(providerPath, provider, "utf8");

const statePath = "PROJECT_STATE.md";
let state = fs.readFileSync(statePath, "utf8");
const marker = "## 2026-09-06 — Real-user Turn 4 current-self query ontology";
if (!state.includes(marker)) {
  state = state.trimEnd() + `\n\n${marker}\n- The privacy false positive for \`senin manit falan var mı\` was already closed by PR #117, but that PR explicitly left current-self-state vs autobiographical self-memory routing unresolved.\n- Current-main inspection proved the memory architecture already has the correct distinction: \`self_fact\` is Kaira-owned self truth with evidence-revision mutability, while \`autobiographical_memory\` is append-only lived self history.\n- The remaining gap was the semantic-provider contract: \`selfMemoryQuery.scope\` listed both scopes without defining present/mutable self state versus historical lived episodes.\n- ADR-0066 binds provider semantics to the existing ontology. Current relationship status and other present self facts use \`self_fact\`; past lived episodes use \`autobiographical_memory\`; \`any\` is only genuine unresolved scope.\n- No new memory store, downstream raw-text parser, RelationshipReducer rule, provider call or second semantic authority is introduced. Development and CI remain API-free.\n`;
  fs.writeFileSync(statePath, state, "utf8");
}

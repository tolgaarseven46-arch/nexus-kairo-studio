import fs from "node:fs";

const path = "PROJECT_STATE.md";
const marker = "PR32 / UNIFIED_GUARD_PASS canonical final-delivery checkpoint";
const source = fs.readFileSync(path, "utf8");
if (source.includes(marker)) {
  console.log("PR4 checkpoint already present.");
  process.exit(0);
}

const checkpoint = `

## 131. 2026-09-03 — PR32 / UNIFIED_GUARD_PASS canonical final-delivery checkpoint
- ADR-0006 PR4 için \`src/services/kairaResponseConstraintPass.ts\` eklendi.
- Canonical final-delivery sırası tek pass içinde sabitlendi: **world truth → autobiographical truth → epistemic truth → KairaResponsePlan enforcement → final conformance**.
- Truth guard katmanları sosyal WHAT/WHETHER kararı üretmiyor; çözülmüş \`KairaResponsePlan\` canonical davranış otoritesi olarak kalıyor.
- Fallback metinleri doğrudan teslim edilmiyor; aynı ordered constraint pass içinden yeniden geçiriliyor.
- Canonical consistency yalnız son teslim edilecek metinde hesaplanıyor; legacy \`chosenTone\` / intent / sentiment keyword eşleşmeleri canonical accept/reject otoritesi olmaktan çıkarıldı.
- \`server.ts\` içinde \`UNIFIED_GUARD_PASS\` flag'i hem local fast-path hem AI/model yanıt yoluna bağlandı. Flag OFF iken mevcut legacy enforcement/rollback yolu korunuyor.
- \`kairaResponseConstraintPass.test.ts\`, \`kairaUnifiedGuardWiringContracts.test.ts\` ve epistemic runtime seam kontratları canonical/legacy sınırı doğruluyor.
- Activity-permission side channel PR31'de planner-owned reply dışına çıkarıldığı için bu pass sonrasında planner cevabını tekrar mutate etmiyor.
- PR32 merge ön koşulu: full CI + canonical suite + Architecture Review tamamen yeşil. Sonraki iş PR5 değildir; önce \`CANONICAL_PATH_PROMOTION_GATE\` kanıtları (canonical ON beta acceptance, recorded-session replay, OFF rollback drill, canonical-vs-legacy açıklanmış diff) tamamlanmalıdır.
`;

fs.writeFileSync(path, source.trimEnd() + checkpoint + "\n");
console.log("PR4 project checkpoint appended.");

# KAIRO PROJECT STATE

> Bu dosya projenin **aktif çalışma checkpoint'idir**. Yeni sohbet başladığında önce GitHub'daki gerçek `main`, açık PR/issue/CI ve bu dosya doğrulanır; eski sohbetten varsayım yapılmaz. Ayrıntılı tarih Git geçmişi, `AI_CHANGELOG.md` ve `docs/adr/**` içindedir.

## 1. Değişmez mimari kurallar
- `SemanticInterpretation@2` current-turn sınıflandırmasının tek canonical semantik otoritesidir.
- Morphology / syntax / discourse katmanları typed evidence üretir; semantic truth canonical L6 gateway'de oluşur.
- Downstream raw-text reparse veya ikinci semantic authority yok.
- `RelationshipReducer`, social appraisal, memory, dialogue decision, behavior/response ve persistence ownership sınırları korunur.
- Provider/API seçimi canonical semantic truth veya deterministic architecture proof değildir.
- Yeni regex/classifier/phrase patch yalnız ölçülmüş failure class ile gerekçelendirilir.
- Runtime provider/fallback kimliği observability concern'dür; canonical semantic authority provider-neutral kalır.

## 2. Language / canonical foundation — CLOSED
- PR #192–#196: provider-neutral Turkish morphology evidence, runtime integration, bounded local semantic acceptance ve L7 field-level provenance tamamlandı.
- Zero-parse / ambiguity abstention korunur.
- Typed evidence canonical interpretation'ı yalnız gateway'de reconcile eder; raw text downstream yeniden parse edilmez.
- Frozen Phase-0 baseline: 21 senaryo / 423 tur; sonraki behavior değişikliklerinde regression proof olarak korunur.

## 3. Relationship / memory / persistence foundation — CLOSED
- PR #199: provider-free same-stimulus relationship A/B acceptance.
- PR #202: long-horizon relationship progression + persistence continuity.
- PR #203: memory + relationship combined behavior proof.
- PR #204: request-vs-persisted relationship effective-state arbitration.
- PR #205: mixed-provider continuity regression test canonical selector seam'ine hizalandı; production behavior değişmedi.

## 4. State mutation concurrency / ownership — CLOSED
- PR #206: distinct-request state-owner lost-update race için distributed lease serialization.
- PR #207: requestId-less `/api/chat` çağrıları da coordination/state-owner serialization'a girer.
- PR #210: bounded clock-skew takeover safety.
- PR #211: ownership-loss propagation / stale-holder pre-persistence fencing merge edildi.
- Canonical invariant: authoritative lease ownership kaybı tespit edilirse stale holder persistence başlamadan fail-closed olur; crash recovery başka owner için korunur.

## 5. Counterfactual / discourse authority — CLOSED
- PR #209: multi-turn counterfactual replay proof; lived self-fact revision, pending-question dependency ve third-party open-thread resumption history intervention ile doğrulandı.
- PR #213 merge commit: `fa91edec9cd8169e4428205f8b5fc4d31e47860a`.
- Ambiguous open-thread resumption dialogue decision authority altında bounded clarification üretir; semantic authority'ye yeni parser eklenmedi.

## 6. Provider / canonical boundary — CLOSED
- PR #214 merge `c491c8c504788daedb211b0aff93ce5f5b8582b2`: canonical semantic runtime identity provider-neutral `llm_semantic_runtime`.
- PR #215 merge `be345044699939012f7605bdfd6f8136fd106a08`: model-generated provider etiketi trusted canonical provenance değildir.
- Provider/fallback transport + observability concern olarak kalır; canonical semantic/state authority değildir.

## 7. Response-generation measured fixes — CLOSED FOR KNOWN FAILURES
- Trace A PASS: rich context altında forbidden question/advice final metne sızmadı.
- Trace C/D: dynamic relationship/reaction state final dile gerçekten yansıyor.
- Trace F PASS: third-party open-thread state final response'a ulaşıyor.
- PR #217: `-ması/-mesi daha iyi olur` delivered-advice kaçağı regression ile kapatıldı.
- PR #218 merge `955c1fbfedc44379ffd4260034424d03bf04b3a6`: hurt/distancing canlı probe'da görülen `kendine dön biraz bugün` unsolicited-advice leak'i dar structural regression ile kapatıldı.
- Trace G provider parity production'da Gemini kapalı olduğu için tamamlanmış sayılmıyor.
- Live/provider keşif testleri maliyet nedeniyle durduruldu; yeni core validation deterministic/local/CI olmalı.

## 8. Core confidence reclassification — DETERMINISTIC HARDENING CLOSED
- `21 senaryo / 423 tur GREEN` bilinen failure class'ları kilitleyen regression baseline'ıdır; tek başına `production-grade robust core` iddiası değildir.
- Red-team sonrası açılan **Core Adversarial Validation / Soak / Counterfactual Matrix** deterministic kapsamı Phase 1–4 ile tamamlandı.
- Long-horizon, injury/repair, mixed soak, extreme relationship state, discourse collision, temporal robustness, uncertainty damping, persistence corruption/version mismatch ve spontaneous conversation sınıfları deterministic CI altında kapsandı.
- Yeni feature/provider tuning bu hardening fazına dahil edilmedi.

## 9. Core Adversarial Validation Phase 1 — CLOSED
- PR #219 merge `6a4601e8f7f3e2420966b4ea377ff76b9463f40a`.
- 120 tur positive long-horizon stability, 120 tur injury → repair, 150 tur mixed soak, 8 trust × warmth × familiarity uç kombinasyonu ve three-way discourse collision GREEN.
- İlk RED production failure değildi: 120 turun yaklaşık 10 saatlik simulated age olduğu durumda familiarity `>0.8` beklentisi canonical curve ile uyumsuz test varsayımıydı; assertion canonical curve'e hizalandı (`>0.5`) ve full CI #2716 + Architecture Review PASS oldu.
- Production behavior değişmedi; provider/API çağrısı yok.

## 10. Core Adversarial Validation Phase 2 — CLOSED
- PR #220 merged; final head `344f88aab78c712d1c957c6496fa2e33b24423ba`.
- Temporal robustness: 0m / 5m / 60m / 1d elapsed-time recovery monotonicity ve time-only full-reset olmaması GREEN.
- Semantic uncertainty mutation damping: yüksek belirsizliğin durable relationship mutation'ı azaltması doğrulandı.
- İlk implementation normal uncertainty davranışını da fazla zayıflattığı için historical betrayal regression RED oldu; assertion gevşetilmeden damping yalnız yüksek uncertainty bölgesine daraltıldı ve full CI GREEN oldu.
- Provider/API çağrısı yok.

## 11. Core Adversarial Validation Phase 3 — CLOSED
- PR #221 squash merge `e062c70e01a9682bd7449592857ff13125b6960c`.
- Persistence corruption/recovery gate: interrupted/partial write + schema version mismatch.
- Measured failure: hydration `schemaVersion` değerini 1'e zorlayıp unknown future version'ı sessizce kabul edebiliyor; eksik top-level arrays da boş diziye çevrilip geçerli state gibi hydrate olabiliyordu.
- Persisted canonical identity envelope artık normalize edilmeden önce exact schema version ve required top-level arrays ile doğrulanıyor; corrupt/version-mismatched document fail-closed oluyor.
- Storage/transport failure `unavailable`, corrupt persisted document `missing` olarak ayrıştırılıyor.
- Transactional append/self-fact revision corrupt envelope üzerinde mutate etmiyor.
- Fast CI, Architecture Review, historical RED→GREEN, full tests, TypeScript ve production build GREEN; provider/API çağrısı yok.

## 12. Core Adversarial Validation Phase 4 — CLOSED
- PR #222 squash merge `4659bfbb35cf01b677988c2185946fb96a43380e`.
- Deterministic 30-case spontaneous conversation probe seti: social routine, standalone acknowledgement, emotional opening, casual statement ve context-bound acknowledgement sınıfları.
- İlk RED'ler production invariant failure değil, testin exact dialogue move / sentence-count değerini gereksiz yere sabitlemesiydi; assertions actual dialogue-authority invariantlarına daraltıldı.
- Korunan invariantlar: bounded plan, unsupported speculation yok, standalone acknowledgement ile topic invention yok, explicit Kaira offer sonrası kısa acknowledgement doğru previous-answer binding'i koruyor.
- Fast CI, Architecture Review, historical RED→GREEN, full tests, TypeScript ve production build GREEN.
- Production behavior değişmedi; provider/API çağrısı yok.

## 13. Güncel checkpoint
- Deterministic core adversarial hardening için açık faz kalmadı.
- Gerçek provider parity / production acceptance ayrı bir kabul sınıfıdır; bu çalışmada canlı/provider çağrısı yapılmadı ve yapılmayacak.
- Bir sonraki geliştirme ancak yeni ölçülmüş failure class, yeni ürün hedefi veya açıkça başlatılan provider kabul turu ile açılmalı.
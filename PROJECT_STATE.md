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
- PR #192–#196 tamamlandı; frozen Phase-0 baseline 21 senaryo / 423 tur korunuyor.

## 3. Relationship / memory / persistence foundation — CLOSED
- PR #199, #202, #203, #204, #205 tamamlandı.

## 4. State mutation concurrency / ownership — CLOSED
- PR #206, #207, #210, #211 tamamlandı; lease ownership loss fail-closed.

## 5. Counterfactual / discourse authority — CLOSED
- PR #209 ve #213 tamamlandı.

## 6. Provider / canonical boundary — CLOSED
- PR #214 ve #215 tamamlandı; canonical semantic authority provider-neutral.

## 7. Response-generation measured fixes — CLOSED FOR KNOWN FAILURES
- Trace A PASS; Trace C/D state realization görüldü; Trace F PASS.
- PR #217 ve #218 advice leak regression'ları kapatıldı.
- Trace G provider parity Gemini kapalı olduğu için ayrı acceptance sınıfı.
- Live/provider keşif testleri maliyet nedeniyle durduruldu.

## 8. Core Adversarial Validation Phase 1–4 — CLOSED
- PR #219: long-horizon + 8 ilişki uç kombinasyonu + three-way discourse collision.
- PR #220: temporal robustness + semantic uncertainty mutation damping.
- PR #221: persistence corruption/version mismatch fail-closed.
- PR #222: 30-case spontaneous conversation probes.
- Full CI / Architecture Review GREEN; provider/API çağrısı yok.

## 9. Core Emotion-State Validation Phase 5A — CLOSED
- PR #224 squash merge `1fdbc00ac853f0520a6ef9970be32198bb3c149d`.
- Canonical resting affect alanları: `anger`, `stress`, `happiness`, `calmness`.
- 12-case pilot: 4 affect-dominant fixture × 3 canonical stimulus (`neutral`, `criticism`, `apology`).
- Sonuç: current affect semantic/relationship direction üretmedi; exact-zero korundu; G4 yalnız bounded affective magnitude/activation modülasyonu yaptı.
- Anger/stress negative pressure'ı artırdı, calmness activation'ı düşürdü, happiness positive affective significance'ı artırdı.
- Fast CI, full CI, historical RED→GREEN, TypeScript, production build ve Architecture Review GREEN; provider/API çağrısı yok.

## 10. Core Emotion-State Validation Phase 5B — CLOSED
- PR #225 squash merge `74cafdd9931b194bafb38944d81914b87e92ad22`.
- Runtime-derived reaction modes: `neutral`, `irritated`, `hurt`, `withdrawn`, `repairing`.
- 15-case deterministic matrix: 5 coherent relationship/reaction fixture × 3 stimulus sentiment (`neutral`, `negative`, `positive`).
- SpeechIdentity HOW ile BehaviorContract WHAT/WHETHER authority ayrımı aynı state uzayında doğrulandı.
- Non-neutral reactionMode sentiment değişimiyle silinmiyor; hurt/withdrawn/repairing style hard permissions açmıyor.
- Beklenen yönler korunuyor: withdrawn=`closed`, repairing=`repairing-cautious`, hurt=`distant-responsive`, irritated=`firm`; neutral ilişkide stimulus sentiment yalnız HOW tarafını etkileyebiliyor.
- Fast CI, full CI, historical RED→GREEN, TypeScript, production build ve Architecture Review GREEN.
- Production behavior değişmedi; provider/API çağrısı yok.

## 11. Core Emotion-State Validation Phase 5C — CLOSED
- Affect × reactionMode kesişimi için 6 deterministic cross-axis kombinasyon eklendi.
- `stress+repairing`, `anger+hurt`, `happiness+hurt`, `calmness+withdrawn`, `stress+irritated`, `happiness+repairing` kombinasyonlarında SpeechIdentity HOW ile BehaviorContract WHAT/WHETHER ayrımı korundu.
- Ek boundedness/isolation proof: diğer state alanları sabitken happiness 70→100 değişimi yüksek-yüklü negatif event appraisal valence/significance/activation değerini azaltmadı.
- İlk RED'ler production failure değildi; aynı fixture'da birden fazla affect alanını değiştiren test tasarımı ve canonical olmayan mutlak eşik kaynaklıydı. Tek-değişken A/B ile gerçek invariant izole edildi.
- Production behavior değişmedi; provider/API çağrısı yok.

## 12. Live Acceptance Transport — CLOSED
- PR #228 merge commit `a2c688ce7e1cdb2c4f96bf07cbfeb8d2c02673d7` ile `main`e alındı.
- İlk gerçek provider oturumunda browser `/api/chat` isteğinin 35 saniyede client-side `AbortController` ile kesildiği ölçüldü.
- Client deadline 35s → 75s taşındı ve tek transport policy sabitine alındı.
- Ambiguous timeout mesajı aynı mesajın hemen yeniden gönderilmemesi konusunda uyarıyor.
- Deterministic transport-policy regression testi eklendi; provider çağrısı yapılmadı.
- PR head `1ae0e2cd5ce7930aa6ae57145258cbf99fe73eb6` üzerinde CI ve Architecture Review GREEN.

## 13. Canonical behavior-situation authority — CLOSED
- PR #230 merge commit `4aaf8e6ab597fd28218f27159bc2c1950e62de6f` ile `main`e alındı.
- Personality, motivation, values, preferences, social orientation ve expression-style motorlarındaki downstream raw-text semantic reparse kaldırıldı.
- `projectCanonicalBehaviorSituations()` canonical `SemanticInterpretation@2` üzerinden typed situation üretip behavior motorlarına dağıtıyor.
- Dyadic hostility/coercion yalnız canonical `target === "kaira"` olduğunda Kaira-user davranış baskısına dönüşüyor; third-party isolation regression ile kilitli.
- Full CI, TypeScript, production build ve Architecture Review GREEN.

## 14. Provider outbound attempt cost-safety — CLOSED
- PR #231 merge commit `849fcfadc18d6538867ed83627f423438c9a2e0f` ile `main`e alındı.
- Deterministic server audit, tek generation'ın OpenRouter initial + affordable-token retry + empty-response retry + Gemini fallback üzerinden birden fazla ücretli outbound çağrıya dönüşebildiğini doğruladı.
- Canlı provider/API keşif çağrısı yapılmadı; risk statik/runtime-control contract ile ölçüldü.
- Generation başına toplam en fazla `2` outbound provider attempt = primary + tek recovery invariant'ı uygulanıyor.
- Same-provider retry ile cross-provider fallback aynı shared budget'ı tüketiyor; ikinci recovery/üçüncü ücretli çağrı engelleniyor.
- Değişiklik yalnız provider orchestration/cost-safety sınırında; canonical semantic/KDM authority değişmedi.
- RED/GREEN regression proof: `kairaProviderAttemptBudgetRegression.test.ts`.
- PR head `06d5086f8bca8121bca73276fe071a057e79df36` üzerinde full CI ve Architecture Review GREEN.

## 15. State-to-response realization audit — ACTIVE
- Response plan; question/advice/social-move/content-engagement/humor/affection/counter-flirt/forgiveness/reopening ve sentence/word/emoji budget ihlallerini deterministic olarak denetliyor.
- Final-delivery gate'in belgelenmiş invariant'ına karşı yeni RED bulundu: upstream `accepted=true` verse bile boş candidate mevcut implementationda boş assistant mesajı persist edebiliyor.
- RED proof branch: `codex/close-live-transport-realization-gate`, PR #233, Fast CI failure beklenen şekilde doğrulandı.
- Hedef fix: final-delivery gate boş candidate'i kendi ownership sınırında fail-closed reddetmeli ve fallback persist etmeli; provider çağrısı gerekmiyor.

## 16. Güncel checkpoint
- Core Emotion-State Validation Phase 5A + 5B + 5C CLOSED.
- Deterministic emotion coverage: 27 ana matrix cell + 6 cross-axis combination + boundedness/isolation proof.
- Live Acceptance Transport CLOSED; PR #228 main üzerinde.
- PR #230 CLOSED; canonical behavior-situation authority `main` üzerinde doğrulandı.
- PR #231 CLOSED; provider outbound-attempt budget `main` üzerinde generation başına primary + tek recovery ile sınırlandı.
- Aktif tek ölçülmüş realization RED: PR #233 final-delivery empty-candidate fail-closed invariantı.
- PR #230 sonrası eksik behavior-situation kavramları yalnız yeni testlerle gerçekten gerekli olduğu kanıtlanırsa canonical language schema/evidence katmanında modellenmeli; downstream regex geri getirilmemeli.
- Provider tarafında yeni production patch yalnız ölçülmüş RED failure sonrası açılmalı; canlı keşif çağrısı yapılmamalı.

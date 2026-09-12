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

## 12. Live Acceptance Transport — ACTIVE FIX
- İlk gerçek provider oturumunda browser `/api/chat` isteğinin 35 saniyede client-side `AbortController` ile kesildiği ölçüldü.
- Bu sınır provider'ın kendi timeout'u değildi; geç provider cevabını client tarafında kaybetme ve kullanıcı resend'i üzerinden ikinci ücretli çağrı riski yaratıyordu.
- Client deadline 35s → 75s taşındı ve tek transport policy sabitine alındı.
- Ambiguous timeout mesajı kullanıcıyı aynı mesajı hemen tekrar göndermemesi konusunda uyarıyor.
- Bu fix için provider çağrısı yapılmadı; deterministic transport-policy regression testi eklendi.

## 13. Canonical behavior-situation authority — ACTIVE PR #230
- Production audit'te personality, motivation, values, preferences, social orientation ve expression-style motorlarının canonical `SemanticInterpretation@2` üretildikten sonra `userMessage` üzerinden kendi regex semantiklerini tekrar çıkardığı doğrulandı.
- PR #230 bu ikinci semantic authority'yi kaldırıyor: tek `projectCanonicalBehaviorSituations()` projection'ı canonical interpretation'dan typed situation üretip altı behavior motoruna dağıtıyor.
- Dyadic hostility/coercion yalnız canonical `target === "kaira"` olduğunda personality/social/expression baskısına dönüşüyor; third-party hostility Kaira-user çatışmasına sızmıyor.
- Canonical schema'da henüz açıkça temsil edilmeyen alanlar downstream lexical tahminle yeniden oluşturulmuyor; neutral/fail-closed kalıyor. Başlıca açık kümeler: normative event facets (`deception`, `unfairness`, `betrayal`, `harm`, `irresponsibility`), interaction affordances (`novelty`, `competition`) ve environmental/goal affordances'ın bazıları (`instability`, daha zengin achievement/influence bağlamı).
- `boundaryEngine` ve `behaviorIntegrationEngine` production'da canonical `SemanticEvent` tüketiyor; raw-text fallback'leri compatibility cleanup adayı olarak ayrı takip edilecek.
- Regression contract downstream behavior motorlarında raw-text reparse'i yasaklıyor ve third-party target isolation'ı kilitliyor.

## 14. Güncel checkpoint
- Core Emotion-State Validation Phase 5A + 5B + 5C CLOSED.
- Deterministic emotion coverage: 27 ana matrix cell + 6 cross-axis combination + boundedness/isolation proof.
- Live Acceptance transport fix hattı ayrı olarak korunuyor.
- PR #230 canonical behavior-situation authority düzeltmesini doğruluyor; full CI + Architecture Review GREEN olmadan merge edilmeyecek.
- PR #230 sonrası kalan mimari iş: gerçekten gerekli olduğu testlerle kanıtlanırsa eksik behavior-situation kavramlarını canonical language schema/evidence katmanında açıkça modellemek; downstream regex geri getirilmemeli.
- Server tarafındaki provider retry/fallback maliyet davranışı ayrı cost-safety incelemesinde takip edilmeli; canlı keşif çağrısı yapılmamalı.
- Yeni production patch yalnız ölçülmüş RED failure sonrası açılmalı.
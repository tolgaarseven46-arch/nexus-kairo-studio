# KAIRO PROJECT STATE

> Bu dosya projenin **aktif çalışma checkpoint'idir**. Yeni sohbet başladığında önce GitHub'daki gerçek `main`, açık PR/issue/CI ve bu dosya doğrulanır; eski sohbetten varsayım yapılmaz. Ayrıntılı tarih Git geçmişi, `AI_CHANGELOG.md` ve `docs/adr/**` içindedir.

## 1. Değişmez mimari kurallar
- `SemanticInterpretation@2` current-turn sınıflandırmasının tek canonical semantik otoritesidir.
- Morphology / syntax / discourse katmanları typed evidence üretir; semantic truth canonical L6 gateway'de oluşur.
- Downstream raw-text reparse veya ikinci semantic authority yok.
- `RelationshipReducer`, social appraisal, memory, dialogue decision, behavior/response ve persistence ownership sınırları korunur.
- SpeechIdentity yalnız HOW; BehaviorContract WHAT/WHETHER authority’sidir.
- Provider/API seçimi canonical semantic truth veya deterministic architecture proof değildir.
- Yeni regex/classifier/phrase patch yalnız ölçülmüş failure class ile gerekçelendirilir.
- Yeni production patch yalnız deterministic counterexample / measured RED sonrası açılır.

## 2. Foundation — CLOSED
- Language/canonical foundation: PR #192–#196; frozen Phase-0 baseline 21 senaryo / 423 tur korunuyor.
- Relationship/memory/persistence foundation: PR #199, #202–#205.
- State mutation concurrency/ownership: PR #206, #207, #210, #211; lease ownership loss fail-closed.
- Counterfactual/discourse authority: PR #209, #213.
- Provider/canonical boundary: PR #214, #215; canonical authority provider-neutral.

## 3. Core adversarial + emotion-state validation — CLOSED
- PR #219–#222: long-horizon, relationship edge combinations, discourse collision, temporal robustness, uncertainty damping, persistence corruption/version mismatch, spontaneous conversation probes.
- PR #224: affect baseline / Phase 5A.
- PR #225: relationship-derived reaction-mode matrix / Phase 5B; SpeechIdentity HOW vs BehaviorContract WHAT/WHETHER separation.
- Phase 5C: affect × reactionMode cross-axis boundedness/isolation proof.
- Known deterministic gates, TypeScript, build and Architecture Review are GREEN.

## 4. Runtime/response/provider safety — CLOSED FOR KNOWN FAILURES
- PR #217/#218: measured advice-leak regressions closed.
- PR #228: live transport timeout policy closed.
- PR #230: canonical behavior-situation projection; downstream raw-text semantic reparse removed from production behavior path.
- PR #231: generation başına shared outbound provider attempt budget max 2.
- PR #233: final-delivery empty reply fail-closed; accepted turn boş reply persist edemez.
- PR #235: canonical semantic event production reachability closed.
- Provider/API live keşif testleri maliyet nedeniyle deterministic acceptance’tan ayrıdır.

## 5. Relationship maturity / severe harm — CLOSED
- PR #236: mature/high-trust relationship severe coercion/privacy injury floor; severe harm maturity attenuation ile tamamen eriyemez.
- PR #251: trust/warmth aynı tutulurken yalnız history/maturity farkının aynı mild direct injury’yi farklı damp ettiği tek-değişken A/B proof GREEN.
- PR #252: gerçek `saveKdmInteraction()` → `loadKdmState()` normalization/hydration round-trip sonrası aynı maturity-bearing state aynı reducer davranışını üretir; GREEN.

## 6. Commitment / betrayal lifecycle + appraisal — CLOSED FOR KNOWN FAILURES
- PR #237: commitment/betrayal typed appraisal boundary.
- PR #239: unresolved counterparty isolation; missing counterparty fail-closed `unknown`.
- PR #241/#242: evidence-order stability + person/scope/counterparty lifecycle isolation.
- PR #244/#245: equal/invalid timestamp lifecycle ambiguity fail-closed.
- PR #246: plan-generation temporal ambiguity fail-closed.
- PR #247: conflicting terminal-outcome temporal bucket caller/storage order’dan bağımsız; ambiguity → `unknown`.
- PR #248: canonical lifecycle `unknown` SocialAppraisal’da `absent`a düşmez; betrayal uncertainty korunur.
- PR #250: `betrayal: unknown` downstream application seviyesinde relational/affective mutation, confidence escalation veya material effect üretmez.
- Bu alanda bilinen açık production failure yok.

## 7. Automated pre-beta system acceptance — CLOSED
- PR #253 merge commit `f27f9bd0142cd618b952b012b7856059849e078a`.
- Provider-free deterministic acceptance toplam 120 relationship turn çalıştırır: iki kullanıcı × 60 turn.
- Supportive ve mixed history aynı canonical `RelationshipReducer` altında farklı ilişki geçmişi üretir; aynı final mild direct negative probe history-dependent relational output verir.
- Bir kullanıcının progression’ı diğer kullanıcının state’ini mutate etmez.
- İki ayrı user ID gerçek `saveKdmInteraction()` / `loadKdmState()` normalization path’inden geçer; yalnız Firestore transport in-memory mock’tur; cross-user persistence contamination yoktur.
- Long-horizon state SpeechIdentity → BehaviorContract → final-delivery zincirine girer; HOW/WHAT authority ayrımı ve forbidden advice korunur; accepted final reply non-empty kalır.
- CI run `34759029702`: docs-guard, behavior-guard, architecture contracts, autonomous runtime contracts, beta runtime regression, Phase-0 harness/report, beta conversation/KNT replay, proof manifest, Historical RED→GREEN, full Tests, TypeScript ve production build GREEN.
- Architecture Review run `34759029689` GREEN.
- Ölçülen production RED çıkmadı; runtime patch yapılmadı.

## 8. Güncel checkpoint
- Doğrulanmış `main`: `f27f9bd0142cd618b952b012b7856059849e078a` (#253 sonrası).
- PR #250–#253 zinciri CLOSED.
- Açık production failure bilinmiyor.
- Otomatik pre-beta deterministic architecture/system acceptance kapsamında şu an bilinen açık iş yok.
- Yeni relationship/social-appraisal/world-lifecycle/behavior/realization/provider production patch yalnız yeni ölçülmüş RED/counterexample sonrası açılmalı.
- Eksik behavior-situation kavramı ancak test ile gerçekten gerekli olduğu kanıtlanırsa canonical language schema/evidence katmanında modellenmeli; downstream regex/classifier geri getirilmemeli.
- Provider live parity / maliyetli gerçek-provider keşfi ayrı acceptance sınıfıdır ve deterministic mimari proof yerine geçmez.

## 9. Sıradaki ürün aşaması
- Sıradaki ana aşama **gerçek insan beta / live conversation acceptance**: gerçek kullanıcıların doğal uzun sohbetleri, ürün gözlemi ve yakalanan KNT/trace’lerin deterministic replay’e dönüştürülmesi.
- Beta sırasında yalnız ölçülmüş davranış failure’ları bug-class regression’a çevrilir; mimari varsayımla genişletilmez.
- Gerçek insan beta bu repo içinden otomatik tamamlanamaz; dış kullanım/veri gerektirir.

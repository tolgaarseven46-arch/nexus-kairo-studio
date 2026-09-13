# KAIRO PROJECT STATE

> Bu dosya projenin **aktif çalışma checkpoint'idir**. Yeni sohbet başladığında önce GitHub'daki gerçek `main`, açık PR/issue/CI ve bu dosya doğrulanır; eski sohbetten varsayım yapılmaz. Bu dosyadaki eski commit SHA'ları tarihsel kanıttır; güncel `main` SHA her zaman GitHub'dan yeniden doğrulanır. Ayrıntılı tarih Git geçmişi, `AI_CHANGELOG.md` ve `docs/adr/**` içindedir.

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

## 6. Commitment / betrayal lifecycle + appraisal — ACTIVE: PR #258
- PR #237: commitment/betrayal typed appraisal boundary.
- PR #239: unresolved counterparty isolation; missing counterparty fail-closed `unknown`.
- PR #241/#242: evidence-order stability + person/scope/counterparty lifecycle isolation.
- PR #244/#245: equal/invalid timestamp lifecycle ambiguity fail-closed.
- PR #246: plan-generation temporal ambiguity fail-closed.
- PR #247: conflicting terminal-outcome temporal bucket caller/storage order’dan bağımsız; ambiguity → `unknown`.
- PR #248: canonical lifecycle `unknown` SocialAppraisal’da `absent`a düşmez; betrayal uncertainty korunur.
- PR #250: `betrayal: unknown` downstream application seviyesinde relational/affective mutation, confidence escalation veya material effect üretmez.
- 13 Eylül authority audit’i yeni bir temsil boşluğu kanıtladı: mevcut `SemanticAttribution` controllability / communicationConsent / externalCause taşımıyordu ve SocialAppraisal commitment projection current `state` ile prior state/lifecycle outcome’u ayırmıyordu.
- Characterization RED branch `codex/lifecycle-socialappraisal-mapping-contract`, RED commit `3d7949059071de07a5ca120510ff1e7e596e6ee4`, Fast CI run `34762500294`: 8 lifecycle mapping senaryosunun 5’i RED, 3’ü mevcut davranışla GREEN.
- PR #258 aynı mevcut semantic authority’yi typed alanlarla genişletir; yeni authority, downstream raw-text reparse, regex veya phrase heuristic eklemez. Missing/legacy attribution evidence `unknown` fail-closed normalize edilir.
- Commitment projection `state / previousState / lifecycleOutcome` olarak ayrılır: postponed aktif obligation’ı korur; failed/cancelled terminal outcome prior active state’i silmez; unknown lifecycle fail-closed kalır.
- GREEN head `f95b377d8f74f16020e55920a6bfa4c6643c9b51`, Fast CI run `34763424188`: lifecycle mapping contract 8/8 GREEN, toplam 59/59 test ve `tsc --noEmit` GREEN.
- PR #258 full CI / Architecture Review kapanmadan bu extension CLOSED sayılmaz.

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
- PR #254 automated pre-beta checkpoint closure/docs sync olarak merge edildi.

## 8. Güncel teknik durum
- PR #258’de measured lifecycle→SocialAppraisal representation gap’i kapanıyor; merge edilene kadar commitment/betrayal lifecycle alanı açık implementation işi sayılır.
- Bunun dışındaki otomatik pre-beta deterministic architecture/system acceptance kapsamında bilinen açık implementation işi yok.
- Yeni relationship/social-appraisal/world-lifecycle/behavior/realization/provider production patch yalnız yeni ölçülmüş RED/counterexample sonrası açılmalı.
- Eksik behavior-situation kavramı ancak test ile gerçekten gerekli olduğu kanıtlanırsa canonical language schema/evidence katmanında modellenmeli; downstream regex/classifier geri getirilmemeli.
- Provider live parity / maliyetli gerçek-provider keşfi ayrı acceptance sınıfıdır ve deterministic mimari proof yerine geçmez.

## 9. Live beta / real-human acceptance — ACTIVE PHASE
- Sıradaki ana aşama gerçek insan beta / live conversation acceptance'tır; PR #258 gate’leri kapanmadan yeni lifecycle/appraisal davranışı merge edilmiş kabul edilmez.
- `docs/beta/live-beta-protocol.md` beta giriş kriterlerini, minimum session/turn evidence'ını, failure class/severity modelini, deterministic RED promotion zincirini ve exit criteria'yı tanımlar.
- `.github/ISSUE_TEMPLATE/live-beta-failure.md` her gerçek beta failure'ı için standart capture/replay handoff formatıdır.
- Bir beta gözlemi production bug sayılmaz; önce exact failing window + runtime evidence + owning seam + deterministic replay/counterexample gerekir.
- Trace'te bulunmayan canonical evidence raw text'ten sonradan yeniden türetilmez; `missing` olarak tutulur.
- `UNKNOWN` failure class'tan production patch yapılmaz.
- S0 cross-user contamination/data/privacy failure beta'yı durdurur; S1 canonical truth/relationship/memory/hard-permission failure deterministic reproduction sonrası geniş beta öncesi kapatılır.

## 10. Beta acceptance hedefleri
- En az iki gerçek kullanıcıyla bağımsız history/memory ilişkileri test edilmeli.
- Fresh vs mature relationship farkı gerçek kullanımda gözlenmeli.
- Positive history → mild conflict ve repeated negative → repair akışları denenmeli.
- Third-party referanslar Kaira-user ilişkisini yanlış mutate etmemeli.
- Restart/hydration sonrası state parity gerçek kullanımda gözlenmeli.
- En az bir gerçek sohbet 100+ turn boyunca manuel state reset olmadan yürütülmeli; yalnız final snapshot değil per-turn relationship/affect/memory/decision evrimi incelenmeli.
- Aynı/benzer input farklı user history'lerinde gerektiğinde farklı sonuç üretmeli fakat kullanıcı state'leri birbirine sızmamalı.
- Beta completion için unresolved S0/S1 kalmamalı; düzeltilen S1/S2 davranış failure'larının deterministic regression/replay'i olmalı.

## 11. Çalışma kuralı
- Beta başlamadan varsayımsal behavior patch üretme.
- Gerçek kullanıcı failure'ı geldiğinde zincir: capture → ownership → minimal deterministic RED/replay → owning-seam fix → neighboring regressions → full CI → merge.
- Test Lab'deki statik/simüle cevaplar gerçek live-beta kanıtı sayılmaz; beta evidence gerçek runtime conversation path'ten gelmelidir.

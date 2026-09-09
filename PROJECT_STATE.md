# KAIRO PROJECT STATE

> Bu dosya projenin **tek kaynaklı aktif çalışma checkpoint'idir**. Yeni sohbet başladığında önce GitHub'daki gerçek `main`, açık PR/issue/CI durumu ve bu dosya doğrulanır; eski sohbetten varsayım yapılmaz.
>
> Ayrıntılı eski çalışma kronolojisi Git history ve `docs/adr/` altında korunur. Bu dosya bilinçli olarak **aktif mimari gerçek + kapanmış fazlar + sıradaki ölçülebilir iş** için kompakt tutulur.

## 1. Proje kimliği
- Proje: NEXUS / KAIRO Studio
- Repo: `tolgaarseven46-arch/nexus-kairo-studio`
- Ana amaç: kişiliği, dinamik durumu, ilişki geçmişi, hafızası, dünya/self modeli ve kendi yaşam akışı olan Sentetik Droit'ler üretmek; Kaira bu mimarinin referans karakteridir.
- Temel geliştirme yöntemi: KTM/KDM — katmanlı, authority sınırları açık, deterministic evidence + regression odaklı geliştirme.

## 2. Değişmez mimari kurallar
- `SemanticInterpretation@2` current-turn sınıflandırmasının tek canonical semantik otoritesidir. Downstream katmanlar raw kullanıcı metnini tekrar parse ederek ikinci semantic authority oluşturamaz.
- `RelationshipReducer` canonical relationship-state transition otoritesidir.
- `KairaResponsePlan` final WHAT/WHETHER davranış otoritesidir; speech/persona/style katmanları HOW-only'dir ve kapalı bir izni yeniden açamaz.
- Final delivery world truth → autobiographical truth → epistemic truth → ResponsePlan enforcement → final conformance sırasındaki canonical constraint zincirinden geçer.
- Claim, WorldEvent, self_fact, autobiographical_memory, language_style, relationship_state ve discourse_state ayrı ownership sınırlarına sahiptir; birbirine sessizce factual truth olarak promote edilemez.
- Stable character/fine-tune config resting affect baseline'ı; server KDM ise situational dynamic affect transition/recovery'yi sahiplenir.
- Provider/API geliştirme/audit/CI kanıtının yerine kullanılmaz. Yeni product patch önce deterministic characterization ile kanıtlanır; canlı provider yalnız gerçek-user acceptance gerektiğinde kullanılır.
- Yeni regex/classifier, phrase patch veya ikinci memory/appraisal authority ancak mevcut canonical boundary'nin yetersizliği ölçülerek kanıtlanırsa düşünülebilir.

## 3. Kapanmış büyük fazlar
- Canonical-only rollout ve legacy compatibility kaldırımı tamamlandı.
- Single semantic authority, dialogue-policy decoupling, repetition, emotional-load calibration ve canonical mixed-session acceptance tamamlandı.
- World-memory semantic retrieval authority, Claim/Event provenance ve self/identity integrity fazları tamamlandı.
- Affect baseline vs situational affect authority ayrımı tamamlandı.
- Structured-memory ontology tamamlandı.
- Natural conversation / final-delivery / question-act / transcript leakage / relationship persistence ana blocker zincirleri deterministic ve gerekli yerlerde production acceptance ile kapatıldı.
- Autonomous Life: instance ownership, planning, scheduler, replay/idempotency, health ve production recovery fazı kapalıdır; yeni production evidence olmadan yeniden açılmaz.
- Dialogue obligations / fulfillment authority ve final-delivery fail-closed zinciri kapatıldı.
- Privacy/coercion ontology ile current-self vs autobiographical-self routing sınırları typed semantics üzerinden daraltıldı; downstream raw-text patch eklenmedi.
- First-party ongoing event continuity typed claims + discourse working set üzerinden kuruldu; raw topic regex'i eklenmedi.
- Phase-0 A-cluster authority observability kapatıldı; unavailable authority varmış gibi gösterilmez.

## 4. Social Appraisal canonical architecture — G1 → G4 — CLOSED (2026-09-08)
- G1 exact-zero gate: semantik olarak anlamlı sosyal etki yoksa appraisal exact-zero kalır.
- G2 candidate readings + dyadic reweight: ilişki/norm bağlamı yalnız candidate ağırlığını değiştirir; yeni semantic fact icat etmez.
- G3 single resolution: tek resolved social appraisal üretilir; downstream ikinci appraisal üretmez.
- G4 bounded context modulation: personality, relationship state, dyadic norms ve bounded autobiographical context yalnız **zaten anlamlı olan** sosyal etkinin magnitude/nitelik yorumunu modüle eder.
- Neutral bir turdan injury/reward/repair yaratılamaz.
- Full/raw autobiography G4'e verilmez; yalnız instance-owned canonical autobiography'den aktif kullanıcı için türetilen bounded typed summary kullanılır.
- Production wiring PR #170 ile kapatıldı; main merge SHA `3511f62a9bb0af37c1551cc0cb1e10845057fd80`.
- Yeni ölçülmüş regression olmadan G1/G2/G3/G4, dyadic norm authority, participant identity veya bounded autobiographical-context sınırı yeniden açılmaz.

## 5. Phase-0 authority observability — CLOSED
- PR #174 merge edildi; main merge SHA `780a19193de861f6bbe6da5e01b985f20342a6a1`.
- Current-self/world, autobiography ve session provenance ayrı typed facet'lerdir.
- Authority yoksa Phase-0 açıkça `unavailable` kalır; raw-text parser veya fabricated snapshot ile coverage üretilmez.
- Persistent production memory hydration Phase-0 kapsamı değildir; persistent-memory davranışı gerçek production typed seam'inde ayrıca characterize edilir.

## 6. Natural-conversation characterization acceptance — CLOSED (2026-09-08)
- PR #176 `test(kaira): close natural conversation characterization acceptance` merge edildi.
- Main merge SHA: `ec7be842e433b8c84b2a47a42ed82a934847ccb9`.
- Final acceptance şunları doğruluyor:
  - maximally deep autobiography neutral bir turdan effect üretemiyor;
  - autobiographical context relational meaning'i değiştiremiyor;
  - explicit third-party scope deep active-user autobiography olsa bile relationship-neutral kalıyor;
  - aynı typed mild social injury fragile ve established relationship history arasında farklı magnitude üretiyor fakat insult immunity yaratmıyor;
  - gerçek çok-turlu Türkçe Phase-0 C3/C4/D1/D2 senaryoları canonical semantics → G4/KDM → relationship → BehaviorContract/DialogueDecision → canonical ResponsePlan hattında replay ediliyor ve plan/WHY-HOW tutarlılık invariants'ları korunuyor.
- Production behavior, semantic authority, appraisal authority veya memory authority değiştirilmedi; yeni heuristic/classifier eklenmedi.

## 7. Şu anki canonical runtime özeti
1. canonical language understanding → immutable `SemanticInterpretation@2`;
2. grounded event/entity projection;
3. instance/self/world/autobiographical authorities gerektiği kadar typed evidence sağlar;
4. single Social Appraisal G1→G4 zinciri dyadic relationship effect'i çözer;
5. `RelationshipReducer` dynamic relationship/affect state'i günceller;
6. BehaviorContract + DialogueDecision + HOW-only SpeechIdentity → canonical `KairaResponsePlan`;
7. local renderer veya provider yalnız planı realize eder;
8. canonical truth/plan/final-delivery gates user-facing cevabı doğrular;
9. accepted turn state, trace, memory ve observability sınırlarına persist edilir.

Semantic interpretation, appraisal resolution, relationship transition ve final behavior permission ayrı fakat tekil authority'lerdir; aynı kavramın paralel consumer-local yorumu kabul edilmez.

## 8. Çalışma protokolü — FAST/FULL operating model — ACTIVE
- PR #180 `ci: add fast branch validation operating model` merge edildi.
- Main merge SHA: `fa61b7598ec025606faa370ca5c2f46ea1220213`.
- `codex/**` branch push'ları FAST lane'de compact canonical test + touched characterization + TypeScript çalıştırır ve tek `fast-ci-<sha>` artifact üretir.
- Existing FULL CI kapsamı küçültülmedi; PR/main merge kapısında architecture contracts + autonomous + beta + Phase-0 + historical proof + full Vitest + TypeScript + build çalışmaya devam eder.
- `PROJECT_STATE.md` mümkün olduğunda aynı feature PR içinde güncellenir; ayrı checkpoint PR churn'ü yaratılmaz.
- Kapanmış seam yeni reproducible failure, invariant failure, authority contradiction veya production evidence olmadan yeniden açılmaz.

## 9. Shadow-authority kısa kontrolü — CLOSED (2026-09-09)
- `discourseSocialAct.ts`: user classification shared canonical event'ten gelir; compatibility `_message` intentionally ignored.
- `droitBehaviorEngine.computeBehaviorProfile`: legacy raw-text distress fallback kodda kalır; canonical production KDM path structured `appraiseBehaviorSeriousContext(semanticInterpretation)` verir; fallback canonical production authority değildir.
- `relationshipBehaviorService.applyRelationshipContext`: dosya hâlâ vardır ancak current-main code search caller bulmamıştır; cleanup manifestinde dead/legacy candidate olarak evidence-before-deletion ile değerlendirilecektir.

Bu checkpoint product patch gerektirmedi.

## 10. Final-delivery live regression history — FIX MERGED / PROVIDER FOLLOW-UP DEFERRED
- PR #178 (`test/phase1-live-conversation-probe`) **closed, not merged**.
- PR #179 (`fix(delivery): recover rejected live replies from canonical social move`) **merged**.
- Main merge SHA: `7424f449af9896e31fa7762ccbfa0ec8620d8e0f`.
- Provider follow-up current core-development gate değildir. Mevcut çalışma API/provider kullanmadan deterministic core tooling ve characterization üzerinde devam eder.

## 11. Natural Characterization v2 — INITIAL RUN COMPLETE / FRAMEWORK MERGE PENDING
- Frozen 21 senaryo / 423 tur regression baseline'a dokunulmadı.
- Ayrı v2 corpus: 10 senaryo, 11 execution, toplam 220 user turn.
- Her senaryo `openQuestionId` taşır.
- Per-turn artifact semantic/state/relationship/dialogue/ResponsePlan/invariant snapshot'ı üretir.
- Son corrected FAST run: `3d590f61572cba89cea28d198b8601fa0813af70`.
- FAST validation: **PASS**.
- Classification: `PASS=3`, `FAIL_PRODUCT=2`, `FAIL_TEST_OR_DETECTOR=0`, `OBSERVATION=6`, `CAPABILITY_GAP=0`.

### Kanıtlanan iyi davranışlar
- S7 repair provenance: **PASS** — canonical repair/apology evidence yokken `repairProgress` kendiliğinden artmadı.
- S9 paired relationship trajectory: **PASS** — aynı transcript farklı relationship seed'lerinde farklı trajectory üretti; fresh hurt delta `+4`, established hurt delta `+3`; familiarity injury'yi azalttı fakat sıfırlamadı.

### Kanıtlanan product failure aileleri
1. **S5 — canonical stop/paraphrase + negated-apology semantic gap**
   - `konuşmayı bırak` current-turn stop olarak tanınmıyor.
   - `yeter artık cevap verme` current-turn stop olarak tanınmıyor.
   - `çekil git` current-turn stop olarak tanınmıyor.
   - `bana bir şey yazma` current-turn stop olarak tanınmıyor.
   - `ama özür dilemedim` yanlışlıkla apology/repair semantics'e yükseliyor ve relationship yumuşaması üretiyor.
   - Not: `stopTalking` mevcut BehaviorContract tasarımında transient/current-turn komuttur; persistent disengagement oracle'ı kullanılmaz.
2. **S8 — third-party target bleed**
   - `iş arkadaşına salak dedi` yanlışlıkla `target=kaira` oluyor.
   - Aynı turda dyad delta: warmth `-3`, trust `-2`, conflict `+4`, hurt `+5`.
   - `unknown`/`event` target olup dyadic harm üretmeyen neighbor turlar yalnız observation'dır; product bug sayılmaz.

Detaylı audit: `docs/audits/2026-09-09-natural-characterization-v2-initial-results.md`.

## 12. Test sonucu sınıflandırma kuralı
- `PASS`: tanımlı invariant/oracle sağlandı.
- `FAIL_PRODUCT`: canonical davranış ölçülebilir biçimde yanlış.
- `FAIL_TEST_OR_DETECTOR`: oracle/detector/test tooling yanlış.
- `OBSERVATION`: beklenmedik/incelemeye değer davranış, henüz bug kanıtı değil.
- `CAPABILITY_GAP`: henüz tasarlanmamış yetenek; bug olarak patchlenmez.

Characterization'ın görevi `FAIL_PRODUCT` keşfetmektir; bu sonuç framework/tooling merge'ini tek başına engellemez. `FAIL_TEST_OR_DETECTOR` tooling'i engeller.

## 13. Next verified development mode
Sıra:
1. Natural Characterization v2 framework + corpus + artifact'ı full PR merge gate ile main'e al.
2. Ayrı product-fix branch'te yalnız kanıtlanmış iki semantic failure ailesini canonical language-understanding/target boundary'de düzelt: S5 ve S8.
3. Reported case + neighbor regressions + frozen 21/423 + final full CI ile kapat.
4. Ardından repo cleanup manifest çıkar: branch/script/root docs için KEEP/MOVE/ARCHIVE/DELETE evidence tablosu.
5. Manifest onayı sonrası merged branch/doc/script cleanup uygula.

## 14. Latest checkpoint
- Date: 2026-09-09
- Current main before v2 framework PR: `fa61b7598ec025606faa370ca5c2f46ea1220213`
- FAST/FULL operating model: **MERGED / ACTIVE**
- Shadow-authority short check: **CLOSED**
- Frozen 21/423 regression baseline: **UNCHANGED**
- Natural Characterization v2 initial run: **COMPLETE**
- V2 tooling health: **PASS; FAIL_TEST_OR_DETECTOR=0**
- Proven product failures: **S5 semantic paraphrase/negation**, **S8 third-party target bleed**
- Provider/API used in current work: **NO**
- Active work: **merge v2 framework, then fix only S5/S8 canonical semantic failures**

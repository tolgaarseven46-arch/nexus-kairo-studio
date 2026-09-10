# KAIRO PROJECT STATE

> Bu dosya projenin **tek kaynaklı aktif çalışma checkpoint'idir**. Yeni sohbet başladığında önce GitHub'daki gerçek `main`, açık PR/issue/CI durumu ve bu dosya doğrulanır; eski sohbetten varsayım yapılmaz.

## 1. Değişmez mimari kurallar
- `SemanticInterpretation@2` current-turn sınıflandırmasının tek canonical semantik otoritesidir.
- Morphology L2 typed evidence'tır; semantic truth yalnız L6'da oluşur.
- Downstream raw text reparse / ikinci semantic authority yok.
- Social Appraisal G1→G4, `RelationshipReducer` ve `KairaResponsePlan` ownership sınırları korunur.
- Provider/API deterministic architecture proof yerine kullanılmaz.
- Yeni regex/classifier/phrase patch ancak canonical boundary'deki ölçülmüş failure ile gerekçelendirilir.

## 2. Pre-Gemini Turkish language foundation — CLOSED
- PR #192 merge: `1605e239355b485164b72f3b70f9c8c8a2f42344`.
- Rich provider-neutral `TurkishMorphologyEvidence` contract mevcut.
- Ambiguity ve explicit zero-parse korunur.
- Typed L6 adjudicator raw text okumadan typed L2/L3/L5 evidence tüketir.
- L7 field-level semantic provenance sidecar contract mevcut.
- Bu foundation semantic provider/LLM'i kaldırmaz; canonical semantic authority `SemanticInterpretation@2` olarak kalır.

## 3. Local language runtime integration — MERGED
- PR #193 merge: `cb5a1207d8bfba80865fae2bfeb6ae31675912ff`.
- Rich morphology evidence production language-understanding gateway'e bağlandı.
- Legacy morphology aynı rich contract'a adapte edilerek L6'ya girer.
- Incoming/shared ve semantic-provider interpretation aynı canonical L6 evidence gate'inden geçer.
- Zero-parse ve ambiguity abstention runtime'da korunur.
- Post-merge main FULL CI #2638 PASS.

## 4. Morphology analyzer shadow benchmark — MERGED
- PR #194 merge: `ac9bfa9cc3998167f67bc5ecc17e3b122d6254bb`.
- Provider-neutral deterministic benchmark parse rate / zero-parse / ambiguity / expected-feature recall ölçer.
- JS-native frozen proof yararlı morphology evidence üretir fakat production dependency seçmek için yeterli kanıt değildir.
- Legacy Zemberek `/lemmas`: `compatibility_only`.
- Rich Zemberek sentence analysis: ölçülmemiş `reference_candidate`.
- Analyzer winner bilinçli olarak **NOT SELECTED**; gerçek karşılaştırılabilir runtime evidence olmadan seçim yapılmaz.
- Post-merge main FULL CI #2640 PASS.

## 5. Bounded local semantic runtime acceptance — MERGED
- PR #195 merge: `4af0b4841db70c7595c816d157ba7fb7235d9e4b`.
- Typed greeting / how_are_you / what_doing routine evidence canonical L6'da kabul edilir.
- Unanimous NEG yalnız existing positive semantic candidate'i block eder; kendi başına semantic invention yapmaz.
- QUES morphology yalnız typed `polarQuestionClause` scope ile information request'e promote edilir.
- Ambiguous QUES promotion yapılmaz; uncertainty yükselir.
- Zero-parse tamamen abstain eder.
- PR #195 Architecture Review #770 PASS.
- PR #195 FULL CI #2641 PASS.
- Post-merge main FULL CI #2642 PASS.

## 6. L7 provenance source-kind audit — MERGED
- PR #196 merge: `cbd4c8bf93c87c97deb30c378631b5f24a3fa732`.
- Typed social-routine provenance `discourse` olarak kaydedilir; morphology diye yanlış etiketlenmez.
- Unanimous NEG provenance `morphology` olarak kalır.
- Typed polar-question promotion field provenance'da ortak `morphology + syntax` evidence olarak kaydedilir.
- Yalnız gerçekten adjudicate edilen canonical semantic field'lara sidecar provenance yazılır.
- Focused provenance-kind regressions eklendi.
- PR #196 Architecture Review #770 PASS.
- PR #196 FULL CI #2643 PASS.
- Post-merge main FULL CI #2644 PASS.

## 7. Remaining deterministic language families — CHARACTERIZED / PASS
Current canonical runtime üzerinde yeniden doğrulanan aileler:
- contextual `yeter`: sufficiency/predicate kullanım stop değildir; standalone `yeter` stop request'tir;
- preference-vs-directed `seviyorum`: `kahveyi seviyorum` neutral preference, `seni seviyorum` Kaira-directed positive social act olarak ayrılır;
- inflected interrogatives: `ne yaptın`, `neredeydin`, `kimlerle konuştun`, `neredesin`, `ne yapacaksın` information_request olarak kalır;
- target grounding: narrated dative third-party harm active Kaira-user dyadına sızmaz; explicit second-person harm Kaira target olarak kalır;
- nearby non-question counterexamples korunur.

Bu characterization mevcut canonical behavior'ı regression proof ile kilitler; yeni semantic regex/parser/phrase patch eklemez.

## 8. Provider-free relationship acceptance — MERGED
- PR #199 merge: `0151e64503d1b2b75603d324159e06d7fa9bd15a`.
- Frozen C3 same-stimulus A/B proof gerçek canonical Phase-0 runtime üzerinde geçer.
- Yeni ve established/high-quality ilişki yalnız typed `DroitDynamicState.relationship` seed'iyle ayrılır.
- Her iki kol non-zero injury üretir; familiar/high-quality context harm'ı azaltır fakat sıfırlamaz.
- Aynı turn için canonical `SemanticInterpretation@2` ve `SemanticEvent` eşit kalır.
- Provider/API çağrısı ve yeni runtime parser eklenmedi.

## 9. Dismissive rhetorical semantic-floor coverage — MERGED
- Issue #200 kapandı.
- PR #201 merge edildi ve dismissive competence/knowledge/capability retorik sorularının bounded canonical social devaluation üretmesi regression proof ile kilitlendi.
- Literal bilgi soruları non-devaluing kalır; joke frame severity/confidence'i modüle eder; explicit repair/apology semantiği korunur.
- Yeni semantic authority veya provider/API dependency eklenmedi.
- Frozen 21/423 Phase-0 baseline ve PR #199 relationship A/B acceptance korundu.

## 10. Provider-free long-horizon relationship progression/persistence — MERGED
- PR #202 merge: `38c5c8fe990f967610ee1b5bf47ff752293ee572`.
- Post-merge main FULL CI #2664 PASS.
- Canonical reducer age + interaction tabanlı continuous familiarity, relationship-quality gelişimi, injury damping ve recovery üretir.
- 40 turluk provider-free horizon persistence-style JSON round-trip ile iki fazda doğrulandı; interaction count, familiarity, warmth/trust progression ve firstSeen/lastInteraction continuity korundu.
- Production persistent Kaira instance hydrate/save seam'leri ve durable relationship field continuity acceptance ile kilitlendi.
- Yeni semantic parser, model/provider çağrısı veya ikinci relationship authority eklenmedi.

## 11. Provider-free memory + relationship combined behavior — MERGED
- PR #203 merge: `47d5f5012c00e50cca6572bb777b0ca3b5d3905d`.
- Same canonical semantic + same established relationship A/B proof memory var/yok canonical KDM turn sınırında geçti.
- Typed autobiographical memory yalnız material affective projection'ı derinleştirir; relationship state'i yeniden yorumlamaz.

## 12. Persistent relationship effective-state arbitration — MERGED
- PR #204 merge: `0cac99f9da1ea603ea116e9857a02cb7f59dde3e`.
- Production failure class: stale request relationship, daha yeni persisted relationship snapshot'ını ezebiliyordu.
- Timestamp chronology primary; tie/missing chronology interaction count ile çözülür; exact tie persisted lehine fail-closed olur.
- Genuinely newer request authoritative kalır.
- `server.ts` canonical `selectEffectiveKdmDynamicState` selector üzerinden arbitrate eder.

## 13. Post-#204 CI regression recovery — MERGED / CLOSED
- PR #205 merge: `27e0680c71613746d25b3a12847642618e6a5593`.
- Post-#204 FULL CI failure production davranışı değil, stale source-string wiring assertion'ıydı.
- Geçici diagnostic proof failure'ı `1/2294` olarak izole etti; mixed-provider continuity testi canonical selector seam'ine hizalandı.
- PR #205 FULL CI #2669 PASS; Architecture Review #789 PASS.
- Post-merge main FULL CI #2670 PASS.
- Geçici diagnostic workflow/output tamamen temizlendi.

## 14. Distinct-request state-owner lost-update race — MERGED / CLOSED
- PR #206 merge: `603d120d01cc70bb00430d7ce53ffc8338791e92`.
- Historical RED: `8b12455aa209ab294beab56c3ed0dacd1db8752d`; Fast CI #171 FAIL.
- Firestore transaction lease + expiry + heartbeat aynı state owner mutasyonlarını seri hale getirir; farklı owner'lar paralel kalır.
- Distributed backend unavailable olduğunda process-local keyed fallback yalnız tek-process ordering garantisi verir.
- PR #206 FULL CI #2671 PASS; Architecture Review #791 PASS.
- Post-merge main FULL CI #2672 PASS.
- ADR: `docs/adr/0092-state-owner-mutation-serialization.md`.

## 15. RequestId-less direct API serialization — ACTIVE / RED→GREEN
- Active branch: `codex/request-idless-chat-serialization`.
- Ölçülmüş gap: `/api/chat` external `requestId` olmadan çağrıldığında request coordination ve state-owner lease tamamen bypass ediliyordu.
- RED commit: `bf2a12a5bcbd893241327fe415640c493bd95650`; Fast CI #185 FAIL.
- Çözüm: external retry identity ile internal execution coordination identity ayrıldı.
- External `requestId` varsa mevcut replay/dedup contract korunur.
- External `requestId` yoksa server namespaced `internal:<uuid>` operation identity üretir; bu kimlik yalnız state-owner serialization içindir, caller retry replay garantisi değildir.
- Response requestId davranışı değişmez: caller vermediyse response hâlâ requestId döndürmez.
- Success/failure aynı coordination claim'i release eder.
- Server wiring regression requestId varlığına bağlı coordination gate kalmadığını kilitler.
- ADR: `docs/adr/0093-request-idless-chat-coordination-identity.md`.

## 16. Sıradaki kapılar
- RequestId-less coordination branch'inin latest Fast CI'sini GREEN doğrula.
- Normal PR FULL CI + Architecture Review'dan geçir.
- Yeşilse merge et ve post-merge main FULL CI'yi doğrula.
- Ardından açık issue/main/runtime evidence'i yeniden ölç; yeni işi yalnız gerçek failure class üzerinden seç.

## 17. Latest checkpoint
- Date: 2026-09-10
- Base main: `603d120d01cc70bb00430d7ce53ffc8338791e92`.
- Active branch: `codex/request-idless-chat-serialization`.
- Active target: requestId-less `/api/chat` state-owner serialization gap closure.
- Historical RED proof: Fast CI #185 FAIL.
- External retry contract preserved: YES.
- Internal requestId-less coordination identity: YES.
- External AI API in deterministic tests: NO.
- New downstream semantic authority: NO.
- Semantic LLM removal: NO.

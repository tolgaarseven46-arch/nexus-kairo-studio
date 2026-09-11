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

## 15. RequestId-less direct API serialization — MERGED / CLOSED
- PR #207 merge: `9809e25e3497c384e0a5132c927429311000fdd1`.
- Historical RED: `bf2a12a5bcbd893241327fe415640c493bd95650`; Fast CI #185 FAIL.
- `/api/chat` external `requestId` olmadan çağrıldığında artık request coordination ve state-owner lease bypass edilmez.
- External `requestId` varsa mevcut replay/dedup contract korunur.
- External `requestId` yoksa server namespaced `internal:<uuid>` operation identity üretir; bu kimlik yalnız state-owner serialization içindir, caller retry replay garantisi değildir.
- Response requestId davranışı değişmez: caller vermediyse response fabricated requestId döndürmez.
- Success/failure aynı coordination claim'i release eder.
- Bug-class neighbor/counterexample proof ve historical RED→GREEN gate PASS.
- PR #207 FULL CI #2683 PASS; Architecture Review #807 PASS.
- Post-merge main FULL CI #2684 PASS.
- Geçici diagnostic workflow/output tamamen temizlendi.
- ADR: `docs/adr/0093-request-idless-chat-coordination-identity.md`.

## 16. Multi-turn counterfactual replay proof — MERGED / CLOSED
- PR #209 merge: `b891c781f5f81a60bc318f42302f04d864f0f2df`.
- Test-only proof; production behavior ve semantic authority değişmedi.
- Üç bağımsız history intervention kanıtı eklendi: lived self-fact revision, pending-question discourse dependency ve third-party open-thread resumption.
- Her proof aynı final input/state transition noktasını koruyup yalnız önceki history evidence'ını değiştirerek downstream canonical state'in farklılaştığını doğrular.
- Fast CI #205 PASS.
- PR #209 FULL CI #2688 PASS; Architecture Review #811 PASS.
- Phase-0 A/B/D/E observability körlüğü current main için stale: typed projector'lar + scenario-complete readiness mevcut; bu yüzden yeni observability patch üretilmedi.
- Post-merge main FULL CI #2689 PASS.

## 17. Distributed lease clock-skew takeover — MERGED / CLOSED
- PR #210 merge: `a2ca9ccedbc9edafd1860f08a1a6d1b49011fc75`.
- Historical RED commit: `d736ae5934106d83f13b3f13ef92a34f56bddd09`; Fast CI #208 FAIL because a contender 20 seconds ahead acquired an active lease (`expected false`, received `true`).
- Root cause: `firestoreStateMutationBackend.acquire` treated caller wall-clock `now` as authoritative expiry evidence.
- Fix: bounded 30-second `STATE_MUTATION_LEASE_CLOCK_SKEW_TOLERANCE_MS`; another owner may take over only after stored `leaseUntil + tolerance`.
- Neighbor proof preserves crash recovery after lease expiry plus tolerance.
- PR #210 FULL CI #2690 PASS; Architecture Review #812 PASS.
- Post-merge main commit: `a2ca9ccedbc9edafd1860f08a1a6d1b49011fc75`; main CI #2691 PASS.
- ADR: `docs/adr/0094-state-mutation-lease-clock-skew-bound.md`.
- This is bounded-skew safety, not arbitrary-clock correctness.

## 18. State lease ownership-loss propagation — RED→GREEN / ACTIVE PR PREP
- Active branch: `codex/state-lease-ownership-loss-red` from clean main `a2ca9ccedbc9edafd1860f08a1a6d1b49011fc75`.
- First characterization RED showed a second owner can recover while the old process still retains an unreleased local handle; that condition alone is not the correct safety invariant because blocking recovery until voluntary release would break crash recovery.
- Correct invariant: once authoritative renewal is rejected, the stale holder must be able to detect ownership loss and must fail before beginning persistence.
- Measured RED: commit `d1b65a94f023f6473cedf32b0658993167a0a778`; Fast CI #215 FAIL only on new ownership-loss assertion because `assertOwned` was undefined (51/52 focused tests passed).
- Fix: `KairaStateMutationLease.assertOwned()` + explicit `KairaStateMutationOwnershipLostError`; heartbeat `renew=false` marks local ownership lost.
- Coordinator propagates request-scoped ownership assertion alongside release semantics.
- Both local-language and provider/AI chat paths revalidate authoritative lease ownership immediately before persistence begins.
- Recovery remains allowed for another owner; stale-holder persistence is what fails closed.
- GREEN: commit `d4b84d0d971daf9f3d16f4af0e2be6c2fc5c58fd`; Fast CI #218 PASS, focused 52/52 tests PASS, TypeScript PASS.
- ADR 0092 updated with ownership-loss contract and RED→GREEN evidence.
- No semantic, relationship, behavior, or response authority changed.

## 19. Sıradaki kapılar
- Open PR for state-lease ownership-loss RED→GREEN package.
- Complete docs-guard, behavior-guard, FULL CI, Architecture Review, merge, then verify post-merge clean main.
- Yeni işi yalnız ölçülmüş failure class / açık contract gap / doğrulanmış regression üzerinden seç.

## 20. Latest checkpoint
- Date: 2026-09-11
- Clean main at branch start: `a2ca9ccedbc9edafd1860f08a1a6d1b49011fc75` (PR #210 merged).
- Active branch: `codex/state-lease-ownership-loss-red`.
- Correct ownership-loss historical RED: `d1b65a94f023f6473cedf32b0658993167a0a778`; Fast CI #215 FAIL on missing fail-closed ownership assertion.
- Ownership-loss implementation + server pre-persistence wiring: GREEN at `d4b84d0d971daf9f3d16f4af0e2be6c2fc5c58fd`; Fast CI #218 PASS with 52/52 focused tests and TypeScript PASS.
- Production behavior changed on active branch: YES, only distributed state-mutation lease-loss safety / pre-persistence fencing check.
- External AI API in deterministic tests: NO.
- New downstream semantic authority: NO.
- Next action: PR → FULL CI + Architecture Review → merge → post-merge main verification.

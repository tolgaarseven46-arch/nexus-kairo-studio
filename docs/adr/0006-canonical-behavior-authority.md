# ADR-0006: Canonical relationship reducer + single behavior-plan authority

- **Durum:** Accepted
- **Tarih:** 2026-09-02
- **Karar veren:** CODEOWNERS
- **İlgili PR:** bu PR (PR1) ve devamı (PR2–PR6)

## Bağlam

18 turluk KNT full-session forensic review'ı (session `knt_test_user_x_new`)
Kaira'nın sohbet/ilişki davranış sisteminde tekil bug değil, **bug üreten ortak
kök nedenler** gösterdi:

- Tek davranış otoritesi yok; `chosenTone`, `speechIdentity.register`,
  `behaviorContract.stance`, client `behaviorPolicy` ve KDM aynı kararı bağımsız
  verip çelişiyor.
- Sınıflandırma leksikal + tek-etiketli; `severity` tek skalara çöküyor;
  banter/insult/coercion ayrımı bağlamsız.
- İlişki state makinesi tek yönlü ratchet; recovery yalnız duvar-saatine bağlı
  (oturum içi turlar arasında `recovery=no-elapsed-time`).
- Injury asimetrisi sabit magic çarpanlardan; tek olay birikmiş repair'i siliyor.
- `withdrawn`/`disengaged` sabit taban duygu-delta'sı taşıyor; nötr soru bile
  state'i bozuyor.
- `familiarityDays` gün-granüler → aynı-gün oturumda hep 0 → tüm familiarity
  damping'i devre dışı; `toleranceMultiplier` yanlış adlandırılmış amplifikatör
  (pozitif geri besleme terimi var).

## Karar

Aşağıdaki kalıcı mimari değişmezler kabul edilir:

1. **Üç katman + tek çözülmüş çıktı:** `HardConstraintSet` (karakter/güvenlik
   policy'si, deontik) · `SoftTendencyProfile` (ilişki-koşullu eğilimler,
   **≥2 ortogonal eksen**) · `PlanResolver` → `KairaResponsePlan`.
2. `KairaResponsePlan` **tek davranış kontratıdır** ama turluk **çözülmüş
   snapshot**'tır; transition içermez, "tek dev state-machine" değildir.
3. `conversationState` FSM'i küçük ve saf, `RelationshipReducer` içindedir.
   Çıktısı plana **bir girdidir**. `disengageReason ∈ hardReasons` dışında
   `guardedness` / `warmthAxis` / `uncertainty` eksenlerini **ezmez**.
4. Realizer (LLM) planı yeniden yorumlayıp davranış kararı **veremez**.
5. Compositional semantic şema (`SemanticInterpretation@2`): `primaryIntent` +
   `secondarySocialActs[]` + `target` + normalized `severity` vektörü +
   `jokingConfidence` + `sincerityConfidence` + `evidence[]` + `uncertainty`.
   Bunlar hard truth değildir; uncertainty korunur.
6. `RedlinePolicyConfig` + recovery/asimetri türetme ağırlıkları **config
   nesnesidir** (`config/relationship-reducer.json`); sabit sabit yoktur, fixture
   / telemetry ile kalibre edilir.
7. Recovery = elapsed-time **+** interaction-based; ne tek başına özür ne tek
   başına zaman tam reset yapar.
8. Injury asimetrisi sabit oran değildir; recovery hızını `severity`,
   `repetition`, `relationship history` ve `repair quality` türetir.

## Kapsam dışı (dokunulmaz)

`temperamentEngine`, `worldReasoningPolicy` + `worldStateAppraisal` policy
türetimi, idempotency/retry (`kairaChatIdempotency*`, `kairaDistributedChatIdempotency`,
`kairaChatRetryIdentity`). Bunlara diff = review fail.

## Sonuçlar

- PR1–PR4 feature-flag arkasında, davranış değişimi flag flip ile.
  Flag sahipleri + kaldırılacağı PR + exit criteria: `src/config/canonicalBehaviorFlags.ts`.
- **Foundation-repair eki (2026-09-03):** `interpretSemanticEvent`/`buildKairaResponsePlan`
  seam'lerine minimal `DiscourseState` bağlamı eklendi (`src/types/discourseState.ts`,
  `src/services/discourseStateReducer.ts`, `discourseSocialAct.ts`). `planDialogueResponse`
  ve `tryLocalKairoReply` 6.–10. parametre olarak `discourseState` alır; YD
  (`kairoLocalLanguageEngine`) artık intent sınıflandırmaz — yalnız paylaşılan
  `SemanticEvent.socialRoutine` + trivial `dialogueMove` + doygunluk kontrolüyle
  render eder. Bu değişiklikler flag'e bağlı DEĞİL (üçüncü gerçeklik hattı yaratmaz);
  `npm run test:canonical` üç canonical flag açıkken bu hattı ayrıca doğrular.
- PR5 (compat söküm + flag kaldırma) yalnız `git revert` ile geri alınır;
  ön koşulu **süre değil**, `CANONICAL_PATH_PROMOTION_GATE` (aynı dosya).
- PR6 yalnız config/fixture kalibrasyonu.
- Detaylı sequence + dosya listesi: bu PR'ın açıklaması ve takip issue'ları.

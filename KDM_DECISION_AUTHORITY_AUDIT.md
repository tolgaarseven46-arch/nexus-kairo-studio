# KDM Decision Authority Audit

Tarih: 2026-08-29

## Amaç

Tek tek cümle yakalayıp regex eklemek yerine, Kaira'nın karar zincirinde hangi katmanın hangi konuda otorite olduğunu netleştirmek. Hedef: aynı kullanıcı mesajının birden fazla yerde yeniden yorumlanmasını, state geçişlerinin farklı katmanlarca ezilmesini ve LLM çıktısının KDM kararını aşmasını engellemek.

## Mevcut gerçek akış

1. `droitChatService.ts` kullanıcı mesajından `SemanticEvent` üretir.
2. Aynı client akışında personality/motivation/values/preferences/social/boundary/expression katmanları çalışır.
3. `behaviorIntegrationEngine.ts` bu katmanları birleştirip runtime kararları üretir.
4. Client `semanticEvent` dahil payload'ı `/api/chat` endpointine yollar.
5. `server.ts` şu anda `semanticEvent` alanını request body'den almıyor.
6. Server `analyzeKdmInteraction(normalizeKdmSemanticAliases(userMessage), ...)` çağırır.
7. `kdmConsistencyEngine.ts` kendi içinde `interpretSemanticEvent(userMessage)` çağırarak SemanticEvent'i yeniden üretir.
8. Server ayrıca mesajı bağımsız şekilde `analyzeDialogueTurn` ve `planDialogueResponse` ile tekrar yorumlar.
9. Local-language yolu kendi `detectIntent` mantığını kullanır.
10. LLM yolu KDM, dialogue decision, grounding ve speech identity talimatlarını birlikte alır.
11. Post-generation aşamasında dialogue/grounding validatorları ve `enforceKairoResponse` çalışır.

## Kritik mimari bulgular

### P0 — SemanticEvent tek otorite değil

Client'ın ürettiği `SemanticEvent`, boundary ve central integration tarafından kullanılıyor; fakat server bunu tüketmiyor. Server mesajı normalize edip KDM içinde yeniden yorumluyor. Bu yüzden aynı turn içinde layer audit ile server KDM farklı gerçeklik üretebiliyor.

Canlı kanıt: son testte `sanane` için server KDM `hakaret_ve_saldiri / negatif / kaira` üretirken client layer audit `general_chat / neutral / unknown` kaydetti.

Kök çözüm: `SemanticEvent` request-level immutable truth olmalı. Server yalnızca payload'daki doğrulanmış event'i kullanmalı; yeniden yorumlama sadece legacy/fallback modunda yapılmalı.

### P0 — Dialogue katmanı paralel niyet motoru gibi davranıyor

`kairoDialogueDecisionEngine.ts`, `analyzeDialogueTurn(userMessage)` üzerinden kendi `acts` yorumunu yapıyor. Bu katmanın görevi içerik anlamını yeniden sınıflandırmak değil; canonical SemanticEvent + konuşma geçmişinden sadece discourse move seçmek olmalı.

Öneri: `planDialogueResponse(history, semanticEvent, userMessage, userName)` biçimine geçmeli. `question`, `banter`, `complaint`, `emotional opening` gibi semantik kararları tekrar çıkarmamalı.

### P0 — BehaviorContract yok

`IntegratedBehaviorDecision` iyi bir başlangıç fakat contract olarak yetersiz. Şu anda şunlar var: continueConversation, humorAllowed, askQuestion, repairAllowed, stance, length, directness, warmth, distance.

Eksik bağlayıcı alanlar:
- relationshipStateBefore / allowedRelationshipTransition
- forgivenessStatus: forbidden | acknowledged | evaluating | forgiven
- intimacyAllowed
- affectionAllowed
- maxEmoji
- allowNewTopic
- allowReassurance
- allowAssistantLikeHelp
- boundaryResponseRequired
- mustAcknowledgeViolation
- maxQuestions
- responseAct whitelist/blacklist

Bu nedenle KDM içeride `distancing` olsa bile model `geçti gitti` diyebiliyor.

### P0 — Repair state ile dil davranışı arasında açık var

Relationship state machine ile verbal response contract birbirinden kopuk. `repairAllowed` yalnızca bir boolean. Bu, “özrü duyabilirsin ama affetmiş gibi konuşamazsın” ayrımını ifade etmiyor.

Kök çözüm: repair/forgiveness ayrı state olmalı. Örnek:
- no_repair_signal
- apology_received
- repair_observing
- trust_rebuilding
- forgiven

LLM ancak `forgiven` durumunda `sorun yok / geçti gitti / affettim` benzeri sonuç dili kullanabilmeli.

### P1 — Local language bağımsız intent motoru

`kairoLocalLanguageEngine.ts` kendi `detectIntent` regexlerini çalıştırıyor. Şimdilik runtimeContinueConversation kontrolü sayesinde hard-stop'u yeniden açamıyor; fakat semantic authority açısından yine paralel parser.

Kök çözüm: Local engine mesajı sınıflandırmamalı. `SemanticEvent` + dialogue move + BehaviorContract almalı ve yalnızca uygun deterministic surface form seçmeli.

### P1 — Speech identity karar taşıyor

`kairoSpeechIdentity.ts` stil katmanı olması gerekirken runtime kararlarını okuyup davranış talimatları da üretiyor. Şu an yararlı ama authority sınırını bulanıklaştırıyor.

Kök çözüm: speech identity yalnızca HOW belirlemeli; WHAT/WHETHER kararlarını BehaviorContract'tan direkt render etmeli, yeni karar üretmemeli.

### P1 — Validatorlar farklı sözleşmelere bakıyor

- `findDialogueDecisionIssues` dialogue plan'a bakıyor.
- `validateKairoResponse` ReasoningTrace/tone heuristiklerine bakıyor.
- `enforceKairoResponse` runtime rules + conversationState'e bakıyor.

Üçü de farklı kaynaklara göre doğrulama yaptığı için false positive/false negative kaçınılmaz.

Kök çözüm: Tek validator kaynağı `BehaviorContract` olmalı. Grounding/factual validator ayrı tutulabilir çünkü o epistemik doğruluk alanıdır.

### P1 — Validator metni regex ile cerrahi düzeltmeye çalışıyor

`enforceKairoResponse` emoji/humor/question metinlerini silerek yanıtı mutate ediyor. Bu kısa vadede işe yarar fakat semantik anlam bozabilir. Örnek: soru işaretli cümleyi atmak bazen cevabın ana bölümünü silebilir.

Kök çözüm: önce structured response plan doğrulaması, sonra surface generation. Final metin ihlal ederse deterministic fallback veya tek kontrollü regeneration.

### P1 — KDM içinde ölü legacy classifierlar duruyor

`kdmConsistencyEngine.ts` içinde `classifyIntent`, `classifySentiment`, INSULT/AGGRESSIVE gibi eski yorum yolları hâlâ mevcut. Yeni semantic mapper artık çoğunu kullanmasa da kod tabanında iki gerçeklik modelini yaşatıyor ve gelecekte yanlışlıkla yeniden devreye girme riski yaratıyor.

Kök çözüm: canonical migration tamamlanınca legacy parserları fallback modülüne taşı veya sil.

## Hedef mimari

```text
User Message
   |
   v
SemanticEventEngine  <-- TEK anlam otoritesi
   |
   +--> Appraisal
   +--> 8 psychological layers
   +--> Relationship State Machine
   |
   v
BehaviorContract     <-- TEK davranış otoritesi
   |
   +--> Dialogue planner (discourse only)
   +--> Local verbalizer OR LLM verbalizer
   |
   v
Contract Validator + Grounding Validator
   |
   v
Persist + Deliver
```

## Otorite kuralları

### SemanticEventEngine karar verir
- mesaj ne tür olaydır
- hedef kimdir
- valence/severity
- insult/disrespect/coercion/manipulation/privacy
- apology/repair/affection/support/compliment
- explicit stop/question/talking signals

### Psychological layers karar verir
- bu olay Kaira için ne kadar önemli
- hangi ihtiyaç/değer/sınır aktive oldu
- içsel baskılar

### Relationship State Machine karar verir
- active/distancing/disengaged/repairing
- trust/hurt/conflict/repair trajectory
- geçişe izin var mı

### BehaviorContract karar verir
- konuşacak mı
- soru soracak mı
- mizah yapacak mı
- yakınlık gösterecek mi
- özrü kabul edebilir mi
- affetmiş gibi konuşabilir mi
- yeni konu açabilir mi
- cevap uzunluğu/sertliği/mesafesi

### Dialogue planner karar verir
- discourse move: cevap, recall, correction, topic shift vb.
- semantik olayın ne olduğuna tekrar karar VERMEZ

### Speech identity karar verir
- kelime seçimi, ritim, argo, cümle uzunluğu
- BehaviorContract kararını DEĞİŞTİRMEZ

### LLM
- yalnızca verbalizer
- state veya relationship transition yapmaz

### Validator
- BehaviorContract'a göre pass/fail
- grounding validator factual consistency için ayrı

## Uygulama sırası

### Phase 1 — Authority lock
1. `server.ts` request'ten `semanticEvent` alacak.
2. `analyzeKdmInteraction` optional canonical SemanticEvent kabul edecek.
3. Server canonical event varsa yeniden interpret etmeyecek.
4. Audit'e `semanticEventSource: client|server_fallback` yazılacak.
5. Client layer audit ve server trace aynı canonical event id/hash ile işaretlenecek.

### Phase 2 — BehaviorContract
1. `IntegratedBehaviorDecision` yerine/yanına `BehaviorContract` tanımla.
2. Repair/forgiveness durumunu explicit yap.
3. Relationship transition iznini contract'a koy.
4. Dialogue/speech/local/LLM/validator sadece contract tüketsin.

### Phase 3 — Parser consolidation
1. Dialogue engine semantic sınıflandırmayı bırakacak.
2. Local language intent detection canonical event'e bağlanacak.
3. KDM legacy classifyIntent/classifySentiment kaldırılacak veya izole fallback yapılacak.

### Phase 4 — Contract enforcement
1. `validateKairoResponse` contract-based olacak.
2. `enforceKairoResponse` yalnızca güvenli deterministic dönüşümler yapacak.
3. Büyük ihlallerde fallback/regenerate uygulanacak.
4. `geçti gitti`, `sorun yok`, `affettim` gibi forgiveness ifadeleri state izni olmadan çıkamayacak.

### Phase 5 — Invariant tests
Cümle bazlı testlerden önce mimari invariant testleri:
- bir turn = tek SemanticEvent
- aynı event id bütün katmanlarda aynı
- disengaged -> active tek mesajla olamaz
- not_forgiven contract altında forgiveness dili çıkamaz
- askQuestion=false ise final response soru içeremez
- humor=false ise final response humor signal içeremez
- third_party negative event Kaira relationship damage yazamaz
- local path ile AI path aynı BehaviorContract'a uyar

## İlk karar

Yeni regex eklemeyi durdur. Önce Phase 1 tamamlanmalı. Aksi halde her yeni semantic iyileştirme paralel parserların yalnızca birini düzeltir ve test döngüsü sonsuza uzar.

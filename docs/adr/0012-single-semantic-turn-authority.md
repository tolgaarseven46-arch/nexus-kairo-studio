# ADR-0012: Conversation turn semantic truth is immutable and single-source

- **Durum:** Proposed
- **Tarih:** 2026-09-03
- **Karar veren:** Tolga / ChatGPT, Claude red-team evidence review
- **İlgili PR:** #35

## Bağlam

PR #34 sonrasında yapılan ilk sekiz turluk normal konuşma testi, yapısal olarak yeşil CI'a rağmen temel conversation sorunları üretti. Patch önermek yerine önceden sabitlenmiş bir ablation ölçümü yapıldı.

Aynı sekiz user turn için ingestion-time LLM semantic okuması ile historical replay'de kullanılan regex `interpretSemanticEvent(text)` okuması karşılaştırıldı. Davranış kararını etkileyen intent/social-act, target, valence/emotional sınıfı veya relationship severity farkı "materyal" kabul edildi. Yeniden tasarım eşiği ölçümden önce yaklaşık %10–15 olarak sabitlendi.

Sonuç: sekiz turun yedisinde (%87.5) materyal semantic fark bulundu. Bu nedenle current-turn ve historical-turn için iki farklı parser kullanılması yalnız teknik borç değil, aynı conversation içinde fiilen farklı gerçekler üreten bir authority hatasıdır.

Bu ADR yalnız C1a kararını kapsar. `RelationshipReducer` önündeki `interpretationFromLegacyEvent` projection'ı C1b olarak ayrıca doğrulanacaktır. Semantic content etiketi -> dialogue policy coupling ayrı bir C2 problemidir ve bu PR değişikliğinde çözülmez.

## Karar

Bir user turn'ün canonical `SemanticEvent`'i ingestion anında tam olarak bir kez doğar, turn ile birlikte immutable snapshot olarak taşınır/persist edilir ve historical discourse replay yalnız bu snapshot'ı tüketir; historical raw text runtime'da yeniden semantic parse edilmez.

Ek kurallar:

1. `deriveDiscourseState` historical user text için regex/LLM çağrısı yapamaz; fonksiyon canonical snapshot tüketir.
2. Live Studio history, client->server history payload ve Firestore session hydration aynı turn'e ait canonical event'i korur.
3. Eski/persist edilmemiş historical turn'de canonical event yoksa discourse semantic replay fail-closed olur; runtime sessizce ikinci bir semantic truth üretmez.
4. Regex parser'ın meşru rolü current-turn canonical language-understanding çağrısı başarısız olduğunda açıkça `fallback_regex` olarak aynı `SemanticEvent` şemasını üretmektir. Historical reparse rolü yoktur.
5. C1a doğrulaması classification→policy davranışını değiştirmez. `complaint/confusion` etiketinin `repair_or_rephrase` kararına nasıl modüle edildiği ayrı değişiklikte ele alınır.

## Sonuçlar

- Olumlu: Conversation history ve current turn aynı semantic evidence modelini kullanır; Ablation-0'daki parser divergence sınıfı runtime'da yapısal olarak kapanır.
- Olumlu: Bir geliştirici gelecekte historical text reparse eklerse authority contract/golden regression kırılır.
- Olumsuz / takas: C1a öncesi persisted turn'lerde semantic snapshot yoktur; bunlar runtime'da yeniden yorumlanmak yerine discourse semantic replay açısından fail-closed davranır. Gerekirse ayrı, açık bir batch migration tasarlanmalıdır.
- Olumsuz / takas: Bu karar repair-policy problemini veya `emotionalLoad` kalibrasyonunu çözmez ve çözdüğü varsayılmamalıdır.
- Etkilenen seam: `TestMessage` / `ConversationTurn`, `droitChatService` history payload, Studio live history, test-session persistence/hydration, `deriveDiscourseState`.

## Doğrulama

- Pre-change ablation: 7/8 (%87.5) material semantic divergence.
- Focused C1a authority suite: 24/24 passed before PR-wide validation.
- TypeScript focused validation passed before PR-wide validation.
- PR-wide CI/Architecture Review merge öncesi ayrıca zorunludur.

## Notlar

Bu ADR Accepted olmadan ve C1a bağımsız CI kanıtı alınmadan C1b veya C2 ile birleştirilmez. Böylece hangi yapısal değişikliğin hangi davranışı etkilediği izlenebilir kalır.

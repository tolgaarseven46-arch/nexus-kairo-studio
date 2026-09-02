# ADR-0003: Firestore kuralları şu an tam açık — bilinçli geçici durum

- **Durum:** Accepted (geçici; sıkılaştırma takip işi)
- **Tarih:** 2026-09-02
- **Karar veren:** CODEOWNERS
- **İlgili PR:** governance PR'ı

## Bağlam

`firestore.rules` şu anda tüm dokümanlara kimliksiz okuma/yazma izni veriyor:

```
match /{document=**} {
  allow read, write: if true;
}
```

Autonomous-life runtime'ı ve stüdyo geliştirmesi bu açık kuralla hızlı ilerliyor;
ama üretimde veri sızması/bozulması riski taşıyor. Bir ajan "kuralları deploy et"
talimatıyla bu açık kuralı canlıya taşıyabilir.

## Karar

1. Açık kural **yalnızca geliştirme aşaması için** kabul edilir.
2. `firestore.rules` ve `firestore.indexes.json` **riskli path**'tir
   (`.github/architecture-risky-paths.txt`). Değişikliği `architecture-review-required`
   etiketi ve `/arch-approve <head-sha>` insan onayı olmadan merge edilemez.
3. Hiçbir ajan Firestore kurallarını **insan onayı olmadan deploy etmez**.
4. Takip görevi: kimlik doğrulamalı, koleksiyon bazlı kurallara geçiş için ayrı ADR.

## Sonuçlar

- Olumlu: mevcut geliştirme akışı bozulmaz; risk yazılı ve kapı altına alınmış olur.
- Olumsuz / takas: güvenli kurallar yazılana kadar üretim dağıtımı yapılmamalı.
- Etkilenen seam: `firestore.rules`, `firestore.indexes.json`, Firestore'a erişen tüm servisler.

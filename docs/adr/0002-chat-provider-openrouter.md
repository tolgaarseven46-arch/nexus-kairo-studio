# ADR-0002: Sohbet sağlayıcısı varsayılanı OpenRouter

- **Durum:** Accepted (karar daha önce koda uygulanmıştı; burada geriye dönük kaydedilir)
- **Tarih:** 2026-09-02
- **Karar veren:** CODEOWNERS
- **İlgili PR:** governance PR'ı (geriye dönük kayıt)

## Bağlam

`server.ts` runtime sohbet çağrılarında OpenRouter'ı birincil sağlayıcı olarak
kullanıyor; Gemini yedek. Bu, koda birden çok commit ile girmiş durumda
(`Default chat API to OpenRouter`, `use OpenRouter as default provider`, provider
outage fallback çalışması). Karar hiçbir ADR ile sabitlenmemişti; bir ajan
sağlayıcıyı fark etmeden Gemini'ye geri çevirebilir.

## Karar

Runtime sohbet çağrılarında **varsayılan sağlayıcı OpenRouter**'dır.

- İstek: `POST https://openrouter.ai/api/v1/chat/completions`, `Authorization: Bearer ${OPENROUTER_API_KEY}`.
- Model: `OPENROUTER_MODEL` (trim), yoksa `openrouter/free`.
- `server.ts` içinde `preferredProvider === "openrouter" && hasOpenRouter` yolu önce denenir.
- **Gemini yalnız yedektir**: OpenRouter yoksa/başarısızsa `@google/genai` (`gemini-3.6-flash`).
- `providerUsed` alanı yanıtta hangi sağlayıcının kullanıldığını raporlar
  (`gemini` | `openrouter` | `deterministic_fallback`).

Sağlayıcı varsayılanını değiştirmek yeni bir ADR gerektirir.

## Sonuçlar

- Olumlu: tek net varsayılan; ajanlar arası "hangi sağlayıcı" tartışması biter.
- Olumsuz / takas: OpenRouter kotası/kesintisi doğrudan sohbeti etkiler; deterministik
  fallback yalnız son çare.
- Etkilenen seam: `server.ts` (OpenRouter çağrısı, Gemini istemcisi, `providerUsed`,
  `preferredProvider` parametresi), env: `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`,
  `GEMINI_API_KEY`, `APP_URL`.

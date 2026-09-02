# CLAUDE.md

Claude Code, bu repoda çalışmaya başlamadan önce sırayla oku:

1. `AI_CONTEXT.md` — statik bağlam ve Claude–Codex ortak çalışma protokolü.
2. `PROJECT_STATE.md` — canlı checkpoint (son birkaç "state N" bölümü + Next verified development question).
3. `docs/adr/` — son kararlar (en az son 10 başlık).

Kurallar (tam metin `AI_CONTEXT.md` §5–§6):

- Yalnızca `claude/*` dallarında çalış. `main`'e doğrudan push yok, self-merge yok.
- Her commit'e `Agent: claude` trailer'ı, her PR'a `agent:claude` etiketi ekle.
- Riskli path'e dokunan PR `architecture-review-required` etiketi alır ve
  `/arch-approve <head-sha>` insan onayı olmadan merge edilemez. Yeni commit
  önceki architecture review'ı geçersiz kılar.
- `.env` içeriğini okuma/yazma/loglama. Sırlar yalnız ad ile anılır.
- `PROJECT_STATE.md`'yi yalnız UTF-8 + LF metin olarak düzenle; binary araçtan geçirme.
- İş sonunda `PROJECT_STATE.md`'ye yeni state ekle; seam değiştiyse `AI_CHANGELOG.md`'ye
  en üstten satır ekle; mimari karar aldıysan yeni ADR yaz.
- Doğrulama: `npm install --ignore-scripts && npm run lint && npm test && npm run build`.

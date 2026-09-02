# AGENTS.md

Codex (ve diğer OpenAI ajanları), bu repoda çalışmaya başlamadan önce sırayla oku:

1. `AI_CONTEXT.md` — statik bağlam ve Claude–Codex ortak çalışma protokolü.
2. `PROJECT_STATE.md` — canlı checkpoint (son birkaç "state N" bölümü + Next verified development question).
3. `docs/adr/` — son kararlar (en az son 10 başlık).

Kurallar (tam metin `AI_CONTEXT.md` §5–§8):

- Yalnızca `codex/*` dallarında çalış. `main`'e doğrudan push yok, self-merge yok.
- **B/C sınıfı (davranış/mimari/kontrat) değişiklikte `AI_CONTEXT.md` §8 Hata
  Azaltma Protokolü zorunludur:** kanıt standardı (test yeşil ≠ davranış doğru),
  minimal repro + çürütücü karşı-örnek, yazılı tek karar kaynağı, güncel
  dependency/consumer etki haritası, golden long-session regression (CI), ikinci-göz
  architecture review, tekrar eden bug sınıfında önce root-cause, feature-flag +
  eski/yeni karşılaştırma, KNT telemetry görünürlüğü, çürütücü test.
- Her commit'e `Agent: codex` trailer'ı, her PR'a `agent:codex` etiketi ekle.
- Riskli path'e dokunan PR `architecture-review-required` etiketi alır ve
  `/arch-approve <head-sha>` insan onayı olmadan merge edilemez. Yeni commit
  önceki architecture review'ı geçersiz kılar.
- `.env` içeriğini okuma/yazma/loglama. Sırlar yalnız ad ile anılır.
- `PROJECT_STATE.md`'yi yalnız UTF-8 + LF metin olarak düzenle; binary araçtan geçirme
  (bkz. #21 bozulması — bu dosya bir Codex dalından binary'ye çevrilmişti).
- İş sonunda `PROJECT_STATE.md`'ye yeni state ekle; seam değiştiyse `AI_CHANGELOG.md`'ye
  en üstten satır ekle; mimari karar aldıysan yeni ADR yaz.
- Doğrulama: `npm install --ignore-scripts && npm run lint && npm test && npm run build`.

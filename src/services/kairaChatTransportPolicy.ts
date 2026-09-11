export const KAIRA_CHAT_CLIENT_TIMEOUT_MS = 75_000;

export function kairaChatClientTimeoutMessage(timeoutMs = KAIRA_CHAT_CLIENT_TIMEOUT_MS) {
  const seconds = Math.round(timeoutMs / 1000);
  return `Kaira isteği ${seconds} saniyede tamamlanmadı. İstek provider tarafında hâlâ işleniyor olabilir; aynı mesajı hemen yeniden göndermeyin.`;
}

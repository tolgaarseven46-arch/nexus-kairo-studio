export interface GuardResult {
  ok: boolean;
  text: string;
  reason?: string;
}

export function guardKairoResponse(text: unknown): GuardResult {
  if (typeof text !== 'string') return { ok: false, text: '', reason: 'non_text_response' };
  const normalized = text.trim();
  if (!normalized) return { ok: false, text: '', reason: 'empty_response' };
  if (/^<!doctype\s+html|^<html[\s>]/i.test(normalized)) {
    return { ok: false, text: '', reason: 'html_instead_of_response' };
  }
  if (/^(\[hata\]|error\s*:|internal server error)/i.test(normalized)) {
    return { ok: false, text: '', reason: 'server_error_text' };
  }
  return { ok: true, text: normalized };
}

export function shouldRetryKairoResponse(text: unknown): boolean {
  return !guardKairoResponse(text).ok;
}

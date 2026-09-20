import type { Firestore } from 'firebase-admin/firestore';
import { isKairaDmIntegrationResponseV0 } from '../integrations/kaira/contracts';
import { applyKairaProposedActions } from './kairaActionExecutor';
import { probeKairaIntegration } from './kairaIntegrationProbe';
import {
  claimKairaOutboxEvent,
  completeKairaOutboxEvent,
  failKairaOutboxEvent,
} from './kairaOutboxStore';

const RETRY_DELAYS_MS = [5_000, 30_000, 120_000, 600_000];

const resolveEndpoint = (): string | null => {
  const base = process.env.KAIRA_API_URL?.trim();
  if (!base) return null;
  const explicit = process.env.KAIRA_DM_ENDPOINT?.trim();
  if (explicit) return explicit;
  return `${base.replace(/\/$/, '')}/api/integrations/privatroom/dm`;
};

void probeKairaIntegration().then((result) => {
  if (!('reason' in result)) {
    console.log('[Kaira Integration] transport ready: endpoint_and_auth_verified');
    return;
  }
  console.warn(
    `[Kaira Integration] transport not ready: ${result.reason}` +
      (result.status ? ` status=${result.status}` : '') +
      (result.detail ? ` detail=${result.detail}` : ''),
  );
});

export const dispatchKairaOutboxEvent = async (
  db: Firestore,
  eventId: string,
): Promise<{ status: 'skipped' | 'succeeded' | 'retryable_failure' | 'terminal_failure'; detail?: string; appliedActions?: number }> => {
  const claimed = await claimKairaOutboxEvent(db, eventId);
  if (!claimed) return { status: 'skipped', detail: 'event_not_claimable' };

  const endpoint = resolveEndpoint();
  if (!endpoint) {
    await failKairaOutboxEvent(db, eventId, 'KAIRA_API_URL yapılandırılmamış.', false);
    return { status: 'terminal_failure', detail: 'kaira_not_configured' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.KAIRA_INTEGRATION_TOKEN?.trim()
          ? { Authorization: `Bearer ${process.env.KAIRA_INTEGRATION_TOKEN.trim()}` }
          : {}),
      },
      body: JSON.stringify(claimed.event),
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const retryable = response.status >= 500 || response.status === 408 || response.status === 429;
      const message = `Kaira gateway HTTP ${response.status}`;
      const retryDelay = RETRY_DELAYS_MS[Math.min(Math.max(claimed.attemptCount - 1, 0), RETRY_DELAYS_MS.length - 1)];
      await failKairaOutboxEvent(db, eventId, message, retryable, retryable ? Date.now() + retryDelay : undefined);
      return { status: retryable ? 'retryable_failure' : 'terminal_failure', detail: message };
    }

    if (!isKairaDmIntegrationResponseV0(payload) || payload.sourceEventId !== eventId) {
      await failKairaOutboxEvent(db, eventId, 'Kaira geçersiz veya sourceEventId uyuşmayan cevap döndürdü.', false);
      return { status: 'terminal_failure', detail: 'invalid_contract_response' };
    }

    const applied = await applyKairaProposedActions(db, claimed.event, payload);
    await completeKairaOutboxEvent(db, eventId, payload);
    return { status: 'succeeded', appliedActions: applied.applied };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const retryDelay = RETRY_DELAYS_MS[Math.min(Math.max(claimed.attemptCount - 1, 0), RETRY_DELAYS_MS.length - 1)];
    await failKairaOutboxEvent(db, eventId, message, true, Date.now() + retryDelay);
    return { status: 'retryable_failure', detail: message };
  } finally {
    clearTimeout(timeout);
  }
};

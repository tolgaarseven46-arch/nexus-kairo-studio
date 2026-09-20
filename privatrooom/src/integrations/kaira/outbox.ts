import type { KairaDmMessageCreatedEventV0, KairaDmIntegrationResponseV0 } from './contracts';

export type KairaOutboxStatus =
  | 'pending'
  | 'in_flight'
  | 'succeeded'
  | 'retryable_failure'
  | 'terminal_failure';

export interface KairaOutboxRecordV0 {
  eventId: string;
  status: KairaOutboxStatus;
  event: KairaDmMessageCreatedEventV0;
  attemptCount: number;
  nextAttemptAt?: number;
  lastAttemptAt?: number;
  completedAt?: number;
  response?: KairaDmIntegrationResponseV0;
  lastError?: string;
}

export const createKairaOutboxRecordV0 = (
  event: KairaDmMessageCreatedEventV0
): KairaOutboxRecordV0 => ({
  eventId: event.eventId,
  status: 'pending',
  event,
  attemptCount: 0,
});

export const isKairaOutboxTerminal = (status: KairaOutboxStatus): boolean =>
  status === 'succeeded' || status === 'terminal_failure';

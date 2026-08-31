const DEFAULT_TTL_MS = 2 * 60 * 1000;
const DEFAULT_MAX_ENTRIES = 500;

export type KairaChatRequestOutcome<T = unknown> =
  | { ok: true; payload: T }
  | { ok: false; errorMessage: string };

export type KairaChatRequestClaim<T = unknown> =
  | { kind: 'owner' }
  | { kind: 'replay'; payload: T }
  | { kind: 'wait'; outcome: Promise<KairaChatRequestOutcome<T>> };

type InFlightEntry<T> = {
  kind: 'inflight';
  expiresAt: number;
  outcome: Promise<KairaChatRequestOutcome<T>>;
  resolve: (outcome: KairaChatRequestOutcome<T>) => void;
};

type CompletedEntry<T> = {
  kind: 'completed';
  expiresAt: number;
  payload: T;
};

type Entry<T> = InFlightEntry<T> | CompletedEntry<T>;

const entries = new Map<string, Entry<unknown>>();

function prune(now: number, maxEntries = DEFAULT_MAX_ENTRIES) {
  for (const [key, entry] of entries) {
    if (entry.expiresAt <= now) entries.delete(key);
  }
  if (entries.size <= maxEntries) return;
  const overflow = entries.size - maxEntries;
  let removed = 0;
  for (const key of entries.keys()) {
    entries.delete(key);
    removed += 1;
    if (removed >= overflow) break;
  }
}

export function claimKairaChatRequest<T = unknown>(
  key: string,
  now = Date.now(),
  ttlMs = DEFAULT_TTL_MS,
): KairaChatRequestClaim<T> {
  const normalizedKey = key.trim();
  if (!normalizedKey) return { kind: 'owner' };
  prune(now);
  const existing = entries.get(normalizedKey) as Entry<T> | undefined;
  if (existing?.kind === 'completed') {
    return { kind: 'replay', payload: existing.payload };
  }
  if (existing?.kind === 'inflight') {
    return { kind: 'wait', outcome: existing.outcome };
  }

  let resolve!: (outcome: KairaChatRequestOutcome<T>) => void;
  const outcome = new Promise<KairaChatRequestOutcome<T>>((done) => {
    resolve = done;
  });
  entries.set(normalizedKey, {
    kind: 'inflight',
    expiresAt: now + Math.max(1000, ttlMs),
    outcome,
    resolve,
  });
  return { kind: 'owner' };
}

export function completeKairaChatRequest<T = unknown>(
  key: string,
  payload: T,
  now = Date.now(),
  ttlMs = DEFAULT_TTL_MS,
) {
  const normalizedKey = key.trim();
  if (!normalizedKey) return;
  const existing = entries.get(normalizedKey) as Entry<T> | undefined;
  if (existing?.kind === 'inflight') {
    existing.resolve({ ok: true, payload });
  }
  entries.set(normalizedKey, {
    kind: 'completed',
    expiresAt: now + Math.max(1000, ttlMs),
    payload,
  });
  prune(now);
}

export function failKairaChatRequest(key: string, error: unknown) {
  const normalizedKey = key.trim();
  if (!normalizedKey) return;
  const existing = entries.get(normalizedKey);
  if (existing?.kind === 'inflight') {
    existing.resolve({
      ok: false,
      errorMessage: error instanceof Error ? error.message : String(error || 'Chat request failed'),
    });
  }
  entries.delete(normalizedKey);
}

export function clearKairaChatIdempotencyForTests() {
  entries.clear();
}

export function kairaChatIdempotencySizeForTests() {
  return entries.size;
}

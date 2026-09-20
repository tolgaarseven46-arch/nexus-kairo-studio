const resolveEndpoint = (): string | null => {
  const base = process.env.KAIRA_API_URL?.trim();
  if (!base) return null;
  const explicit = process.env.KAIRA_DM_ENDPOINT?.trim();
  if (explicit) return explicit;
  return `${base.replace(/\/$/, '')}/api/integrations/privatroom/dm`;
};

export type KairaIntegrationProbeResult =
  | { ready: true; status: 400 }
  | { ready: false; reason: 'not_configured' | 'auth_rejected' | 'unexpected_status' | 'request_failed'; status?: number; detail?: string };

export const probeKairaIntegration = async (): Promise<KairaIntegrationProbeResult> => {
  const endpoint = resolveEndpoint();
  const token = process.env.KAIRA_INTEGRATION_TOKEN?.trim();
  if (!endpoint || !token) return { ready: false, reason: 'not_configured' };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: '{}',
      signal: controller.signal,
    });

    // Auth happens before contract validation on the Kaira bridge. Therefore an
    // invalid empty event returning 400 proves the endpoint and bearer token are
    // accepted without creating Kaira state or executing any platform action.
    if (response.status === 400) return { ready: true, status: 400 };
    if (response.status === 401 || response.status === 403) {
      return { ready: false, reason: 'auth_rejected', status: response.status };
    }
    return { ready: false, reason: 'unexpected_status', status: response.status };
  } catch (error) {
    return {
      ready: false,
      reason: 'request_failed',
      detail: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
};

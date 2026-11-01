export interface HealthResponse {
  status: 'ok' | 'degraded';
  app: string;
  version: string;
  environment?: string;
  database: 'up' | 'down';
  timezone?: string;
  timestamp: string;
}

export async function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch('/api/health', {
    signal,
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`A API respondeu com status ${response.status}.`);
  }

  return (await response.json()) as HealthResponse;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

interface ErrorPayload {
  error?: {
    code?: string;
    message?: string;
  };
}

/**
 * Cliente HTTP único. Usa o mesmo domínio da aplicação (proxy do Vite em dev)
 * e envia cookies de sessão automaticamente.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const response = await fetch(path, {
    method: options.method ?? 'GET',
    signal: options.signal,
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      ...(options.body !== undefined
        ? { 'Content-Type': 'application/json' }
        : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const data = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    const payload = data as ErrorPayload | null;
    throw new ApiError(
      response.status,
      payload?.error?.code ?? 'REQUEST_ERROR',
      payload?.error?.message ?? 'Não foi possível concluir a solicitação.',
    );
  }

  return data as T;
}

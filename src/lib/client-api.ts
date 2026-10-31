import { ApiError } from './ux-state';
export async function api<T>(path: string, method = 'GET', data?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/hub/${path}`, {
      method,
      cache: 'no-store',
      headers: method === 'GET' ? {} : { 'Content-Type': 'application/json' },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
  } catch {
    throw new ApiError(
      'Não foi possível conectar. Confira sua conexão e tente novamente.',
      null,
      'NETWORK_ERROR',
    );
  }
  let json: { error?: string; code?: string; details?: unknown };
  try {
    json = await response.json();
  } catch {
    json = {};
    if (response.ok)
      throw new ApiError(
        'O servidor enviou uma resposta inválida. Tente novamente.',
        response.status,
        'INVALID_RESPONSE',
      );
  }
  if (!response.ok) {
    if (
      response.status === 401 &&
      !(path === 'me' && method === 'GET') &&
      typeof window !== 'undefined'
    )
      window.dispatchEvent(new Event('hub-session-expired'));
    throw new ApiError(
      json.error ??
        (response.status === 429
          ? 'Muitas solicitações. Aguarde antes de tentar novamente.'
          : 'Não foi possível concluir a operação. Tente novamente.'),
      response.status,
      json.code,
      json.details,
    );
  }
  return json as T;
}

import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../src/lib/client-api';
afterEach(() => vi.unstubAllGlobals());
describe('Fronteira HTTP recuperável', () => {
  it('401 de mutação do perfil também encerra a exposição da conta', async () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal('window', { dispatchEvent });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));
    await expect(api('me', 'PATCH', {})).rejects.toMatchObject({ status: 401 });
    expect(dispatchEvent).toHaveBeenCalledOnce();
  });
  for (const status of [401, 403, 429, 500, 503])
    it(`preserva HTTP ${status}`, async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Falha' }), { status })),
      );
      await expect(api('me')).rejects.toMatchObject({ status, message: 'Falha' });
    });
  it('não transforma offline em visitante ou coleção vazia', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    await expect(api('me')).rejects.toMatchObject({ status: null, code: 'NETWORK_ERROR' });
  });
  it('distingue JSON inválido de erro HTTP e mantém o status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>', { status: 200 })));
    await expect(api('me')).rejects.toMatchObject({ status: 200, code: 'INVALID_RESPONSE' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>', { status: 503 })));
    await expect(api('me')).rejects.toMatchObject({ status: 503 });
  });
});

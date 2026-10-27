import { describe,expect,it } from 'vitest';
import { fetchCsvSnapshot } from '../scripts/source-fetch.mjs';
const url =
  'https://raw.githubusercontent.com/PokeAPI/pokeapi/5ee47a9a9c1229632ec4b473a9c1c53026e005dd/data/v2/csv/pokemon.csv';
describe('Adaptador de fonte externa', () => {
  it('falha explicitamente em erro de rede', async () => {
    await expect(
      fetchCsvSnapshot(url, async () => {
        throw new Error('Network offline');
      }),
    ).rejects.toThrow('Network offline');
  });
  it('recusa HTTP não bem-sucedido', async () => {
    await expect(
      fetchCsvSnapshot(url, async () => new Response('unavailable', { status: 503 })),
    ).rejects.toThrow('503');
  });
  it('não aceita HTML como dados', async () => {
    await expect(
      fetchCsvSnapshot(url, async () => new Response('<html>Service unavailable</html>')),
    ).rejects.toThrow('CSV');
  });
  it('recusa fonte não aprovada', async () => {
    await expect(fetchCsvSnapshot('https://example.test/pokemon.csv')).rejects.toThrow(
      'Unapproved',
    );
  });
  it('preserva dados sem fabricar valores', async () => {
    const data = await fetchCsvSnapshot(
      url,
      async () => new Response('id,identifier\n1,bulbasaur\n'),
    );
    expect(data.toString()).toContain('bulbasaur');
  });
});

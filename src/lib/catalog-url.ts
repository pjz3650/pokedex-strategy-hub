import { isGame } from './games';
import { TYPES } from './engine';
export function parseCatalogParams(params: URLSearchParams) {
  const oneOf = (key: string, values: readonly string[], fallback = '') =>
    values.includes(params.get(key) ?? '') ? params.get(key)! : fallback;
  const number = Number(params.get('page'));
  return {
    q: (params.get('q') ?? '').slice(0, 120),
    type: oneOf('type', TYPES),
    secondary: oneOf('secondary', TYPES),
    generation: oneOf('generation', ['1', '2', '3', '4', '5', '6', '7', '8', '9']),
    kind: oneOf('kind', ['base', 'regional', 'mega', 'alternative', 'battle', 'gigantamax']),
    sort: oneOf('sort', ['dex', 'name', 'bst', 'attack', 'speed'], 'dex'),
    evolution: oneOf('evolution', ['base', 'evolved']),
    availability: oneOf('availability', ['base', 'known']),
    page: Number.isInteger(number) && number >= 1 && number <= 1000 ? number : 1,
    game: isGame(params.get('game'))
      ? (params.get('game') as 'sword' | 'arceus' | 'za')
      : undefined,
    focus: /^\d+$/.test(params.get('focus') ?? '') ? params.get('focus')! : '',
  };
}
export function catalogReturn(value: string | null) {
  if (!value || value.length > 1500) return '/pokedex';
  try {
    const url = new URL(value, 'https://local.invalid');
    if (
      url.origin !== 'https://local.invalid' ||
      !['/pokedex', '/favoritos'].includes(url.pathname)
    )
      return '/pokedex';
    const parsed = parseCatalogParams(url.searchParams);
    const params = new URLSearchParams();
    for (const [key, val] of Object.entries(parsed))
      if (val !== undefined && val !== '') params.set(key, String(val));
    return url.pathname + '?' + params.toString();
  } catch {
    return '/pokedex';
  }
}

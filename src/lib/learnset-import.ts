export type RawPokemon = { id: string; species_id: string; identifier: string };
export type RawForm = {
  pokemon_id: string;
  form_order: string;
  is_default: string;
  form_identifier: string;
};
export type SourceLearnset = {
  pokemon: number;
  form: number;
  moves: {
    move: number;
    method: string;
    level?: number;
    master_level?: number;
    item?: string;
    pokemon?: number;
    form?: number;
  }[];
};

export function createFormMap(pokemon: RawPokemon[], forms: RawForm[]) {
  const byId = new Map(pokemon.map((p) => [p.id, p]));
  const result = new Map<string, number>();
  // Map every cosmetic row to its existing Pokémon identity, without inventing new stat forms.
  for (const form of forms) {
    const p = byId.get(form.pokemon_id);
    if (!p || /gmax|totem/.test(p.identifier)) continue;
    const key = `${p.species_id}:${Number(form.form_order) - 1}`;
    if (!result.has(key) || form.is_default === '1') result.set(key, Number(p.id));
  }
  return result;
}

export function learnsetKey(species: number, form: number, move: SourceLearnset['moves'][number]) {
  return `${move.pokemon ?? species}:${move.form ?? form}:${move.method}:${move.move}:${move.method === 'levelup' ? (move.level ?? 0) : 0}`;
}

/** Explicit TM item references exclude unused compatibility flags from the native tables. */
export function parseBaseLearnsetKeys(text: string, method: string) {
  const result = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const [identity, list] = line.split('\t');
    if (!list) continue;
    const [species, form = '0'] = identity.split('.');
    for (const token of list.split(',')) {
      const [move, value] = token.split(':');
      if (method === 'tm' && !/^TM\d+$/.test(value ?? '')) continue;
      const level = method === 'levelup' ? Number(value) : 0;
      const sourceMethod = method === 'levelup' && level <= 0 ? 'evolution' : method;
      result.add(
        learnsetKey(Number(species), Number(form), {
          move: Number(move),
          method: sourceMethod,
          level: Math.max(0, level),
        }),
      );
    }
  }
  return result;
}

export function normalizeLearnsets(
  rows: SourceLearnset[],
  forms: Map<string, number>,
  gameId: string,
  contentFor: (species: number, form: number, move: SourceLearnset['moves'][number]) => string,
) {
  const methods: Record<string, string> = {
    levelup: 'level-up',
    tm: 'machine',
    tr: 'machine',
    evolution: 'level-up',
    oyabun: 'alpha',
  };
  const versionGroup = { sword: 22, arceus: 24, za: 31 }[gameId];
  if (!versionGroup) throw new Error('Unknown game');
  const mapped = new Map<
    string,
    {
      formId: number;
      moveId: number;
      gameId: string;
      versionGroup: number;
      method: string;
      level: number;
      content: string;
    }
  >();
  const unmapped: string[] = [];
  for (const row of rows) {
    const formId = forms.get(`${row.pokemon}:${row.form}`);
    if (!formId) {
      unmapped.push(`${row.pokemon}:${row.form}`);
      continue;
    }
    for (const move of row.moves) {
      // Z-A stores compatibility flags for non-existent TM slots too. They are not obtainable TMs.
      if (!Number.isInteger(move.move) || move.move <= 0) throw new Error('Invalid move ID');
      if (gameId === 'za' && move.method === 'tm' && !/^TM\d+$/.test(move.item ?? '')) continue;
      const method = methods[move.method] ?? move.method;
      const level = move.method === 'evolution' ? 0 : (move.level ?? 0);
      if (!Number.isInteger(level) || level < 0 || level > 100)
        throw new Error('Invalid learn level');
      const record = {
        formId,
        moveId: move.move,
        gameId,
        versionGroup,
        method,
        level,
        content: contentFor(row.pokemon, row.form, move),
      };
      mapped.set(`${formId}:${move.move}:${versionGroup}:${method}:${level}`, record);
    }
  }
  return { records: [...mapped.values()], unmapped };
}

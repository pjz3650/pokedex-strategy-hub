import { describe,expect,it } from 'vitest';
import {
createFormMap,
learnsetKey,
normalizeLearnsets,
parseBaseLearnsetKeys,
} from '../src/lib/learnset-import';

describe('Normalização de learnsets nativos', () => {
  it('mapeia formas distintas e cosméticos mantendo a ordem nativa', () => {
    const pokemon = [
      { id: '248', species_id: '248', identifier: 'tyranitar' },
      { id: '10049', species_id: '248', identifier: 'tyranitar-mega' },
      { id: '710', species_id: '710', identifier: 'pumpkaboo-average' },
      { id: '10027', species_id: '710', identifier: 'pumpkaboo-small' },
      { id: '666', species_id: '666', identifier: 'vivillon' },
    ];
    const forms = [
      { pokemon_id: '248', form_order: '1', is_default: '1', form_identifier: '' },
      { pokemon_id: '10049', form_order: '2', is_default: '1', form_identifier: 'mega' },
      { pokemon_id: '710', form_order: '1', is_default: '1', form_identifier: 'average' },
      { pokemon_id: '10027', form_order: '2', is_default: '1', form_identifier: 'small' },
      { pokemon_id: '666', form_order: '7', is_default: '1', form_identifier: 'meadow' },
      { pokemon_id: '666', form_order: '1', is_default: '0', form_identifier: 'icy-snow' },
    ];
    const mapping = createFormMap(pokemon, forms);
    expect(mapping.get('248:1')).toBe(10049);
    expect(mapping.get('710:0')).toBe(710);
    expect(mapping.get('710:1')).toBe(10027);
    expect(mapping.get('666:0')).toBe(666);
    expect(mapping.get('666:6')).toBe(666);
  });
  it('preserva método, nível, conteúdo e jogo sem duplicar registros', () => {
    const result = normalizeLearnsets(
      [
        {
          pokemon: 248,
          form: 0,
          moves: [
            { move: 242, method: 'evolution' },
            { move: 242, method: 'evolution' },
            { move: 89, method: 'tm', item: 'TM069' },
            { move: 200, method: 'oyabun' },
          ],
        },
      ],
      new Map([['248:0', 248]]),
      'za',
      () => 'base',
    );
    expect(result.records).toHaveLength(3);
    expect(result.records[0]).toMatchObject({
      gameId: 'za',
      method: 'level-up',
      level: 0,
      versionGroup: 31,
    });
    expect(result.records[1].method).toBe('machine');
    expect(result.records[2].method).toBe('alpha');
  });
  it('exclui TMs sem item real e diferencia jogo base e DLC', () => {
    const keys = parseBaseLearnsetKeys('0248.00\t89:TM069,484\n', 'tm');
    expect(keys.has(learnsetKey(248, 0, { move: 89, method: 'tm' }))).toBe(true);
    expect(keys.has(learnsetKey(248, 0, { move: 484, method: 'tm' }))).toBe(false);
    const result = normalizeLearnsets(
      [
        {
          pokemon: 248,
          form: 0,
          moves: [
            { move: 89, method: 'tm', item: 'TM069' },
            { move: 484, method: 'tm' },
            { move: 799, method: 'tm', item: 'TM143' },
          ],
        },
      ],
      new Map([['248:0', 248]]),
      'za',
      (s, f, m) => (keys.has(learnsetKey(s, f, m)) ? 'base' : 'mega-dimension'),
    );
    expect(result.records).toHaveLength(2);
    expect(result.records.map((m) => m.content)).toEqual(['base', 'mega-dimension']);
  });
  it('relata formas sem mapeamento e rejeita IDs inválidos', () => {
    expect(
      normalizeLearnsets([{ pokemon: 59, form: 2, moves: [] }], new Map(), 'arceus', () => 'base')
        .unmapped,
    ).toEqual(['59:2']);
    expect(() =>
      normalizeLearnsets(
        [{ pokemon: 1, form: 0, moves: [{ move: -1, method: 'tm' }] }],
        new Map([['1:0', 1]]),
        'za',
        () => 'base',
      ),
    ).toThrow();
  });
});

import { describe,expect,it } from 'vitest';
import type { GameId,LegalMove,Pokemon,Stats } from '../src/lib/contracts';
import {
aggregateRankings,
analyzeTeam,
availableAt,
canUse,
effectiveness,
evaluateBuild,
generateTeam,
moveValue,
recommendBuild,
recommendItem,
validateFormat,
} from '../src/lib/engine';
const stats: Stats = {
  hp: 78,
  attack: 84,
  defense: 78,
  specialAttack: 109,
  specialDefense: 85,
  speed: 100,
};
const pokemon = (
  id: number,
  types = ['fire', 'flying'],
  override: Partial<Stats> = {},
): Pokemon => ({
  id,
  identifier: `test-${id}`,
  name: `Pokemon ${id}`,
  speciesId: id,
  generation: 1,
  kind: 'base',
  isDefault: true,
  evolvesFromId: null,
  legendary: false,
  mythical: false,
  types,
  stats: { ...stats, ...override },
  artwork: null,
  sprite: null,
  availability: [
    { gameId: 'sword', content: 'base', minStage: 0, acquisition: 'Test fixture', verified: true },
    { gameId: 'arceus', content: 'base', minStage: 0, acquisition: 'Test fixture', verified: true },
  ],
});
const move = (
  id: number,
  type: string,
  category = 'special',
  power: number | null = 80,
  gameId: GameId = 'sword',
): LegalMove => ({
  id,
  identifier: id === 4 ? 'roost' : `move-${id}`,
  name: `Move ${id}`,
  type,
  category,
  gameId,
  power,
  accuracy: 100,
  pp: 15,
  cooldown: null,
  priority: 0,
  range: null,
  area: null,
  verified: true,
  effect: null,
  methods: [{ method: 'level-up', level: 1, content: 'base', minStage: 0 }],
  sourceUrl: 'https://example.test/source',
});
const legal = [
  move(1, 'fire'),
  move(2, 'flying'),
  move(3, 'grass'),
  move(4, 'flying', 'status', null),
  move(5, 'dragon'),
  move(6, 'fire', 'physical'),
];
describe('Efetividade por jogo', () => {
  it('combina os dois tipos e produz 4x em Sword', () =>
    expect(effectiveness('rock', ['fire', 'flying'], 'sword')).toBe(4));
  it('usa 2.5x para dupla fraqueza em Arceus', () =>
    expect(effectiveness('rock', ['fire', 'flying'], 'arceus')).toBe(2.5));
  it('usa .4x para dupla resistência em Arceus', () =>
    expect(effectiveness('grass', ['fire', 'flying'], 'arceus')).toBe(0.4));
  it('combina fraqueza e resistência para neutralidade', () =>
    expect(effectiveness('water', ['fire', 'grass'])).toBe(1));
  it('mantém imunidade mesmo com outro tipo vulnerável', () =>
    expect(effectiveness('electric', ['ground', 'water'])).toBe(0));
  it('rejeita tipo desconhecido', () => expect(() => effectiveness('unknown', ['fire'])).toThrow());
  it('considera Levitate somente em jogos com habilidades', () => {
    expect(effectiveness('ground', ['steel'], 'sword', 'Levitate')).toBe(0);
    expect(effectiveness('ground', ['steel'], 'arceus', 'Levitate')).toBe(2);
  });
  it('não confunde cobertura ofensiva com resistência', () => {
    const p = pokemon(1, ['fire']);
    const a = analyzeTeam([{ pokemon: p, moves: [move(1, 'grass')] }], 'sword');
    const water = a.matrix.find((t) => t.type === 'water')!;
    expect(water.covered).toBe(1);
    expect(water.weak).toBe(1);
    expect(water.resist).toBe(0);
  });
});
describe('Builds e legalidade', () => {
  it('STAB aumenta o valor comparável de um ataque', () => {
    const p = pokemon(1, ['fire']);
    expect(moveValue(p, move(1, 'fire'), 'sword')).toBeGreaterThan(
      moveValue(p, move(2, 'normal'), 'sword'),
    );
  });
  it('favorece a estatística ofensiva adequada', () => {
    const p = pokemon(1, ['fire'], { attack: 30, specialAttack: 150 });
    expect(moveValue(p, move(1, 'fire'), 'sword')).toBeGreaterThan(
      moveValue(p, move(2, 'fire', 'physical'), 'sword'),
    );
  });
  it('não aceita movimento de outra versão', () =>
    expect(() =>
      evaluateBuild(pokemon(1), [move(1, 'fire', 'special', 80, 'arceus')], 'sword'),
    ).toThrow());
  it('não permite movimentos duplicados', () =>
    expect(() => evaluateBuild(pokemon(1), [legal[0], legal[0]], 'sword')).toThrow());
  it('não permite cinco movimentos', () =>
    expect(() => evaluateBuild(pokemon(1), legal.slice(0, 5), 'sword')).toThrow());
  it('produz quatro movimentos únicos e determinísticos', () => {
    const a = recommendBuild(pokemon(1), legal, 'sword');
    expect(a.moves).toHaveLength(4);
    expect(new Set(a.moves.map((m) => m.id)).size).toBe(4);
    expect(recommendBuild(pokemon(1), legal, 'sword')).toEqual(a);
  });
  it('inclui utilidade e não exige quatro tipos diferentes', () => {
    const result = recommendBuild(pokemon(1), legal, 'sword', 'defensive');
    expect(result.moves.some((m) => m.category === 'status')).toBe(true);
  });
  it('não converte PP em cooldown em Z-A', () => {
    const p = pokemon(1);
    p.availability.push({
      gameId: 'za',
      content: 'base',
      minStage: 0,
      acquisition: 'fixture',
      verified: true,
    });
    const m = move(1, 'fire', 'special', 80, 'za');
    expect(moveValue(p, m, 'za')).toBe(0);
  });
  it('retorna aviso e conjunto vazio quando não há learnset', () =>
    expect(recommendBuild(pokemon(1), [], 'sword').warnings.length).toBeGreaterThan(0));
  it('não inventa competitivo em Arceus', () =>
    expect(() => validateFormat('arceus', 'ranked')).toThrow(/não possui/));
  it('exige um regulamento importado para competitivo', () =>
    expect(() => validateFormat('sword', 'competitive')).toThrow(/regulamento/));
});
describe('Progressão e geração', () => {
  it('exclui dados de etapa desconhecida por padrão', () => {
    const a = pokemon(1).availability[0];
    a.minStage = null;
    expect(availableAt(a, 3, true, false)).toBe(false);
    expect(availableAt(a, 0, true, true)).toBe(true);
  });
  it('não libera DLC sem permissão', () => {
    const a = { ...pokemon(1).availability[0], content: 'isle-of-armor' };
    expect(availableAt(a, 3, false, true)).toBe(false);
  });
  it('a seleção manual de espécie independe de progresso', () => {
    const p = pokemon(1);
    p.availability[0].minStage = 3;
    expect(canUse(p, 'sword')).toBe(true);
    expect(availableAt(p.availability[0], 0, true, false)).toBe(false);
  });
  const pool = Array.from({ length: 8 }, (_, i) => ({
    pokemon: pokemon(i + 1, [
      ['fire', 'water', 'grass', 'electric', 'ground', 'fairy', 'steel', 'ghost'][i],
    ]),
    moves: legal,
  }));
  const options = {
    stage: 0,
    dlc: false,
    ignoreProgress: false,
    style: 'balanced' as const,
    required: [1],
    banned: [8],
    size: 6,
  };
  it('gera tamanho correto, respeita obrigatórios e proibidos', () => {
    const r = generateTeam(pool, 'sword', options);
    expect(r.members).toHaveLength(6);
    expect(r.members.some((m) => m.formId === 1)).toBe(true);
    expect(r.members.some((m) => m.formId === 8)).toBe(false);
    expect(generateTeam(pool, 'sword', options)).toEqual(r);
  });
  it('rejeita obrigatório indisponível', () =>
    expect(() => generateTeam(pool, 'sword', { ...options, required: [99] })).toThrow());
  it('rejeita lista insuficiente em vez de fabricar equipe', () =>
    expect(() => generateTeam(pool.slice(0, 2), 'sword', options)).toThrow());
  it('aceita Pokémon que naturalmente possuem menos de quatro movimentos', () => {
    const ditto = {
      pokemon: pokemon(132, ['normal']),
      moves: [move(144, 'normal', 'status', null)],
    };
    const result = generateTeam([ditto], 'sword', {
      ...options,
      size: 1,
      required: [132],
      banned: [],
      ignoreProgress: true,
    });
    expect(result.members).toHaveLength(1);
    expect(result.members[0].moves).toEqual([144]);
  });
  it('não libera movimento sem etapa verificada', () => {
    const unknown = legal.map((m) => ({
      ...m,
      methods: m.methods.map((x) => ({ ...x, minStage: null })),
    }));
    expect(
      recommendBuild(pokemon(1), unknown, 'sword', 'balanced', {
        stage: 3,
        dlc: true,
        ignoreProgress: false,
      }).moves,
    ).toHaveLength(0);
  });
});
describe('Itens específicos por jogo', () => {
  const items = [
    { id: 1, name: 'Leftovers', minStage: null },
    { id: 2, name: 'Life Orb', minStage: null },
  ];
  it('não recomenda held items em Arceus', () =>
    expect(recommendItem(pokemon(1), items, 'arceus')).toBeNull());
  it('respeita disponibilidade desconhecida na geração estrita', () =>
    expect(
      recommendItem(pokemon(1), items, 'sword', 'balanced', { stage: 3, ignoreProgress: false }),
    ).toBeNull());
  it('considera custo e função ao sugerir um item', () => {
    expect(recommendItem(pokemon(1), items, 'sword', 'offensive')?.item.name).toBe('Life Orb');
    expect(recommendItem(pokemon(1), items, 'sword', 'defensive')?.item.name).toBe('Leftovers');
  });
});
describe('Rankings com procedência', () => {
  const evidence = [
    { tier: 'S', weight: 1, gameId: 'sword', format: 'story', scope: 'all', sourceId: 'a' },
    { tier: 'A', weight: 1, gameId: 'sword', format: 'story', scope: 'all', sourceId: 'b' },
  ];
  it('não inventa ranking com uma única fonte', () =>
    expect(aggregateRankings(evidence.slice(0, 1), 'sword', 'story', 'all').tier).toBeNull());
  it('agrega somente recortes compatíveis', () => {
    expect(aggregateRankings(evidence, 'sword', 'story', 'all').tier).toBe('A');
    expect(aggregateRankings(evidence, 'arceus', 'story', 'all').tier).toBeNull();
  });
  it('não conta a mesma fonte duas vezes', () =>
    expect(aggregateRankings([evidence[0], evidence[0]], 'sword', 'story', 'all').tier).toBeNull());
  it('não mistura competitivo com campanha', () =>
    expect(aggregateRankings(evidence, 'sword', 'ranked', 'all').tier).toBeNull());
});

import chart from '../data/type-chart.json';
import type {
Availability,
BuildResult,
GameId,
LegalMove,
Pokemon,
Stats,
Style,
} from './contracts';
import { GAMES } from './games';
export const ENGINE_VERSION = '1.1.0';
export const TYPES = [
  'normal',
  'fire',
  'water',
  'electric',
  'grass',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
  'dark',
  'steel',
  'fairy',
];
export const TYPE_LABELS: Record<string, string> = {
  normal: 'Normal',
  fire: 'Fogo',
  water: 'Água',
  electric: 'Elétrico',
  grass: 'Planta',
  ice: 'Gelo',
  fighting: 'Lutador',
  poison: 'Veneno',
  ground: 'Terrestre',
  flying: 'Voador',
  psychic: 'Psíquico',
  bug: 'Inseto',
  rock: 'Pedra',
  ghost: 'Fantasma',
  dragon: 'Dragão',
  dark: 'Sombrio',
  steel: 'Aço',
  fairy: 'Fada',
};
export function effectiveness(
  attack: string,
  defense: string[],
  game: GameId = 'sword',
  ability?: string,
): number {
  if (!TYPES.includes(attack) || !defense.length || defense.some((t) => !TYPES.includes(t)))
    throw new Error('Tipagem inválida.');
  if (GAMES[game].abilities && ability) {
    if (
      (ability === 'Levitate' && attack === 'ground') ||
      (['Water Absorb', 'Storm Drain', 'Dry Skin'].includes(ability) && attack === 'water') ||
      (['Volt Absorb', 'Lightning Rod', 'Motor Drive'].includes(ability) &&
        attack === 'electric') ||
      (ability === 'Flash Fire' && attack === 'fire') ||
      (ability === 'Sap Sipper' && attack === 'grass')
    )
      return 0;
  }
  let result = defense.reduce(
    (x, t) => x * ((chart as Record<string, number>)[`${attack}:${t}`] ?? 1),
    1,
  );
  if (result === 4) result = GAMES[game].doubleWeakness;
  if (result === 0.25) result = GAMES[game].doubleResistance;
  if (GAMES[game].abilities && ability === 'Thick Fat' && ['fire', 'ice'].includes(attack))
    result *= 0.5;
  return result;
}
export function defenseProfile(p: Pick<Pokemon, 'types'>, game: GameId, ability?: string) {
  return TYPES.map((type) => ({ type, multiplier: effectiveness(type, p.types, game, ability) }));
}
export const bst = (s: Stats) => Object.values(s).reduce((a, b) => a + b, 0);
export function recommendItem<T extends { id: number; name: string; minStage: number | null }>(
  pokemon: Pokemon,
  items: T[],
  game: GameId,
  style: Style = 'balanced',
  options?: { stage: number; ignoreProgress: boolean },
): { item: T; reason: string } | null {
  if (!GAMES[game].heldItems) return null;
  const candidates = items.filter(
    (i) =>
      !options || options.ignoreProgress || (i.minStage !== null && i.minStage <= options.stage),
  );
  const defensive =
    style === 'defensive' || style === 'support' || role(pokemon) === 'Parede defensiva';
  const item =
    candidates.find((i) => i.name === (defensive ? 'Leftovers' : 'Life Orb')) ??
    candidates.find((i) => i.name === 'Leftovers');
  return item
    ? {
        item,
        reason:
          item.name === 'Leftovers'
            ? 'Recuperação passiva apoia a permanência em campo. O efeito não é incorporado ao índice de movimentos.'
            : 'Pressão ofensiva adicional em troca de HP. Avalie a perda de sobrevivência; o efeito não é incorporado ao índice de movimentos.',
      }
    : null;
}
export const role = (p: Pokemon): string =>
  p.stats.hp * (p.stats.defense + p.stats.specialDefense) > 23000
    ? 'Parede defensiva'
    : Math.abs(p.stats.attack - p.stats.specialAttack) < 15
      ? 'Atacante misto'
      : p.stats.attack > p.stats.specialAttack
        ? 'Atacante físico'
        : 'Atacante especial';
export function canUse(p: Pokemon, game: GameId): boolean {
  return p.availability.some((a) => a.gameId === game && a.verified);
}
export function availableAt(
  a: Availability | undefined,
  stage: number,
  dlc: boolean,
  ignoreProgress: boolean,
): boolean {
  return (
    !!a &&
    a.verified &&
    (dlc || a.content === 'base') &&
    (ignoreProgress || (a.minStage !== null && a.minStage <= stage))
  );
}
export function validateFormat(game: GameId, mode: string) {
  if (mode !== 'story')
    throw new Error(
      game === 'arceus'
        ? 'Legends: Arceus não possui este modo competitivo oficial.'
        : 'Selecione um regulamento histórico ou temporada verificada. Nenhum foi importado ainda.',
    );
}
const utility: Record<string, { value: number; reason: string }> = {
  protect: { value: 68, reason: 'Proteção para administrar pressão e posicionamento.' },
  detect: { value: 68, reason: 'Proteção para administrar pressão e posicionamento.' },
  roost: { value: 82, reason: 'Recuperação aumenta a permanência em campo.' },
  recover: { value: 82, reason: 'Recuperação aumenta a permanência em campo.' },
  'soft-boiled': { value: 82, reason: 'Recuperação aumenta a permanência em campo.' },
  'swords-dance': { value: 75, reason: 'Setup favorece Attack; exige oportunidade para ativar.' },
  'nasty-plot': {
    value: 75,
    reason: 'Setup favorece Special Attack; exige oportunidade para ativar.',
  },
  'calm-mind': { value: 78, reason: 'Combina preparação ofensiva especial e defesa especial.' },
  'thunder-wave': { value: 70, reason: 'Controle de velocidade por status.' },
  'will-o-wisp': {
    value: 74,
    reason: 'Burn limita atacantes físicos; verifique as imunidades do adversário.',
  },
  'stealth-rock': { value: 74, reason: 'Pressiona trocas com dano de entrada.' },
  toxic: { value: 72, reason: 'Pressiona adversários defensivos ao longo dos turnos.' },
  'confuse-ray': { value: 42, reason: 'Confusão oferece controle situacional.' },
  hypnosis: {
    value: 46,
    reason: 'Controle por status; resultado depende de aplicação e janela de oportunidade.',
  },
  'work-up': { value: 48, reason: 'Setup beneficia as duas estatísticas ofensivas.' },
  'metal-sound': { value: 50, reason: 'Redução de defesa especial pode apoiar ataques especiais.' },
  reflect: { value: 68, reason: 'Suporte defensivo físico.' },
  'light-screen': { value: 68, reason: 'Suporte defensivo especial.' },
  tailwind: { value: 70, reason: 'Controle de velocidade para a equipe.' },
  'sleep-powder': { value: 60, reason: 'Controle de ações por status.' },
  leechseed: { value: 65, reason: 'Recuperação e desgaste.' },
};
export const WEIGHTS: Record<
  Style,
  { damage: number; coverage: number; utility: number; reliability: number }
> = {
  balanced: { damage: 0.45, coverage: 0.25, utility: 0.2, reliability: 0.1 },
  offensive: { damage: 0.6, coverage: 0.23, utility: 0.07, reliability: 0.1 },
  defensive: { damage: 0.25, coverage: 0.15, utility: 0.48, reliability: 0.12 },
  support: { damage: 0.2, coverage: 0.15, utility: 0.53, reliability: 0.12 },
};
export function moveValue(p: Pokemon, m: LegalMove, game: GameId): number {
  if (m.gameId !== game) throw new Error('Movimento de outro jogo.');
  if (m.category === 'status') {
    let value = utility[m.identifier]?.value ?? 12;
    if (m.identifier === 'swords-dance' && p.stats.attack < p.stats.specialAttack - 20)
      value *= 0.45;
    if (m.identifier === 'nasty-plot' && p.stats.specialAttack < p.stats.attack - 20) value *= 0.45;
    return value;
  }
  const stat = m.category === 'physical' ? p.stats.attack : p.stats.specialAttack;
  const ratio = stat / Math.max(p.stats.attack, p.stats.specialAttack);
  const stab = p.types.includes(m.type) ? GAMES[game].stab : 1;
  if (m.power === null) return 24 * ratio * stab; // Explicitly reduced evidence; never invent damage for an unknown/variable-power move.
  const accuracy = game !== 'za' ? (m.accuracy ?? 100) / 100 : 1;
  const resource = game === 'za' ? (m.cooldown && m.cooldown > 0 ? 8 / m.cooldown : 0) : 1;
  return Math.min(150, m.power * ratio * stab * accuracy * resource);
}
export function evaluateBuild(
  p: Pokemon,
  moves: LegalMove[],
  game: GameId,
  style: Style = 'balanced',
) {
  if (!canUse(p, game)) throw new Error('Pokémon indisponível neste jogo.');
  if (moves.length > 4 || new Set(moves.map((m) => m.id)).size !== moves.length)
    throw new Error('A build aceita até quatro movimentos únicos.');
  if (moves.some((m) => m.gameId !== game)) throw new Error('Learnset incompatível com o jogo.');
  const attacks = moves.filter((m) => m.category !== 'status');
  const coverage = TYPES.filter((t) => attacks.some((m) => effectiveness(m.type, [t], game) > 1));
  const damage = attacks.length
    ? Math.min(100, Math.max(...attacks.map((m) => moveValue(p, m, game))) / 1.5)
    : 0;
  const u = moves
    .filter((m) => m.category === 'status')
    .map((m) => moveValue(p, m, game))
    .sort((a, b) => b - a);
  const util = Math.min(100, (u[0] ?? 0) + (u[1] ?? 0) * 0.25);
  const reliability = attacks.length
    ? attacks.reduce(
        (sum, m) =>
          sum + (game !== 'za' ? (m.verified ? (m.accuracy ?? 100) : 0) : m.verified ? 100 : 0),
        0,
      ) / attacks.length
    : 0;
  const redundancy = attacks.length - new Set(attacks.map((m) => m.type)).size;
  const components = {
    damage: Math.round(damage),
    coverage: Math.round((coverage.length / 18) * 100),
    utility: Math.round(util),
    reliability: Math.round(reliability),
    redundancy: redundancy * 4,
  };
  const w = WEIGHTS[style];
  const score = Math.max(
    0,
    Math.min(
      100,
      damage * w.damage +
        (coverage.length / 18) * 100 * w.coverage +
        util * w.utility +
        reliability * w.reliability -
        redundancy * 4,
    ),
  );
  return { score: Math.round(score * 10) / 10, components, coverage };
}
export function recommendBuild(
  p: Pokemon,
  legal: LegalMove[],
  game: GameId,
  style: Style = 'balanced',
  options?: { stage: number; dlc: boolean; ignoreProgress: boolean; level?: number },
): BuildResult {
  const pool = legal.filter(
    (m) =>
      m.gameId === game &&
      (game !== 'za' || m.verified) &&
      (!options ||
        m.methods.some(
          (method) =>
            (options.dlc || method.content === 'base') &&
            (options.ignoreProgress ||
              (method.minStage !== null && method.minStage <= options.stage)) &&
            (!options.level || method.method !== 'level-up' || method.level <= options.level),
        )),
  );
  if (!pool.length)
    return {
      moves: [],
      score: 0,
      role: role(p),
      components: {},
      explanations: [],
      coverage: [],
      warnings: ['Nenhum movimento elegível com evidência suficiente para estes filtros.'],
      alternatives: [],
    };
  const byType = new Map<string, LegalMove[]>();
  for (const m of pool) {
    const key = m.category === 'status' ? m.identifier : m.type;
    const a = byType.get(key) ?? [];
    a.push(m);
    byType.set(key, a);
  }
  const candidates = [...byType.values()]
    .flatMap((a) =>
      a.sort((a, b) => moveValue(p, b, game) - moveValue(p, a, game) || a.id - b.id).slice(0, 2),
    )
    .sort((a, b) => moveValue(p, b, game) - moveValue(p, a, game) || a.id - b.id)
    .slice(0, 26);
  let beam: { moves: LegalMove[]; score: number }[] = [{ moves: [], score: 0 }];
  for (let slot = 0; slot < Math.min(4, candidates.length); slot++) {
    const expanded = new Map<string, { moves: LegalMove[]; score: number }>();
    for (const b of beam)
      for (const m of candidates) {
        if (b.moves.some((x) => x.id === m.id)) continue;
        const ms = [...b.moves, m].sort((a, b) => a.id - b.id);
        const key = ms.map((x) => x.id).join(',');
        if (!expanded.has(key))
          expanded.set(key, { moves: ms, score: evaluateBuild(p, ms, game, style).score });
      }
    beam = [...expanded.values()]
      .sort(
        (a, b) =>
          b.score - a.score ||
          a.moves
            .map((x) => x.id)
            .join(',')
            .localeCompare(b.moves.map((x) => x.id).join(',')),
      )
      .slice(0, 20);
  }
  const chosen = beam[0]?.moves ?? [];
  const evaluation = evaluateBuild(p, chosen, game, style);
  const warnings: string[] = [];
  if (chosen.some((m) => !m.verified))
    warnings.push(
      'Propriedades específicas não verificadas: a seleção usa apenas tipagem, categoria e learnset. A nota não estima dano real.',
    );
  if (game === 'za')
    warnings.push(
      'Cooldown base do movimento normal; não simula Speed, movimentos plus, alcance, desvio ou posicionamento.',
    );
  if (game === 'arceus')
    warnings.push(
      'Parâmetros do estilo normal; a análise não simula estilos Ágil/Forte, domínio ou a ordem dinâmica de ações.',
    );
  warnings.push(
    'Heurística explicável de campanha; não equivale a probabilidade de vitória ou ranking comunitário.',
  );
  return {
    ...evaluation,
    moves: chosen,
    role: role(p),
    warnings,
    alternatives: pool
      .filter((m) => !chosen.some((x) => x.id === m.id))
      .sort((a, b) => moveValue(p, b, game) - moveValue(p, a, game))
      .slice(0, 6),
    explanations: chosen.map(
      (m) =>
        `${m.name}: ${m.category === 'status' ? (utility[m.identifier]?.reason ?? 'Utilidade situacional; efeito específico não modelado.') : `${p.types.includes(m.type) ? `STAB de ${GAMES[game].stab}×. ` : ''}Usa ${m.category === 'physical' ? 'Attack' : 'Special Attack'} (${m.category === 'physical' ? p.stats.attack : p.stats.specialAttack}). ${m.power === null ? 'Poder específico desconhecido; sem estimativa de dano.' : `Poder ${m.power}${game === 'za' ? `, cooldown base ${m.cooldown ?? '?'} s` : `, precisão ${m.accuracy ?? 'sem teste'}${m.accuracy ? '%' : ''}`}.`}`}`,
    ),
  };
}
export function analyzeTeam(
  members: { pokemon: Pokemon; moves: LegalMove[]; ability?: string }[],
  game: GameId,
) {
  const matrix = TYPES.map((type) => ({
    type,
    weak: members.filter((m) => effectiveness(type, m.pokemon.types, game, m.ability) > 1).length,
    resist: members.filter((m) => {
      const x = effectiveness(type, m.pokemon.types, game, m.ability);
      return x > 0 && x < 1;
    }).length,
    immune: members.filter((m) => effectiveness(type, m.pokemon.types, game, m.ability) === 0)
      .length,
    covered: members.filter((m) =>
      m.moves.some((a) => a.category !== 'status' && effectiveness(a.type, [type], game) > 1),
    ).length,
  }));
  const shared = matrix.filter((m) => m.weak >= 2 && m.resist + m.immune === 0);
  const physical = members.filter(
    (m) => m.pokemon.stats.attack > m.pokemon.stats.specialAttack + 14,
  ).length;
  const special = members.filter(
    (m) => m.pokemon.stats.specialAttack > m.pokemon.stats.attack + 14,
  ).length;
  const roles = new Set(members.map((m) => role(m.pokemon)));
  const coverage = matrix.filter((m) => m.covered > 0).length;
  const balance = members.length ? 100 * (1 - Math.abs(physical - special) / members.length) : 0;
  const score = members.length
    ? Math.max(
        0,
        Math.round(
          (coverage / 18) * 40 +
            (Math.min(3, roles.size) / 3) * 20 +
            balance * 0.2 +
            20 -
            shared.length * 5,
        ),
      )
    : 0;
  return {
    matrix,
    shared,
    physical,
    special,
    mixed: members.length - physical - special,
    coverage,
    roles: [...roles],
    score,
    averageSpeed: members.length
      ? Math.round(members.reduce((s, m) => s + m.pokemon.stats.speed, 0) / members.length)
      : 0,
    recommendations: [
      ...shared.map(
        (t) =>
          `Há ${t.weak} fraquezas a ${TYPE_LABELS[t.type]} sem resistência ou imunidade. Procure um integrante que receba menos de 1× desse tipo.`,
      ),
      ...(members.length && physical === members.length
        ? ['Inclua um atacante especial para variar a pressão ofensiva.']
        : []),
      ...(members.length && special === members.length
        ? ['Inclua um atacante físico para variar a pressão ofensiva.']
        : []),
      ...(coverage < 12
        ? [
            'Revise os movimentos para ampliar a cobertura ofensiva. Cobertura não concede resistência defensiva.',
          ]
        : []),
    ],
  };
}
export function generateTeam(
  pool: { pokemon: Pokemon; moves: LegalMove[] }[],
  game: GameId,
  options: {
    stage: number;
    dlc: boolean;
    ignoreProgress: boolean;
    style: Style;
    required: number[];
    banned: number[];
    size: number;
    variant?: number;
  },
) {
  if (options.size < 1 || options.size > 6) throw new Error('Tamanho de equipe inválido.');
  if (
    new Set(options.required).size !== options.required.length ||
    options.required.length > options.size
  )
    throw new Error('Pokémon obrigatórios duplicados ou acima do limite.');
  const allowed = pool.filter(
    (m) =>
      !options.banned.includes(m.pokemon.id) &&
      !['mega', 'battle', 'gigantamax'].includes(m.pokemon.kind) &&
      availableAt(
        m.pokemon.availability.find((a) => a.gameId === game),
        options.stage,
        options.dlc,
        options.ignoreProgress,
      ),
  );
  for (const id of options.required)
    if (!allowed.some((m) => m.pokemon.id === id))
      throw new Error(
        'Um Pokémon obrigatório não atende aos filtros de disponibilidade, progresso ou exclusão.',
      );
  // Keep role/type diversity in the preselection and always retain mandatory forms.
  const quality = (p: Pokemon) =>
    Math.max(p.stats.attack, p.stats.specialAttack) * 0.4 +
    Math.sqrt((p.stats.hp * (p.stats.defense + p.stats.specialDefense)) / 2) * 0.4 +
    p.stats.speed * 0.2;
  const ordered = [...allowed].sort(
    (a, b) => quality(b.pokemon) - quality(a.pokemon) || a.pokemon.id - b.pokemon.id,
  );
  const retained = new Map<number, (typeof allowed)[number]>();
  for (const id of options.required) {
    const candidate = allowed.find((m) => m.pokemon.id === id);
    if (candidate) retained.set(id, candidate);
  }
  for (const type of TYPES)
    for (const candidate of ordered.filter((m) => m.pokemon.types.includes(type)).slice(0, 4))
      retained.set(candidate.pokemon.id, candidate);
  for (const candidate of ordered) {
    if (retained.size >= 100) break;
    retained.set(candidate.pokemon.id, candidate);
  }
  const candidates = [...retained.values()]
    .map((m) => ({
      ...m,
      build: recommendBuild(m.pokemon, m.moves, game, options.style, {
        stage: options.stage,
        dlc: options.dlc,
        ignoreProgress: options.ignoreProgress,
      }),
    }))
    .filter((m) => m.build.moves.length > 0)
    .sort((a, b) => b.build.score - a.build.score || a.pokemon.id - b.pokemon.id);
  const required = options.required.map((id) => {
    const candidate = candidates.find((m) => m.pokemon.id === id);
    if (!candidate)
      throw new Error('Não há movimentos verificados/elegíveis para um Pokémon obrigatório.');
    return candidate;
  });
  type Candidate = (typeof candidates)[number];
  const value = (team: Candidate[]) =>
    analyzeTeam(
      team.map((m) => ({ pokemon: m.pokemon, moves: m.build.moves })),
      game,
    ).score *
      0.65 +
    (team.reduce((s, m) => s + m.build.score, 0) / Math.max(1, team.length)) * 0.35;
  let beam: { team: Candidate[]; score: number }[] = [{ team: required, score: value(required) }];
  for (let slot = required.length; slot < options.size; slot++) {
    const states = new Map<string, { team: Candidate[]; score: number }>();
    for (const b of beam)
      for (const c of candidates) {
        if (b.team.some((m) => m.pokemon.speciesId === c.pokemon.speciesId)) continue;
        const team = [...b.team, c];
        const key = team
          .map((m) => m.pokemon.id)
          .sort((a, b) => a - b)
          .join(',');
        if (!states.has(key)) states.set(key, { team, score: value(team) });
      }
    beam = [...states.values()]
      .sort(
        (a, b) =>
          b.score - a.score ||
          a.team
            .map((x) => x.pokemon.id)
            .join(',')
            .localeCompare(b.team.map((x) => x.pokemon.id).join(',')),
      )
      .slice(0, 12);
    if (!beam.length)
      throw new Error(
        'Dados elegíveis insuficientes para formar a equipe. Tente outro tamanho ou habilite ignorar progresso.',
      );
  }
  const best = beam[Math.abs(options.variant ?? 0) % beam.length];
  if (!best || best.team.length !== options.size)
    throw new Error('Não foi possível gerar uma equipe completa.');
  return {
    members: best.team.map((m) => ({
      formId: m.pokemon.id,
      moves: m.build.moves.map((x) => x.id),
      build: m.build,
    })),
    analysis: analyzeTeam(
      best.team.map((m) => ({ pokemon: m.pokemon, moves: m.build.moves })),
      game,
    ),
    eligible: allowed.length,
    method: 'Beam search · 100 candidatos · largura 12',
    warnings: options.ignoreProgress
      ? ['Progresso ignorado por escolha do usuário.']
      : [
          'Progressão parcialmente catalogada; Pokémon e movimentos sem etapa verificada foram excluídos.',
        ],
  };
}
export function aggregateRankings(
  evidence: {
    tier: string;
    weight: number;
    gameId: string;
    format: string;
    scope: string;
    sourceId: string;
  }[],
  game: GameId,
  format: string,
  scope: string,
) {
  const valid = evidence.filter(
    (e) =>
      e.gameId === game &&
      e.format === format &&
      e.scope === scope &&
      e.weight > 0 &&
      ['S', 'A', 'B', 'C', 'D', 'F'].includes(e.tier),
  );
  const unique = [...new Map(valid.map((e) => [e.sourceId, e])).values()];
  if (unique.length < 2)
    return { tier: null, confidence: 'insufficient', sourceCount: unique.length };
  const tiers = ['S', 'A', 'B', 'C', 'D', 'F'];
  const score =
    unique.reduce((s, e) => s + tiers.indexOf(e.tier) * e.weight, 0) /
    unique.reduce((s, e) => s + e.weight, 0);
  return {
    tier: tiers[Math.round(score)],
    confidence: unique.length >= 3 ? 'medium' : 'low',
    sourceCount: unique.length,
  };
}

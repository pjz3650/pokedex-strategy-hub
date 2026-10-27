import type { Prisma } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import type { GameId,LegalMove,Pokemon } from './contracts';
import { db } from './db';
const formInclude = {
  species: true,
  stats: true,
  gameStats: true,
  types: { include: { type: true }, orderBy: { slot: 'asc' as const } },
  availability: { where: { verified: true }, include: { source: true } },
} satisfies Prisma.PokemonFormInclude;
type FormRow = Prisma.PokemonFormGetPayload<{ include: typeof formInclude }>;
export function mapPokemon(p: FormRow): Pokemon {
  if (!p.stats) throw new Error(`Atributos ausentes para forma ${p.id}`);
  return {
    id: p.id,
    identifier: p.identifier,
    name: p.name,
    speciesId: p.speciesId,
    generation: p.species.generation,
    kind: p.kind,
    isDefault: p.isDefault,
    evolvesFromId: p.species.evolvesFromId,
    legendary: p.species.legendary,
    mythical: p.species.mythical,
    types: p.types.map((t) => t.type.name),
    stats: {
      hp: p.stats.hp,
      attack: p.stats.attack,
      defense: p.stats.defense,
      specialAttack: p.stats.specialAttack,
      specialDefense: p.stats.specialDefense,
      speed: p.stats.speed,
    },
    statsByGame: Object.fromEntries(
      p.gameStats.map((s) => [
        s.gameId,
        {
          hp: s.hp,
          attack: s.attack,
          defense: s.defense,
          specialAttack: s.specialAttack,
          specialDefense: s.specialDefense,
          speed: s.speed,
        },
      ]),
    ),
    sprite: p.sprite,
    artwork: p.artwork,
    availability: p.availability.map((a) => ({
      gameId: a.gameId as GameId,
      content: a.content,
      minStage: a.minStage,
      acquisition: a.acquisition,
      verified: a.verified,
      sourceUrl: a.source.url,
    })),
  };
}
export function forGame(p: Pokemon, game: GameId): Pokemon {
  return { ...p, stats: p.statsByGame?.[game] ?? p.stats };
}
export const getCatalog = unstable_cache(
  async () => {
    const pokemon = await db.pokemonForm.findMany({
      where: { availability: { some: { verified: true } } },
      include: formInclude,
      orderBy: [{ speciesId: 'asc' }, { id: 'asc' }],
    });
    return pokemon.map(mapPokemon);
  },
  ['catalog-v4-full-game-learnsets'],
  { revalidate: 3600 },
);
export async function getLegalMoves(formId: number, gameId: GameId): Promise<LegalMove[]> {
  const rows = await db.pokemonLearnset.findMany({
    where: { formId, gameId },
    include: {
      source: true,
      move: { include: { type: true, games: { where: { gameId }, include: { source: true } } } },
    },
    orderBy: { level: 'asc' },
  });
  const result = new Map<number, LegalMove>();
  for (const r of rows) {
    let value = result.get(r.moveId);
    if (!value) {
      const data = r.move.games[0];
      value = {
        id: r.moveId,
        identifier: r.move.identifier,
        name: r.move.name,
        type: data?.typeName ?? r.move.type.name,
        category: data?.category ?? r.move.category,
        gameId,
        power: data?.power ?? null,
        accuracy: data?.accuracy ?? null,
        pp: data?.pp ?? null,
        cooldown: data?.cooldown ?? null,
        priority: data?.priority ?? null,
        range: data?.range ?? null,
        area: data?.area ?? null,
        verified: data?.verified ?? false,
        effect: data?.effect ?? null,
        methods: [],
        sourceUrl: data?.source.url ?? r.source.url,
      };
      result.set(r.moveId, value);
    }
    value.methods.push({
      method: r.method,
      level: r.level,
      content: r.content,
      minStage: r.minStage,
    });
  }
  return [...result.values()];
}
export async function getGameMovePool(pokemon: Pokemon[], gameId: GameId) {
  const [learnsets, moveData] = await Promise.all([
    db.pokemonLearnset.findMany({
      where: { formId: { in: pokemon.map((p) => p.id) }, gameId },
      select: {
        formId: true,
        moveId: true,
        method: true,
        level: true,
        content: true,
        minStage: true,
      },
    }),
    db.moveGameData.findMany({
      where: { gameId },
      include: { move: { include: { type: true } }, source: true },
    }),
  ]);
  const baseMoves = new Map<number, Omit<LegalMove, 'methods'>>(
    moveData.map((d) => [
      d.moveId,
      {
        id: d.moveId,
        identifier: d.move.identifier,
        name: d.move.name,
        type: d.typeName ?? d.move.type.name,
        category: d.category ?? d.move.category,
        gameId,
        power: d.power,
        accuracy: d.accuracy,
        pp: d.pp,
        cooldown: d.cooldown,
        priority: d.priority,
        range: d.range,
        area: d.area,
        verified: d.verified,
        effect: d.effect,
        sourceUrl: d.source.url,
      },
    ]),
  );
  const mapped = new Map<number, Map<number, LegalMove>>();
  for (const learn of learnsets) {
    const base = baseMoves.get(learn.moveId);
    if (!base) continue;
    let form = mapped.get(learn.formId);
    if (!form) {
      form = new Map();
      mapped.set(learn.formId, form);
    }
    let move = form.get(learn.moveId);
    if (!move) {
      move = { ...base, methods: [] };
      form.set(learn.moveId, move);
    }
    move.methods.push({
      method: learn.method,
      level: learn.level,
      content: learn.content,
      minStage: learn.minStage,
    });
  }
  return pokemon.map((p) => ({
    pokemon: forGame(p, gameId),
    moves: [...(mapped.get(p.id)?.values() ?? [])],
  }));
}
export async function getDetail(id: number, game: GameId) {
  const row = await db.pokemonForm.findUnique({ where: { id }, include: formInclude });
  if (!row) return null;
  const [moves, forms, abilities, encounters, items, evolutions] = await Promise.all([
    getLegalMoves(id, game),
    db.pokemonForm.findMany({ where: { speciesId: row.speciesId }, include: formInclude }),
    db.pokemonAbilityAvailability.findMany({
      where: { formId: id, gameId: game },
      include: { ability: true },
    }),
    db.pokemonEncounter.findMany({
      where: { formId: id, gameId: game },
      include: { location: true, source: true },
    }),
    db.itemGameAvailability.findMany({
      where: { gameId: game },
      include: { item: true, source: true },
    }),
    db.pokemonSpecies.findMany({
      where: { OR: [{ id: row.species.evolvesFromId ?? -1 }, { evolvesFromId: row.speciesId }] },
      select: { id: true, name: true },
    }),
  ]);
  return {
    pokemon: forGame(mapPokemon(row), game),
    height: row.height,
    weight: row.weight,
    genus: row.species.genus,
    source: row.sourceId,
    forms: forms.map((p) => forGame(mapPokemon(p), game)),
    moves,
    abilities: abilities.map((a) => ({ id: a.abilityId, name: a.ability.name, hidden: a.hidden })),
    encounters: encounters.map((e) => ({
      name: e.location.name,
      method: e.method,
      source: e.source.url,
    })),
    items: items.map((i) => ({
      id: i.itemId,
      name: i.item.name,
      kind: i.item.kind,
      effect: i.effect,
      location: i.location,
      minStage: i.minStage,
      source: i.source.url,
    })),
    evolutions,
  };
}
export type PokemonDetail = NonNullable<Awaited<ReturnType<typeof getDetail>>>;

export async function getDataCoverage() {
  const [availability, learnsets, properties] = await Promise.all([
    db.pokemonGameAvailability.findMany({
      where: { verified: true },
      select: { formId: true, gameId: true, form: { select: { speciesId: true } } },
    }),
    db.pokemonLearnset.groupBy({ by: ['formId', 'gameId'], _count: true }),
    db.moveGameData.groupBy({ by: ['gameId', 'verified'], _count: true }),
  ]);
  return (['sword', 'arceus', 'za'] as const).map((gameId) => {
    const forms = availability.filter((a) => a.gameId === gameId);
    const covered = new Set(learnsets.filter((l) => l.gameId === gameId).map((l) => l.formId));
    return {
      gameId,
      species: new Set(forms.map((a) => a.form.speciesId)).size,
      forms: forms.length,
      formsWithMoves: forms.filter((a) => covered.has(a.formId)).length,
      learnsetRecords: learnsets
        .filter((l) => l.gameId === gameId)
        .reduce((sum, l) => sum + l._count, 0),
      verifiedMoveProperties:
        properties.find((p) => p.gameId === gameId && p.verified)?._count ?? 0,
    };
  });
}

import type { Prisma } from '@prisma/client';
import { parse } from 'csv-parse';
import { parse as parseSync } from 'csv-parse/sync';
import 'dotenv/config';
import { createReadStream } from 'node:fs';
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import curatedEncounters from '../data/curated-encounters.json';
import curatedItems from '../data/curated-items.json';
import curated from '../data/curated-za.json';
import { seed } from '../prisma/seed';
import { db } from '../src/lib/db';
import { upsertImportedRows } from '../src/lib/import-utils';
import { importGameData } from './import-game-data';
type Row = Record<string, string>;
const csv = async (name: string): Promise<Row[]> =>
  parseSync(await readFile(`data/raw/${name}.csv`), { columns: true, skip_empty_lines: true });
const n = (s: string | undefined) => (s ? Number(s) : null);
const title = (s: string) =>
  s
    .split('-')
    .map((x) => x[0]?.toUpperCase() + x.slice(1))
    .join(' ');
const chunks = async <T>(rows: T[], insert: (rows: T[]) => Promise<unknown>) => {
  for (let i = 0; i < rows.length; i += 1000) await insert(rows.slice(i, i + 1000));
};
const vgMap: Record<number, { game: string; content: string }> = {
  20: { game: 'sword', content: 'base' },
  21: { game: 'sword', content: 'isle-of-armor' },
  22: { game: 'sword', content: 'crown-tundra' },
  24: { game: 'arceus', content: 'base' },
  30: { game: 'za', content: 'base' },
  31: { game: 'za', content: 'mega-dimension' },
};
async function main() {
  const manifest = JSON.parse(await readFile('data/raw/manifest.json', 'utf8')) as {
    commit: string;
    collectedAt: string;
  };
  const run = await db.dataImportRun.create({
    data: { source: 'PokeAPI', commit: manifest.commit, status: 'running' },
  });
  try {
    await seed();
    const sourceId = `pokeapi-${manifest.commit.slice(0, 12)}`;
    await db.rankingSource.upsert({
      where: { id: sourceId },
      create: {
        id: sourceId,
        name: 'PokéAPI · snapshot versionado',
        url: `https://github.com/PokeAPI/pokeapi/tree/${manifest.commit}`,
        license: 'BSD-3-Clause; ver docs/FONTES.md',
        collectedAt: new Date(manifest.collectedAt),
        confidence: 'medium',
      },
      update: {},
    });
    const [
      species,
      speciesNames,
      pokemon,
      forms,
      stats,
      types,
      moves,
      moveNames,
      dex,
      methods,
      versions,
    ] = await Promise.all(
      [
        'pokemon_species',
        'pokemon_species_names',
        'pokemon',
        'pokemon_forms',
        'pokemon_stats',
        'pokemon_types',
        'moves',
        'move_names',
        'pokemon_dex_numbers',
        'pokemon_move_methods',
        'versions',
      ].map(csv),
    );
    const speciesName = new Map(
      speciesNames.filter((x) => x.local_language_id === '9').map((x) => [x.pokemon_species_id, x]),
    );
    await chunks(
      species.map((s) => ({
        id: +s.id,
        identifier: s.identifier,
        name: speciesName.get(s.id)?.name ?? title(s.identifier),
        genus: speciesName.get(s.id)?.genus ?? null,
        generation: +s.generation_id,
        evolvesFromId: n(s.evolves_from_species_id),
        legendary: s.is_legendary === '1',
        mythical: s.is_mythical === '1',
      })),
      (rows) => upsertImportedRows(db, 'PokemonSpecies', rows),
    );
    await chunks(
      (await csv('types'))
        .filter((t) => +t.id <= 18)
        .map((t) => ({ id: +t.id, name: t.identifier })),
      (rows) => upsertImportedRows(db, 'Type', rows),
    );
    await chunks(
      versions
        .filter((v) => vgMap[+v.version_group_id])
        .map((v) => ({ id: +v.id, name: v.identifier, gameId: vgMap[+v.version_group_id].game })),
      (rows) => upsertImportedRows(db, 'GameVersion', rows),
    );
    const formByPokemon = new Map(
      forms.filter((f) => f.is_default === '1').map((f) => [f.pokemon_id, f]),
    );
    const pokemonRows = pokemon.filter((p) =>
      types.some((t) => t.pokemon_id === p.id && +t.type_id <= 18),
    );
    await chunks(
      pokemonRows.map((p) => {
        const f = formByPokemon.get(p.id);
        const kind =
          f?.is_mega === '1'
            ? 'mega'
            : p.identifier.includes('gmax')
              ? 'gigantamax'
              : /alola|galar|hisui|paldea/.test(p.identifier)
                ? 'regional'
                : f?.is_battle_only === '1'
                  ? 'battle'
                  : p.is_default === '1'
                    ? 'base'
                    : 'alternative';
        const baseName = speciesName.get(p.species_id)?.name ?? title(p.identifier);
        const suffix = p.identifier
          .replace(species.find((s) => s.id === p.species_id)?.identifier ?? '', '')
          .replace(/^-/, '');
        return {
          id: +p.id,
          identifier: p.identifier,
          name: suffix ? `${baseName} · ${title(suffix)}` : baseName,
          speciesId: +p.species_id,
          isDefault: p.is_default === '1',
          kind,
          height: n(p.height) === null ? null : +p.height / 10,
          weight: n(p.weight) === null ? null : +p.weight / 10,
          sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`,
          artwork: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${p.id}.png`,
          sourceId,
        };
      }),
      (rows) => upsertImportedRows(db, 'PokemonForm', rows),
    );
    const ids = new Set(pokemonRows.map((p) => +p.id));
    const statNames = [
      'hp',
      'attack',
      'defense',
      'specialAttack',
      'specialDefense',
      'speed',
    ] as const;
    const statRows = pokemonRows.map((p) => {
      const s = Object.fromEntries(
        statNames.map((key, i) => [
          key,
          (() => {
            const value = stats.find(
              (x) => x.pokemon_id === p.id && +x.stat_id === i + 1,
            )?.base_stat;
            if (!value) throw new Error(`Missing stat ${key} for ${p.id}`);
            return Number(value);
          })(),
        ]),
      );
      return { formId: +p.id, ...s } as Prisma.PokemonStatsCreateManyInput;
    });
    await chunks(statRows, (rows) => upsertImportedRows(db, 'PokemonStats', rows));
    const pastStats = await csv('pokemon_stats_past');
    const historicRows: Prisma.PokemonGameStatsCreateManyInput[] = [];
    for (const row of statRows) {
      const previous = pastStats
        .filter((p) => +p.pokemon_id === row.formId && +p.generation_id >= 8 && +p.stat_id <= 6)
        .sort((a, b) => +a.generation_id - +b.generation_id);
      if (!previous.length) continue;
      const historical = { ...row };
      const seen = new Set<string>();
      for (const old of previous) {
        if (seen.has(old.stat_id)) continue;
        seen.add(old.stat_id);
        historical[statNames[+old.stat_id - 1]] = +old.base_stat;
      }
      for (const gameId of ['sword', 'arceus']) historicRows.push({ ...historical, gameId });
    }
    await chunks(historicRows, (rows) => upsertImportedRows(db, 'PokemonGameStats', rows));
    await chunks(
      types
        .filter((t) => ids.has(+t.pokemon_id) && +t.type_id <= 18)
        .map((t) => ({ formId: +t.pokemon_id, typeId: +t.type_id, slot: +t.slot })),
      (rows) => upsertImportedRows(db, 'PokemonType', rows),
    );
    const englishMoveNames = new Map(
      moveNames.filter((x) => x.local_language_id === '9').map((x) => [x.move_id, x.name]),
    );
    await chunks(
      moves
        .filter((m) => +m.type_id <= 18)
        .map((m) => ({
          id: +m.id,
          identifier: m.identifier,
          name: englishMoveNames.get(m.id) ?? title(m.identifier),
          typeId: +m.type_id,
          category: ({ 1: 'status', 2: 'physical', 3: 'special' } as Record<number, string>)[
            +m.damage_class_id
          ],
        })),
      (rows) => upsertImportedRows(db, 'Move', rows),
    );
    const learnsets: Prisma.PokemonLearnsetCreateManyInput[] = [];
    const methodMap = new Map(methods.map((m) => [m.id, m.identifier]));
    const stream = createReadStream('data/raw/pokemon_moves.csv').pipe(parse({ columns: true }));
    for await (const row of stream) {
      const r = row as Row;
      const v = vgMap[+r.version_group_id];
      if (!v || !ids.has(+r.pokemon_id)) continue;
      learnsets.push({
        formId: +r.pokemon_id,
        moveId: +r.move_id,
        gameId: v.game,
        versionGroup: +r.version_group_id,
        method: methodMap.get(r.pokemon_move_method_id) ?? 'unknown',
        level: +r.level,
        content: v.content,
        sourceId,
      });
    }
    await chunks(learnsets, (rows) => upsertImportedRows(db, 'PokemonLearnset', rows));
    const availability: Prisma.PokemonGameAvailabilityCreateManyInput[] = [];
    for (const p of pokemonRows) {
      for (const gameId of ['sword', 'arceus', 'za']) {
        const matching = learnsets.filter((l) => l.formId === +p.id && l.gameId === gameId);
        const dexIds = gameId === 'sword' ? [27, 28, 29] : gameId === 'arceus' ? [30] : [34, 35];
        const dexEntry = dex
          .filter((d) => d.species_id === p.species_id && dexIds.includes(+d.pokedex_id))
          .sort((a, b) => +a.pokedex_id - +b.pokedex_id)[0];
        // Z-A has dex coverage but no learnsets in this snapshot. Do not infer regional forms from species presence.
        const zaMega =
          gameId === 'za' &&
          /mega/.test(p.identifier) &&
          [6, 94, 282, 448, 445, 130].includes(+p.species_id);
        if (!matching.length && !(gameId === 'za' && dexEntry && (p.is_default === '1' || zaMega)))
          continue;
        if (gameId !== 'za' && !matching.length) continue;
        if (gameId === 'sword' && /mega|hisui|paldea/.test(p.identifier)) continue;
        const content = dexEntry
          ? ((
              { 28: 'isle-of-armor', 29: 'crown-tundra', 35: 'mega-dimension' } as Record<
                number,
                string
              >
            )[+dexEntry.pokedex_id] ?? 'base')
          : 'transfer-unknown';
        availability.push({
          formId: +p.id,
          gameId,
          content,
          acquisition: dexEntry
            ? 'Registrado no Pokédex regional. Local e método de obtenção ainda não verificados.'
            : 'Learnset específico confirma compatibilidade. Obtenção nativa, troca ou transferência não discriminada.',
          verified: true,
          sourceId,
          checkedAt: new Date(manifest.collectedAt),
        });
      }
    }
    await chunks(availability, (rows) => upsertImportedRows(db, 'PokemonGameAvailability', rows));
    for (const form of forms.filter((f) => +f.introduced_in_version_group_id === 31))
      await db.pokemonGameAvailability.updateMany({
        where: { formId: +form.pokemon_id, gameId: 'za' },
        data: { content: 'mega-dimension' },
      });
    // Traditional move properties are only used for Sword. No cross-game property inheritance.
    const changes = await csv('move_changelog');
    const swordMoveIds = new Set(
      learnsets.filter((l) => l.gameId === 'sword').map((l) => l.moveId),
    );
    const moveData: Prisma.MoveGameDataCreateManyInput[] = [];
    for (const m of moves.filter((m) => swordMoveIds.has(+m.id))) {
      const old = { ...m };
      for (const c of changes
        .filter(
          (c) =>
            c.move_id === m.id &&
            +c.changed_in_version_group_id > 22 &&
            +c.changed_in_version_group_id < 28,
        )
        .sort((a, b) => +b.changed_in_version_group_id - +a.changed_in_version_group_id))
        for (const k of ['power', 'accuracy', 'pp', 'priority']) if (c[k] !== '') old[k] = c[k];
      moveData.push({
        moveId: +m.id,
        gameId: 'sword',
        power: n(old.power),
        accuracy: n(old.accuracy),
        pp: n(old.pp),
        priority: n(old.priority),
        verified: true,
        sourceId,
      });
    }
    for (const moveId of new Set(
      learnsets.filter((l) => l.gameId === 'arceus').map((l) => l.moveId),
    ))
      moveData.push({ moveId, gameId: 'arceus', verified: false, sourceId });
    await chunks(moveData, (rows) => upsertImportedRows(db, 'MoveGameData', rows));
    const abilities = await csv('abilities');
    const abilityNames = new Map(
      (await csv('ability_names'))
        .filter((a) => a.local_language_id === '9')
        .map((a) => [a.ability_id, a.name]),
    );
    await db.ability.createMany({
      data: abilities.map((a) => ({
        id: +a.id,
        name: abilityNames.get(a.id) ?? title(a.identifier),
      })),
      skipDuplicates: true,
    });
    const swordForms = new Set(
      availability.filter((a) => a.gameId === 'sword').map((a) => a.formId),
    );
    await chunks(
      (await csv('pokemon_abilities'))
        .filter((a) => swordForms.has(+a.pokemon_id))
        .map((a) => ({
          formId: +a.pokemon_id,
          gameId: 'sword',
          abilityId: +a.ability_id,
          hidden: a.is_hidden === '1',
        })),
      (rows) => upsertImportedRows(db, 'PokemonAbilityAvailability', rows),
    );
    const itemNames = new Map(
      (await csv('item_names'))
        .filter((i) => i.local_language_id === '9')
        .map((i) => [i.item_id, i.name]),
    );
    const rawItems = await csv('items');
    const itemIdentifiers = new Set<string>();
    const items = rawItems.filter((item) => {
      if (itemIdentifiers.has(item.identifier)) return false;
      itemIdentifiers.add(item.identifier);
      return true;
    });
    await chunks(
      items.map((i) => ({
        id: +i.id,
        identifier: i.identifier,
        name: itemNames.get(i.id) ?? title(i.identifier),
        kind: i.identifier.endsWith('ite') ? 'mega-stone' : 'item',
      })),
      (rows) => upsertImportedRows(db, 'Item', rows),
    );
    // Only explicitly curated item-game pairs can be selected in the app; item_game_indices is generation-wide, not evidence of game legality.
    for (const entry of curated.pokemon) {
      const sid = `serebii-za-${entry.id}`;
      await db.rankingSource.upsert({
        where: { id: sid },
        create: {
          id: sid,
          name: `Serebii · ${entry.id} · Z-A`,
          url: entry.url,
          license: 'Referência factual manual; sem reprodução de texto editorial.',
          collectedAt: new Date(curated.checkedAt),
          confidence: 'medium',
        },
        update: {},
      });
      for (const tuple of entry.moves) {
        const [identifier, power, cooldown, level] = tuple as [
          string,
          number | null,
          number,
          number,
        ];
        const move = moves.find((m) => m.identifier === identifier);
        if (!move) throw new Error(`Unknown move ${identifier}`);
        await db.moveGameData.upsert({
          where: { moveId_gameId: { moveId: +move.id, gameId: 'za' } },
          create: {
            moveId: +move.id,
            gameId: 'za',
            power,
            cooldown,
            sourceId: sid,
            verified: true,
          },
          update: { power, cooldown, sourceId: sid, verified: true },
        });
        await db.pokemonLearnset.upsert({
          where: {
            formId_moveId_versionGroup_method_level: {
              formId: entry.id,
              moveId: +move.id,
              versionGroup: 30,
              method: 'level-up',
              level,
            },
          },
          create: {
            formId: entry.id,
            moveId: +move.id,
            gameId: 'za',
            versionGroup: 30,
            method: 'level-up',
            level,
            content: 'base',
            sourceId: sid,
          },
          update: {},
        });
      }
    }
    for (const entry of curatedItems) {
      const item = await db.item.findUnique({ where: { identifier: entry.identifier } });
      if (!item) throw new Error(`Unknown item ${entry.identifier}`);
      const id = `serebii-item-${item.id}`;
      await db.rankingSource.upsert({
        where: { id },
        create: {
          id,
          name: `Serebii · ${item.name}`,
          url: entry.sourceUrl,
          collectedAt: new Date(curated.checkedAt),
          confidence: 'medium',
          license: 'Referência factual manual.',
        },
        update: {},
      });
      for (const game of entry.games)
        await db.itemGameAvailability.upsert({
          where: { itemId_gameId: { itemId: item.id, gameId: game.gameId } },
          create: { itemId: item.id, ...game, sourceId: id },
          update: { effect: game.effect, location: game.location, minStage: game.minStage },
        });
    }
    for (const entry of curatedEncounters) {
      const id = `serebii-encounter-${entry.gameId}-${entry.stage}`;
      const locationId = `${entry.gameId}-${entry.location.toLowerCase().replaceAll(' ', '-')}`;
      await db.rankingSource.upsert({
        where: { id },
        create: {
          id,
          name: `Serebii · ${entry.location}`,
          url: entry.sourceUrl,
          collectedAt: new Date(curated.checkedAt),
          confidence: 'medium',
          license: 'Referência factual manual.',
        },
        update: {},
      });
      await db.location.upsert({
        where: { id: locationId },
        create: { id: locationId, name: entry.location },
        update: {},
      });
      for (const formId of entry.pokemon) {
        await db.pokemonGameAvailability.updateMany({
          where: { formId, gameId: entry.gameId },
          data: {
            minStage: entry.stage,
            acquisition: `${entry.location}: ${entry.method}`,
            sourceId: id,
          },
        });
        await db.pokemonEncounter.upsert({
          where: { formId_gameId_locationId: { formId, gameId: entry.gameId, locationId } },
          create: { formId, gameId: entry.gameId, locationId, sourceId: id, method: entry.method },
          update: { method: entry.method },
        });
      }
    }
    const starters: Record<string, number[]> = {
      sword: [810, 813, 816],
      arceus: [155, 501, 722],
      za: [152, 498, 158],
    };
    for (const [gameId, forms] of Object.entries(starters))
      for (const formId of forms)
        await db.pokemonGameAvailability.updateMany({
          where: { formId, gameId },
          data: {
            minStage: 0,
            acquisition:
              'Escolha de parceiro inicial; os três iniciais são alternativas mutuamente exclusivas nesta etapa.',
            sourceId: `official-${gameId === 'arceus' ? 'pla' : gameId}`,
          },
        });
    const typeIds = new Map((await csv('types')).map((t) => [t.id, t.identifier]));
    const chart = Object.fromEntries(
      (await csv('type_efficacy'))
        .filter((t) => +t.damage_type_id <= 18 && +t.target_type_id <= 18)
        .map((t) => [
          `${typeIds.get(t.damage_type_id)}:${typeIds.get(t.target_type_id)}`,
          +t.damage_factor / 100,
        ]),
    );
    await mkdir('src/data', { recursive: true });
    await writeFile('src/data/type-chart.json', JSON.stringify(chart));
    await importGameData();
    await db.dataImportRun.update({
      where: { id: run.id },
      data: {
        status: 'complete',
        finishedAt: new Date(),
        counts: {
          species: species.length,
          forms: pokemonRows.length,
          learnsets: learnsets.length,
          availability: availability.length,
          zaCuratedForms: curated.pokemon.length,
        },
      },
    });
    console.log(
      JSON.stringify({
        status: 'complete',
        commit: manifest.commit,
        species: species.length,
        forms: pokemonRows.length,
        learnsets: learnsets.length,
        availability: availability.length,
      }),
    );
  } catch (error) {
    await db.dataImportRun.update({
      where: { id: run.id },
      data: {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Import failed',
        finishedAt: new Date(),
      },
    });
    throw error;
  }
}
main().finally(() => db.$disconnect());

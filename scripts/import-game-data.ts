import type { Prisma } from '@prisma/client';
import { parse } from 'csv-parse/sync';
import 'dotenv/config';
import { createHash } from 'node:crypto';
import { readFile,writeFile } from 'node:fs/promises';
import { db } from '../src/lib/db';
import { parsePlaMoveProperties,parseZaMoveProperties } from '../src/lib/game-move-properties';
import { upsertImportedRows } from '../src/lib/import-utils';
import {
createFormMap,
learnsetKey,
normalizeLearnsets,
parseBaseLearnsetKeys,
type RawForm,
type RawPokemon,
type SourceLearnset,
} from '../src/lib/learnset-import';

const readJson = async (name: string) =>
  JSON.parse(await readFile(`data/supplemental/${name}`, 'utf8'));
const readCsv = async <T>(name: string): Promise<T[]> =>
  parse(await readFile(`data/raw/${name}.csv`), { columns: true, skip_empty_lines: true }) as T[];
const batch = async (
  client: Pick<typeof db, '$executeRawUnsafe'>,
  table: string,
  rows: object[],
) => {
  for (let i = 0; i < rows.length; i += 750)
    await upsertImportedRows(client, table, rows.slice(i, i + 750));
};

export async function importGameData() {
  const manifest = await readJson('manifest.json');
  for (const source of manifest.sources) {
    for (const [name, expected] of Object.entries(source.hashes)) {
      const bytes = await readFile(`data/supplemental/${name}`);
      if (createHash('sha256').update(bytes).digest('hex') !== expected)
        throw new Error(`Snapshot checksum mismatch: ${name}`);
    }
  }
  const snapshot = manifest.sources.find(
    (s: { repository: string }) => s.repository === 'Fortelle/pokemon-learnsets',
  );
  if (!snapshot || !/^[a-f0-9]{40}$/.test(snapshot.commit))
    throw new Error('Missing versioned learnset snapshot. Run pnpm run data:games.');
  const sourceId = `fortelle-${snapshot.commit.slice(0, 12)}`;
  const run = await db.dataImportRun.create({
    data: {
      source: 'Game learnsets and move parameters',
      commit: snapshot.commit,
      status: 'running',
    },
  });
  try {
    await db.rankingSource.upsert({
      where: { id: sourceId },
      create: {
        id: sourceId,
        name: 'Fortelle · learnsets por jogo e forma',
        url: `https://github.com/${snapshot.repository}/tree/${snapshot.commit}`,
        collectedAt: new Date(manifest.collectedAt),
        confidence: 'medium',
        license:
          'Dados factuais públicos; repositório sem licença explícita. Não concede direitos sobre ativos do jogo.',
      },
      update: {},
    });
    const zaSource = manifest.sources.find(
      (s: { repository: string }) => s.repository === 'projectpokemon/za-textport',
    );
    const zaSourceId = `za-textport-${zaSource.commit.slice(0, 12)}`;
    await db.rankingSource.upsert({
      where: { id: zaSourceId },
      create: {
        id: zaSourceId,
        name: 'Project Pokémon · parâmetros nativos de Z-A',
        url: `https://github.com/${zaSource.repository}/tree/${zaSource.commit}`,
        collectedAt: new Date(manifest.collectedAt),
        confidence: 'medium',
        license:
          'MIT para o repositório; fatos técnicos do jogo, sem redistribuição de arte ou texto editorial.',
      },
      update: {},
    });
    const [pokemon, forms] = await Promise.all([
      readCsv<RawPokemon>('pokemon'),
      readCsv<RawForm>('pokemon_forms'),
    ]);
    const formMap = createFormMap(pokemon, forms);
    const baseZA = new Set(
      (await readFile('data/supplemental/za-base-availability.txt', 'utf8'))
        .trim()
        .split(/\s+/)
        .filter((s) => s !== '0000.00')
        .map((s) => {
          const [species, form] = s.split('.');
          return `${Number(species)}:${Number(form)}`;
        }),
    );
    const baseZAForms = new Set(
      [...baseZA].map((key) => formMap.get(key)).filter((id): id is number => id !== undefined),
    );
    const baseMoveKeys = new Set<string>();
    for (const method of ['levelup', 'tm', 'oyabun', 'special']) {
      for (const key of parseBaseLearnsetKeys(
        await readFile(`data/supplemental/za-base-${method}.txt`, 'utf8'),
        method,
      ))
        baseMoveKeys.add(key);
    }
    const totals: Record<
      string,
      { species: number; forms: number; records: number; missingForms: string[] }
    > = {};
    // Sword already has a complete compatible-species learnset in PokéAPI. Keep its historical version/content metadata.
    for (const [gameId, file, expectedSpecies] of [
      ['arceus', 'legendsarceus', 242],
      ['za', 'legendsza', 364],
    ] as const) {
      const sourceRows: SourceLearnset[] = await readJson(`dist-${file}.json`);
      if (new Set(sourceRows.map((r) => r.pokemon)).size !== expectedSpecies)
        throw new Error(`Unexpected species coverage for ${gameId}`);
      const normalized = normalizeLearnsets(sourceRows, formMap, gameId, (species, form, move) =>
        gameId === 'za' && !baseMoveKeys.has(learnsetKey(species, form, move))
          ? 'mega-dimension'
          : 'base',
      );
      const knownBossRows = new Set(['59:2', '101:2', '549:2', '713:2', '900:1']);
      if (normalized.unmapped.some((key) => gameId !== 'arceus' || !knownBossRows.has(key)))
        throw new Error(`Unmapped forms in ${gameId}: ${normalized.unmapped.join(', ')}`);
      const records = normalized.records.map((r) => ({ ...r, sourceId }));
      const importedForms = [...new Set(records.map((r) => r.formId))];
      const importedSpecies = new Set(
        pokemon
          .filter((p: { id: string }) => importedForms.includes(+p.id))
          .map((p: { species_id: string }) => p.species_id),
      );
      if (importedSpecies.size !== expectedSpecies)
        throw new Error(`Missing mapped species in ${gameId}`);
      const knownMoves = new Set(
        (await db.move.findMany({ select: { id: true } })).map((m) => m.id),
      );
      if (records.some((r) => !knownMoves.has(r.moveId) && r.moveId !== 920))
        throw new Error('Unrecognized move ID');
      // Nihil Light is new to Z-A and is not present in the older PokéAPI snapshot.
      if (gameId === 'za')
        await db.move.upsert({
          where: { id: 920 },
          create: {
            id: 920,
            identifier: 'nihil-light',
            name: 'Nihil Light',
            typeId: 16,
            category: 'special',
          },
          update: {},
        });
      const oldAvailability = await db.pokemonGameAvailability.findMany({ where: { gameId } });
      const avail = importedForms.map((formId) => {
        const old = oldAvailability.find((a) => a.formId === formId);
        const content = gameId === 'za' && !baseZAForms.has(formId) ? 'mega-dimension' : 'base';
        return {
          formId,
          gameId,
          content,
          verified: true,
          minStage: old?.minStage ?? null,
          acquisition:
            old?.acquisition ??
            'Compatibilidade confirmada por lista nativa específica do jogo e da forma. Local de obtenção ainda não catalogado.',
          sourceId,
          checkedAt: new Date(manifest.collectedAt),
        };
      });
      const moveIds = [...new Set(records.map((r) => r.moveId))];
      // Atomic replacement for these two games. Saved user teams/builds are preserved.
      await db.$transaction(
        async (tx) => {
          await tx.pokemonLearnset.deleteMany({ where: { gameId } });
          await batch(tx, 'PokemonLearnset', records);
          await tx.pokemonGameAvailability.updateMany({
            where: { gameId, formId: { notIn: importedForms } },
            data: { verified: false },
          });
          await batch(tx, 'PokemonGameAvailability', avail);
          await tx.moveGameData.createMany({
            data: moveIds.map((moveId) => ({ moveId, gameId, verified: false, sourceId })),
            skipDuplicates: true,
          });
        },
        { timeout: 120000 },
      );
      totals[gameId] = {
        species: importedSpecies.size,
        forms: importedForms.length,
        records: records.length,
        missingForms: normalized.unmapped,
      };
    }
    const properties = parseZaMoveProperties(
      await readJson('za-personal-moves.json'),
      await readJson('za-move-timing.json'),
    );
    const existingMoveIds = new Set(
      (await db.move.findMany({ select: { id: true } })).map((m) => m.id),
    );
    const zaProperties: Prisma.MoveGameDataCreateManyInput[] = properties
      .filter((p) => existingMoveIds.has(p.moveId))
      .map((p) => ({ ...p, gameId: 'za', sourceId: zaSourceId }));
    await batch(db, 'MoveGameData', zaProperties);
    const plaSourceId = 'kaphotics-pla-moves-YyGpUYLc';
    await db.rankingSource.upsert({
      where: { id: plaSourceId },
      create: {
        id: plaSourceId,
        name: 'Kaphotics · parâmetros nativos de Legends Arceus',
        url: 'https://pastebin.com/YyGpUYLc',
        collectedAt: new Date(manifest.collectedAt),
        confidence: 'medium',
        license:
          'Referência factual publicada pelo pesquisador; sem licença explícita para texto editorial.',
      },
      update: {},
    });
    const plaProperties = parsePlaMoveProperties(
      await readFile('data/supplemental/pla-move-data.tsv', 'utf8'),
    );
    await batch(
      db,
      'MoveGameData',
      plaProperties.map((p) => ({ ...p, gameId: 'arceus', sourceId: plaSourceId })),
    );
    const counts = {
      arceusSpecies: totals.arceus.species,
      arceusForms: totals.arceus.forms,
      arceusLearnsets: totals.arceus.records,
      arceusMoveProperties: plaProperties.length,
      zaSpecies: totals.za.species,
      zaForms: totals.za.forms,
      zaLearnsets: totals.za.records,
      zaMoveProperties: zaProperties.length,
    };
    await db.dataImportRun.update({
      where: { id: run.id },
      data: { status: 'complete', finishedAt: new Date(), counts },
    });
    await writeFile(
      'docs/COBERTURA_JOGOS.json',
      JSON.stringify(
        {
          checkedAt: new Date().toISOString(),
          commit: snapshot.commit,
          totals,
          zaMoveProperties: zaProperties.length,
          arceusMoveProperties: plaProperties.length,
        },
        null,
        2,
      ),
    );
    console.log(JSON.stringify({ status: 'complete', ...counts }, null, 2));
    return counts;
  } catch (e) {
    await db.dataImportRun.update({
      where: { id: run.id },
      data: {
        status: 'failed',
        finishedAt: new Date(),
        error: e instanceof Error ? e.message : 'Import failed',
      },
    });
    throw e;
  }
}

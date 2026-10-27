import 'dotenv/config';
import { mkdir,writeFile } from 'node:fs/promises';
import { db } from '../src/lib/db';
async function main() {
  const counts = {
    species: await db.pokemonSpecies.count(),
    forms: await db.pokemonForm.count(),
    moves: await db.move.count(),
    learnsets: await db.pokemonLearnset.count(),
    sources: await db.rankingSource.count(),
  };
  const games = [];
  for (const gameId of ['sword', 'arceus', 'za']) {
    games.push({
      gameId,
      availableForms: await db.pokemonGameAvailability.count({ where: { gameId } }),
      learnsetRecords: await db.pokemonLearnset.count({ where: { gameId } }),
      knownCampaignStages: await db.pokemonGameAvailability.count({
        where: { gameId, minStage: { not: null } },
      }),
      verifiedMoveProperties: await db.moveGameData.count({ where: { gameId, verified: true } }),
      curatedItems: await db.itemGameAvailability.count({ where: { gameId } }),
    });
  }
  const checks = {
    noMegaInSword:
      (await db.pokemonGameAvailability.count({
        where: { gameId: 'sword', form: { kind: 'mega' } },
      })) === 0,
    noPPAsCooldown:
      (await db.moveGameData.count({ where: { gameId: 'za', pp: { not: null } } })) === 0,
    noArceusAbilities:
      (await db.pokemonAbilityAvailability.count({ where: { gameId: 'arceus' } })) === 0,
    noArceusHeldItems: (await db.itemGameAvailability.count({ where: { gameId: 'arceus' } })) === 0,
    noNonPositiveStats:
      (await db.pokemonStats.count({
        where: {
          OR: [
            { hp: { lte: 0 } },
            { attack: { lte: 0 } },
            { defense: { lte: 0 } },
            { specialAttack: { lte: 0 } },
            { specialDefense: { lte: 0 } },
            { speed: { lte: 0 } },
          ],
        },
      })) === 0,
  };
  await mkdir('docs', { recursive: true });
  await writeFile(
    'docs/VALIDACAO_DADOS.json',
    JSON.stringify({ checkedAt: new Date().toISOString(), counts, games, checks }, null, 2),
  );
  console.log(JSON.stringify({ counts, games, checks }, null, 2));
  await db.$disconnect();
  if (Object.values(checks).some((v) => !v)) process.exitCode = 1;
}
main().finally(() => db.$disconnect());

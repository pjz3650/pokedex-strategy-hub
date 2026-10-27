import 'dotenv/config';
import { db } from '../src/lib/db';
import { GAMES } from '../src/lib/games';
export async function seed() {
  for (const game of Object.values(GAMES)) {
    await db.game.upsert({
      where: { id: game.id },
      create: { id: game.id, name: game.name, region: game.region },
      update: { name: game.name, region: game.region },
    });
    for (const [order, name] of game.stages.entries())
      await db.campaignStage.upsert({
        where: { id: `${game.id}-${order}` },
        create: { id: `${game.id}-${order}`, gameId: game.id, name, order },
        update: { name },
      });
    await db.battleFormat.upsert({
      where: { id: `${game.id}-story` },
      create: {
        id: `${game.id}-story`,
        gameId: game.id,
        name: 'Campanha',
        mode: 'story',
        teamSize: 6,
        verified: true,
      },
      update: {},
    });
  }
  for (const [id, gameId, name] of [
    ['isle-of-armor', 'sword', 'The Isle of Armor'],
    ['crown-tundra', 'sword', 'The Crown Tundra'],
    ['mega-dimension', 'za', 'Mega Dimension'],
  ])
    await db.gameExpansion.upsert({ where: { id }, create: { id, gameId, name }, update: {} });
  const collectedAt = new Date('2026-10-16T21:00:00Z');
  for (const source of [
    {
      id: 'official-za',
      name: 'Pokémon · Z-A',
      url: 'https://legends.pokemon.com/en-us/story-world/pokemon',
      license: 'Referência factual; imagens e marcas pertencem aos titulares.',
    },
    {
      id: 'official-pla',
      name: 'Pokémon · Legends: Arceus',
      url: 'https://legends.arceus.pokemon.com/en-us/gameplay/',
      license: 'Referência factual.',
    },
    {
      id: 'official-sword',
      name: 'Pokémon · Sword/Shield',
      url: 'https://swordshield.pokemon.com/en-us/pokemon-galar-region/first-partner-pokemon/',
      license: 'Referência factual.',
    },
  ])
    await db.rankingSource.upsert({
      where: { id: source.id },
      create: { ...source, collectedAt, confidence: 'high' },
      update: { collectedAt },
    });
}
if (process.argv[1]?.replaceAll('\\', '/').endsWith('prisma/seed.ts'))
  seed().finally(() => db.$disconnect());

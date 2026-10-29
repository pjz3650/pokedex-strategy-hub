import 'dotenv/config';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { db } from '../src/lib/db';
import { canUse, recommendBuild } from '../src/lib/engine';
import {
  getCatalog,
  getDataCoverage,
  getDetail,
  getGameMovePool,
  getLegalMoves,
} from '../src/lib/repository';
import { rateLimit } from '../src/lib/security';
import { validateMembers } from '../src/lib/team-service';
import { memberSchema, registerSchema, teamSchema } from '../src/lib/validation';
import { getPokemonVisual } from '../src/lib/pokemon-visual';
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));
afterAll(() => db.$disconnect());
describe('Integração com PostgreSQL e snapshot importado', () => {
  it('configura visualmente todas as formas reais sem exceções por componente', async () => {
    const forms = await db.pokemonForm.findMany({
      include: { types: { include: { type: true } } },
    });
    expect(forms).toHaveLength(1351);
    for (const form of forms) {
      const visual = getPokemonVisual({
        ...form,
        types: form.types.map((entry) => entry.type.name),
      });
      expect(visual.japanese, form.identifier).toBeTruthy();
      expect(visual.style['--poke-color' as keyof React.CSSProperties], form.identifier).toMatch(
        /^#[a-f\d]{6}$/,
      );
      expect(
        Number(visual.style['--art-scale' as keyof React.CSSProperties]),
        form.identifier,
      ).toBeGreaterThan(0);
    }
  });
  it('registra importação concluída e commit', async () => {
    const run = await db.dataImportRun.findFirst({
      where: { status: 'complete' },
      orderBy: { finishedAt: 'desc' },
    });
    expect(run?.commit).toMatch(/^[a-f0-9]{40}$/);
  });
  it('mantém formas regionais separadas e sem atributos herdados', async () => {
    const [base, regional] = await Promise.all([
      db.pokemonForm.findUnique({
        where: { identifier: 'ninetales' },
        include: { stats: true, types: { include: { type: true } } },
      }),
      db.pokemonForm.findUnique({
        where: { identifier: 'ninetales-alola' },
        include: { stats: true, types: { include: { type: true } } },
      }),
    ]);
    expect(base?.id).not.toBe(regional?.id);
    expect(base?.stats?.attack).not.toBe(regional?.stats?.attack);
    expect(regional?.types.map((t) => t.type.name)).toContain('ice');
  });
  it('mantém Mega Charizard X com tipo e atributos próprios', async () => {
    const mega = await db.pokemonForm.findUnique({
      where: { identifier: 'charizard-mega-x' },
      include: { stats: true, types: { include: { type: true } } },
    });
    expect(mega?.stats?.attack).toBe(130);
    expect(mega?.types.map((t) => t.type.name)).toContain('dragon');
  });
  it('usa atributos históricos de Sword', async () => {
    const detail = await getDetail(488, 'sword');
    expect(detail?.pokemon.stats.defense).toBe(120);
    expect(detail?.pokemon.stats.specialDefense).toBe(130);
  });
  it('não reutiliza propriedades de Sword em Arceus', async () => {
    const moves = await getLegalMoves(25, 'arceus');
    expect(moves.length).toBeGreaterThan(0);
    const thunder = moves.find((m) => m.identifier === 'thunder');
    expect(thunder?.power).toBe(100);
    expect(thunder?.pp).toBe(5);
    expect(thunder?.sourceUrl).toContain('YyGpUYLc');
  });
  it('cobre todas as espécies e formas compatíveis com movimentos por jogo', async () => {
    const coverage = await getDataCoverage();
    expect(coverage.map((c) => c.species)).toEqual([664, 242, 364]);
    for (const entry of coverage) expect(entry.formsWithMoves).toBe(entry.forms);
  });
  it('gera builds reais para TODAS as formas disponíveis, sem importar movimentos de outro jogo', async () => {
    const catalog = await getCatalog();
    for (const game of ['sword', 'arceus', 'za'] as const) {
      const pool = await getGameMovePool(
        catalog.filter((p) => canUse(p, game)),
        game,
      );
      for (const entry of pool) {
        const build = recommendBuild(entry.pokemon, entry.moves, game);
        expect(build.moves.length, `${game}/${entry.pokemon.identifier}`).toBeGreaterThan(0);
        expect(build.moves.length).toBeLessThanOrEqual(4);
        expect(Number.isFinite(build.score)).toBe(true);
        expect(new Set(build.moves.map((m) => m.id)).size).toBe(build.moves.length);
        for (const move of build.moves) {
          expect(move.gameId).toBe(game);
          expect(entry.moves.some((m) => m.id === move.id)).toBe(true);
        }
      }
    }
  }, 180000);
  it('oferece movimentos e build ao Tyranitar e Mega Tyranitar em Z-A', async () => {
    for (const id of [248, 10049]) {
      const detail = await getDetail(id, 'za');
      expect(detail?.moves.length).toBeGreaterThan(50);
      expect(recommendBuild(detail!.pokemon, detail!.moves, 'za').moves).toHaveLength(4);
    }
    expect(
      (await getDetail(248, 'arceus'))?.pokemon.availability.some((a) => a.gameId === 'arceus'),
    ).toBe(false);
  });
  it('respeita categoria própria de Double Hit em Arceus', async () => {
    const move = await db.moveGameData.findUnique({
      where: { moveId_gameId: { moveId: 458, gameId: 'arceus' } },
    });
    expect(move?.category).toBe('status');
    expect(move?.power).toBeNull();
    expect(move?.pp).toBe(10);
  });
  it('separa DLC e exclui compatibilidade de TM sem item real em Z-A', async () => {
    const moves = await getLegalMoves(248, 'za');
    expect(
      moves.find((m) => m.id === 799)?.methods.every((m) => m.content === 'mega-dimension'),
    ).toBe(true);
    expect(moves.find((m) => m.id === 484)?.methods).toEqual([
      expect.objectContaining({ method: 'level-up', level: 53 }),
    ]);
  });
  it('mantém Core Enforcer na forma Complete de Zygarde', async () => {
    const complete = await getLegalMoves(10120, 'za');
    const tenPercent = await getLegalMoves(10181, 'za');
    expect(complete.find((m) => m.id === 687)?.methods.some((m) => m.method === 'special')).toBe(
      true,
    );
    expect(tenPercent.find((m) => m.id === 687)?.methods.some((m) => m.method === 'special')).toBe(
      false,
    );
  });
  it('mantém cooldown de Z-A separado de PP', async () => {
    const moves = await getLegalMoves(448, 'za');
    const aura = moves.find((m) => m.identifier === 'aura-sphere');
    expect(aura?.cooldown).toBe(8);
    expect(aura?.pp).toBeNull();
    expect(aura?.power).toBe(80);
  });
  it('recusa movimento que não está no learnset do jogo', async () => {
    await expect(validateMembers([{ formId: 448, moves: [1] }], 'za')).rejects.toThrow(/Movimento/);
  });
  it('recusa held items convencionais em Arceus', async () => {
    await expect(validateMembers([{ formId: 25, moves: [], itemId: 1 }], 'arceus')).rejects.toThrow(
      /held items/,
    );
  });
  it('recusa Mega Stones sem disponibilidade verificada', async () => {
    await expect(validateMembers([{ formId: 448, moves: [], itemId: 752 }], 'za')).rejects.toThrow(
      /Item/,
    );
  });
  it('recusa habilidades em jogos que não usam a mecânica', async () => {
    await expect(
      validateMembers([{ formId: 25, moves: [], abilityId: 9 }], 'arceus'),
    ).rejects.toThrow(/Habilidades/);
  });
  it('recusa forma temporária como integrante permanente', async () => {
    const form = await db.pokemonForm.findUnique({ where: { identifier: 'charizard-mega-x' } });
    await expect(validateMembers([{ formId: form!.id, moves: [] }], 'za')).rejects.toThrow(
      /forma permanente/,
    );
  });
  it('implementa rate limiting atômico e persistente', async () => {
    const key = `test-${Date.now()}`;
    await rateLimit('tests', key, 1, 1000);
    await expect(rateLimit('tests', key, 1, 1000)).rejects.toThrow(/Muitas tentativas/);
  });
  it('valida limites de equipes e cadastro no servidor', () => {
    expect(teamSchema.safeParse({ name: 'x', gameId: 'arceus', members: [] }).success).toBe(false);
    expect(memberSchema.safeParse({ formId: 25, moves: [1, 1] }).success).toBe(false);
    expect(registerSchema.safeParse({ name: 'A', email: 'bad', password: '123' }).success).toBe(
      false,
    );
  });
  it('não marca Mega Charizard como disponível em Sword', async () => {
    const catalog = await getCatalog();
    const mega = catalog.find((p) => p.identifier === 'charizard-mega-x');
    expect(mega?.availability.some((a) => a.gameId === 'sword')).toBe(false);
  });
});

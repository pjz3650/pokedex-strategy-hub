import { describe, expect, it } from 'vitest';
import type { LegalMove, Pokemon } from '../src/lib/contracts';
import { diagnoseGeneration, generationConflicts } from '../src/lib/generation-ux';
import { catalogReturn, parseCatalogParams } from '../src/lib/catalog-url';
const p = {
  id: 448,
  name: 'Lucario',
  kind: 'base',
  availability: [{ gameId: 'sword', verified: true, minStage: null, content: 'base' }],
} as Pokemon;
const move = { gameId: 'sword', methods: [{ content: 'base', minStage: null }] } as LegalMove;
const criteria = { stage: 0, dlc: false, ignoreProgress: false, required: [], banned: [], size: 6 };
describe('Diagnóstico derivado dos dados', () => {
  it('explica dados desconhecidos sem prometer obtenção', () => {
    expect(diagnoseGeneration([{ pokemon: p, moves: [move] }], 'sword', criteria)).toMatchObject({
      code: 'UNKNOWN_PROGRESS',
      available: 0,
      withMoves: 0,
      withoutProgress: 1,
    });
  });
  it('não atribui exclusão voluntária a falta de etapas', () => {
    expect(
      diagnoseGeneration([{ pokemon: p, moves: [move] }], 'sword', { ...criteria, banned: [448] }),
    ).toMatchObject({ code: 'GENERATION_FILTERS', withMoves: 0, withoutProgress: 0 });
  });
  it('aceita dados futuros completos sem diagnóstico fixo', () => {
    const known = { ...p, availability: p.availability.map((a) => ({ ...a, minStage: 0 })) };
    const knownMove = { ...move, methods: move.methods.map((m) => ({ ...m, minStage: 0 })) };
    expect(
      diagnoseGeneration([{ pokemon: known, moves: [knownMove] }], 'sword', criteria).withMoves,
    ).toBe(1);
  });
  it('não chama uma obtenção conhecida posterior de lacuna de dados', () => {
    const late = { ...p, availability: p.availability.map((a) => ({ ...a, minStage: 3 })) };
    expect(diagnoseGeneration([{ pokemon: late, moves: [move] }], 'sword', criteria).code).toBe(
      'GENERATION_FILTERS',
    );
  });
  it('mostra obrigatório/tamanho, DLC, progresso e overlap sem apagar chips', () => {
    expect(
      generationConflicts([p], 'sword', { ...criteria, size: 1, required: [448, 25] }),
    ).toHaveLength(3);
    expect(
      generationConflicts([p], 'sword', { ...criteria, required: [448] })[0].message,
    ).toContain('desconhecida');
    expect(
      generationConflicts([p], 'sword', { ...criteria, required: [448], banned: [448] })[0].message,
    ).toContain('proibidos');
    expect(
      generationConflicts([{ ...p, kind: 'regional' }], 'sword', {
        ...criteria,
        ignoreProgress: true,
        required: [448],
      }),
    ).toEqual([]);
    expect(
      generationConflicts([{ ...p, kind: 'mega' }], 'sword', {
        ...criteria,
        ignoreProgress: true,
        required: [448],
      })[0].message,
    ).toContain('temporária');
  });
});
describe('Origem local e parâmetros públicos', () => {
  it('recusa origens externas, esquemas executáveis e rotas inesperadas', () => {
    for (const url of [
      'https://evil.test/pokedex',
      '//evil.test/favoritos',
      'javascript:alert(1)',
      '/perfil?token=secret',
    ])
      expect(catalogReturn(url)).toBe('/pokedex');
  });
  it('valida enums e paginação e remove parâmetros inesperados', () => {
    expect(
      parseCatalogParams(new URLSearchParams('page=-4&sort=bad&type=bad&game=red')),
    ).toMatchObject({ page: 1, sort: 'dex', type: '', game: undefined });
    expect(catalogReturn('/favoritos?game=za&page=2&q=Luc&secret=x')).toContain('/favoritos?');
    expect(catalogReturn('/favoritos?secret=x')).not.toContain('secret');
  });
});

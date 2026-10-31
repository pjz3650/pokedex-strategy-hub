import { describe, expect, it } from 'vitest';
import {
  ApiError,
  changeDraft,
  changeSlot,
  compactSlots,
  criteriaSignature,
  emptyStore,
  exportDraft,
  matchesPokemon,
  newDraft,
  parseDraftStore,
  parseTeamImport,
  reconcileStore,
  savedStage,
  sessionFailure,
  toSlots,
} from '../src/lib/ux-state';
describe('Estado e propriedade do rascunho', () => {
  it('distingue 401 de falhas transitórias e de autorização', () => {
    expect(sessionFailure(new ApiError('login', 401))).toBe('visitor');
    for (const status of [403, 429, 500, 503, null])
      expect(sessionFailure(new ApiError('falha', status))).toBe('unavailable');
  });
  it('migra membros legados sem associar uma conta', () => {
    const store = parseDraftStore(
      JSON.stringify({ game: 'za', members: [{ formId: 448, moves: [1, 2] }] }),
    );
    expect(store.owner).toBeNull();
    expect(store.drafts.za?.members[0].moves).toEqual([1, 2]);
    expect(store.drafts.za?.dirty).toBe(true);
  });
  it('valida storage corrompido e envelopes incompatíveis', () => {
    for (const input of [
      '{',
      '{"version":9}',
      '{"game":"sword","members":[{"formId":1,"moves":[1,1]}]}',
    ])
      expect(() => parseDraftStore(input)).toThrow();
  });
  it('conserva jogos e detecta baseline sem perder nome', () => {
    const sword = changeDraft(newDraft('sword'), {
      name: 'Teste',
      members: [{ formId: 448, moves: [1] }],
    });
    const store = { ...emptyStore(), drafts: { sword, arceus: newDraft('arceus') } };
    const restored = parseDraftStore(JSON.stringify(store));
    expect(restored.drafts.sword).toEqual(sword);
    expect(
      changeDraft(sword, { baseline: { name: sword.name, members: sword.members } }).dirty,
    ).toBe(false);
  });
  it('só restaura identidade de edição com proprietário validado', () => {
    const draft = changeDraft(newDraft('sword'), { editTeamId: 'team', name: 'Privada' });
    const store = { ...emptyStore('a'), drafts: { sword: draft } };
    expect(
      reconcileStore(store, 'a', [{ id: 'team', gameId: 'sword' }]).drafts.sword?.editTeamId,
    ).toBe('team');
    expect(reconcileStore(store, 'a', []).drafts.sword?.editTeamId).toBeNull();
    expect(reconcileStore(store, 'b', []).drafts).toEqual({});
    expect(
      reconcileStore({ ...store, owner: null }, 'a', [{ id: 'team', gameId: 'sword' }]).drafts.sword
        ?.editTeamId,
    ).toBeNull();
  });
});
describe('Contratos de edição e consulta', () => {
  it('slots vazios não se deslocam e serializam na ordem visível', () => {
    let slots = changeSlot(toSlots([]), 3, 4);
    expect(slots).toEqual([null, null, null, 4]);
    slots = changeSlot(changeSlot(slots, 1, 2), 2, 3);
    slots = changeSlot(slots, 1, null);
    expect(slots).toEqual([null, null, 3, 4]);
    expect(compactSlots(slots)).toEqual([3, 4]);
    expect(changeSlot(slots, 0, 4)).toEqual(slots);
  });
  it('normaliza nomes e números sem traduzir o catálogo', () => {
    for (const q of ['Luc', 'lUc', ' Lucário ', '#0448', '00448'])
      expect(matchesPokemon({ name: 'Lucario', speciesId: 448 }, q)).toBe(true);
  });
  it('importa exportação v1 e recusa vazio, versão desconhecida e nome inválido', () => {
    const d = changeDraft(newDraft('sword'), {
      name: 'Teste',
      members: [{ formId: 1, moves: [3, 2] }],
    });
    expect(parseTeamImport(exportDraft(d)).members).toEqual(d.members);
    for (const patch of [{ version: 2 }, { name: '' }, { members: [] }, { gameId: 'red' }])
      expect(() =>
        parseTeamImport(JSON.stringify({ ...JSON.parse(exportDraft(d)), ...patch })),
      ).toThrow();
    expect(() => parseTeamImport('{')).toThrow('JSON inválido');
    expect(() => parseTeamImport('é'.repeat(33000))).toThrow('64 KB');
  });
  it('assinatura inclui todos os critérios e independe da ordem dos chips', () => {
    expect(criteriaSignature({ size: 1, banned: [2, 1] })).toBe(
      criteriaSignature({ banned: [1, 2], size: 1 }),
    );
    expect(criteriaSignature({ size: 1 })).not.toBe(criteriaSignature({ size: 6 }));
  });
  it('não aplica a etapa legada de outro jogo', () => {
    expect(savedStage({ game: 'sword', stage: 2, stages: { za: 3 } }, 'za')).toBe(3);
    expect(savedStage({ game: 'sword', stage: 2 }, 'arceus')).toBe(0);
    expect(savedStage({ game: 'sword', stage: 9 }, 'sword')).toBe(0);
  });
});

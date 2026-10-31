import { z } from 'zod';
import type { GameId, Member, Pokemon } from './contracts';
import { GAME_IDS } from './contracts';
import { gameSchema, memberSchema, teamSchema } from './validation';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number | null,
    public code = 'REQUEST_FAILED',
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
export type SessionStatus = 'loading' | 'authenticated' | 'visitor' | 'unavailable';
export function sessionFailure(error: unknown): SessionStatus {
  return error instanceof ApiError && error.status === 401 ? 'visitor' : 'unavailable';
}
export const DEFAULT_TEAM_NAME = 'Minha nova equipe';
const baselineSchema = z.object({
  name: z.string().max(80),
  members: z.array(memberSchema).max(6),
});
export const draftSchema = baselineSchema.extend({
  version: z.literal(2),
  gameId: gameSchema,
  editTeamId: z.string().nullable(),
  baseline: baselineSchema,
  dirty: z.boolean(),
});
export type TeamDraft = {
  version: 2;
  gameId: GameId;
  name: string;
  members: Member[];
  editTeamId: string | null;
  baseline: { name: string; members: Member[] };
  dirty: boolean;
};
export type BuildDraft = {
  name: string;
  member: Member | null;
  style: 'balanced' | 'offensive' | 'defensive' | 'support';
  buildId?: string;
};
const buildDraftSchema = z.object({
  name: z.string().max(80),
  member: memberSchema.nullable(),
  style: z.enum(['balanced', 'offensive', 'defensive', 'support']),
  buildId: z.string().optional(),
});
const storeSchema = z.object({
  version: z.literal(2),
  owner: z.string().nullable(),
  drafts: z.partialRecord(gameSchema, draftSchema).default({}),
  builds: z.record(z.string(), buildDraftSchema).default({}),
});
export type DraftStore = {
  version: 2;
  owner: string | null;
  drafts: Partial<Record<GameId, TeamDraft>>;
  builds: Record<string, BuildDraft>;
};
export function emptyStore(owner: string | null = null): DraftStore {
  return { version: 2, owner, drafts: {}, builds: {} };
}
export function newDraft(gameId: GameId): TeamDraft {
  return {
    version: 2,
    gameId,
    name: DEFAULT_TEAM_NAME,
    members: [],
    editTeamId: null,
    baseline: { name: DEFAULT_TEAM_NAME, members: [] },
    dirty: false,
  };
}
export function changeDraft(
  draft: TeamDraft,
  patch: Partial<Pick<TeamDraft, 'name' | 'members' | 'editTeamId' | 'baseline'>>,
): TeamDraft {
  const next = { ...draft, ...patch };
  return {
    ...next,
    dirty:
      JSON.stringify([next.name, next.members]) !==
      JSON.stringify([next.baseline.name, next.baseline.members]),
  };
}
export function parseDraftStore(raw: string | null): DraftStore {
  if (!raw) return emptyStore();
  const value: unknown = JSON.parse(raw);
  const current = storeSchema.safeParse(value);
  if (current.success) {
    for (const game of GAME_IDS) {
      const draft = current.data.drafts[game];
      if (draft?.gameId !== game) delete current.data.drafts[game];
      else if (draft)
        current.data.drafts[game] = changeDraft(draft, {
          editTeamId: current.data.owner ? draft.editTeamId : null,
        }) as typeof draft;
    }
    return current.data;
  }
  const legacy = z.object({ game: gameSchema, members: z.array(memberSchema).max(6) }).parse(value);
  return {
    ...emptyStore(),
    drafts: { [legacy.game]: changeDraft(newDraft(legacy.game), { members: legacy.members }) },
  };
}
export function reconcileStore(
  store: DraftStore,
  owner: string,
  teams: { id: string; gameId: GameId }[],
): DraftStore {
  if (store.owner && store.owner !== owner) return emptyStore(owner);
  const drafts = { ...store.drafts };
  for (const game of GAME_IDS) {
    const d = drafts[game];
    if (
      d?.editTeamId &&
      (!store.owner || !teams.some((t) => t.id === d.editTeamId && t.gameId === game))
    )
      drafts[game] = changeDraft(d, { editTeamId: null });
  }
  return { ...store, owner, drafts };
}
export function normalizeSearch(value: string) {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
export function matchesPokemon(p: Pick<Pokemon, 'name' | 'speciesId'>, query: string) {
  const q = normalizeSearch(query);
  return (
    !q ||
    normalizeSearch(p.name).includes(q) ||
    (/^#?\d+$/.test(q) && Number(q.replace('#', '')) === p.speciesId)
  );
}
export function isPermanent(p: Pick<Pokemon, 'kind'>) {
  return !['mega', 'battle', 'gigantamax'].includes(p.kind);
}
export type MoveSlots = (number | null)[];
export function toSlots(moves: number[]): MoveSlots {
  return Array.from({ length: 4 }, (_, i) => moves[i] ?? null);
}
export function compactSlots(slots: MoveSlots) {
  return slots.filter((m): m is number => m !== null);
}
export function changeSlot(slots: MoveSlots, index: number, value: number | null): MoveSlots {
  if (
    index < 0 ||
    index > 3 ||
    (value !== null && slots.some((v, i) => v === value && i !== index))
  )
    return slots;
  return slots.map((v, i) => (i === index ? value : v));
}
export function parseTeamImport(text: string) {
  if (new TextEncoder().encode(text).length > 64000) throw new Error('Arquivo maior que 64 KB.');
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('JSON inválido. Confira aspas, vírgulas e chaves e tente novamente.');
  }
  const parsed = teamSchema.extend({ version: z.literal(1) }).safeParse(value);
  if (!parsed.success)
    throw new Error(
      'Use uma exportação versão 1: jogo válido, nome de 2 a 80 caracteres e de 1 a 6 integrantes, com até 4 movimentos únicos cada.',
    );
  return parsed.data;
}
export function exportDraft(draft: TeamDraft) {
  return JSON.stringify(
    { version: 1, name: draft.name, gameId: draft.gameId, members: draft.members },
    null,
    2,
  );
}
export function criteriaSignature(value: Record<string, unknown>) {
  return JSON.stringify(
    Object.keys(value)
      .sort()
      .map((k) => [
        k,
        Array.isArray(value[k]) ? [...(value[k] as number[])].sort((a, b) => a - b) : value[k],
      ]),
  );
}
export function savedStage(
  preferences:
    { game?: GameId; stage?: number; stages?: Partial<Record<GameId, number>> } | undefined,
  game: GameId,
) {
  const stage =
    preferences?.stages?.[game] ?? (preferences?.game === game ? preferences.stage : 0) ?? 0;
  return Number.isInteger(stage) && stage >= 0 && stage <= 3 ? stage : 0;
}

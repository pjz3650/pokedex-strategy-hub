import type { GameId, LegalMove, Pokemon } from './contracts';
import { availableAt, canUse } from './engine';
import { isPermanent } from './ux-state';
type Criteria = {
  stage: number;
  dlc: boolean;
  ignoreProgress: boolean;
  required: number[];
  banned: number[];
  size: number;
};
export function generationConflicts(catalog: Pokemon[], game: GameId, criteria: Criteria) {
  const conflicts: { id?: number; message: string }[] = [];
  if (criteria.required.length > criteria.size)
    conflicts.push({
      message: `${criteria.required.length} obrigatórios para ${criteria.size} vaga${criteria.size === 1 ? '' : 's'}.`,
    });
  for (const id of criteria.required) {
    const p = catalog.find((p) => p.id === id);
    const a = p?.availability.find((a) => a.gameId === game);
    const reason = criteria.banned.includes(id)
      ? 'também está nos proibidos'
      : !p || !canUse(p, game)
        ? 'não tem disponibilidade verificada neste jogo'
        : !isPermanent(p)
          ? 'é uma transformação temporária'
          : !criteria.dlc && a?.content !== 'base'
            ? 'exige conteúdo de DLC'
            : !criteria.ignoreProgress && a?.minStage == null
              ? 'tem etapa de obtenção desconhecida'
              : !criteria.ignoreProgress && a && a.minStage! > criteria.stage
                ? 'tem obtenção registrada após a etapa escolhida'
                : null;
    if (reason) conflicts.push({ id, message: `${p?.name ?? '#' + id}: ${reason}.` });
  }
  return conflicts;
}
export function diagnoseGeneration(
  pool: { pokemon: Pokemon; moves: LegalMove[] }[],
  game: GameId,
  criteria: Criteria,
) {
  const permanent = pool.filter(
    (m) =>
      canUse(m.pokemon, game) && isPermanent(m.pokemon) && !criteria.banned.includes(m.pokemon.id),
  );
  const available = permanent.filter((m) =>
    availableAt(
      m.pokemon.availability.find((a) => a.gameId === game),
      criteria.stage,
      criteria.dlc,
      criteria.ignoreProgress,
    ),
  );
  const movesEligible = (moves: LegalMove[], ignoreProgress: boolean) =>
    moves.some(
      (m) =>
        m.gameId === game &&
        (game !== 'za' || m.verified) &&
        m.methods.some(
          (method) =>
            (criteria.dlc || method.content === 'base') &&
            (ignoreProgress || (method.minStage !== null && method.minStage <= criteria.stage)),
        ),
    );
  const withMoves = available.filter((m) => movesEligible(m.moves, criteria.ignoreProgress));
  const withoutProgress = permanent.filter(
    (m) =>
      availableAt(
        m.pokemon.availability.find((a) => a.gameId === game),
        criteria.stage,
        criteria.dlc,
        true,
      ) && movesEligible(m.moves, true),
  );
  const unknownProgress =
    !criteria.ignoreProgress &&
    withMoves.length === 0 &&
    withoutProgress.length > 0 &&
    withoutProgress.some((m) => {
      const a = m.pokemon.availability.find((a) => a.gameId === game);
      // A known later encounter is a criterion conflict, not missing progress data.
      if (!a || (a.minStage !== null && a.minStage > criteria.stage)) return false;
      return m.moves.some(
        (move) =>
          move.gameId === game &&
          (game !== 'za' || move.verified) &&
          move.methods.some(
            (method) =>
              (criteria.dlc || method.content === 'base') &&
              (method.minStage === null || method.minStage <= criteria.stage) &&
              (a.minStage === null || method.minStage === null),
          ),
      );
    });
  return {
    code: unknownProgress ? 'UNKNOWN_PROGRESS' : 'GENERATION_FILTERS',
    available: available.length,
    withMoves: withMoves.length,
    withoutProgress: withoutProgress.length,
    required: criteria.required
      .filter((id) => !withMoves.some((m) => m.pokemon.id === id))
      .map((id) => ({
        id,
        reason:
          generationConflicts(
            pool.map((m) => m.pokemon),
            game,
            { ...criteria, required: [id] },
          ).find((c) => c.id === id)?.message ??
          'Não há movimentos elegíveis com evidência suficiente para o obrigatório.',
      })),
  };
}

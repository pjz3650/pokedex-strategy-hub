import type { GameId,Member } from './contracts';
import { db } from './db';
import { analyzeTeam,canUse } from './engine';
import { GAMES } from './games';
import { forGame,getCatalog,getLegalMoves } from './repository';
import { HttpError } from './security';
export async function validateMembers(members: Member[], game: GameId) {
  const catalog = await getCatalog();
  const result = [];
  for (const member of members) {
    const entry = catalog.find((p) => p.id === member.formId);
    if (!entry || !canUse(entry, game))
      throw new HttpError(400, 'Pokémon ou forma indisponível neste jogo.');
    const pokemon = forGame(entry, game);
    if (['mega', 'gigantamax', 'battle'].includes(pokemon.kind))
      throw new HttpError(
        400,
        'Adicione a forma permanente à equipe. A transformação exige configuração e item verificados, ainda não catalogados.',
      );
    const legal = await getLegalMoves(member.formId, game);
    if (member.moves.some((id) => !legal.some((m) => m.id === id)))
      throw new HttpError(
        400,
        `Movimento sem learnset verificado para ${pokemon.name} neste jogo.`,
      );
    let ability: string | undefined;
    if (member.itemId) {
      if (!GAMES[game].heldItems)
        throw new HttpError(400, 'Este jogo não aceita held items convencionais.');
      const item = await db.itemGameAvailability.findUnique({
        where: { itemId_gameId: { itemId: member.itemId, gameId: game } },
      });
      if (!item) throw new HttpError(400, 'Item sem disponibilidade verificada neste jogo.');
    }
    if (member.abilityId) {
      if (!GAMES[game].abilities)
        throw new HttpError(400, 'Habilidades não são aplicáveis neste jogo.');
      const row = await db.pokemonAbilityAvailability.findUnique({
        where: {
          formId_gameId_abilityId: {
            formId: member.formId,
            gameId: game,
            abilityId: member.abilityId,
          },
        },
        include: { ability: true },
      });
      if (!row) throw new HttpError(400, 'Habilidade incompatível.');
      ability = row.ability.name;
    }
    result.push({ pokemon, moves: legal.filter((m) => member.moves.includes(m.id)), ability });
  }
  return { members: result, analysis: analyzeTeam(result, game) };
}

import type { GameId } from './contracts';
export type GameRules = {
  id: GameId;
  name: string;
  short: string;
  region: string;
  color: string;
  competitive: boolean;
  heldItems: boolean;
  abilities: boolean;
  resource: 'pp' | 'cooldown';
  stab: number;
  doubleWeakness: number;
  doubleResistance: number;
  mechanic: string;
  note: string;
  stages: string[];
};
export const GAMES: Record<GameId, GameRules> = {
  sword: {
    id: 'sword',
    name: 'Pokémon Sword',
    short: 'Sword',
    region: 'Galar',
    color: '#5fa9ff',
    competitive: true,
    heldItems: true,
    abilities: true,
    resource: 'pp',
    stab: 1.5,
    doubleWeakness: 4,
    doubleResistance: 0.25,
    mechanic: 'Dynamax · Gigantamax',
    note: 'Turnos tradicionais. Compatibilidade de Sword/Shield; obtenção nativa, troca e transferência ainda não totalmente discriminadas. Formatos históricos exigem regulamento verificado.',
    stages: ['Início da jornada', 'Campanha intermediária', 'Reta final', 'Pós-jogo'],
  },
  arceus: {
    id: 'arceus',
    name: 'Pokémon Legends: Arceus',
    short: 'Legends: Arceus',
    region: 'Hisui',
    color: '#ac9ae7',
    competitive: false,
    heldItems: false,
    abilities: false,
    resource: 'pp',
    stab: 1.25,
    doubleWeakness: 2.5,
    doubleResistance: 0.4,
    mechanic: 'Agile Style · Strong Style',
    note: 'Análise de campanha. Sem competitivo online oficial, habilidades ou held items convencionais. Atributos exibidos são base; ordem de ações e Effort Levels não são simulados.',
    stages: ['Primeiras expedições', 'Exploração intermediária', 'Últimas regiões', 'Pós-jogo'],
  },
  za: {
    id: 'za',
    name: 'Pokémon Legends: Z-A',
    short: 'Legends: Z-A',
    region: 'Kalos',
    color: '#c6ed7a',
    competitive: true,
    heldItems: true,
    abilities: false,
    resource: 'cooldown',
    stab: 1.5,
    doubleWeakness: 4,
    doubleResistance: 0.25,
    mechanic: 'Tempo real · Mega Evolução',
    note: 'Combate em tempo real. Cooldown e alcance exigem dados próprios. Há Ranked Battles; temporadas não verificadas não são liberadas no motor. Conteúdo de Mega Dimension identificado separadamente.',
    stages: ['Chegada a Lumiose', 'Avanço no Z-A Royale', 'Reta final', 'Pós-jogo'],
  },
};
export function isGame(value: unknown): value is GameId {
  return typeof value === 'string' && value in GAMES;
}

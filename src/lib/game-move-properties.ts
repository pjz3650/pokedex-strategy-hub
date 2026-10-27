/** Project Pokémon's real-time Z-A battle tables, not the legacy turn-based table. */
export type GameMoveProperties = {
  moveId: number;
  typeName: string;
  category: string;
  power: number | null;
  cooldown: number | null;
  accuracy: number | null;
  pp: number | null;
  priority: null;
  range: string | null;
  area: null;
  verified: true;
};

type Row = Record<string, unknown>;
const GAME_TYPES = [
  'normal',
  'fighting',
  'flying',
  'poison',
  'ground',
  'rock',
  'bug',
  'ghost',
  'steel',
  'fire',
  'water',
  'grass',
  'electric',
  'psychic',
  'ice',
  'dragon',
  'dark',
  'fairy',
];
const GAME_CATEGORIES = ['status', 'physical', 'special'];

function record(value: unknown, label: string): Row {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${label}: esperado um objeto`);
  }
  return value as Row;
}

function tableRows(input: unknown, label: string): Row[] {
  const table = record(input, label).Table;
  if (!Array.isArray(table)) throw new Error(`${label}: Table ausente`);
  return table.flatMap((entry, index) => {
    const children = record(entry, `${label}[${index}]`).Table;
    if (!Array.isArray(children)) throw new Error(`${label}[${index}]: Table ausente`);
    return children.map((row) => record(row, `${label}[${index}].Table`));
  });
}

function numberIn(value: unknown, min: number, max: number, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${label}: número fora do intervalo ${min}–${max}`);
  }
  return value;
}

function integerIn(value: unknown, min: number, max: number, label: string): number {
  const number = numberIn(value, min, max, label);
  if (!Number.isInteger(number)) throw new Error(`${label}: inteiro esperado`);
  return number;
}

/**
 * WazaID uses the official move number, also used by PokéAPI. ID 920 (Nihil Light)
 * is newer than some PokéAPI snapshots and must be added to their move dictionary.
 * ExtentionType 0 is the normal variant. Timing IDs with offsets are left out.
 * HitPer is deliberately not exposed as traditional turn-based accuracy. Range
 * and area remain unknown because the raw targeting fields need interpretation.
 */
export function parseZaMoveProperties(
  battleInput: unknown,
  timingInput: unknown,
): GameMoveProperties[] {
  const timing = new Map<number, number>();
  for (const row of tableRows(timingInput, 'waza_param_array')) {
    const id = integerIn(row.WazaId, 0, 65535, 'WazaId');
    if (id === 0 || id >= 1000) continue;
    const cooldown = numberIn(row.WazaRecastTime, 0, 60, `WazaRecastTime ${id}`);
    const previous = timing.get(id);
    if (previous !== undefined && previous !== cooldown) {
      throw new Error(`Cooldown ambíguo para o movimento ${id}`);
    }
    timing.set(id, cooldown);
  }

  const results = new Map<number, GameMoveProperties>();
  for (const row of tableRows(battleInput, 'personal_waza_param_array')) {
    const variant = integerIn(row.ExtentionType, 0, 2, 'ExtentionType');
    if (variant !== 0) continue;
    const moveId = integerIn(row.WazaID, 0, 999, 'WazaID');
    if (moveId === 0) continue;
    const power = integerIn(row.Power, 0, 255, `Power ${moveId}`);
    const result: GameMoveProperties = {
      moveId,
      typeName: GAME_TYPES[integerIn(row.Type, 0, 17, `Type ${moveId}`)],
      category: GAME_CATEGORIES[integerIn(row.DamageType, 0, 2, `DamageType ${moveId}`)],
      power: power === 0 ? null : power,
      cooldown: timing.get(moveId) ?? null,
      accuracy: null,
      pp: null,
      priority: null,
      range: null,
      area: null,
      verified: true,
    };
    const previous = results.get(moveId);
    if (previous && previous.power !== result.power) {
      throw new Error(`Poder ambíguo para o movimento ${moveId}`);
    }
    results.set(moveId, result);
  }
  return [...results.values()].sort((a, b) => a.moveId - b.moveId);
}

/**
 * Kaphotics' PLA Move Data TSV (https://pastebin.com/YyGpUYLc), standard style.
 * CanUseMove is required: unused legacy rows retain other games' values.
 * The 101 accuracy sentinel does not describe a 101% accuracy roll and remains
 * null in the present DTO. FPriority is legacy data, not PLA action order, so
 * it is deliberately not imported. Agile/strong properties need their own DTO.
 */
export function parsePlaMoveProperties(tsv: string): GameMoveProperties[] {
  const lines = tsv
    .replace(/^\uFEFF/, '')
    .trimEnd()
    .split(/\r?\n/);
  const headers = lines.shift()?.split('\t') ?? [];
  const required = [
    'Index',
    'MoveID',
    'CanUseMove',
    'FPower',
    'FAccuracy',
    'FPP',
    'FCategory',
    'FType',
  ];
  if (
    required.some((header) => !headers.includes(header)) ||
    new Set(headers).size !== headers.length
  ) {
    throw new Error('PLA: cabeçalhos TSV ausentes ou repetidos');
  }
  const results = new Map<number, GameMoveProperties>();
  for (const [lineIndex, line] of lines.entries()) {
    if (!line.trim()) continue;
    const values = line.split('\t');
    if (values.length !== headers.length)
      throw new Error(`PLA: colunas inválidas na linha ${lineIndex + 2}`);
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index]]));
    if (!['True', 'False'].includes(row.CanUseMove)) throw new Error('PLA: CanUseMove inválido');
    if (row.CanUseMove !== 'True') continue;
    const readInteger = (key: string, min: number, max: number) => {
      if (!/^-?\d+$/.test(row[key])) throw new Error(`PLA: ${key} inválido`);
      return integerIn(Number(row[key]), min, max, `PLA ${key}`);
    };
    const moveId = readInteger('Index', 1, 999);
    if (readInteger('MoveID', 1, 999) !== moveId)
      throw new Error('PLA: Index e MoveID divergentes');
    const power = readInteger('FPower', 0, 255);
    const accuracy = readInteger('FAccuracy', 0, 101);
    const pp = readInteger('FPP', 1, 64);
    if (results.has(moveId)) throw new Error(`PLA: movimento repetido ${moveId}`);
    results.set(moveId, {
      moveId,
      typeName: GAME_TYPES[readInteger('FType', 0, 17)],
      category: GAME_CATEGORIES[readInteger('FCategory', 0, 2)],
      power: power === 0 ? null : power,
      accuracy: accuracy === 101 ? null : accuracy,
      pp,
      cooldown: null,
      priority: null,
      range: null,
      area: null,
      verified: true,
    });
  }
  if (!results.size) throw new Error('PLA: nenhum movimento habilitado na tabela');
  return [...results.values()].sort((a, b) => a.moveId - b.moveId);
}

import type { PrismaClient } from '@prisma/client';
const TABLE_KEYS: Record<string, string[]> = {
  PokemonSpecies: ['id'],
  PokemonForm: ['id'],
  PokemonStats: ['formId'],
  PokemonGameStats: ['formId', 'gameId'],
  Type: ['id'],
  PokemonType: ['formId', 'slot'],
  GameVersion: ['id'],
  Move: ['id'],
  PokemonLearnset: ['formId', 'moveId', 'versionGroup', 'method', 'level'],
  PokemonGameAvailability: ['formId', 'gameId'],
  MoveGameData: ['moveId', 'gameId'],
  Ability: ['id'],
  PokemonAbilityAvailability: ['formId', 'gameId', 'abilityId'],
  Item: ['id'],
};
/** Only internal allowlisted identifiers enter SQL; row values are a single bound JSON parameter. */
export async function upsertImportedRows(
  db: Pick<PrismaClient, '$executeRawUnsafe'>,
  table: keyof typeof TABLE_KEYS,
  rows: object[],
) {
  if (!rows.length) return;
  const keys = TABLE_KEYS[table];
  if (!keys) throw new Error('Import table not allowed');
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  if (columns.some((c) => !/^\w+$/.test(c))) throw new Error('Invalid import column');
  const quote = (name: string) => `"${name}"`;
  const quoted = columns.map(quote).join(',');
  const update = columns
    .filter((c) => !keys.includes(c))
    .map((c) => `${quote(c)}=EXCLUDED.${quote(c)}`)
    .join(',');
  const sql = `INSERT INTO ${quote(table)} (${quoted}) SELECT ${quoted} FROM json_populate_recordset(NULL::${quote(table)}, $1::json) ON CONFLICT (${keys.map(quote).join(',')}) ${update ? `DO UPDATE SET ${update}` : 'DO NOTHING'}`;
  return db.$executeRawUnsafe(sql, JSON.stringify(rows));
}

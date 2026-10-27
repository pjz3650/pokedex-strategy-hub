import { mkdir, writeFile, readFile, rename, copyFile, access } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fetchCsvSnapshot } from './source-fetch.mjs';
const dataDir = path.resolve('data');
const root = path.join(dataDir, 'raw');
await mkdir(dataDir, { recursive: true });
let previous;
try {
  previous = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
} catch {}
const cached = process.argv.includes('--cached');
const commit =
  cached && previous
    ? previous.commit
    : await fetch('https://api.github.com/repos/PokeAPI/pokeapi/commits/master').then(async (r) => {
        if (!r.ok) throw new Error(`GitHub ${r.status}`);
        return (await r.json()).sha;
      });
if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error('Invalid snapshot commit');
const stage = path.join(dataDir, `.snapshot-${commit}`);
const backup = path.join(dataDir, `.previous-snapshot-${Date.now()}`);
// Verify every resolved directory before whole-directory renames on Windows.
for (const target of [root, stage, backup])
  if (path.dirname(path.resolve(target)) !== dataDir)
    throw new Error('Snapshot path escaped the project data directory');
await mkdir(stage, { recursive: true });
const names = [
  'pokemon',
  'pokemon_species',
  'pokemon_species_names',
  'pokemon_forms',
  'pokemon_form_names',
  'pokemon_stats',
  'pokemon_stats_past',
  'pokemon_types',
  'pokemon_abilities',
  'abilities',
  'ability_names',
  'moves',
  'move_names',
  'move_changelog',
  'pokemon_moves',
  'pokemon_move_methods',
  'pokemon_dex_numbers',
  'pokedexes',
  'version_groups',
  'versions',
  'types',
  'type_names',
  'type_efficacy',
  'items',
  'item_names',
  'item_game_indices',
  'pokemon_evolution',
  'evolution_triggers',
];
const hashes = {};
for (const name of names) {
  const dest = path.join(stage, `${name}.csv`);
  let reused = false;
  if (cached && previous?.commit === commit) {
    try {
      await copyFile(path.join(root, `${name}.csv`), dest);
      reused = true;
    } catch {}
  }
  if (!reused) {
    const bytes = await fetchCsvSnapshot(
      `https://raw.githubusercontent.com/PokeAPI/pokeapi/${commit}/data/v2/csv/${name}.csv`,
    );
    await writeFile(dest, bytes);
  }
  const hash = createHash('sha256')
    .update(await readFile(dest))
    .digest('hex');
  if (reused && previous.hashes?.[name] && hash !== previous.hashes[name])
    throw new Error(`Cached checksum mismatch: ${name}`);
  hashes[name] = hash;
  console.log(`${reused ? 'cached' : 'downloaded'} ${name}`);
}
await writeFile(
  path.join(stage, 'manifest.json'),
  JSON.stringify(
    {
      commit,
      collectedAt:
        cached && previous?.commit === commit ? previous.collectedAt : new Date().toISOString(),
      source: 'https://github.com/PokeAPI/pokeapi',
      files: names,
      hashes,
    },
    null,
    2,
  ),
);
let backedUp = false;
try {
  try {
    await access(root);
    await rename(root, backup);
    backedUp = true;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  await rename(stage, root);
} catch (error) {
  if (backedUp) await rename(backup, root);
  throw error;
}
console.log(
  `Complete snapshot ${commit}. Previous snapshots are preserved under data/.previous-snapshot-*.`,
);
await import('./download-game-data.mjs');

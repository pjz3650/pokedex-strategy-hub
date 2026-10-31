import { readFileSync, writeFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';

// The same pinned PokéAPI snapshot used by the importer. No database migration.
const csv = (name) => parse(readFileSync(`data/raw/${name}.csv`, 'utf8'), { columns: true });
const names = new Map(
  csv('pokemon_species_names')
    .filter((r) => r.local_language_id === '11')
    .map((r) => [r.pokemon_species_id, r.name]),
);
const species = Object.fromEntries(
  csv('pokemon_species').map((r) => [
    r.id,
    {
      japanese: names.get(r.id) ?? null,
      shape: Number(r.shape_id) || null,
      color: Number(r.color_id) || null,
    },
  ]),
);
const forms = Object.fromEntries(
  csv('pokemon').map((r) => [
    r.id,
    { height: Number(r.height) / 10, weight: Number(r.weight) / 10 },
  ]),
);
writeFileSync(
  'src/data/pokemon-visual-metadata.json',
  JSON.stringify(
    {
      source: 'PokeAPI/pokeapi@5ee47a9a9c1229632ec4b473a9c1c53026e005dd',
      language: 11,
      species,
      forms,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  `Visual metadata: ${Object.keys(species).length} species, ${Object.keys(forms).length} forms.`,
);

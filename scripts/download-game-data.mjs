import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Pinned revisions make every import reproducible. Update deliberately after validation.
const sources = [
  {
    repository: 'Fortelle/pokemon-learnsets',
    commit: '79351bcf414276f82efda89c474f9de6e837af06',
    files: {
      'dist-legendsza.json': 'dist/legendsza.json',
      'dist-legendsarceus.json': 'dist/legendsarceus.json',
      'dist-swordshield.json': 'dist/swordshield.json',
      'za-base-availability.txt': 'raw/legendsza@1.0.0/availabilities.txt',
      'za-dlc-availability.txt': 'raw/legendsza@2.0.0/availabilities.txt',
      'za-base-levelup.txt': 'raw/legendsza@1.0.0/levelup.txt',
      'za-base-tm.txt': 'raw/legendsza@1.0.0/tm.txt',
      'za-base-oyabun.txt': 'raw/legendsza@1.0.0/oyabun.txt',
      'za-base-special.txt': 'raw/legendsza@1.0.0/special.txt',
    },
  },
  {
    repository: 'projectpokemon/za-textport',
    commit: '0eb14d75de5282f33b783854e1a5aca8c168d83c',
    files: {
      'za-personal-moves.json': 'Raw/personal_waza_param_array.json',
      'za-move-timing.json': 'Raw/waza_param_array.json',
    },
  },
  {
    repository: 'Kaphotics/PLA-Move-Data',
    commit: 'pastebin-YyGpUYLc-2022-01-27',
    files: { 'pla-move-data.tsv': 'https://pastebin.com/raw/YyGpUYLc' },
    sha256: '2c0dd91cc4a1289264c12b6fa2807964faf386310100c4cc02708eea23992eca',
  },
];
const directory = path.resolve('data/supplemental');
await mkdir(directory, { recursive: true });
const cached = process.argv.includes('--cached');
const manifest = { collectedAt: new Date().toISOString(), sources: [] };
let old;
try {
  old = JSON.parse(await readFile(path.join(directory, 'manifest.json'), 'utf8'));
} catch {}
for (const source of sources) {
  const hashes = {};
  for (const [name, remote] of Object.entries(source.files)) {
    const target = path.join(directory, name);
    let bytes;
    if (cached) {
      const previous = old?.sources?.find(
        (s) => s.repository === source.repository && s.commit === source.commit,
      );
      if (previous?.hashes?.[name]) {
        bytes = await readFile(target);
        if (createHash('sha256').update(bytes).digest('hex') !== previous.hashes[name])
          throw new Error(`Cached checksum mismatch: ${name}`);
      }
    }
    if (!bytes) {
      const url = remote.startsWith('https://')
        ? remote
        : `https://raw.githubusercontent.com/${source.repository}/${source.commit}/${remote}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(45000) });
      if (!response.ok) throw new Error(`${source.repository}/${remote}: HTTP ${response.status}`);
      const text = await response.text();
      if (text.length < (name.endsWith('.json') ? 100 : 1) || text.length > 35_000_000)
        throw new Error(`Unexpected size: ${name}`);
      if (name.endsWith('.json')) JSON.parse(text);
      bytes = Buffer.from(text);
    }
    hashes[name] = createHash('sha256').update(bytes).digest('hex');
    if (source.sha256 && source.sha256 !== hashes[name])
      throw new Error(`Pinned checksum mismatch: ${name}`);
    await writeFile(`${target}.tmp`, bytes);
    await rename(`${target}.tmp`, target);
    console.log(`Verified ${name}`);
  }
  manifest.sources.push({ ...source, hashes });
}
if (cached && old?.collectedAt) manifest.collectedAt = old.collectedAt;
await writeFile(path.join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log('Game snapshots ready.');

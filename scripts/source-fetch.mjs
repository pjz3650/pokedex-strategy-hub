export async function fetchCsvSnapshot(url, fetcher = fetch) {
  const parsed = new URL(url);
  if (
    parsed.protocol !== 'https:' ||
    parsed.hostname !== 'raw.githubusercontent.com' ||
    !/^\/PokeAPI\/pokeapi\/[a-f0-9]{40}\/data\/v2\/csv\/\w+\.csv$/.test(parsed.pathname)
  )
    throw new Error('Unapproved snapshot source');
  const response = await fetcher(url, { signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error(`Source returned HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 120_000_000) throw new Error('Source size limit exceeded');
  const header = bytes.toString('utf8', 0, Math.min(bytes.length, 1000)).split('\n')[0];
  if (!/^[a-z_]+,[a-z_,]+\r?$/.test(header))
    throw new Error('Source is not a recognized CSV snapshot');
  return bytes;
}

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
const root = path.resolve('.local');
const data = path.join(root, 'postgres');
const bin = process.env.PG_BIN || 'C:/Program Files/PostgreSQL/17/bin';
const run = (name, args) =>
  execFileSync(path.join(bin, `${name}.exe`), args, {
    stdio: 'pipe',
    windowsHide: true,
  }).toString();
mkdirSync(root, { recursive: true });
if (!existsSync(path.join(data, 'PG_VERSION'))) {
  if (existsSync('.env'))
    throw new Error(
      'Existing .env: configure database explicitly rather than overwrite credentials.',
    );
  const password = randomBytes(32).toString('hex');
  const pw = path.join(root, 'init-password');
  writeFileSync(pw, password, { mode: 0o600 });
  try {
    run('initdb', [
      '-D',
      data,
      '-U',
      'pokedex',
      '--pwfile',
      pw,
      '--auth=scram-sha-256',
      '--encoding=UTF8',
      '--locale=C',
    ]);
  } finally {
    unlinkSync(pw);
  }
  writeFileSync(
    '.env',
    `DATABASE_URL="postgresql://pokedex:${password}@127.0.0.1:54329/pokedex?schema=public"\nAUTH_SECRET="${randomBytes(48).toString('base64url')}"\nAUTH_URL="http://127.0.0.1:3000"\nAUTH_TRUST_HOST=true\n`,
  );
}
if (process.argv.includes('--stop')) {
  let running = false;
  try {
    run('pg_ctl', ['-D', data, 'status']);
    running = true;
  } catch {}
  if (running) console.log(run('pg_ctl', ['-D', data, 'stop', '-m', 'fast']));
  else console.log('Project PostgreSQL is already stopped.');
  process.exit(0);
}
try {
  run('pg_ctl', ['-D', data, 'status']);
  console.log('Project PostgreSQL already running on port 54329.');
} catch {
  execFileSync(
    path.join(bin, 'pg_ctl.exe'),
    [
      '-D',
      data,
      '-l',
      path.join(root, 'postgres.log'),
      '-o',
      '-h 127.0.0.1 -p 54329',
      '-w',
      'start',
    ],
    { stdio: 'ignore', windowsHide: true },
  );
  console.log('Project PostgreSQL started on 54329.');
}
const url = new URL(readFileSync('.env', 'utf8').match(/DATABASE_URL="([^"]+)"/)[1]);
try {
  execFileSync(
    path.join(bin, 'createdb.exe'),
    ['-h', '127.0.0.1', '-p', '54329', '-U', 'pokedex', '-w', 'pokedex'],
    { env: { ...process.env, PGPASSWORD: url.password }, windowsHide: true, stdio: 'pipe' },
  );
  console.log('Database pokedex created.');
} catch (error) {
  if (!String(error.stderr).includes('already exists'))
    throw new Error('Database creation failed; consult .local/postgres.log.');
}
console.log('Local database ready. Secrets stored in ignored .env.');

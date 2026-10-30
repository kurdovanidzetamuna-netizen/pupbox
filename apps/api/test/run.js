#!/usr/bin/env node
// npm test (in apps/api): a fresh test database, then every *.test.ts.
//   node test/run.js                 all tests
//   node test/run.js rules           only files whose name contains "rules"
// The test database is rebuilt from a clean copy each run (pupbox_test from
// pupbox_test_seed). The first run creates that copy: migrations + starter data.
const { url } = require('./env');
const { execFileSync, spawnSync } = require('child_process');
const { readdirSync } = require('fs');
const { resolve, join } = require('path');
const { PrismaClient } = require('@prisma/client');

const ROOT = resolve(__dirname, '../../..');
const SCHEMA = join(ROOT, 'packages/database/prisma/schema.prisma');
const name = url.match(/\/([^/?]+)(\?|$)/)[1];
const template = `${name}_seed`;
const at = (db) => url.replace(/\/[^/?]+(\?|$)/, `/${db}$1`);
const sh = (cmd, args, env = {}, cwd = ROOT) => execFileSync(cmd, args, { cwd, env: { ...process.env, ...env }, stdio: ['ignore', 'ignore', 'inherit'] });

async function freshDatabase() {
  const admin = new PrismaClient({ datasources: { db: { url: at('postgres') } } });
  try {
    const exists = async (db) => (await admin.$queryRawUnsafe('SELECT 1 FROM pg_database WHERE datname = $1', db)).length > 0;
    if (!(await exists(template))) {
      console.log(`Building the clean test copy ${template} (first run only)…`);
      await admin.$executeRawUnsafe(`CREATE DATABASE "${template}"`);
      const env = { DATABASE_URL: at(template) };
      sh('npx', ['prisma', 'migrate', 'deploy', '--schema', SCHEMA], env);
      for (const s of ['seed', 'seed-delivery', 'seed-plans', 'seed-products']) sh('npx', ['ts-node', `prisma/${s}.ts`], env, join(ROOT, 'packages/database'));
    }
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await admin.$executeRawUnsafe(`CREATE DATABASE "${name}" TEMPLATE "${template}"`);
  } finally {
    await admin.$disconnect();
  }
  // Migrations added since the copy was made.
  sh('npx', ['prisma', 'migrate', 'deploy', '--schema', SCHEMA], { DATABASE_URL: url });
}

(async () => {
  // The server and the tests type-check first: that is also where the shared
  // data descriptions are compared with the server (contracts.test.ts).
  const tsc = spawnSync('npx', ['tsc', '--noEmit', '-p', resolve(__dirname, '../tsconfig.json')], { cwd: resolve(__dirname, '..'), stdio: 'inherit' });
  if (tsc.status !== 0) { console.error('Type check failed (see above). No tests were run.'); process.exit(1); }
  await freshDatabase();
  const filter = process.argv[2] ?? '';
  const files = readdirSync(__dirname).filter((f) => f.endsWith('.test.ts') && f.includes(filter)).map((f) => join(__dirname, f));
  if (!files.length) { console.error(`No test files match "${filter}".`); process.exit(1); }
  const r = spawnSync(process.execPath, ['--test', '--test-concurrency=1', '-r', 'ts-node/register/transpile-only', ...files], {
    cwd: resolve(__dirname, '..'),
    stdio: 'inherit',
    env: { ...process.env, TS_NODE_PROJECT: resolve(__dirname, '../tsconfig.json') },
  });
  process.exit(r.status ?? 1);
})().catch((e) => { console.error(e); process.exit(1); });

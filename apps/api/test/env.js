// Settings for the automated tests. Loaded before anything else (see run.js),
// so the server and Prisma only ever see the test database.
const { readFileSync } = require('fs');
const { resolve } = require('path');

function rootEnv() {
  const out = {};
  try {
    for (const line of readFileSync(resolve(__dirname, '../../../.env'), 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
      if (m) out[m[1]] = m[2];
    }
  } catch { /* no .env: TEST_DATABASE_URL must be set */ }
  return out;
}

/** The test database: TEST_DATABASE_URL, else the local one with its name ending in _test. */
function testDatabaseUrl() {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const local = rootEnv().DATABASE_URL;
  if (!local) throw new Error('No DATABASE_URL in .env and no TEST_DATABASE_URL: nowhere to run the tests.');
  return local.replace(/\/([^/?]+)(\?|$)/, '/pupbox_test$2');
}

const url = testDatabaseUrl();
// Never let the tests near real data: they wipe their database every run.
if (!/\/[^/?]*_test(\?|$)/.test(url)) throw new Error(`Refusing to run tests on ${url.replace(/:[^:@/]+@/, ':***@')}: the database name must end in _test.`);

Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL: url,
  JWT_SECRET: 'test-only-secret-that-is-long-enough-1234567890',
  JWT_REFRESH_SECRET: 'test-only-refresh-secret-1234567890',
  JWT_EXPIRES_IN: '1h',
  JWT_REFRESH_EXPIRES_IN: '7d',
  TEST_LOGIN_CODE: '111111',
  // No bank: payments are simulated. A known secret: bank callbacks can be signed here.
  FLITT_MERCHANT_ID: '',
  FLITT_SECRET_KEY: 'test-flitt-secret',
  RESEND_API_KEY: '',
  WIFISHER_API_KEY: '',
  NEXT_PUBLIC_API_URL: 'http://localhost/api/v1',
  NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
  NEXT_PUBLIC_ADMIN_URL: 'http://localhost:3001',
  API_PREFIX: 'api/v1',
  ADMIN_PASSWORD: 'TestAdmin-12345',
});

module.exports = { url };

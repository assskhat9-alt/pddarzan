import pg from 'pg';

const NEON_URL = process.env.DATABASE_URL;
if (!NEON_URL) {
  console.error('DATABASE_URL env var is required (e.g. node --env-file=.env scripts/clean_test_accounts.js)');
  process.exit(1);
}

async function cleanTestAccounts() {
  const pool = new pg.Pool({ connectionString: NEON_URL, ssl: { rejectUnauthorized: false } });
  const client = await pool.connect();

  console.log('--- DELETING TEST ACCOUNTS ---');
  const testUsernames = ['neon_student', 'aruak006', 'testuser99', 'test_loc_3992'];
  const res = await client.query('DELETE FROM users WHERE username = ANY($1) RETURNING id, username, full_name', [testUsernames]);
  console.log('Deleted users:', res.rows);

  // Clear test attempts
  await client.query('DELETE FROM test_attempts WHERE user_id = 1');
  console.log('Cleaned test attempts.');

  const remaining = await client.query('SELECT id, username, full_name, phone, role, has_access, access_expires_at, created_at FROM users ORDER BY id ASC');
  console.log('\n--- REMAINING USERS IN DATABASE ---');
  console.table(remaining.rows);

  client.release();
  await pool.end();
}

cleanTestAccounts().catch(console.error);

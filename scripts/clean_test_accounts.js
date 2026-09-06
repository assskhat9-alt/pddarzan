import pg from 'pg';

const NEON_URL = 'postgresql://neondb_owner:npg_jTApBoRcZ32z@ep-floral-art-aym4jtfi-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require';

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

import https from 'https';
import pg from 'pg';

const BASE_URL = 'https://pddarzan.onrender.com';
const NEON_URL = 'postgresql://neondb_owner:npg_jTApBoRcZ32z@ep-floral-art-aym4jtfi-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require';

function request(method, path, data, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(BASE_URL + path);
    const body = data ? JSON.stringify(data) : null;
    const headers = {};
    if (body) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(body);
    }
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const req = https.request({
      hostname: u.hostname,
      port: 443,
      path: u.pathname + u.search,
      method,
      headers
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(b);
          resolve({ status: res.statusCode, data: parsed, raw: b });
        } catch (e) {
          resolve({ status: res.statusCode, raw: b });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function runLiveAudit() {
  console.log('========================================================');
  console.log('   STARTING LIVE AUDIT OF https://pddarzan.onrender.com  ');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Platform Stats
    console.log('--- 1. Testing Platform Stats ---');
    const stats = await request('GET', '/api/platform-stats');
    assert(stats.status === 200 && stats.data && stats.data.totalQuestions === 1103, `Total questions on live server: ${stats.data?.totalQuestions}`);

    // 2. Public Config
    console.log('\n--- 2. Testing Public Config ---');
    const cfg = await request('GET', '/api/public/config');
    assert(cfg.status === 200 && !!cfg.data?.adminWhatsapp, `Admin WhatsApp: ${cfg.data?.adminWhatsapp}`);

    // 3. Admin Login
    console.log('\n--- 3. Testing Admin Login ---');
    const adminLogin = await request('POST', '/api/auth/login', {
      username: 'admin',
      password: 'admin123',
      deviceId: 'audit_live_verifier'
    });
    assert(adminLogin.status === 200 && adminLogin.data?.user?.role === 'admin', 'Admin login successful on live server');
    const adminToken = adminLogin.data?.token;

    // 4. Admin Users List
    console.log('\n--- 4. Checking Existing Users in Database ---');
    const usersRes = await request('GET', '/api/admin/users', null, adminToken);
    assert(usersRes.status === 200 && Array.isArray(usersRes.data?.users), 'Fetched users list successfully');
    
    const users = usersRes.data?.users || [];
    console.log(`Total users found on live server: ${users.length}`);
    for (const u of users) {
      console.log(` - ID ${u.id}: ${u.username} (${u.full_name || 'no name'}), access: ${u.has_access}, role: ${u.role}`);
    }

    const hasNeonStudent = users.some(u => u.username === 'neon_student');
    const aruakUser = users.find(u => u.username === 'aruak006');
    
    assert(hasNeonStudent, 'Database contains `neon_student` (confirms Neon PostgreSQL is connected!)');
    assert(aruakUser && aruakUser.has_access === 0, 'User `aruak006` is found and has access blocked (0)');

    // 5. Create a new test user via Admin API
    console.log('\n--- 5. Testing User Creation via Live Admin API ---');
    const testUsername = 'live_test_' + Date.now().toString().slice(-4);
    const createRes = await request('POST', '/api/admin/user/create', {
      username: testUsername,
      full_name: 'Live Render Test',
      password: 'testpassword123',
      phone: '+77079998877',
      has_access: true,
      access_duration_months: 1
    }, adminToken);

    assert(createRes.status === 200 && createRes.data?.user?.username === testUsername, `Created student ${testUsername} successfully`);
    const newUserId = createRes.data?.user?.id;

    // 6. Test Login as newly created student
    console.log('\n--- 6. Testing Login as New Student ---');
    const studentLogin = await request('POST', '/api/auth/login', {
      username: testUsername,
      password: 'testpassword123',
      deviceId: 'live_device_1'
    });
    assert(studentLogin.status === 200 && studentLogin.data?.user?.hasAccess === true, 'Student logged in and has access = true');
    const studentToken = studentLogin.data?.token;

    // 7. Test Start Real Exam for Student
    console.log('\n--- 7. Testing Real Exam Session Start ---');
    const examRes = await request('GET', '/api/test/start?lang=kk&timed=true', null, studentToken);
    assert(examRes.status === 200 && examRes.data?.questions?.length === 40, 'Exam session started with 40 questions');

    // 8. Test Single Device Restriction
    console.log('\n--- 8. Testing Single Device Session Enforcement ---');
    const studentLoginDev2 = await request('POST', '/api/auth/login', {
      username: testUsername,
      password: 'testpassword123',
      deviceId: 'live_device_2'
    });
    assert(studentLoginDev2.status === 200, 'Student logged in from Device 2');

    const dev1Check = await request('GET', '/api/test/start?lang=kk&timed=true', null, studentToken);
    assert(dev1Check.status === 403 && dev1Check.data?.code === 'DEVICE_OVERRIDDEN', 'Device 1 kicked out with 403 DEVICE_OVERRIDDEN');

    // 9. Verify direct persistence in Neon Cloud PostgreSQL
    console.log('\n--- 9. Direct Query into Neon Cloud Database ---');
    const pool = new pg.Pool({ connectionString: NEON_URL, ssl: { rejectUnauthorized: false } });
    const client = await pool.connect();
    const dbRes = await client.query('SELECT id, username, full_name, has_access, access_expires_at FROM users WHERE username = $1', [testUsername]);
    assert(dbRes.rows.length === 1, `Direct Neon DB query found user ${testUsername} stored in cloud!`);
    console.log('Neon DB Record:', dbRes.rows[0]);

    // Clean up test user
    console.log('\n--- 10. Cleaning up test user ---');
    const delRes = await request('DELETE', `/api/admin/user/${newUserId}`, null, adminToken);
    assert(delRes.status === 200, 'Cleaned up test user successfully');

    client.release();
    await pool.end();

  } catch (err) {
    console.error('Audit Error:', err);
    failed++;
  }

  console.log('\n========================================================');
  console.log(`LIVE AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================');
}

runLiveAudit();

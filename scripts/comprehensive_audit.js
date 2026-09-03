import fs from 'fs';
import path from 'path';
import http from 'http';

function post(url, data, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const body = JSON.stringify(data);
    const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const req = http.request({ hostname: u.hostname, port: u.port, path: u.pathname, method: 'POST', headers }, res => {
      let b = ''; res.on('data', c => b += c); res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(b) }));
    });
    req.on('error', reject); req.write(body); req.end();
  });
}

function get(url, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request({ hostname: u.hostname, port: u.port, path: u.pathname + u.search, method: 'GET', headers: token ? { 'Authorization': 'Bearer ' + token } : {} }, res => {
      let b = ''; res.on('data', c => b += c); res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(b) }));
    });
    req.on('error', reject); req.end();
  });
}

function del(url, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request({ hostname: u.hostname, port: u.port, path: u.pathname, method: 'DELETE', headers: token ? { 'Authorization': 'Bearer ' + token } : {} }, res => {
      let b = ''; res.on('data', c => b += c); res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(b) }));
    });
    req.on('error', reject); req.end();
  });
}

async function runAudit() {
  console.log('=====================================================');
  console.log('       PDD PLATFORM COMPREHENSIVE AUDIT REPORT       ');
  console.log('=====================================================\n');

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

  // 1. Questions File Audit
  console.log('--- 1. QUESTIONS DATABASE AUDIT ---');
  const questionsPath = path.resolve('questions.json');
  assert(fs.existsSync(questionsPath), 'questions.json exists');
  const rawQ = fs.readFileSync(questionsPath, 'utf-8');
  const questions = JSON.parse(rawQ);
  assert(questions.length === 1103, `Exactly 1103 questions loaded (Actual: ${questions.length})`);

  let validCount = 0;
  let hasImageCount = 0;
  for (const q of questions) {
    if (q.id && q.number && q.kk && q.ru && q.en && q.kk.options && q.ru.options && q.en.options) {
      if (q.correct_index >= 0 && q.correct_index < q.kk.options.length) {
        validCount++;
      }
    }
    const imgPath = path.resolve(`public/images/q_${q.id}.png`);
    if (fs.existsSync(imgPath)) hasImageCount++;
  }
  assert(validCount === 1103, `All 1103 questions have valid structures and correct answer indices (Valid: ${validCount})`);
  assert(hasImageCount === 811, `All 811 extracted illustrations exist on disk (Found: ${hasImageCount})`);

  // 2. Static Assets Audit
  console.log('\n--- 2. STATIC ASSETS & FRONTEND AUDIT ---');
  assert(fs.existsSync('public/index.html'), 'public/index.html exists');
  assert(fs.existsSync('public/style.css'), 'public/style.css exists');
  assert(fs.existsSync('public/app.js'), 'public/app.js exists');

  const htmlContent = fs.readFileSync('public/index.html', 'utf-8');
  assert(htmlContent.includes('id="authView"'), 'index.html contains authView');
  assert(htmlContent.includes('id="dashboardView"'), 'index.html contains dashboardView');
  assert(htmlContent.includes('id="testView"'), 'index.html contains testView');
  assert(htmlContent.includes('id="resultView"'), 'index.html contains resultView');
  assert(htmlContent.includes('id="studyView"'), 'index.html contains studyView');
  assert(htmlContent.includes('id="adminView"'), 'index.html contains adminView');
  assert(htmlContent.includes('id="paywallModal"'), 'index.html contains paywallModal');
  assert(htmlContent.includes('id="deviceConflictModal"'), 'index.html contains deviceConflictModal');

  // 3. API Endpoints Audit
  console.log('\n--- 3. BACKEND API ENDPOINTS AUDIT ---');
  const statsRes = await get('http://localhost:3000/api/platform-stats');
  assert(statsRes.status === 200 && statsRes.data.totalQuestions === 1103, 'GET /api/platform-stats returns 1103 questions');

  const cfgRes = await get('http://localhost:3000/api/public/config');
  assert(cfgRes.status === 200 && !!cfgRes.data.adminWhatsapp, `GET /api/public/config returns admin WhatsApp (${cfgRes.data.adminWhatsapp})`);

  console.log('\n--- 4. ADMIN & SECURITY AUDIT ---');
  const adminLogin = await post('http://localhost:3000/api/auth/login', { username: 'admin', password: 'admin123', deviceId: 'audit_dev_admin' });
  assert(adminLogin.status === 200 && adminLogin.data.user.role === 'admin', 'Admin login successful with role: admin');
  const adminToken = adminLogin.data.token;

  const adminUsersRes = await get('http://localhost:3000/api/admin/users', adminToken);
  assert(adminUsersRes.status === 200 && Array.isArray(adminUsersRes.data.users), `GET /api/admin/users returns list (Count: ${adminUsersRes.data.users.length})`);

  // Create temporary verification student
  const ts = Date.now();
  const testStudentName = 'audit_user_' + ts;
  const createRes = await post('http://localhost:3000/api/admin/user/create', {
    username: testStudentName,
    full_name: 'Аудит Сынақшы',
    password: 'password123',
    phone: '+77071234567',
    has_access: true
  }, adminToken);
  assert(createRes.status === 200 && createRes.data.user.username === testStudentName, 'Admin creates active student successfully');
  const studentId = createRes.data.user.id;

  const studentLogin = await post('http://localhost:3000/api/auth/login', { username: testStudentName, password: 'password123', deviceId: 'dev_student_a' });
  assert(studentLogin.status === 200 && studentLogin.data.user.hasAccess === true, 'Student logs in with active access');
  const studentToken = studentLogin.data.token;

  // Test start timed
  const testStartTimed = await get('http://localhost:3000/api/test/start?lang=kk&timed=true', studentToken);
  assert(testStartTimed.status === 200 && testStartTimed.data.questions.length === 40 && testStartTimed.data.timed === true, 'GET /api/test/start?timed=true returns 40 questions');

  // Test start untimed
  const testStartUntimed = await get('http://localhost:3000/api/test/start?lang=kk&timed=false', studentToken);
  assert(testStartUntimed.status === 200 && testStartUntimed.data.timed === false, 'GET /api/test/start?timed=false returns untimed session');

  // Study questions access
  const studyRes = await get('http://localhost:3000/api/study/questions?page=1&limit=20', studentToken);
  assert(studyRes.status === 200 && studyRes.data.questions.length === 20, 'GET /api/study/questions returns 20 study questions');

  // Test Single Device Enforce
  const studentLoginDev2 = await post('http://localhost:3000/api/auth/login', { username: testStudentName, password: 'password123', deviceId: 'dev_student_b' });
  const dev1AfterDev2 = await get('http://localhost:3000/api/test/start', studentToken);
  assert(dev1AfterDev2.status === 403 && dev1AfterDev2.data.code === 'DEVICE_OVERRIDDEN', 'Single Device Enforcement kicks previous device (403 DEVICE_OVERRIDDEN)');

  // Clean up temporary student
  const delRes = await del(`http://localhost:3000/api/admin/user/${studentId}`, adminToken);
  assert(delRes.status === 200, 'Admin cleanly deletes temporary audit student');

  console.log('\n=====================================================');
  console.log(`AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('=====================================================\n');

  if (failed === 0) {
    console.log('>>> SYSTEM STATUS: 100% HEALTHY & READY FOR DEPLOYMENT! <<<');
  } else {
    process.exit(1);
  }
}

runAudit().catch(err => {
  console.error('Audit encountered unexpected error:', err);
  process.exit(1);
});

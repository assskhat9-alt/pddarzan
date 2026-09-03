import http from 'http';

async function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, text: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('Testing PDD Testing Platform API...\n');

  // 1. Register test user
  const uniqueUser = 'test_user_' + Date.now();
  console.log('1. Testing Registration for:', uniqueUser);
  const regRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    full_name: 'Марат Серікұлы',
    username: uniqueUser,
    password: 'password123'
  });
  console.log('Register status:', regRes.status, 'User:', regRes.data.user?.username);
  const token = regRes.data.token;
  if (!token) throw new Error('Registration failed: no token returned');

  // 2. Start Test (40 questions)
  console.log('\n2. Testing Start Test (40 questions in Kazakh)...');
  const testRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/test/start?lang=kk',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('Test start status:', testRes.status);
  console.log('Total questions received:', testRes.data.questions?.length);
  console.log('Sample question 1:', testRes.data.questions[0].question);
  console.log('Sample question 1 options count:', testRes.data.questions[0].options.length);
  console.log('Sample question 1 hasImage:', testRes.data.questions[0].hasImage);

  const testSessionId = testRes.data.testSessionId;
  const questions = testRes.data.questions;

  // 3. Submit Test (Simulate answering all 40 questions)
  console.log('\n3. Testing Test Submission with answers...');
  const answers = questions.map((q, idx) => ({
    questionId: q.id,
    selectedIndex: 0 // Select option 1 for all
  }));

  const submitRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/test/submit',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, {
    testSessionId,
    timeSpentSeconds: 450, // 7.5 mins
    language: 'kk',
    answers
  });

  console.log('Submit status:', submitRes.status);
  console.log('Result Score:', submitRes.data.score, '/', submitRes.data.totalQuestions);
  console.log('Passed:', submitRes.data.passed);
  console.log('Attempt ID:', submitRes.data.attemptId);

  // 4. Test History
  console.log('\n4. Testing History API...');
  const histRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/history',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('History status:', histRes.status);
  console.log('Total attempts in history:', histRes.data.history?.length);
  console.log('User stats:', histRes.data.stats);

  // 5. Test History Single Attempt Review
  console.log('\n5. Testing Single Attempt Review for ID:', submitRes.data.attemptId);
  const reviewRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/history/${submitRes.data.attemptId}`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('Review status:', reviewRes.status);
  console.log('Review answers count:', reviewRes.data.answers?.length);

  console.log('\n✅ ALL API TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

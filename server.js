import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import db from './db.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.resolve('public')));

// Load questions.json into memory
let questions = [];
try {
  questions = JSON.parse(fs.readFileSync('questions.json', 'utf-8'));
  console.log(`Loaded ${questions.length} questions into memory.`);
} catch (e) {
  console.error('Failed to load questions.json:', e.message);
}

// Question map by ID
const questionMap = new Map();
questions.forEach(q => questionMap.set(q.id, q));

// HMAC Authentication Token Secret
const AUTH_SECRET = 'pdd_exam_auth_secret_key_2026_qazaqstan';

function generateAuthToken(user) {
  const payload = {
    userId: user.id,
    username: user.username,
    role: user.role || 'user',
    createdAt: Date.now(),
    nonce: crypto.randomBytes(8).toString('hex')
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

function verifyAuthToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(data).digest('base64url');
  if (signature !== expectedSig) return null;
  try {
    return JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
  } catch (e) {
    return null;
  }
}

// Active test sessions: sessionId -> { userId, questionIds, startedAt, language, timed }
const activeTestSessions = new Map();

// Helper to check if image exists for question
function hasQuestionImage(qId) {
  return fs.existsSync(path.resolve(`public/images/q_${qId}.png`));
}

// ================= AUTHENTICATION & SECURITY MIDDLEWARES =================

// Authentication middleware with Single Device verification
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ error: 'Авторизация қажет (Токен табылмады)' });
    }
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const payload = verifyAuthToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'Сессия жарамсыз немесе аяқталған' });
    }

    const freshUser = await db.findUserById(payload.userId);
    if (!freshUser) {
      return res.status(401).json({ error: 'Пайдаланушы табылмады' });
    }

    // Single Device Enforcement: if not admin, ensure current session token matches
    if (freshUser.role !== 'admin' && freshUser.current_token && freshUser.current_token !== token) {
      return res.status(403).json({
        error: 'Бұл аккаунт басқа құрылғыдан ашылды! Бір аккаунтпен бір уақытта тек бір ғана құрылғыда жұмыс істеуге болады.',
        code: 'DEVICE_OVERRIDDEN'
      });
    }

    req.user = {
      userId: freshUser.id,
      username: freshUser.username,
      fullName: freshUser.full_name,
      role: freshUser.role,
      hasAccess: freshUser.has_access === 1 || freshUser.role === 'admin',
      phone: freshUser.phone,
      deviceId: freshUser.device_id
    };
    next();
  } catch (err) {
    console.error('requireAuth error:', err);
    res.status(500).json({ error: 'Авторизация тексеру қатесі: ' + err.message });
  }
}

// Paid / Admin-Granted Access Gatekeeper
function requireAccess(req, res, next) {
  if (req.user && (req.user.role === 'admin' || req.user.hasAccess)) {
    return next();
  }
  return res.status(403).json({
    error: 'Бұл бөлім құлыпталған. Платформаға толық қолжетімділік алу үшін әкімшіге (WhatsApp) хабарласыңыз.',
    code: 'ACCESS_LOCKED',
    locked: true
  });
}

// Admin Only Gatekeeper
function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Бұл әрекетке тек әкімшінің (Admin) құқығы бар' });
}

// ================= PUBLIC CONFIG ENDPOINT =================

app.get('/api/public/config', async (req, res) => {
  try {
    const adminWhatsapp = await db.getSetting('admin_whatsapp', '77770000000');
    res.json({ adminWhatsapp });
  } catch (err) {
    res.json({ adminWhatsapp: '77770000000' });
  }
});

// ================= AUTH ENDPOINTS =================

// Register (Self-registration: created with has_access = 0, awaiting admin activation)
app.post('/api/auth/register', async (req, res) => {
  try {
    let { username, full_name, password, deviceId, phone } = req.body;
    username = (username || '').trim().toLowerCase();
    full_name = (full_name || '').trim();
    password = (password || '');
    deviceId = (deviceId || '').trim();

    if (!username) {
      return res.status(400).json({ error: 'Логинді енгізіңіз' });
    }
    if (username.length < 3) {
      return res.status(400).json({ error: 'Логин кемінде 3 таңбадан тұруы керек' });
    }
    if (username.length > 30) {
      return res.status(400).json({ error: 'Логин 30 таңбадан аспауы керек' });
    }
    if (/\s/.test(username)) {
      return res.status(400).json({ error: 'Логинде бос орын (пробел) болмауы керек' });
    }

    if (!full_name) {
      return res.status(400).json({ error: 'Аты-жөніңізді енгізіңіз' });
    }
    if (full_name.length < 2) {
      return res.status(400).json({ error: 'Аты-жөніңіз кемінде 2 таңбадан тұруы керек' });
    }

    if (!password || password.trim().length < 4) {
      return res.status(400).json({ error: 'Құпия сөз кемінде 4 таңбадан тұруы керек' });
    }

    const existing = await db.findUserByUsername(username);
    if (existing) {
      return res.status(400).json({ error: 'Бұл логин жүйеде тіркелген. Басқа логин таңдаңыз.' });
    }

    // Default self-registered accounts are locked (hasAccess = 0)
    const newUser = await db.createUser(username, full_name, password, 'user', 0, phone);
    const token = generateAuthToken(newUser);

    // Save session and device binding
    await db.updateUserSession(newUser.id, deviceId, token);

    const adminWhatsapp = await db.getSetting('admin_whatsapp', '77770000000');

    res.json({
      success: true,
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        fullName: newUser.full_name,
        role: 'user',
        hasAccess: false,
        phone: newUser.phone
      },
      adminWhatsapp
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Тіркелу кезінде қате орын алды: ' + err.message });
  }
});

// Login (Single Device Enforcement on login)
app.post('/api/auth/login', async (req, res) => {
  try {
    let { username, password, deviceId } = req.body;
    username = (username || '').trim().toLowerCase();
    password = (password || '');
    deviceId = (deviceId || '').trim();

    if (!username || !password) {
      return res.status(400).json({ error: 'Логин мен құпия сөзді енгізіңіз' });
    }

    const user = await db.findUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Логин немесе құпия сөз қате' });
    }

    const isValid = db.verifyPassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Логин немесе құпия сөз қате' });
    }

    const token = generateAuthToken(user);

    // Update single device active session in DB (overriding any previous device)
    await db.updateUserSession(user.id, deviceId, token);

    const adminWhatsapp = await db.getSetting('admin_whatsapp', '77770000000');

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
        hasAccess: user.has_access === 1 || user.role === 'admin',
        phone: user.phone
      },
      adminWhatsapp
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Кіру кезінде қате орын алды: ' + err.message });
  }
});

// Get current user + stats
app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const stats = await db.getUserStats(req.user.userId);
    const adminWhatsapp = await db.getSetting('admin_whatsapp', '77770000000');
    res.json({
      user: req.user,
      stats,
      adminWhatsapp
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Logout
app.post('/api/auth/logout', requireAuth, async (req, res) => {
  try {
    await db.resetUserDevice(req.user.userId);
  } catch (e) {}
  res.json({ success: true });
});

// ================= ADMIN ENDPOINTS =================

// Get all users and system stats
app.get('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await db.getAllUsers();
    const stats = {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.has_access === 1 || u.role === 'admin').length,
      lockedUsers: users.filter(u => u.has_access === 0 && u.role !== 'admin').length,
      devicesBound: users.filter(u => !!u.device_id).length
    };
    const adminWhatsapp = await db.getSetting('admin_whatsapp', '77770000000');
    res.json({ users, stats, adminWhatsapp });
  } catch (err) {
    res.status(500).json({ error: 'Әкімші деректерін жүктеу қатесі: ' + err.message });
  }
});

// Admin creates new user (by default active with full access)
app.post('/api/admin/user/create', requireAuth, requireAdmin, async (req, res) => {
  try {
    let { username, full_name, password, phone, has_access } = req.body;
    username = (username || '').trim().toLowerCase();
    full_name = (full_name || '').trim();
    password = (password || '');
    phone = (phone || '').trim();
    const access = has_access !== false ? 1 : 0;

    if (!username || username.length < 3) {
      return res.status(400).json({ error: 'Логин кемінде 3 таңбадан тұруы керек' });
    }
    if (/\s/.test(username)) {
      return res.status(400).json({ error: 'Логинде бос орын болмауы керек' });
    }
    if (!full_name || full_name.length < 2) {
      return res.status(400).json({ error: 'Аты-жөнін дұрыс енгізіңіз' });
    }
    if (!password || password.trim().length < 4) {
      return res.status(400).json({ error: 'Құпия сөз кемінде 4 таңба болуы шарт' });
    }

    const existing = await db.findUserByUsername(username);
    if (existing) {
      return res.status(400).json({ error: 'Бұл логин жүйеде тіркелген' });
    }

    const newUser = await db.createUser(username, full_name, password, 'user', access, phone);
    res.json({ success: true, user: newUser });
  } catch (err) {
    res.status(500).json({ error: 'Пайдаланушыны қосу қатесі: ' + err.message });
  }
});

// Admin toggles user access (lock / unlock)
app.post('/api/admin/user/toggle-access', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId, hasAccess } = req.body;
    if (!userId) return res.status(400).json({ error: 'Пайдаланушы ID көрсетілмеді' });

    await db.toggleUserAccess(userId, hasAccess);
    res.json({ success: true, userId, hasAccess: !!hasAccess });
  } catch (err) {
    res.status(500).json({ error: 'Доступты өзгерту қатесі: ' + err.message });
  }
});

// Admin resets user device binding (allowing login on a new device)
app.post('/api/admin/user/reset-device', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'Пайдаланушы ID көрсетілмеді' });

    await db.resetUserDevice(userId);
    res.json({ success: true, message: 'Құрылғы байланысы сәтті өшірілді (босатылды)' });
  } catch (err) {
    res.status(500).json({ error: 'Құрылғыны босату қатесі: ' + err.message });
  }
});

// Admin deletes user
app.delete('/api/admin/user/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (!userId) return res.status(400).json({ error: 'Пайдаланушы ID қате' });

    const targetUser = await db.findUserById(userId);
    if (targetUser && targetUser.role === 'admin') {
      return res.status(400).json({ error: 'Бас әкімшіні өшіруге болмайды' });
    }

    await db.deleteUser(userId);
    res.json({ success: true, message: 'Пайдаланушы сәтті өшірілді' });
  } catch (err) {
    res.status(500).json({ error: 'Пайдаланушыны өшіру қатесі: ' + err.message });
  }
});

// Admin settings (WhatsApp number, etc.)
app.get('/api/admin/settings', requireAuth, requireAdmin, async (req, res) => {
  try {
    const adminWhatsapp = await db.getSetting('admin_whatsapp', '77770000000');
    res.json({ adminWhatsapp });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/settings', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { adminWhatsapp } = req.body;
    if (!adminWhatsapp) return res.status(400).json({ error: 'WhatsApp нөмірін енгізіңіз' });

    const cleanNumber = adminWhatsapp.replace(/\D/g, '');
    await db.setSetting('admin_whatsapp', cleanNumber);
    res.json({ success: true, adminWhatsapp: cleanNumber });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= TEST ENDPOINTS (LOCKED WITHOUT ACCESS) =================

// Start a 40-question test session
app.get('/api/test/start', requireAuth, requireAccess, (req, res) => {
  try {
    const lang = req.query.lang || 'kk';
    const timed = req.query.timed !== 'false';
    if (questions.length === 0) {
      return res.status(500).json({ error: 'Сұрақтар базасы жүктелмеген' });
    }

    // Shuffle and pick 40 random questions
    const shuffled = [...questions].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 40);
    const questionIds = selected.map(q => q.id);

    const testSessionId = crypto.randomUUID();
    activeTestSessions.set(testSessionId, {
      userId: req.user.userId,
      questionIds,
      startedAt: Date.now(),
      language: lang,
      timed
    });

    // Prepare questions without leaking correct_index
    const testQuestions = selected.map((q, idx) => {
      const langData = q[lang] || q.kk || q.ru;
      return {
        index: idx + 1,
        id: q.id,
        number: q.number,
        question: langData.question,
        options: langData.options,
        kk: q.kk,
        ru: q.ru,
        en: q.en,
        hasImage: hasQuestionImage(q.id),
        imageUrl: hasQuestionImage(q.id) ? `/images/q_${q.id}.png` : null
      };
    });

    res.json({
      testSessionId,
      totalQuestions: testQuestions.length,
      timeLimitMinutes: timed ? 40 : 0,
      timed,
      language: lang,
      questions: testQuestions
    });
  } catch (err) {
    console.error('Start test error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Submit test answers
app.post('/api/test/submit', requireAuth, requireAccess, async (req, res) => {
  try {
    const { testSessionId, timeSpentSeconds, answers, language = 'kk', timed } = req.body;
    
    // answers is array: [{ questionId, selectedIndex }]
    const session = activeTestSessions.get(testSessionId);
    const isTimed = timed !== undefined ? !!timed : (session ? !!session.timed : true);
    let questionIds = session ? session.questionIds : (answers || []).map(a => a.questionId);

    if (!questionIds || questionIds.length === 0) {
      return res.status(400).json({ error: 'Жауаптар немесе сессия табылмады' });
    }

    const answersMap = new Map();
    (answers || []).forEach(a => answersMap.set(a.questionId, a.selectedIndex));

    let score = 0;
    const detailedAnswers = [];

    for (const qId of questionIds) {
      const q = questionMap.get(qId);
      if (!q) continue;

      const userSelected = answersMap.has(qId) ? answersMap.get(qId) : -1;
      const isCorrect = userSelected === q.correct_index;
      if (isCorrect) score++;

      const langData = q[language] || q.kk || q.ru;
      detailedAnswers.push({
        questionId: q.id,
        number: q.number,
        question: langData.question,
        options: langData.options,
        kk: q.kk,
        ru: q.ru,
        en: q.en,
        userSelected,
        correctIndex: q.correct_index,
        isCorrect,
        hasImage: hasQuestionImage(q.id),
        imageUrl: hasQuestionImage(q.id) ? `/images/q_${q.id}.png` : null
      });
    }

    const totalQuestions = detailedAnswers.length;
    const passed = score >= 32; // Standard AutoTsON pass mark (32 out of 40 = 80%)

    // Save to database
    const attemptId = await db.saveTestAttempt(
      req.user.userId,
      score,
      totalQuestions,
      passed,
      timeSpentSeconds || 0,
      language,
      detailedAnswers
    );

    // Clean up test session
    if (testSessionId) {
      activeTestSessions.delete(testSessionId);
    }

    // Refresh user stats
    const stats = await db.getUserStats(req.user.userId);

    res.json({
      attemptId,
      score,
      totalQuestions,
      percentage: Math.round((score / totalQuestions) * 100),
      passed,
      timeSpentSeconds: timeSpentSeconds || 0,
      timed: isTimed,
      answers: detailedAnswers,
      stats
    });
  } catch (err) {
    console.error('Submit test error:', err);
    res.status(500).json({ error: 'Тест нәтижесін сақтау кезінде қате орын алды: ' + err.message });
  }
});

// Test history for current user
app.get('/api/history', requireAuth, async (req, res) => {
  try {
    const history = await db.getUserTestHistory(req.user.userId);
    const stats = await db.getUserStats(req.user.userId);
    res.json({ history, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Single past attempt detail
app.get('/api/history/:id', requireAuth, async (req, res) => {
  try {
    const attempt = await db.getTestAttemptById(req.params.id, req.user.userId);
    if (!attempt) {
      return res.status(404).json({ error: 'Нәтиже табылмады' });
    }
    res.json(attempt);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// General stats
app.get('/api/platform-stats', (req, res) => {
  res.json({
    totalQuestions: questions.length,
    languages: ['kk', 'ru', 'en'],
    questionsPerTest: 40,
    passingScore: 32
  });
});

// ================= STUDY / MEMORIZATION ENDPOINTS (LOCKED WITHOUT ACCESS) =================

// Browse and study questions with search and pagination
app.get('/api/study/questions', requireAuth, requireAccess, (req, res) => {
  try {
    const lang = req.query.lang || 'kk';
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(5, parseInt(req.query.limit) || 20));
    const search = (req.query.search || '').trim().toLowerCase();
    const filter = req.query.filter || 'all'; // 'all', 'image', 'no-image'

    let filtered = questions;

    // Filter by image
    if (filter === 'image') {
      filtered = filtered.filter(q => hasQuestionImage(q.id));
    } else if (filter === 'no-image') {
      filtered = filtered.filter(q => !hasQuestionImage(q.id));
    }

    // Filter by search keyword
    if (search) {
      filtered = filtered.filter(q => {
        const langData = q[lang] || q.kk || q.ru;
        const qText = (langData.question || '').toLowerCase();
        const optsText = (langData.options || []).join(' ').toLowerCase();
        const numStr = q.number.toString();
        return qText.includes(search) || optsText.includes(search) || numStr === search;
      });
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;
    const pageItems = filtered.slice(offset, offset + limit).map(q => {
      const langData = q[lang] || q.kk || q.ru;
      return {
        id: q.id,
        number: q.number,
        question: langData.question,
        options: langData.options,
        kk: q.kk,
        ru: q.ru,
        en: q.en,
        correct_index: q.correct_index,
        hasImage: hasQuestionImage(q.id),
        imageUrl: hasQuestionImage(q.id) ? `/images/q_${q.id}.png` : null
      };
    });

    res.json({
      total,
      page,
      totalPages,
      limit,
      questions: pageItems
    });
  } catch (err) {
    console.error('Study questions error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get single question by ID or number
app.get('/api/study/question/:id', requireAuth, requireAccess, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const lang = req.query.lang || 'kk';
    const q = questionMap.get(id);
    if (!q) {
      return res.status(404).json({ error: 'Сұрақ табылмады' });
    }

    const langData = q[lang] || q.kk || q.ru;
    res.json({
      id: q.id,
      number: q.number,
      question: langData.question,
      options: langData.options,
      kk: q.kk,
      ru: q.ru,
      en: q.en,
      correct_index: q.correct_index,
      hasImage: hasQuestionImage(q.id),
      imageUrl: hasQuestionImage(q.id) ? `/images/q_${q.id}.png` : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start express server
async function start() {
  await db.initDb();
  app.listen(PORT, () => {
    console.log(`PDD Testing Platform running at http://localhost:${PORT}`);
  });
}

start();

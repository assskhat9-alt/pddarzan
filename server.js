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

// HMAC Authentication Token Secret (must be set via AUTH_SECRET env var in production)
let AUTH_SECRET = process.env.AUTH_SECRET;
if (!AUTH_SECRET || AUTH_SECRET.length < 32) {
  AUTH_SECRET = crypto.randomBytes(48).toString('hex');
  console.warn('WARNING: AUTH_SECRET env var is missing or shorter than 32 chars. Using a random secret — all sessions will be invalidated on restart.');
}

// Token lifetime: 30 days
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function generateAuthToken(user) {
  const now = Date.now();
  const payload = {
    userId: user.id,
    username: user.username,
    role: user.role || 'user',
    createdAt: now,
    exp: now + TOKEN_TTL_MS,
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
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

// Active test sessions: sessionId -> { userId, questionIds, startedAt, language, timed, mode }
const activeTestSessions = new Map();

// Helper to check if image exists for question
function hasQuestionImage(qId) {
  return fs.existsSync(path.resolve(`public/images/q_${qId}.png`));
}

// Question payload for a running test (never includes the correct answer)
function toTestQuestion(q, idx, lang) {
  const langData = q[lang] || q.kk || q.ru;
  const hasImage = hasQuestionImage(q.id);
  return {
    index: idx + 1,
    id: q.id,
    number: q.number,
    question: langData.question,
    options: langData.options,
    kk: q.kk,
    ru: q.ru,
    en: q.en,
    hasImage,
    imageUrl: hasImage ? `/images/q_${q.id}.png` : null
  };
}

const PASS_RATIO = 0.8; // 32 of 40, as at AutoTSON

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

    // Check access expiration
    let isExpired = false;
    let hasAccess = false;
    if (freshUser.role === 'admin') {
      hasAccess = true;
    } else if (freshUser.has_access === 1) {
      if (freshUser.access_expires_at) {
        const expiresTime = new Date(freshUser.access_expires_at).getTime();
        if (!isNaN(expiresTime) && expiresTime < Date.now()) {
          isExpired = true;
          hasAccess = false;
        } else {
          hasAccess = true;
        }
      } else {
        hasAccess = true;
      }
    }

    req.user = {
      userId: freshUser.id,
      username: freshUser.username,
      fullName: freshUser.full_name,
      role: freshUser.role,
      hasAccess,
      accessExpiresAt: freshUser.access_expires_at,
      isExpired,
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
  const isExpired = req.user && req.user.isExpired;
  const msg = isExpired
    ? 'Сіздің қолжетімділік (доступ) мерзіміңіз аяқталды. Мерзімді ұзарту үшін әкімшіге (WhatsApp) хабарласыңыз.'
    : 'Бұл бөлім құлыпталған. Платформаға толық қолжетімділік алу үшін әкімшіге (WhatsApp) хабарласыңыз.';

  return res.status(403).json({
    error: msg,
    code: 'ACCESS_LOCKED',
    isExpired: !!isExpired,
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

// Health check endpoint for keep-alive monitoring
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

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
    let { username, full_name, fullName, password, deviceId, phone } = req.body;
    username = (username || '').trim().toLowerCase();
    full_name = (full_name || fullName || '').trim();
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

    // Default self-registered accounts are locked on paid basis (hasAccess = 0)
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
        hasAccess: user.role === 'admin' || (user.has_access === 1 && (!user.access_expires_at || new Date(user.access_expires_at).getTime() >= Date.now())),
        accessExpiresAt: user.access_expires_at,
        isExpired: user.access_expires_at ? (new Date(user.access_expires_at).getTime() < Date.now()) : false,
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
    const rawUsers = await db.getAllUsers();
    const now = Date.now();

    const users = rawUsers.map(u => {
      let isExpired = false;
      let effectiveAccess = false;
      if (u.role === 'admin') {
        effectiveAccess = true;
      } else if (u.has_access === 1) {
        if (u.access_expires_at) {
          const exp = new Date(u.access_expires_at).getTime();
          if (!isNaN(exp) && exp < now) {
            isExpired = true;
            effectiveAccess = false;
          } else {
            effectiveAccess = true;
          }
        } else {
          effectiveAccess = true; // Unlimited
        }
      }

      return {
        ...u,
        has_access: effectiveAccess ? 1 : 0,
        raw_has_access: u.has_access,
        is_expired: isExpired
      };
    });

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

// Admin creates new user (with access period: 7_days, 30_days, 90_days, unlimited, or revoke)
app.post('/api/admin/user/create', requireAuth, requireAdmin, async (req, res) => {
  try {
    let { username, full_name, password, phone, has_access, access_period } = req.body;
    username = (username || '').trim().toLowerCase();
    full_name = (full_name || '').trim();
    password = (password || '');
    phone = (phone || '').trim();

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

    const period = access_period || (has_access !== false ? '30_days' : 'revoke');
    let access, expiresAt;
    try {
      ({ hasAccess: access, expiresAt } = db.resolveAccessPeriod(period));
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }

    const newUser = await db.createUser(username, full_name, password, 'user', access, phone, expiresAt);
    res.json({ success: true, user: newUser });
  } catch (err) {
    res.status(500).json({ error: 'Пайдаланушыны қосу қатесі: ' + err.message });
  }
});

// Admin sets user access period (7_days, 30_days, 90_days, unlimited, revoke)
app.post('/api/admin/user/set-access', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId, period } = req.body;
    if (!userId) return res.status(400).json({ error: 'Пайдаланушы ID көрсетілмеді' });

    const result = await db.setUserAccessPeriod(userId, period);
    res.json({ success: true, userId, hasAccess: result.hasAccess, accessExpiresAt: result.accessExpiresAt });
  } catch (err) {
    res.status(500).json({ error: 'Доступты өзгерту қатесі: ' + err.message });
  }
});

// Admin toggles user access (legacy / backwards-compatible)
app.post('/api/admin/user/toggle-access', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId, hasAccess, period } = req.body;
    if (!userId) return res.status(400).json({ error: 'Пайдаланушы ID көрсетілмеді' });

    const selectedPeriod = period || (hasAccess ? '30_days' : 'revoke');
    const result = await db.setUserAccessPeriod(userId, selectedPeriod);
    res.json({ success: true, userId, hasAccess: result.hasAccess, accessExpiresAt: result.accessExpiresAt });
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
    const testQuestions = selected.map((q, idx) => toTestQuestion(q, idx, lang));

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

// Fixed set of 20 demo questions (same for everyone): general rules, signs, markings,
// right of way, overtaking, stopping, railway crossing, fines, first aid
const DEMO_QUESTION_IDS = [33, 60, 86, 112, 162, 238, 264, 289, 339, 443, 494, 523, 582, 644, 705, 791, 817, 843, 897, 1042];
const DEMO_PASS_RATIO = 0.8; // same 80% pass mark as the real exam

// Start the 20-question DEMO test session (Accessible to anyone, including guests & AI, to preview the platform)
app.get('/api/test/demo', (req, res) => {
  try {
    const lang = req.query.lang || 'kk';
    if (questions.length === 0) {
      return res.status(500).json({ error: 'Сұрақтар базасы жүктелмеген' });
    }

    const authHeader = req.headers['authorization'];
    const decoded = authHeader ? verifyAuthToken(authHeader.replace(/^Bearer\s+/i, '').trim()) : null;
    const userId = (decoded && decoded.userId) || 'guest';

    const selected = DEMO_QUESTION_IDS.map(id => questionMap.get(id)).filter(Boolean);
    const questionIds = selected.map(q => q.id);

    const testSessionId = 'demo_' + crypto.randomUUID();
    activeTestSessions.set(testSessionId, {
      userId,
      questionIds,
      startedAt: Date.now(),
      language: lang,
      isDemo: true,
      timed: true
    });

    const testQuestions = selected.map((q, idx) => toTestQuestion(q, idx, lang));

    res.json({
      testSessionId,
      totalQuestions: selected.length,
      timeLimitMinutes: selected.length,
      timed: true,
      isDemo: true,
      language: lang,
      questions: testQuestions
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit demo test answers (Accessible without prior login)
app.post('/api/test/demo-submit', async (req, res) => {
  try {
    const { testSessionId, timeSpentSeconds, answers, language = 'kk' } = req.body;
    const session = activeTestSessions.get(testSessionId);
    // Only the fixed demo questions can be graded here (never arbitrary ids from the client)
    const questionIds = session ? session.questionIds : DEMO_QUESTION_IDS;

    const answersMap = new Map();
    (answers || []).forEach(a => answersMap.set(a.questionId, a.selectedIndex));

    let score = 0;
    const detailedAnswers = [];

    for (let i = 0; i < questionIds.length; i++) {
      const qId = questionIds[i];
      const q = questionMap.get(qId);
      if (!q) continue;

      const userSelected = answersMap.has(qId) ? answersMap.get(qId) : -1;
      const isCorrect = (userSelected === q.correct_index);
      if (isCorrect) score++;

      const langData = q[language] || q.kk || q.ru;
      detailedAnswers.push({
        questionId: q.id,
        id: q.id,
        number: q.number,
        question: langData.question,
        options: langData.options,
        kk: q.kk,
        ru: q.ru,
        en: q.en,
        correctIndex: q.correct_index,
        userSelected,
        isCorrect,
        hasImage: hasQuestionImage(q.id),
        imageUrl: hasQuestionImage(q.id) ? `/images/q_${q.id}.png` : null
      });
    }

    if (testSessionId) activeTestSessions.delete(testSessionId);

    res.json({
      success: true,
      score,
      totalQuestions: detailedAnswers.length,
      percentage: Math.round((score / detailedAnswers.length) * 100),
      passed: score >= Math.ceil(detailedAnswers.length * DEMO_PASS_RATIO),
      timeSpentSeconds: timeSpentSeconds || 60,
      isDemo: true,
      answers: detailedAnswers
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// "Work on mistakes": a test from the questions the user last answered wrong (up to 40, untimed)
app.get('/api/test/mistakes', requireAuth, requireAccess, async (req, res) => {
  try {
    const lang = req.query.lang || 'kk';
    const mistakes = await db.getUserMistakes(req.user.userId);
    const selected = mistakes
      .map(m => ({ ...m, rnd: Math.random() }))
      .sort((a, b) => b.wrongCount - a.wrongCount || a.rnd - b.rnd)
      .slice(0, 40)
      .map(m => questionMap.get(m.questionId))
      .filter(Boolean)
      .sort(() => 0.5 - Math.random());

    if (selected.length === 0) {
      return res.json({ totalQuestions: 0, totalMistakes: 0, questions: [] });
    }

    const testSessionId = crypto.randomUUID();
    activeTestSessions.set(testSessionId, {
      userId: req.user.userId,
      questionIds: selected.map(q => q.id),
      startedAt: Date.now(),
      language: lang,
      timed: false,
      mode: 'mistakes'
    });

    res.json({
      testSessionId,
      mode: 'mistakes',
      totalQuestions: selected.length,
      totalMistakes: mistakes.length,
      timeLimitMinutes: 0,
      timed: false,
      language: lang,
      questions: selected.map((q, idx) => toTestQuestion(q, idx, lang))
    });
  } catch (err) {
    console.error('Mistakes test error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Submit test answers (Requires Full Paid Access)
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
    const passed = score >= Math.ceil(totalQuestions * PASS_RATIO); // 32 of 40 = 80%, as at AutoTSON

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
      mode: session && session.mode ? session.mode : 'exam',
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
    const mistakes = await db.getUserMistakes(req.user.userId);
    res.json({ history, stats, mistakesCount: mistakes.length });
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
  startKeepAlive();
  startExpiredHistoryCleanup();
}

// Test history of users whose access expired more than this many days ago is deleted
const EXPIRED_HISTORY_GRACE_DAYS = 1;

function startExpiredHistoryCleanup() {
  const cleanup = async () => {
    try {
      const deleted = await db.deleteExpiredUsersHistory(EXPIRED_HISTORY_GRACE_DAYS);
      if (deleted > 0) console.log(`Expired-access cleanup: deleted ${deleted} test attempts.`);
    } catch (err) {
      console.error('Expired-access cleanup failed:', err.message);
    }
  };
  cleanup();
  setInterval(cleanup, 6 * 60 * 60 * 1000);
}

// Render free instances sleep after 15 min without inbound traffic.
// Pinging our own public URL (through Render's proxy) every 10 min keeps the instance awake.
function startKeepAlive() {
  const publicUrl = process.env.KEEP_ALIVE_URL || process.env.RENDER_EXTERNAL_URL;
  if (!publicUrl) return;
  const healthUrl = publicUrl.replace(/\/+$/, '') + '/health';
  const INTERVAL_MS = 10 * 60 * 1000;
  setInterval(async () => {
    try {
      const res = await fetch(healthUrl, { signal: AbortSignal.timeout(30000) });
      if (!res.ok) console.warn(`Keep-alive ping returned ${res.status}`);
    } catch (err) {
      console.warn('Keep-alive ping failed:', err.message);
    }
  }, INTERVAL_MS);
  console.log(`Keep-alive enabled: pinging ${healthUrl} every 10 minutes.`);
}

start();

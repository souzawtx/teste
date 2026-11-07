'use strict';

/* Liga dos Leitores — servidor local/centralizado, sem dependências externas.
 * Para uso em rede, hospede este servidor em HTTPS e configure as variáveis do .env.
 * O arquivo data/liga-db.json é criado automaticamente e não deve ser publicado.
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = __dirname;
// Leitura simples de .env com módulos nativos, sem dependência externa.
const ENV_PATH = path.join(ROOT, '.env');
if (fs.existsSync(ENV_PATH)) {
  fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/).forEach(line => {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  });
}
const DATA_DIR = path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'liga-db.json');
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || '0.0.0.0';
const IS_PROD = process.env.NODE_ENV === 'production';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const sessions = new Map();
const rateBuckets = new Map();
let writeQueue = Promise.resolve();
let teacherSetupInProgress = false;

const DEFAULT_CONFIG = {
  classes: [{ code: '8ANO-B', name: '8º Ano B' }],
  missionRules: { startingHearts: 3, allowHeartRecovery: true, xpPerQuestion: 20 }
};

function readDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    const initial = { users: {}, teacherConfig: DEFAULT_CONFIG, customMissions: [], createdAt: Date.now() };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), { mode: 0o600 });
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    parsed.users ||= {};
    parsed.teacherConfig ||= DEFAULT_CONFIG;
    parsed.customMissions ||= [];
    return parsed;
  } catch (error) {
    console.error('Banco de dados JSON inválido. Faça uma cópia de segurança de data/liga-db.json.', error);
    process.exit(1);
  }
}
let db = readDb();
function persist() {
  writeQueue = writeQueue.catch(() => {}).then(() => new Promise((resolve, reject) => {
    const tmp = `${DB_FILE}.${process.pid}.tmp`;
    fs.writeFile(tmp, JSON.stringify(db, null, 2), { mode: 0o600 }, err => {
      if (err) return reject(err);
      fs.rename(tmp, DB_FILE, err2 => err2 ? reject(err2) : resolve());
    });
  }));
  return writeQueue;
}

function safeUser(user) {
  if (!user) return null;
  return {
    username: user.username,
    role: user.role,
    classCode: user.classCode || '',
    appearance: user.appearance || null,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt || null
  };
}
function passwordHash(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}
function timingSafeHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(part => {
    const i = part.indexOf('=');
    if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}
function currentUser(req) {
  const sid = parseCookies(req).ll_session;
  const entry = sid && sessions.get(sid);
  if (!entry) return null;
  if (entry.expires < Date.now()) { sessions.delete(sid); return null; }
  entry.expires = Date.now() + SESSION_TTL_MS;
  return db.users[entry.username] || null;
}
function send(res, status, payload, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
    ...headers
  });
  res.end(JSON.stringify(payload));
}
function fail(res, status, message) { send(res, status, { error: message }); }
async function readBody(req, limit = 1024 * 1024) {
  let size = 0; const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw Object.assign(new Error('Corpo da requisição muito grande.'), { status: 413 });
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw Object.assign(new Error('JSON inválido.'), { status: 400 }); }
}
function validOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // clientes same-origin sem Origin
  try { return new URL(origin).host === req.headers.host; } catch { return false; }
}
function rateLimit(req, key) {
  const ip = req.socket.remoteAddress || 'unknown';
  const id = `${ip}:${key}`;
  const now = Date.now();
  const bucket = rateBuckets.get(id) || { start: now, count: 0 };
  if (now - bucket.start > 15 * 60 * 1000) { bucket.start = now; bucket.count = 0; }
  bucket.count += 1; rateBuckets.set(id, bucket);
  return bucket.count <= 10;
}
function requireAuth(req, res, role) {
  const user = currentUser(req);
  if (!user) { fail(res, 401, 'Sua sessão expirou. Entre novamente.'); return null; }
  if (role && user.role !== role) { fail(res, 403, 'Você não tem permissão para realizar esta ação.'); return null; }
  return user;
}
function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '').slice(0, 32);
}
function hasTeacherAccount() {
  return Object.values(db.users).some(account => account.role === 'teacher');
}
function isLoopbackRequest(req) {
  const address = String(req.socket.remoteAddress || '').toLowerCase();
  return address === '::1' || address === '::ffff:127.0.0.1' || address.startsWith('127.');
}
function publicStudent(user) {
  return {
    ...safeUser(user),
    gameState: user.gameState || null,
    activity: user.activity || []
  };
}
function authPayload(user) {
  const base = { user: safeUser(user) };
  if (user.role === 'teacher') {
    base.data = {
      students: Object.values(db.users).filter(u => u.role === 'student').map(publicStudent),
      teacherConfig: db.teacherConfig,
      customMissions: db.customMissions
    };
  } else {
    base.data = {
      user: publicStudent(user),
      teacherConfig: db.teacherConfig,
      customMissions: db.customMissions
    };
  }
  return base;
}
function setSession(res, username) {
  const sid = crypto.randomBytes(32).toString('hex');
  sessions.set(sid, { username, expires: Date.now() + SESSION_TTL_MS });
  const secure = IS_PROD ? '; Secure' : '';
  res.setHeader('Set-Cookie', `ll_session=${sid}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}${secure}`);
}
function sanitizeGameState(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Progresso inválido.');
  const state = JSON.parse(JSON.stringify(input));
  state.xp = Math.max(0, Math.min(100000, Number(state.xp) || 0));
  state.coins = Math.max(0, Math.min(100000, Number(state.coins) || 0));
  state.hearts = Math.max(0, Math.min(5, Number(state.hearts) || 0));
  state.maxHearts = Math.max(1, Math.min(5, Number(state.maxHearts) || 3));
  state.completedMissions = Array.isArray(state.completedMissions) ? [...new Set(state.completedMissions.map(String).slice(0, 200))] : [];
  state.inventory = Array.isArray(state.inventory) ? state.inventory.slice(0, 100) : [];
  state.savedAt = Date.now();
  return state;
}
function sanitizeMission(m) {
  if (!m || typeof m !== 'object') throw new Error('Missão inválida.');
  const clean = {
    id: String(m.id || `custom_${crypto.randomBytes(6).toString('hex')}`).slice(0, 64),
    worldId: String(m.worldId || 'metamorphosis').slice(0, 48),
    order: Math.max(1, Math.min(999, Number(m.order) || 1)),
    title: String(m.title || '').trim().slice(0, 100),
    briefing: String(m.briefing || '').trim().slice(0, 800),
    npcId: null,
    xpReward: Math.max(5, Math.min(300, Number.isFinite(Number(m.xpReward)) && Number(m.xpReward) > 0 ? Number(m.xpReward) : 30)),
    coinReward: Math.max(0, Math.min(200, Number.isFinite(Number(m.coinReward)) ? Number(m.coinReward) : 10)),
    type: 'quiz',
    requires: Array.isArray(m.requires) ? m.requires.map(String).slice(0, 20) : [],
    excerpt: { text: String(m.excerpt?.text || '').trim().slice(0, 2500), source: String(m.excerpt?.source || '').trim().slice(0, 180) },
    question: String(m.question || '').trim().slice(0, 500),
    options: Array.isArray(m.options) ? m.options.slice(0, 5).map(o => ({ text: String(o.text || '').trim().slice(0, 350), correct: !!o.correct, feedback: String(o.feedback || '').trim().slice(0, 500) })) : [],
    hint: String(m.hint || '').trim().slice(0, 500),
    skill: ['literal', 'inferencial', 'interpretacao', 'critica'].includes(m.skill) ? m.skill : 'interpretacao',
    published: m.published !== false,
    createdAt: Number(m.createdAt) || Date.now()
  };
  if (!clean.title || !clean.briefing || !clean.question || clean.options.length < 2 || clean.options.filter(o => o.correct).length !== 1 || clean.options.some(o => !o.text)) {
    throw new Error('Preencha o título, contexto, pergunta e pelo menos duas alternativas com exatamente uma resposta correta.');
  }
  return clean;
}

// Cria/atualiza a conta da professora somente a partir de configuração do servidor.
if (process.env.TEACHER_USERNAME && process.env.TEACHER_PASSWORD) {
  const username = normalizeUsername(process.env.TEACHER_USERNAME);
  const password = process.env.TEACHER_PASSWORD;
  if (!db.users[username]) {
    const salt = crypto.randomBytes(16).toString('hex');
    db.users[username] = { username, role: 'teacher', salt, passwordHash: passwordHash(password, salt), createdAt: Date.now(), appearance: null, activity: [] };
    persist().catch(console.error);
    console.log(`Conta inicial da professora criada: ${username}`);
  } else if (db.users[username].role !== 'teacher') {
    console.warn('TEACHER_USERNAME já pertence a uma conta que não é professora. Ajuste a configuração.');
  }
}

async function api(req, res, url) {
  if (req.method !== 'GET' && !validOrigin(req)) return fail(res, 403, 'Origem não autorizada.');

  if (url.pathname === '/api/health' && req.method === 'GET') return send(res, 200, { ok: true, service: 'Liga dos Leitores', version: '2.3.1' });
  if (url.pathname === '/api/classes' && req.method === 'GET') return send(res, 200, { classes: db.teacherConfig.classes || [] });

  // Primeiro acesso da professora: permitido somente no próprio computador do servidor.
  if (url.pathname === '/api/auth/teacher-setup-status' && req.method === 'GET') {
    const configured = hasTeacherAccount();
    return send(res, 200, { configured, canSetup: !configured && isLoopbackRequest(req) });
  }
  if (url.pathname === '/api/auth/setup-teacher' && req.method === 'POST') {
    if (!isLoopbackRequest(req)) return fail(res, 403, 'Por segurança, a primeira conta da professora só pode ser configurada no próprio computador que executa o servidor.');
    if (teacherSetupInProgress) return fail(res, 409, 'A configuração da conta já está em andamento. Tente novamente.');
    if (hasTeacherAccount()) return fail(res, 409, 'A conta da professora já foi configurada. Use o login normal.');
    teacherSetupInProgress = true;
    try {
      const body = await readBody(req);
      const username = normalizeUsername(body.username);
      const password = String(body.password || '');
      const confirmation = String(body.confirmPassword || '');
      if (!/^[a-z0-9_.-]{3,32}$/.test(username)) return fail(res, 400, 'Use um usuário de 3 a 32 caracteres: letras sem acento, números, ponto, hífen ou sublinhado.');
      if (password.length < 10 || password.length > 128) return fail(res, 400, 'Crie uma senha com pelo menos 10 caracteres.');
      if (password !== confirmation) return fail(res, 400, 'A confirmação da senha não confere.');
      if (db.users[username]) return fail(res, 409, 'Esse nome já pertence a uma conta de estudante. Escolha outro usuário para a professora.');
      const salt = crypto.randomBytes(16).toString('hex');
      const teacher = db.users[username] = { username, role: 'teacher', salt, passwordHash: passwordHash(password, salt), createdAt: Date.now(), appearance: null, activity: [] };
      await persist();
      setSession(res, username);
      console.log(`Conta inicial da professora configurada pelo primeiro acesso local: ${username}`);
      return send(res, 201, authPayload(teacher));
    } finally {
      teacherSetupInProgress = false;
    }
  }

  if (url.pathname === '/api/auth/access' && req.method === 'POST') {
    if (!rateLimit(req, 'auth')) return fail(res, 429, 'Muitas tentativas. Aguarde 15 minutos.');
    const body = await readBody(req);
    const username = normalizeUsername(body.username);
    const password = String(body.password || '');
    const role = body.role === 'teacher' ? 'teacher' : 'student';
    if (!/^[a-z0-9_.-]{3,32}$/.test(username)) return fail(res, 400, 'Use um nome de usuário com 3 a 32 caracteres: letras, números, ponto, hífen ou sublinhado.');
    if (password.length < 8 || password.length > 128) return fail(res, 400, 'A senha deve ter entre 8 e 128 caracteres.');
    let user = db.users[username];
    if (!user) {
      if (role === 'teacher') return fail(res, 403, hasTeacherAccount() ? 'Conta da professora não encontrada. Confira o usuário utilizado.' : 'A conta da professora ainda não foi configurada. Volte à aba Professora e clique em Configurar primeiro acesso.');
      const requestedClass = String(body.classCode || '').trim().toUpperCase().slice(0, 24);
      const knownClasses = (db.teacherConfig.classes || []).map(item => String(item.code).toUpperCase());
      if (requestedClass && !knownClasses.includes(requestedClass)) return fail(res, 400, 'Código de turma não encontrado. Consulte a professora.');
      const salt = crypto.randomBytes(16).toString('hex');
      user = db.users[username] = {
        username, role: 'student', salt, passwordHash: passwordHash(password, salt),
        classCode: requestedClass,
        createdAt: Date.now(), appearance: null, gameState: null, activity: []
      };
      await persist();
    } else {
      if (user.role !== role) {
        if (role === 'teacher' && user.role === 'student') return fail(res, 403, 'Este usuário pertence a uma conta de estudante. Selecione Estudante para entrar nessa conta ou use a conta própria da professora.');
        return fail(res, 403, `Esta conta é do tipo ${user.role === 'teacher' ? 'professora' : 'estudante'}.`);
      }
      if (!timingSafeHex(user.passwordHash, passwordHash(password, user.salt))) return fail(res, 401, 'Nome de usuário ou senha incorretos.');
    }
    user.lastLoginAt = Date.now(); await persist();
    setSession(res, username);
    return send(res, 200, authPayload(user));
  }

  if (url.pathname === '/api/auth/session' && req.method === 'GET') {
    const user = requireAuth(req, res); if (!user) return;
    return send(res, 200, authPayload(user));
  }
  if (url.pathname === '/api/auth/logout' && req.method === 'POST') {
    const sid = parseCookies(req).ll_session; if (sid) sessions.delete(sid);
    res.setHeader('Set-Cookie', 'll_session=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0' + (IS_PROD ? '; Secure' : ''));
    return send(res, 200, { ok: true });
  }
  if (url.pathname === '/api/auth/session' && req.method === 'DELETE') {
    const sid = parseCookies(req).ll_session; if (sid) sessions.delete(sid);
    res.setHeader('Set-Cookie', 'll_session=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0' + (IS_PROD ? '; Secure' : ''));
    return send(res, 200, { ok: true });
  }

  const user = requireAuth(req, res); if (!user) return;
  if (url.pathname === '/api/data' && req.method === 'GET') return send(res, 200, authPayload(user).data);
  if (url.pathname === '/api/profile' && req.method === 'PUT') {
    const body = await readBody(req);
    if (!body.appearance || typeof body.appearance !== 'object') return fail(res, 400, 'Avatar inválido.');
    const a = body.appearance;
    user.appearance = {
      gender: a.gender === 'male' ? 'male' : 'female', name: String(a.name || '').trim().slice(0, 20),
      outfit: /^#[0-9a-f]{6}$/i.test(a.outfit) ? a.outfit : '#7c3aed',
      hair: /^#[0-9a-f]{6}$/i.test(a.hair) ? a.hair : '#2a1810',
      skin: /^#[0-9a-f]{6}$/i.test(a.skin) ? a.skin : '#f1c295',
      accessory: ['none', 'hat', 'glasses', 'backpack'].includes(a.accessory) ? a.accessory : 'none'
    };
    await persist(); return send(res, 200, { appearance: user.appearance });
  }
  if (url.pathname === '/api/game-state' && req.method === 'PUT') {
    if (user.role !== 'student') return fail(res, 403, 'Apenas estudantes podem salvar progresso.');
    const body = await readBody(req);
    try {
      const incoming = sanitizeGameState(body.gameState);
      // Impede queda acidental de progresso por abas/sincronizações atrasadas.
      const previous = user.gameState || {};
      incoming.xp = Math.max(Number(previous.xp) || 0, incoming.xp);
      // Moedas podem diminuir após uma compra legítima no Mercado Literário.
      // A sincronização do cliente é serializada para reduzir gravações fora de ordem.
      incoming.completedMissions = [...new Set([...(previous.completedMissions || []), ...incoming.completedMissions])];
      const inventory = [...(previous.inventory || []), ...(incoming.inventory || [])];
      incoming.inventory = [...new Map(inventory.filter(item => item && item.id).map(item => [String(item.id), item])).values()].slice(0, 100);
      user.gameState = incoming;
      await persist(); return send(res, 200, { ok: true, savedAt: incoming.savedAt });
    } catch (error) { return fail(res, 400, error.message); }
  }
  if (url.pathname === '/api/activity' && req.method === 'POST') {
    if (user.role !== 'student') return fail(res, 403, 'Apenas estudantes podem registrar atividades.');
    const body = await readBody(req);
    const item = body.activity || {};
    user.activity ||= [];
    user.activity.push({ type: String(item.type || 'event').slice(0, 40), missionId: String(item.missionId || '').slice(0, 64), missionTitle: String(item.missionTitle || '').slice(0, 120), xpGained: Math.max(0, Math.min(500, Number(item.xpGained) || 0)), coinsGained: Math.max(0, Math.min(500, Number(item.coinsGained) || 0)), usedHint: !!item.usedHint, score: Math.max(0, Math.min(100, Number(item.score) || 0)), total: Math.max(0, Math.min(100, Number(item.total) || 0)), bySkill: item.bySkill && typeof item.bySkill === 'object' ? item.bySkill : null, timestamp: Date.now() });
    user.activity = user.activity.slice(-1000); await persist(); return send(res, 200, { ok: true });
  }
  if (url.pathname === '/api/config' && req.method === 'PUT') {
    if (user.role !== 'teacher') return fail(res, 403, 'Apenas a professora pode alterar as configurações.');
    const body = await readBody(req); const c = body.config || {};
    db.teacherConfig = {
      classes: Array.isArray(c.classes) ? c.classes.slice(0, 100).map(x => ({ code: String(x.code || '').trim().toUpperCase().slice(0, 24), name: String(x.name || '').trim().slice(0, 80) })).filter(x => /^[A-Z0-9_-]{2,24}$/.test(x.code) && x.name) : DEFAULT_CONFIG.classes,
      missionRules: {
        startingHearts: Math.max(1, Math.min(5, Number(c.missionRules?.startingHearts) || 3)),
        allowHeartRecovery: c.missionRules?.allowHeartRecovery !== false,
        xpPerQuestion: Math.max(5, Math.min(100, Number(c.missionRules?.xpPerQuestion) || 20))
      }
    };
    await persist(); return send(res, 200, { ok: true, config: db.teacherConfig });
  }
  if (url.pathname === '/api/missions' && req.method === 'PUT') {
    if (user.role !== 'teacher') return fail(res, 403, 'Apenas a professora pode editar missões.');
    const body = await readBody(req);
    try {
      const list = Array.isArray(body.missions) ? body.missions : [];
      if (list.length > 200) return fail(res, 400, 'Limite de 200 missões personalizadas.');
      db.customMissions = list.map(sanitizeMission);
      await persist(); return send(res, 200, { ok: true, missions: db.customMissions });
    } catch (error) { return fail(res, 400, error.message); }
  }
  if (url.pathname === '/api/ranking' && req.method === 'GET') {
    if (user.role !== 'student') return fail(res, 403, 'Ranking disponível para estudantes.');
    const classmates = user.classCode
      ? Object.values(db.users).filter(u => u.role === 'student' && u.classCode === user.classCode)
      : [user];
    const rows = classmates.map(u => ({
      username: u.username,
      classCode: u.classCode || '',
      appearance: u.appearance ? { gender: u.appearance.gender, name: u.appearance.name, outfit: u.appearance.outfit, hair: u.appearance.hair, skin: u.appearance.skin, accessory: u.appearance.accessory } : null,
      gameState: u.gameState ? {
        xp: Number(u.gameState.xp) || 0,
        completedMissions: Array.isArray(u.gameState.completedMissions) ? u.gameState.completedMissions.map(String).slice(0, 200) : [],
        stats: {
          missionsCorrect: Number(u.gameState.stats?.missionsCorrect) || 0,
          missionsWrong: Number(u.gameState.stats?.missionsWrong) || 0
        }
      } : null
    }));
    return send(res, 200, { students: rows, scope: user.classCode ? 'class' : 'individual' });
  }
  if (url.pathname === '/api/teacher/students' && req.method === 'DELETE') {
    if (user.role !== 'teacher') return fail(res, 403, 'Apenas a professora pode executar esta ação.');
    const confirmation = await readBody(req);
    if (confirmation.confirm !== 'APAGAR ESTUDANTES') return fail(res, 400, 'Confirmação inválida.');
    Object.keys(db.users).forEach(username => { if (db.users[username].role === 'student') delete db.users[username]; });
    db.customMissions = [];
    await persist();
    return send(res, 200, { ok: true });
  }
  return fail(res, 404, 'Rota da API não encontrada.');
}

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon' };
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/.env' || pathname.startsWith('/data/') || pathname.startsWith('/.git/')) { res.writeHead(404); return res.end('Not found'); }
    if (pathname === '/') pathname = '/index.html';
    const filePath = path.resolve(ROOT, `.${pathname}`);
    if (!filePath.startsWith(ROOT + path.sep) && filePath !== path.join(ROOT, 'index.html')) { res.writeHead(403); return res.end('Forbidden'); }
    let stat; try { stat = fs.statSync(filePath); } catch { res.writeHead(404); return res.end('Not found'); }
    if (!stat.isFile()) { res.writeHead(404); return res.end('Not found'); }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'same-origin',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
      // Durante o desenvolvimento, não reutilizar JS/CSS antigos do navegador:
      // isso evita que a interface de login fique incompatível com o servidor atualizado.
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) fail(res, error.status || 500, error.status ? error.message : 'Erro interno do servidor.');
    else res.destroy();
  }
});
server.listen(PORT, HOST, () => {
  console.log(`Liga dos Leitores disponível em http://localhost:${PORT}`);
  if (!hasTeacherAccount()) console.warn('Ainda não há conta de professora. Acesse pelo próprio computador, selecione Professora e use “Configurar primeiro acesso”.');
  if (IS_PROD) console.log('Modo produção: configure HTTPS no proxy reverso.');
});

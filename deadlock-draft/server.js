'use strict';
/*
 * Deadlock Draft — сервер без внешних зависимостей (Node.js 18+).
 * Вход через Steam (OpenID 2.0), гостевой вход с ником, комнаты драфта
 * с проверкой ходов и таймером на сервере, обновления в реальном времени (SSE),
 * статистика игроков из открытого Deadlock API (на нём же построен StatLocker).
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname, 'public');
const DAPI = (process.env.DEADLOCK_API_URL || 'https://api.deadlock-api.com').replace(/\/$/, '');
const STATLOCKER = process.env.STATLOCKER_PROFILE_URL || 'https://statlocker.gg/profile/{id}';
const STEAM_OP = 'https://steamcommunity.com/openid/login';
const STEAM64_BASE = 76561197960265728n;

fs.mkdirSync(DATA_DIR, { recursive: true });
const SECRET = process.env.SESSION_SECRET || (() => {
  const f = path.join(DATA_DIR, '.secret');
  try { return fs.readFileSync(f, 'utf8').trim(); } catch (e) { /* создадим */ }
  const s = crypto.randomBytes(32).toString('hex');
  try { fs.writeFileSync(f, s, { mode: 0o600 }); } catch (e) { /* только в памяти */ }
  return s;
})();

/* ---------- Герои ---------- */
const BUILTIN = [['Abrams','tank'],['Mo & Krill','tank'],['Rat King','tank'],['Victor','tank'],['Warden','tank'],
['Dynamo','sup'],['Ivy','sup'],['Kelvin','sup'],['McGinnis','sup'],['Nurse Harrow','sup'],['Paige','sup'],['Rem','sup'],['Viscous','sup'],
['Haze','gun'],['Holliday','gun'],['Mirage','gun'],['Venator','gun'],['Vindicta','gun'],['Violet','gun'],['Vyper','gun'],['Wraith','gun'],
['Celeste','spi'],['Graves','spi'],['Grey Talon','spi'],['Lady Geist','spi'],['Mina','spi'],['Seven','spi'],
['Apollo','ass'],['Calico','ass'],['Drifter','ass'],['Pocket','ass'],['Shiv','ass'],['Silver','ass'],['Yamato','ass'],
['Bebop','ini'],['Billy','ini'],['Deadman Danny','ini'],['Infernus','ini'],['Lash','ini'],
['Baba','dis'],['The Doorman','dis'],['Paradox','dis'],['Sinclair','dis'],['Solomon','dis']];
const hkey = n => String(n).toLowerCase().replace(/^the\s+/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
let roster = BUILTIN.map(([n, r]) => ({ id: hkey(n), name: n, role: r, img: null, heroId: null }));
let rosterIds = new Set(roster.map(h => h.id));
let rosterSource = 'builtin';

const httpsUrl = u => (typeof u === 'string' && /^https:\/\/[^\s"'<>]+$/.test(u) ? u : '');
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const clean = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, n);

function pickImage(images) {
  if (!images || typeof images !== 'object') return '';
  for (const k of ['icon_hero_card', 'icon_hero_card_webp', 'icon_image_small', 'icon_image_small_webp', 'selection_image', 'minimap_image']) {
    if (httpsUrl(images[k])) return images[k];
  }
  for (const v of Object.values(images)) if (httpsUrl(v) && /\.(png|webp|jpg)(\?|$)/i.test(v)) return v;
  return '';
}

async function refreshRoster() {
  try {
    const list = await dapi('/v1/assets/heroes', 6 * 3600e3);
    if (!Array.isArray(list) || !list.length) return;
    const next = roster.map(h => ({ ...h }));
    const byKey = new Map(next.map(h => [h.id, h]));
    for (const a of list) {
      if (!a || typeof a.name !== 'string') continue;
      if (a.disabled === true || a.player_selectable === false) continue;
      const k = hkey(a.name);
      if (!k) continue;
      let h = byKey.get(k);
      if (!h && a.in_development === true) continue;
      if (!h) { h = { id: k, name: clean(a.name, 40), role: 'new', img: null, heroId: null }; next.push(h); byKey.set(k, h); }
      h.heroId = num(a.id) || null;
      h.img = pickImage(a.images) || null;
    }
    roster = next;
    rosterIds = new Set(roster.map(h => h.id));
    rosterSource = 'deadlock-api';
  } catch (e) {
    console.warn('[roster] не удалось обновить из Deadlock API:', e.message);
  }
}

/* ---------- Deadlock API ---------- */
const cache = new Map();
async function dapi(p, ttl = 600e3) {
  const hit = cache.get(p);
  if (hit && hit.t > Date.now()) return hit.v;
  const headers = { Accept: 'application/json', 'User-Agent': 'deadlock-draft/1.0' };
  if (process.env.DEADLOCK_API_KEY) headers['X-API-KEY'] = process.env.DEADLOCK_API_KEY;
  const r = await fetch(DAPI + p, { headers, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error('Deadlock API ' + r.status + ' ' + p);
  const v = await r.json();
  cache.set(p, { v, t: Date.now() + ttl });
  if (cache.size > 3000) cache.delete(cache.keys().next().value);
  return v;
}

const RANK_NAMES = ['Obscurus', 'Initiate', 'Seeker', 'Acolyte', 'Sentinel', 'Mystic', 'Ritualist', 'Emissary', 'Oracle', 'Phantom', 'Ascendant', 'Eternus'];
async function rankAssets() {
  try { const v = await dapi('/v1/assets/ranks', 24 * 3600e3); return Array.isArray(v) ? v : []; } catch (e) { return []; }
}
async function parseRank(v) {
  const o = Array.isArray(v) ? v[0] : v;
  if (!o || typeof o !== 'object') return null;
  let tier = null, sub = null;
  const badge = [o.badge, o.ranked_badge, o.ranked_display_badge, o.rank_badge].find(x => x != null && Number.isFinite(Number(x)) && Number(x) > 0);
  if (badge != null) { tier = Math.floor(Number(badge) / 10); sub = Number(badge) % 10; }
  else if (o.subrank != null || o.tier != null) { tier = num(o.rank ?? o.tier); sub = num(o.subrank ?? o.sub_rank); }
  else if (Number(o.rank) > 11) { tier = Math.floor(Number(o.rank) / 10); sub = Number(o.rank) % 10; }
  if (!tier || tier < 1 || tier > 11) return null;
  sub = Math.min(Math.max(sub || 1, 1), 6);
  const assets = await rankAssets();
  const a = assets.find(x => num(x.tier) === tier);
  const img = a && a.images ? httpsUrl(a.images['small_subrank' + sub]) || httpsUrl(a.images['large_subrank' + sub]) || httpsUrl(a.images.small) || httpsUrl(a.images.large) : '';
  return { tier, sub, name: (a && typeof a.name === 'string' ? clean(a.name, 30) : RANK_NAMES[tier]) + ' ' + sub, img };
}

async function playerInfo(acc) {
  const out = { accountId: acc, name: '', avatar: '', rank: null, heroes: {}, matches: 0, wins: 0, statlocker: STATLOCKER.replace('{id}', String(acc)), ok: false };
  const [steam, rank, hs] = await Promise.allSettled([
    dapi('/v1/players/steam?account_ids=' + acc, 3600e3),
    dapi('/v1/players/' + acc + '/rank', 900e3),
    dapi('/v1/players/hero-stats?account_ids=' + acc, 900e3),
  ]);
  if (steam.status === 'fulfilled') {
    const p = Array.isArray(steam.value) ? steam.value[0] : steam.value;
    if (p) { out.name = clean(p.personaname, 40); out.avatar = httpsUrl(p.avatarmedium) || httpsUrl(p.avatar) || httpsUrl(p.avatarfull); }
  }
  if (rank.status === 'fulfilled') out.rank = await parseRank(rank.value);
  if (hs.status === 'fulfilled' && Array.isArray(hs.value)) {
    for (const e of hs.value) {
      const hid = num(e && e.hero_id);
      if (!hid) continue;
      const m = num(e.matches_played ?? e.matches ?? e.games);
      const w = num(e.wins);
      out.heroes[hid] = { m, w, k: num(e.kills), d: num(e.deaths), a: num(e.assists) };
      out.matches += m; out.wins += w;
    }
  }
  out.ok = [steam, rank, hs].some(x => x.status === 'fulfilled');
  return out;
}

async function steamProfile(steamId, acc) {
  if (process.env.STEAM_API_KEY) {
    try {
      const u = 'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=' + encodeURIComponent(process.env.STEAM_API_KEY) + '&steamids=' + steamId;
      const r = await fetch(u, { signal: AbortSignal.timeout(8000) });
      const j = await r.json();
      const p = j && j.response && j.response.players && j.response.players[0];
      if (p) return { name: clean(p.personaname, 40), avatar: httpsUrl(p.avatarmedium) || httpsUrl(p.avatarfull) };
    } catch (e) { /* дальше */ }
  }
  try {
    const v = await dapi('/v1/players/steam?account_ids=' + acc, 3600e3);
    const p = Array.isArray(v) ? v[0] : v;
    if (p) return { name: clean(p.personaname, 40), avatar: httpsUrl(p.avatarmedium) || httpsUrl(p.avatar) };
  } catch (e) { /* без профиля */ }
  return { name: '', avatar: '' };
}

/* ---------- Сессии ---------- */
function parseCookies(req) {
  const o = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) { try { o[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); } catch (e) { /* пропуск */ } }
  }
  return o;
}
const sign = v => crypto.createHmac('sha256', SECRET).update(v).digest('base64url');
function isHttps(req) {
  return (String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https') || !!req.socket.encrypted || String(process.env.BASE_URL || '').startsWith('https://');
}
function baseUrl(req) {
  if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/$/, '');
  return (isHttps(req) ? 'https' : 'http') + '://' + req.headers.host;
}
function readSession(req) {
  const c = parseCookies(req).dlk_s;
  if (!c) return null;
  const [v, s] = c.split('.');
  if (!v || !s) return null;
  const exp = sign(v);
  if (s.length !== exp.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(exp))) return null;
  try { const o = JSON.parse(Buffer.from(v, 'base64url').toString()); return o && o.exp > Date.now() && o.uid ? o : null; } catch (e) { return null; }
}
function writeSession(req, res, o) {
  o.exp = Date.now() + 30 * 864e5;
  const v = Buffer.from(JSON.stringify(o)).toString('base64url');
  res.setHeader('Set-Cookie', `dlk_s=${v}.${sign(v)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 86400}${isHttps(req) ? '; Secure' : ''}`);
}
function getUser(req, res) {
  let s = readSession(req);
  if (!s) { s = { uid: 'g:' + crypto.randomBytes(9).toString('base64url'), nick: '', avatar: '', acc: null }; writeSession(req, res, s); }
  return s;
}
const publicUser = u => ({ uid: u.uid, nick: u.nick || '', avatar: u.avatar || '', acc: u.acc || null, steam: !!u.acc });

/* ---------- Steam OpenID ---------- */
const nonces = new Map();
function steamLogin(req, res) {
  const b = baseUrl(req);
  const p = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': b + '/auth/steam/return',
    'openid.realm': b,
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
  });
  res.writeHead(302, { Location: STEAM_OP + '?' + p.toString() });
  res.end();
}
async function verifySteam(q, expectedReturn, fetchImpl = fetch) {
  if (q.get('openid.mode') !== 'id_res') return null;
  if (q.get('openid.op_endpoint') !== STEAM_OP) return null;
  const rt = q.get('openid.return_to') || '';
  if (rt.split('?')[0] !== expectedReturn) return null;
  const m = /^https?:\/\/steamcommunity\.com\/openid\/id\/(7656119\d{10})\/?$/.exec(q.get('openid.claimed_id') || '');
  if (!m || q.get('openid.identity') !== q.get('openid.claimed_id')) return null;
  const nonce = q.get('openid.response_nonce') || '';
  if (!nonce || nonces.has(nonce)) return null;
  const p = new URLSearchParams();
  for (const [k, v] of q) if (k.startsWith('openid.')) p.set(k, v);
  p.set('openid.mode', 'check_authentication');
  try {
    const r = await fetchImpl(STEAM_OP, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: p.toString(), signal: AbortSignal.timeout(8000) });
    const t = await r.text();
    if (!/(^|\n)is_valid\s*:\s*true/.test(t)) return null;
  } catch (e) { return null; }
  nonces.set(nonce, Date.now());
  return m[1];
}
async function steamReturn(req, res, url) {
  const sid = await verifySteam(url.searchParams, baseUrl(req) + '/auth/steam/return');
  if (!sid) { res.writeHead(302, { Location: '/?login=fail' }); res.end(); return; }
  const acc = Number(BigInt(sid) - STEAM64_BASE);
  const prof = await steamProfile(sid, acc);
  writeSession(req, res, { uid: 's:' + sid, sid, acc, nick: prof.name || 'Steam ' + acc, avatar: prof.avatar || '' });
  const back = parseCookies(req).dlk_back;
  const to = /^\/r\/[A-Z0-9]{4,6}$/.test(back || '') ? back : '/';
  res.setHeader('Set-Cookie', [res.getHeader('Set-Cookie'), 'dlk_back=; Path=/; Max-Age=0'].flat());
  res.writeHead(302, { Location: to + '?login=ok' });
  res.end();
}

/* ---------- Комнаты ---------- */
const ALPH = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const REG = ['eu', 'ru', 'na', 'sa', 'as', 'oc'];
const TIMERS = [0, 20, 30, 45, 60, 90];
const rooms = new Map(); // code -> { d, clients:Set, tm }
const card = u => ({ uid: u.uid, nick: clean(u.nick, 24) || 'Игрок', avatar: httpsUrl(u.avatar), acc: u.acc || null });
const eseq = d => (d.flip ? d.seq.map(x => x[0] + (x[1] === 'A' ? 'B' : 'A')) : d.seq);
/* выбор игроков: первым берёт игрока тот, кто вторым начинает драфт героев */
const pdOn = d => !!(d.pd && d.pd.on);
function pseq(d) {
  const f = eseq(d)[0], F = f && f[1] === 'A' ? 'B' : 'A', O = F === 'A' ? 'B' : 'A', out = [];
  for (let i = 0; i < 2 * (d.pd.size - 1); i++) out.push(d.pd.order === 'alt' ? (i % 2 ? O : F) : (i % 4 === 0 || i % 4 === 3 ? F : O));
  return out;
}
const teamUids = (d, t) => [d.cap[t] && d.cap[t].uid, ...(d.pd ? d.pd.picks : []).filter(p => p.t === t).map(p => p.uid)].filter(Boolean);
const teamOf = (d, uid) => ['A', 'B'].find(t => teamUids(d, t).includes(uid)) || null;
const availPlayers = d => Object.values(d.pool || {}).filter(p => p.ready && !teamOf(d, p.uid));
function pdMaybeEnd(d) {
  if (d.status === 'pdraft' && (d.pd.picks.length >= pseq(d).length || !availPlayers(d).length)) { d.status = 'wait'; d.turnAt = 0; }
}

function newCode() {
  for (let k = 0; k < 50; k++) {
    let c = '';
    for (let i = 0; i < (k > 30 ? 5 : 4); i++) c += ALPH[crypto.randomInt(ALPH.length)];
    if (!rooms.has(c)) return c;
  }
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}
function makeRoom(o) {
  const code = newCode();
  const d = {
    code, createdAt: Date.now(), updatedAt: Date.now(), host: o.host.uid, hostNick: clean(o.host.nick, 24),
    seq: o.seq, timer: o.timer, names: o.names, cap: o.cap || { A: null, B: null }, status: o.pd ? 'gather' : 'wait', flip: !!o.flip,
    acts: [], turnAt: 0, lobby: { code: '', region: 'eu', note: '', slots: {}, ready: { A: false, B: false } }, next: '',
    pool: o.pool || {}, pd: { on: !!o.pd, order: o.order === 'alt' ? 'alt' : 'snake', size: 6, picks: [] },
  };
  if (d.pd.on) for (const t of ['A', 'B']) if (d.cap[t]) d.pool[d.cap[t].uid] = { ...d.cap[t], ready: true, at: Date.now() };
  rooms.set(code, { d, clients: new Set(), tm: null });
  prune();
  return rooms.get(code);
}
function prune() {
  if (rooms.size <= 400) return;
  const old = [...rooms.values()].filter(R => !R.clients.size).sort((a, b) => a.d.updatedAt - b.d.updatedAt);
  for (const R of old.slice(0, rooms.size - 400)) { clearTimeout(R.tm); rooms.delete(R.d.code); }
}
function viewers(R) {
  const m = new Map();
  for (const c of R.clients) if (!m.has(c.u.uid)) m.set(c.u.uid, { nick: clean(c.u.nick, 24) || 'Гость', avatar: httpsUrl(c.u.avatar), acc: c.u.acc || null });
  return [...m.values()].slice(0, 40);
}
function pub(R) {
  const online = new Set([...R.clients].map(c => c.u.uid));
  const pool = Object.values(R.d.pool || {}).map(p => ({ ...p, online: online.has(p.uid) }));
  return { ...R.d, pool, viewers: viewers(R), serverNow: Date.now() };
}
function broadcast(R, event = 'state') {
  R.d.updatedAt = Date.now();
  const msg = `event: ${event}\ndata: ${JSON.stringify(event === 'state' ? pub(R) : { code: R.d.code })}\n\n`;
  for (const c of R.clients) { try { c.res.write(msg); } catch (e) { /* закрыт */ } }
  schedule(R);
  saveSoon();
}
function schedule(R) {
  clearTimeout(R.tm);
  const d = R.d;
  if (!d.timer || !rooms.has(d.code)) return;
  const wait = Math.max(0, d.turnAt + d.timer * 1000 - Date.now()) + 250;
  if (d.status === 'draft') { const step = d.acts.length; R.tm = setTimeout(() => autoAct(R, step), wait); }
  else if (d.status === 'pdraft') { const step = d.pd.picks.length; R.tm = setTimeout(() => autoPick(R, step), wait); }
}
function autoPick(R, step) {
  const d = R.d;
  if (d.status !== 'pdraft' || d.pd.picks.length !== step) return;
  const av = availPlayers(d);
  if (av.length) { d.pd.picks.push({ t: pseq(d)[step], uid: av[crypto.randomInt(av.length)].uid }); d.turnAt = Date.now(); d.lastAutoP = step; }
  pdMaybeEnd(d);
  broadcast(R);
}
function applyLock(d, c, h) {
  d.acts.push({ s: c[0], t: c[1], h: h || null });
  d.turnAt = Date.now();
  if (d.acts.length >= d.seq.length) d.status = 'done';
}
function autoAct(R, step) {
  const d = R.d;
  if (d.status !== 'draft' || d.acts.length !== step) return;
  const c = eseq(d)[step];
  if (!c) return;
  let h = null;
  if (c[0] === 'p') {
    const used = new Set(d.acts.map(a => a.h));
    const av = roster.filter(x => !used.has(x.id));
    h = av.length ? av[crypto.randomInt(av.length)].id : null;
    if (!h) return;
  }
  applyLock(d, c, h);
  d.lastAuto = step;
  broadcast(R);
}

function act(R, u, b) {
  const d = R.d;
  const t = b.team === 'B' ? 'B' : 'A';
  const isHost = d.host === u.uid;
  const isCap = x => !!(d.cap[x] && d.cap[x].uid === u.uid);
  const picksOf = x => d.acts.filter(a => a.t === x && a.s === 'p' && a.h).length;
  switch (b.type) {
    case 'claim': {
      if (d.status === 'done') return 'Драфт уже завершён';
      if (!u.nick) return 'Сначала укажите ник';
      if (d.cap[t] && d.cap[t].uid !== u.uid) return 'Место уже занято';
      const o = t === 'A' ? 'B' : 'A';
      if (pdOn(d) && d.pd.picks.some(p => p.uid === u.uid)) return 'Вас уже выбрали в команду';
      if (isCap(o)) { if (d.status === 'pdraft') return 'Во время выбора игроков нельзя сменить команду'; d.cap[o] = null; }
      d.cap[t] = card(u);
      if (pdOn(d)) d.pool[u.uid] = { ...card(u), ready: true, at: (d.pool[u.uid] && d.pool[u.uid].at) || Date.now() };
      return null;
    }
    case 'free':
      if (!isCap(t) && !isHost) return 'Нет прав';
      d.cap[t] = null; return null;
    case 'start':
      if (!isHost) return 'Драфт запускает хост';
      if (d.status !== 'wait') return 'Драфт уже идёт';
      d.status = 'draft'; d.turnAt = Date.now(); return null;
    case 'coin':
      if (!isHost || d.status !== (pdOn(d) ? 'gather' : 'wait')) return 'Монетку бросает хост до старта';
      d.flip = crypto.randomInt(2) === 1; return null;
    case 'lock': {
      if (d.status !== 'draft') return 'Драфт сейчас не идёт';
      if (Number(b.step) !== d.acts.length) return 'Этот ход уже сделан';
      const c = eseq(d)[d.acts.length];
      const cap = d.cap[c[1]];
      if (cap ? cap.uid !== u.uid : !isHost) return 'Сейчас не ваш ход';
      const h = b.hero ? String(b.hero) : null;
      if (c[0] === 'p' && !h) return 'Выберите героя';
      if (h && !rosterIds.has(h)) return 'Неизвестный герой';
      if (h && d.acts.some(a => a.h === h)) return 'Герой уже занят';
      applyLock(d, c, h); return null;
    }
    case 'undo':
      if (!isHost) return 'Отменять ходы может хост';
      if (pdOn(d) && (d.status === 'pdraft' || (d.status === 'wait' && !d.acts.length))) {
        if (!d.pd.picks.length) return 'Нечего отменять';
        d.pd.picks.pop(); d.status = 'pdraft'; d.turnAt = Date.now(); return null;
      }
      if (!d.acts.length) return 'Нечего отменять';
      d.acts.pop(); d.status = 'draft'; d.turnAt = Date.now(); return null;
    case 'slot': {
      const k = String(b.key || '');
      const mm = /^([AB])([0-9])$/.exec(k);
      if (!mm || Number(mm[2]) >= picksOf(mm[1])) return 'Нет такого места';
      const st = d.lobby.slots[k];
      const canManage = isHost || isCap(mm[1]);
      if (b.mode === 'me') {
        if (!u.nick) return 'Сначала укажите ник';
        if (pdOn(d) && teamOf(d, u.uid) !== mm[1]) return 'Это место для игроков команды ' + (d.names[mm[1]] || mm[1]);
        if (st && st.uid && st.uid !== u.uid) return 'Место уже занято';
        for (const [kk, v] of Object.entries(d.lobby.slots)) if (v && v.uid === u.uid) delete d.lobby.slots[kk];
        d.lobby.slots[k] = card(u); return null;
      }
      if (b.mode === 'clear') {
        if (!st) return null;
        if (!(canManage || (st.uid && st.uid === u.uid))) return 'Нет прав';
        delete d.lobby.slots[k]; return null;
      }
      if (b.mode === 'name') {
        if (!canManage) return 'Вписывать игроков может хост или капитан';
        if (st && st.uid && st.uid !== u.uid) return 'Место занято игроком со Steam';
        const n = clean(b.nick, 24);
        if (n) d.lobby.slots[k] = { uid: null, nick: n, avatar: '', acc: null }; else delete d.lobby.slots[k];
        return null;
      }
      return 'Неизвестное действие';
    }
    case 'lobby':
      if (!isHost && !isCap('A') && !isCap('B')) return 'Настройки лобби меняют хост и капитаны';
      if (typeof b.code === 'string') d.lobby.code = clean(b.code, 24);
      if (typeof b.region === 'string' && REG.includes(b.region)) d.lobby.region = b.region;
      if (typeof b.note === 'string') d.lobby.note = clean(b.note, 80);
      return null;
    case 'ready':
      if (!isHost && !isCap(t)) return 'Готовность отмечает капитан команды';
      d.lobby.ready[t] = !d.lobby.ready[t]; return null;
    case 'join': {
      if (!pdOn(d)) return 'В этой комнате нет выбора игроков';
      if (d.status === 'done') return 'Драфт уже завершён';
      if (!u.nick) return 'Сначала укажите ник';
      const ex = d.pool[u.uid];
      if (!ex && Object.keys(d.pool).length >= 40) return 'В лобби уже 40 игроков';
      d.pool[u.uid] = { ...card(u), ready: b.ready === true || !!(ex && ex.ready), at: (ex && ex.at) || Date.now() };
      return null;
    }
    case 'pready': {
      if (!pdOn(d)) return 'В этой комнате нет выбора игроков';
      if (!u.nick) return 'Сначала укажите ник';
      const ex = d.pool[u.uid];
      if (!ex && Object.keys(d.pool).length >= 40) return 'В лобби уже 40 игроков';
      if (ex && teamOf(d, u.uid) && b.ready === false && d.status !== 'gather') return 'Вы уже в команде';
      d.pool[u.uid] = { ...card(u), ready: typeof b.ready === 'boolean' ? b.ready : !(ex && ex.ready), at: (ex && ex.at) || Date.now() };
      if (d.status === 'pdraft' && !d.pool[u.uid].ready) pdMaybeEnd(d);
      return null;
    }
    case 'leave':
      if (!d.pool[u.uid]) return null;
      if (teamOf(d, u.uid)) return isCap('A') || isCap('B') ? 'Сначала освободите место капитана' : 'Вас уже выбрали в команду';
      delete d.pool[u.uid]; return null;
    case 'kick': {
      if (!isHost) return 'Убирать игроков может хост';
      const id = String(b.uid || '');
      if (!d.pool[id]) return null;
      if (teamOf(d, id)) return 'Игрок уже в команде';
      delete d.pool[id]; return null;
    }
    case 'pstart':
      if (!isHost) return 'Выбор игроков запускает хост';
      if (d.status !== 'gather') return 'Выбор игроков уже идёт';
      if (!d.cap.A || !d.cap.B) return 'Нужны оба капитана';
      if (!availPlayers(d).length) return 'Нет готовых игроков';
      d.status = 'pdraft'; d.turnAt = Date.now(); pdMaybeEnd(d); return null;
    case 'ppick': {
      if (d.status !== 'pdraft') return 'Сейчас не выбор игроков';
      if (Number(b.step) !== d.pd.picks.length) return 'Этот выбор уже сделан';
      const t2 = pseq(d)[d.pd.picks.length];
      const cap = d.cap[t2];
      if (cap ? cap.uid !== u.uid : !isHost) return 'Сейчас выбирает другой капитан';
      const p = d.pool[String(b.uid || '')];
      if (!p) return 'Игрок ушёл из лобби';
      if (!p.ready) return 'Игрок ещё не готов';
      if (teamOf(d, p.uid)) return 'Игрок уже в команде';
      d.pd.picks.push({ t: t2, uid: p.uid }); d.turnAt = Date.now(); pdMaybeEnd(d); return null;
    }
    case 'pend':
      if (!isHost) return 'Закончить выбор может хост';
      if (d.status !== 'pdraft' && d.status !== 'gather') return 'Сейчас не выбор игроков';
      d.status = 'wait'; d.turnAt = 0; return null;
    case 'names':
      if (!isHost || d.status !== 'wait') return 'Названия меняет хост до старта';
      d.names = { A: clean(b.A, 40) || d.names.A, B: clean(b.B, 40) || d.names.B }; return null;
    default:
      return 'Неизвестное действие';
  }
}

/* ---------- Сохранение ---------- */
const ROOMS_FILE = path.join(DATA_DIR, 'rooms.json');
let saveT = null;
function saveSoon() {
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    const all = [...rooms.values()].map(R => R.d);
    fs.writeFile(ROOMS_FILE + '.tmp', JSON.stringify(all), e => { if (!e) fs.rename(ROOMS_FILE + '.tmp', ROOMS_FILE, () => {}); });
  }, 800);
}
function loadRooms() {
  try {
    const all = JSON.parse(fs.readFileSync(ROOMS_FILE, 'utf8'));
    for (const d of all) if (d && d.code && Date.now() - d.updatedAt < 24 * 3600e3) { d.pool = d.pool || {}; d.pd = d.pd || { on: false, order: 'snake', size: 6, picks: [] }; const R = { d, clients: new Set(), tm: null }; rooms.set(d.code, R); schedule(R); }
    console.log('[rooms] загружено комнат:', rooms.size);
  } catch (e) { /* файла ещё нет */ }
}
setInterval(() => {
  for (const R of rooms.values()) if (!R.clients.size && Date.now() - R.d.updatedAt > 12 * 3600e3) { clearTimeout(R.tm); rooms.delete(R.d.code); }
  saveSoon();
}, 10 * 60e3).unref();
setInterval(() => { for (const [k, t] of nonces) if (Date.now() - t > 3600e3) nonces.delete(k); }, 10 * 60e3).unref();

/* ---------- HTTP ---------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
const SEC_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self' https://steamcommunity.com",
};
function send(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...SEC_HEADERS });
  res.end(JSON.stringify(obj));
}
function readBody(req) {
  return new Promise(resolve => {
    let s = '';
    req.on('data', c => { s += c; if (s.length > 64e3) { req.destroy(); resolve({}); } });
    req.on('end', () => { try { resolve(s ? JSON.parse(s) : {}); } catch (e) { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}
function sameOrigin(req) {
  const o = req.headers.origin;
  if (!o) return true;
  try { return new URL(o).host === req.headers.host; } catch (e) { return false; }
}
const rate = new Map();
function limited(key, ms) {
  const t = rate.get(key) || 0;
  if (Date.now() - t < ms) return true;
  rate.set(key, Date.now());
  if (rate.size > 5000) rate.clear();
  return false;
}
function serveStatic(req, res, p) {
  let f = p === '/' || /^\/r\/[A-Za-z0-9]{4,6}\/?$/.test(p) ? '/index.html' : p;
  f = path.normalize(path.join(PUBLIC_DIR, f));
  if (!f.startsWith(PUBLIC_DIR + path.sep)) { res.writeHead(404); res.end(); return; }
  fs.readFile(f, (err, buf) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', ...SEC_HEADERS }); res.end('Не найдено'); return; }
    const ext = path.extname(f);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=300', ...SEC_HEADERS });
    res.end(buf);
  });
}

async function handle(req, res) {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  const M = req.method;

  if (p === '/healthz') return send(res, 200, { ok: true, rooms: rooms.size });
  if (p === '/auth/steam' && M === 'GET') {
    const back = url.searchParams.get('back') || '';
    if (/^\/r\/[A-Z0-9]{4,6}$/.test(back)) res.setHeader('Set-Cookie', `dlk_back=${back}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`);
    return steamLogin(req, res);
  }
  if (p === '/auth/steam/return' && M === 'GET') return steamReturn(req, res, url);

  if (!p.startsWith('/api/')) return serveStatic(req, res, p);
  if (M === 'POST' && !sameOrigin(req)) return send(res, 403, { error: 'Запрос с чужого сайта' });
  const u = getUser(req, res);

  if (p === '/api/me' && M === 'GET') return send(res, 200, { user: publicUser(u) });
  if (p === '/api/me' && M === 'POST') {
    const b = await readBody(req);
    const nick = clean(b.nick, 24);
    if (!nick) return send(res, 400, { error: 'Ник не может быть пустым' });
    u.nick = nick;
    writeSession(req, res, u);
    return send(res, 200, { user: publicUser(u) });
  }
  if (p === '/api/logout' && M === 'POST') {
    writeSession(req, res, { uid: 'g:' + crypto.randomBytes(9).toString('base64url'), nick: u.nick || '', avatar: '', acc: null });
    return send(res, 200, { ok: true });
  }
  if (p === '/api/heroes' && M === 'GET') return send(res, 200, { heroes: roster, source: rosterSource });

  let m = /^\/api\/player\/(\d{1,10})$/.exec(p);
  if (m && M === 'GET') {
    const acc = Number(m[1]);
    if (!acc) return send(res, 400, { error: 'Неверный id' });
    return send(res, 200, await playerInfo(acc));
  }

  if (p === '/api/rooms' && M === 'GET') {
    const list = [...rooms.values()].sort((a, b) => b.d.createdAt - a.d.createdAt).slice(0, 20)
      .map(R => ({ code: R.d.code, names: R.d.names, status: R.d.status, createdAt: R.d.createdAt, hostNick: R.d.hostNick, viewers: viewers(R).length }));
    return send(res, 200, { rooms: list });
  }
  if (p === '/api/rooms' && M === 'POST') {
    if (!u.nick) return send(res, 400, { error: 'Сначала укажите ник или войдите через Steam' });
    if (limited('create:' + u.uid, 4000)) return send(res, 429, { error: 'Слишком часто, подождите пару секунд' });
    const b = await readBody(req);
    const seq = Array.isArray(b.seq) ? b.seq.filter(x => /^[bp][AB]$/.test(x)).slice(0, 40) : [];
    if (!seq.some(x => x[0] === 'p')) return send(res, 400, { error: 'В порядке ходов нужен хотя бы один пик' });
    if (seq.filter(x => x === 'pA').length > 10 || seq.filter(x => x === 'pB').length > 10) return send(res, 400, { error: 'Не больше 10 пиков на команду' });
    const timer = TIMERS.includes(Number(b.timer)) ? Number(b.timer) : 30;
    const names = { A: clean(b.names && b.names.A, 40) || 'Amber Hand', B: clean(b.names && b.names.B, 40) || 'Sapphire Flame' };
    const R = makeRoom({ host: u, seq, timer, names, pd: b.playerDraft !== false, order: b.order });
    saveSoon();
    return send(res, 200, { code: R.d.code });
  }

  m = /^\/api\/rooms\/([A-Z0-9]{4,6})(\/events|\/act|\/rematch)?$/.exec(p);
  if (m) {
    const R = rooms.get(m[1]);
    if (!R) return send(res, 404, { error: 'Комната не найдена' });
    if (!m[2] && M === 'GET') return send(res, 200, pub(R));
    if (m[2] === '/events' && M === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
      const client = { res, u };
      R.clients.add(client);
      res.write('retry: 2000\n\n');
      broadcast(R);
      const hb = setInterval(() => { try { res.write(': ping\n\n'); } catch (e) { /* закрыт */ } }, 25000);
      req.on('close', () => { clearInterval(hb); R.clients.delete(client); if (rooms.has(R.d.code)) broadcast(R); });
      return;
    }
    if (m[2] === '/act' && M === 'POST') {
      if (limited('act:' + u.uid, 150)) return send(res, 429, { error: 'Слишком быстро' });
      const b = await readBody(req);
      if (b.type === 'delete') {
        if (R.d.host !== u.uid) return send(res, 403, { error: 'Удалить комнату может только хост' });
        clearTimeout(R.tm);
        broadcast(R, 'deleted');
        rooms.delete(R.d.code);
        saveSoon();
        return send(res, 200, { ok: true });
      }
      const err = act(R, u, b);
      if (err) return send(res, 400, { error: err });
      broadcast(R);
      return send(res, 200, { ok: true });
    }
    if (m[2] === '/rematch' && M === 'POST') {
      const d = R.d;
      if (d.host !== u.uid) return send(res, 403, { error: 'Реванш создаёт хост' });
      if (d.next && rooms.has(d.next)) return send(res, 200, { code: d.next });
      const pool = {};
      for (const [k, p] of Object.entries(d.pool || {})) pool[k] = { ...p, ready: false };
      const N = makeRoom({ host: u, seq: d.seq, timer: d.timer, names: d.names, cap: { A: d.cap.A, B: d.cap.B }, flip: !d.flip, pd: pdOn(d), order: d.pd && d.pd.order, pool });
      d.next = N.d.code;
      broadcast(R);
      return send(res, 200, { code: N.d.code });
    }
  }
  return send(res, 404, { error: 'Не найдено' });
}

if (require.main === module) {
  loadRooms();
  refreshRoster();
  setInterval(refreshRoster, 6 * 3600e3).unref();
  http.createServer((req, res) => {
    handle(req, res).catch(e => { console.error(e); try { send(res, 500, { error: 'Внутренняя ошибка сервера' }); } catch (x) { /* уже отправлено */ } });
  }).listen(PORT, () => console.log(`Deadlock Draft: http://localhost:${PORT}`));
}

module.exports = { verifySteam, act, makeRoom, rooms, parseRank, hkey };

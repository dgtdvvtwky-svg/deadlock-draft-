'use strict';
(() => {
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = u => (typeof u === 'string' && /^https:\/\/[^\s"'<>]+$/.test(u) ? u : '');
const ROLES = { tank: ['Танки', '#b98a5e'], sup: ['Поддержка', '#4fae84'], gun: ['Стрелки', '#d4694a'], spi: ['Маги', '#9a7be3'], ass: ['Убийцы', '#d35d93'], ini: ['Инициаторы', '#cfa83f'], dis: ['Контроль', '#43aec2'], new: ['Новые', '#9aa0a6'] };
const SIDE = { A: 'Hidden King', B: 'Archmother' };
const PRE = {
  tour: ['Турнирный: 2 фазы банов', 'bA bB bA bB pA pB pB pA pA pB bB bA bB bA pB pA pA pB pB pA'],
  std: ['Стандарт: 4 бана, змейка', 'bA bB bA bB pA pB pB pA pA pB pB pA pA pB pB pA'],
  heavy: ['Много банов: 10 банов', 'bA bB bA bB bA bB pA pB pB pA bB bA bB bA pB pA pA pB pB pA pA pB'],
  fast: ['Без банов', 'pA pB pB pA pA pB pB pA pA pB pB pA'],
};
const REG = { eu: 'Европа', ru: 'Россия / СНГ', na: 'Северная Америка', sa: 'Южная Америка', as: 'Азия', oc: 'Океания' };
const ST = { gather: 'Сбор игроков', pdraft: 'Выбор игроков', wait: 'Ожидание драфта героев', draft: 'Драфт героев', done: 'Лобби' };
const STEAM_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-9.96 9.04l5.36 2.21a2.83 2.83 0 0 1 1.6-.49h.15l2.38-3.45v-.05a3.77 3.77 0 1 1 3.77 3.77h-.09l-3.4 2.42v.13a2.83 2.83 0 0 1-5.6.57L2.4 14.6A10 10 0 1 0 12 2Zm-4.7 15.2-1.23-.51a2.13 2.13 0 1 0 1.17-2.93l1.27.52a1.57 1.57 0 1 1-1.2 2.92Zm9.6-7.27a2.51 2.51 0 1 0-2.51 2.51 2.51 2.51 0 0 0 2.5-2.51Zm-4.4 0a1.89 1.89 0 1 1 1.89 1.89 1.89 1.89 0 0 1-1.9-1.89Z"/></svg>';

const PILLOW = `<svg class="pillow" viewBox="0 0 260 210" role="img" aria-label="Сонная подушка">
<defs>
 <linearGradient id="pw" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff7ad9"/><stop offset=".5" stop-color="#b45cff"/><stop offset="1" stop-color="#5a3bff"/></linearGradient>
 <radialGradient id="pl" cx=".32" cy=".28" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".45" stop-color="#ffd6f6" stop-opacity=".12"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
 <linearGradient id="pe" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#39e0ff" stop-opacity=".0"/><stop offset="1" stop-color="#39e0ff" stop-opacity=".55"/></linearGradient>
</defs>
<ellipse class="pshadow" cx="130" cy="196" rx="86" ry="9" fill="#a855ff" opacity=".35"/>
<g class="pbody">
 <path d="M46 52 L28 34 L58 44 C92 30 168 30 202 44 L232 34 L214 52 C228 82 228 128 214 158 L232 176 L202 166 C168 180 92 180 58 166 L28 176 L46 158 C32 128 32 82 46 52 Z" fill="url(#pw)" stroke="#ffc2f0" stroke-width="2.5" stroke-linejoin="round"/>
 <path d="M46 52 L28 34 L58 44 C92 30 168 30 202 44 L232 34 L214 52 C228 82 228 128 214 158 L232 176 L202 166 C168 180 92 180 58 166 L28 176 L46 158 C32 128 32 82 46 52 Z" fill="url(#pe)"/>
 <path d="M46 52 L28 34 L58 44 C92 30 168 30 202 44 L232 34 L214 52 C228 82 228 128 214 158 L232 176 L202 166 C168 180 92 180 58 166 L28 176 L46 158 C32 128 32 82 46 52 Z" fill="url(#pl)"/>
 <path d="M60 60 C95 49 165 49 200 60 C210 85 210 125 200 150 C165 161 95 161 60 150 C50 125 50 85 60 60 Z" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2" stroke-dasharray="6 7" stroke-linecap="round"/>
 <path d="M98 104 q10 9 20 0" fill="none" stroke="#2a0b4f" stroke-width="4" stroke-linecap="round"/>
 <path d="M142 104 q10 9 20 0" fill="none" stroke="#2a0b4f" stroke-width="4" stroke-linecap="round"/>
 <ellipse cx="94" cy="122" rx="9" ry="5" fill="#ff4fc8" opacity=".55"/><ellipse cx="166" cy="122" rx="9" ry="5" fill="#ff4fc8" opacity=".55"/>
 <path d="M124 124 q6 5 12 0" fill="none" stroke="#2a0b4f" stroke-width="3" stroke-linecap="round"/>
 <path d="M186 72 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z" fill="#ffe66b"/>
 <circle cx="76" cy="78" r="3" fill="#fff" opacity=".8"/>
</g>
<g class="zz" fill="#ffe66b" font-family="Unbounded,sans-serif" font-weight="800">
 <text class="z1" x="214" y="40" font-size="20">z</text><text class="z2" x="232" y="20" font-size="26">Z</text>
</g>
</svg>`;
const MEMES = (Array.isArray(window.MEMES) ? window.MEMES : [window.MEME_SRC]).filter(u => typeof u === 'string' && /^data:image\/(webp|jpeg|png|gif);base64,/.test(u));
let memeIdx = MEMES.length ? Math.floor(Math.random() * MEMES.length) : 0;
const memeFor = c => { let h = 0; for (const ch of String(c)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return MEMES.length ? h % MEMES.length : 0; };
const memeHTML = (i = memeIdx, cls = '') => (MEMES.length
  ? `<figure class="meme ${cls}" data-a="nextmeme" title="Нажмите, чтобы сменить мем"><span class="mframe"><img src="${MEMES[i % MEMES.length]}" alt="Мем"></span><span class="spk k1">✦</span><span class="spk k2">✦</span><span class="spk k3">✧</span></figure>`
  : PILLOW);
let me = { uid: '', nick: '', avatar: '', acc: null, steam: false };
let H = [], HM = {}, HID = {};
let view = 'home', code = null, room = null, es = null, offset = 0, sel = null, roleF = 'all', q = '';
let listT = null, delArm = 0, pending = false, lastStepSeen = -1, lastPSeen = -1;
let hSeq = PRE.tour[1].split(' '), hPre = 'tour';
const stats = {};

const toastEl = $('toast'); let toastT;
function toast(m) { toastEl.textContent = m; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 3000); }
async function api(p, body) {
  try {
    const r = await fetch(p, { method: body ? 'POST' : 'GET', credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
    let j = {}; try { j = await r.json(); } catch (e) { /* пусто */ }
    if (!r.ok && !j.error) j.error = 'Ошибка сервера (' + r.status + ')';
    return j;
  } catch (e) { return { error: 'Нет связи с сервером' }; }
}
const inits = n => { const w = String(n).replace(/^The /, '').split(/[\s&]+/).filter(Boolean); return (w.length > 1 ? w[0][0] + w[1][0] : (w[0] || '?').slice(0, 2)).toUpperCase(); };
function em(h, cls = '') {
  if (!h) return '';
  const c = (ROLES[h.role] || ROLES.new)[1];
  const img = safeUrl(h.img);
  return `<span class="em ${cls}" style="--c:${c}" aria-hidden="true">${esc(h.i)}${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : ''}</span>`;
}
const avatar = (u, cls = '') => (safeUrl(u && u.avatar) ? `<img class="av ${cls}" src="${esc(u.avatar)}" alt="">` : '');
const tc = t => (t === 'A' ? 'var(--am)' : 'var(--sa)');
function ago(t) { const m = Math.round((Date.now() - t) / 60000); if (!(m >= 0)) return ''; if (m < 1) return 'только что'; if (m < 60) return m + ' мин назад'; const h = Math.round(m / 60); if (h < 24) return h + ' ч назад'; return new Date(t).toLocaleDateString('ru-RU'); }
const pct = (w, m) => (m ? Math.round((w / m) * 100) : 0);
document.addEventListener('error', e => { if (e.target && e.target.tagName === 'IMG') e.target.remove(); }, true);

/* ---------- статистика игроков ---------- */
function loadStats(acc) {
  if (!acc) return;
  const s = stats[acc];
  if (s && (s.loading || Date.now() - s.t < 600e3)) return;
  stats[acc] = { loading: true, t: Date.now(), data: s && s.data };
  api('/api/player/' + acc).then(j => { stats[acc] = { t: Date.now(), data: j && !j.error ? j : null }; if (view === 'room') render(); });
}
const sd = acc => (acc && stats[acc] && stats[acc].data) || null;
function rankHTML(acc) { const d = sd(acc); if (!d || !d.rank) return ''; return `<span class="rk">${safeUrl(d.rank.img) ? `<img src="${esc(d.rank.img)}" alt="">` : ''}${esc(d.rank.name)}</span>`; }
function heroStat(acc, h) { const d = sd(acc); if (!d || !h || !h.heroId) return null; const s = d.heroes && d.heroes[h.heroId]; return s && s.m ? s : null; }

/* ---------- шапка ---------- */
function renderHeader() {
  const back = view === 'room' && code ? '?back=' + encodeURIComponent('/r/' + code) : '';
  $('hdr').innerHTML = me.steam
    ? `<span class="chipme">${avatar(me)}${esc(me.nick)}</span>${rankHTML(me.acc)}<button class="ghost small" data-a="logout">Выйти</button>`
    : `<input id="mynick" maxlength="24" placeholder="Ваш ник (гость)" aria-label="Ваш ник" value="${esc(me.nick)}"><a class="btn steam small" href="/auth/steam${back}">${STEAM_ICON}Войти через Steam</a>`;
  if (me.acc) loadStats(me.acc);
}

/* ---------- навигация ---------- */
function go(path) { if (location.pathname !== path) history.pushState(null, '', path); route(); }
function route() {
  const m = /^\/r\/([A-Za-z0-9]{4,6})\/?$/.exec(location.pathname);
  if (es) { es.close(); es = null; }
  clearInterval(listT); room = null; sel = null; delArm = 0; pending = false; lastStepSeen = -1; lastPSeen = -1;
  if (m) { view = 'room'; code = m[1].toUpperCase(); shell(); connect(); }
  else { view = 'home'; code = null; homeView(); loadList(); listT = setInterval(loadList, 8000); }
  renderHeader();
  window.scrollTo(0, 0);
}

/* ---------- главная ---------- */
const chips = (seq, done, cur) => seq.map((x, i) => {
  const a = done && done[i]; const h = a && a.h ? HM[a.h] : null;
  const lab = a ? (h ? h.i : '–') : (x[0] === 'b' ? 'Б' : 'П');
  return `<span class="ch ${x[0]} ${x[1]}${a ? ' d' : ''}${i === cur ? ' c' : ''}" title="${x[0] === 'b' ? 'Бан' : 'Пик'} ${x[1]}">${esc(lab)}</span>`;
}).join('');
function seqInfo(s) { const n = k => s.filter(x => x === k).length; return `Баны: ${n('bA')} + ${n('bB')} · пики: ${n('pA')} + ${n('pB')} · всего ходов: ${s.length}`; }
function homeView() {
  $('app').innerHTML = `<section class="hero"><div class="htxt"><h1>Драфт для Deadlock</h1>
   <p class="lead">Баны и пики по очереди для двух капитанов, таймер хода и лобби с составами 6 на 6. Входите через Steam, чтобы рядом с ником показывались ранг и статистика по героям, или играйте гостем под ником.</p></div>${memeHTML()}</section>
  <div class="homegrid">
   <section class="card"><h2>Новая комната</h2>
    <div class="two"><label>Команда 1 (Amber)<input id="nA" maxlength="40" value="Amber Hand"></label><label>Команда 2 (Sapphire)<input id="nB" maxlength="40" value="Sapphire Flame"></label></div>
    <label>Формат<select id="fmt">${Object.entries(PRE).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join('')}<option value="custom">Свой порядок</option></select></label>
    <div class="seqbox"><div class="track" id="seqv"></div>
     <div class="seqed"><button class="small" data-a="sq" data-v="bA">+ Бан A</button><button class="small" data-a="sq" data-v="bB">+ Бан B</button><button class="small" data-a="sq" data-v="pA">+ Пик A</button><button class="small" data-a="sq" data-v="pB">+ Пик B</button><button class="small ghost" data-a="sqdel">Убрать последний</button><button class="small ghost" data-a="sqclr">Очистить</button></div>
     <span class="mu sm" id="seqi"></span></div>
    <label class="chk"><input type="checkbox" id="pdon" checked> Сначала капитаны выбирают игроков из лобби</label>
    <label>Порядок выбора игроков<select id="pord"><option value="snake">Змейка: 1-2-2-2-2-1</option><option value="alt">По очереди: 1-1-1-1</option></select></label>
    <label>Время на ход<select id="tmr"><option value="0">Без таймера</option><option value="20">20 секунд</option><option value="30" selected>30 секунд</option><option value="45">45 секунд</option><option value="60">60 секунд</option><option value="90">90 секунд</option></select></label>
    <div class="btns"><button class="pri" data-a="create">Создать комнату</button></div>
   </section>
   <section class="card"><h2>Войти по коду</h2>
    <form id="joinf"><input id="jcode" maxlength="6" placeholder="Например, K7QM" autocomplete="off" aria-label="Код комнаты"><button class="pri">Войти</button></form>
    <h2>Комнаты</h2><div class="rlist" id="rlist"><span class="mu sm">Загрузка…</span></div>
   </section></div>
  <p class="how"><b>Как это работает.</b> Хост создаёт комнату и отправляет ссылку. Все игроки заходят, записываются и отмечают готовность. Капитаны занимают места за Amber и Sapphire и по очереди набирают готовых игроков из общей таблицы, где видны ранг и статистика каждого. Потом идёт драфт героев. Ходы идут по очереди с таймером, сервер следит за очередью и сам доигрывает ход, если время вышло: бан пропускается, пик выбирается случайно. После последнего пика открывается лобби: игроки занимают своих героев кнопкой «Это я», видят ранг и статистику друг друга, хост вставляет код приватного лобби из игры, и состав копируется в Discord.</p>`;
  $('fmt').value = hPre; seqPaint();
}
function seqPaint() { if (!$('seqv')) return; $('seqv').innerHTML = hSeq.length ? chips(hSeq) : '<span class="mu sm">Добавьте ходы кнопками ниже</span>'; $('seqi').textContent = seqInfo(hSeq); }
async function loadList() {
  const j = await api('/api/rooms');
  const el = $('rlist'); if (!el || view !== 'home') return;
  if (j.error) { el.innerHTML = `<span class="mu sm">${esc(j.error)}</span>`; return; }
  const rs = Array.isArray(j.rooms) ? j.rooms : [];
  el.innerHTML = rs.length ? rs.map(r => `<a class="btn rrow" href="/r/${esc(r.code)}" data-link><b>#${esc(r.code)}</b><span>${esc(r.names && r.names.A)} vs ${esc(r.names && r.names.B)}<br><span class="mu sm">хост ${esc(r.hostNick)}${r.viewers ? ' · в комнате ' + Number(r.viewers) : ''}</span></span><span class="st">${esc(ST[r.status] || '')}<br>${esc(ago(r.createdAt))}</span></a>`).join('')
    : '<span class="mu sm">Пока нет комнат: создайте первую.</span>';
}

/* ---------- комната ---------- */
const eseq = () => { const s = (room && Array.isArray(room.seq) ? room.seq : []).filter(x => /^[bp][AB]$/.test(x)); return room && room.flip ? s.map(x => x[0] + (x[1] === 'A' ? 'B' : 'A')) : s; };
const acts = () => (room && Array.isArray(room.acts) ? room.acts : []).map(a => ({ s: a.s === 'p' ? 'p' : 'b', t: a.t === 'B' ? 'B' : 'A', h: HM[a.h] ? a.h : null }));
const curStep = () => eseq()[acts().length];
const taken = () => new Map(acts().filter(a => a.h).map(a => [a.h, a]));
const tname = t => String((room && room.names && room.names[t]) || (t === 'A' ? 'Amber Hand' : 'Sapphire Flame'));
const capOf = t => { const c = room && room.cap && room.cap[t]; return c && c.uid ? c : null; };
const isHost = () => !!room && room.host === me.uid;
const isCap = t => { const c = capOf(t); return !!c && c.uid === me.uid; };
const lob = () => (room && room.lobby) || { slots: {}, ready: {} };
function canAct() { if (!room || room.status !== 'draft') return false; const c = curStep(); if (!c) return false; const cp = capOf(c[1]); return cp ? cp.uid === me.uid : isHost(); }
const pdOn = () => !!(room && room.pd && room.pd.on);
const poolL = () => (room && Array.isArray(room.pool) ? room.pool : []);
const ppicks = () => (room && room.pd && Array.isArray(room.pd.picks) ? room.pd.picks : []);
function pseq() {
  if (!room || !room.pd) return [];
  const f = eseq()[0], F = f && f[1] === 'A' ? 'B' : 'A', O = F === 'A' ? 'B' : 'A', out = [];
  for (let i = 0; i < 2 * ((room.pd.size || 6) - 1); i++) out.push(room.pd.order === 'alt' ? (i % 2 ? O : F) : (i % 4 === 0 || i % 4 === 3 ? F : O));
  return out;
}
const teamUids = t => [capOf(t) && capOf(t).uid, ...ppicks().filter(p => p.t === t).map(p => p.uid)].filter(Boolean);
const teamOf = uid => ['A', 'B'].find(t => teamUids(t).includes(uid)) || null;
const pcur = () => (room && room.status === 'pdraft' ? pseq()[ppicks().length] : null);
function canPick() { const t = pcur(); if (!t) return false; const cp = capOf(t); return cp ? cp.uid === me.uid : isHost(); }
const pcard = uid => poolL().find(p => p.uid === uid) || ['A', 'B'].map(capOf).find(c => c && c.uid === uid) || null;
const myP = () => poolL().find(p => p.uid === me.uid) || null;
const pdPhase = () => room && (room.status === 'gather' || room.status === 'pdraft');
const act = async b => { const j = await api('/api/rooms/' + code + '/act', b); if (j.error) toast(j.error); return j; };

function shell() {
  $('app').innerHTML = `<div class="top"><a href="/" class="btn ghost small" data-link>← Комнаты</a>
   <div class="code"><b>#${esc(code)}</b><button class="small" data-a="copylink">Скопировать ссылку</button></div><span class="pill" id="rstat"></span><div class="viewers" id="viewers"></div></div>
  <div class="note" id="note">Подключаемся к комнате…</div>
  <div class="board" id="board" hidden>
   <section class="team A" id="tA"></section>
   <section class="mid">
    <div id="draftC" class="mid">
     <div class="turn" id="turn"></div>
     <div class="track" id="track"></div>
     <div id="heroC" class="mid">
      <div class="filters"><input id="q" type="search" placeholder="Поиск героя" aria-label="Поиск героя"><div class="chips" id="rch"></div></div>
      <div class="grid" id="grid"></div>
      <span class="mu sm" id="gridnote"></span>
     </div>
     <div id="pdC" class="mid" hidden></div>
     <div class="actbar" id="act"></div>
    </div>
    <div id="lobbyC" hidden></div>
   </section>
   <section class="team B" id="tB"></section>
  </div>`;
  const used = new Set(H.map(h => h.role));
  $('rch').innerHTML = [['all', 'Все'], ...Object.entries(ROLES).filter(([k]) => used.has(k)).map(([k, v]) => [k, v[0]])].map(([k, v]) => `<button class="chip${k === roleF ? ' on' : ''}" data-a="role" data-r="${k}">${v}</button>`).join('');
  $('q').value = q;
}
function connect() {
  let first = true;
  es = new EventSource('/api/rooms/' + code + '/events');
  es.addEventListener('state', e => {
    let d; try { d = JSON.parse(e.data); } catch (x) { return; }
    offset = (Number(d.serverNow) || Date.now()) - Date.now();
    room = d; note(''); first = false;
    render();
  });
  es.addEventListener('deleted', () => { toast('Хост удалил комнату'); go('/'); });
  es.onerror = async () => {
    if (first) {
      const j = await api('/api/rooms/' + code);
      if (j.error) { es && es.close(); es = null; note('Комната не найдена. Проверьте код или создайте новую.'); return; }
    }
    if (es) note('Связь прервалась, переподключаемся…');
  };
}
function note(m) { const n = $('note'); if (n) n.textContent = m || ''; }

function seatHTML(t) {
  const cp = capOf(t), mine = isCap(t);
  if (cp) {
    if (cp.acc) loadStats(cp.acc);
    return `<div class="pl">${avatar(cp, 's')}<span>Капитан: <b>${esc(cp.nick)}</b>${mine ? ' (вы)' : ''}</span></div>${rankHTML(cp.acc)}${(mine || isHost()) && room.status !== 'done' ? `<button class="small ghost" data-a="free" data-t="${t}">Освободить</button>` : ''}`;
  }
  return `<span class="mu">Место капитана свободно</span>${room.status !== 'done' ? `<button class="small" data-a="claim" data-t="${t}">Стать капитаном</button>` : ''}`;
}
function teamHTML(t) {
  const s = eseq(), A = acts(), cur = curStep(), on = (room.status === 'draft' && cur && cur[1] === t) || pcur() === t;
  const nb = s.filter(x => x === 'b' + t).length, np = s.filter(x => x === 'p' + t).length;
  const mb = A.filter(a => a.t === t && a.s === 'b'), mp = A.filter(a => a.t === t && a.s === 'p');
  $('t' + t).classList.toggle('on', !!on);
  const bans = Array.from({ length: nb }, (_, i) => { const a = mb[i]; if (a) return `<span class="bs f" title="${a.h ? esc(HM[a.h].name) : 'Бан пропущен'}">${a.h ? em(HM[a.h]) : '–'}</span>`; return `<span class="bs${on && cur[0] === 'b' && i === mb.length ? ' nx' : ''}">Б${i + 1}</span>`; }).join('');
  const picks = Array.from({ length: np }, (_, i) => { const a = mp[i]; if (a && a.h) { const h = HM[a.h]; return `<div class="ps f">${em(h)}<b>${esc(h.name)}</b></div>`; } return `<div class="ps${on && cur[0] === 'p' && i === mp.length ? ' nx' : ''}"><span class="e0"></span><span class="mu sm">Пик ${i + 1}</span></div>`; }).join('');
  let roster = '';
  if (pdOn()) {
    const mem = teamUids(t).map(pcard).filter(Boolean), size = (room.pd && room.pd.size) || 6, pc = pcur();
    roster = `<div class="picks"><div class="lbl">Состав ${mem.length}/${size}</div>${Array.from({ length: size }, (_, i) => {
      const p = mem[i];
      if (p) { if (p.acc) loadStats(p.acc); return `<div class="ps f mem">${avatar(p, 's') || '<span class="av s"></span>'}<span class="mn"><b>${esc(p.nick)}</b>${i === 0 && capOf(t) ? ' <span class="mu sm">капитан</span>' : ''}${rankHTML(p.acc)}</span></div>`; }
      return `<div class="ps mem${pc === t && i === mem.length ? ' nx' : ''}"><span class="av s"></span><span class="mu sm">Игрок ${i + 1}</span></div>`;
    }).join('')}</div>`;
  }
  return `<div><div class="tn">${esc(tname(t))}</div><div class="side">${SIDE[t]} · ${t === 'A' ? 'Amber' : 'Sapphire'}</div></div>
   <div class="seat">${seatHTML(t)}</div>
   ${roster}
   ${pdPhase() ? '' : `${nb ? `<div><div class="lbl">Баны</div><div class="bans">${bans}</div></div>` : ''}
   <div class="picks"><div class="lbl">Пики</div>${picks}</div>`}`;
}
function turnHTML() {
  if (room.status === 'gather') {
    const pl = poolL(), rd = pl.filter(p => p.ready).length, ok = capOf('A') && capOf('B'), F = pseq()[0] || 'A';
    return `<div class="wh"><span class="big">Сбор игроков</span><span class="mu">Готовы ${rd} из ${pl.length}. ${ok ? 'Оба капитана на местах.' : 'Нужны два капитана: займите места слева и справа.'} Первым игрока выбирает ${esc(tname(F))}, а драфт героев первой начинает другая команда.</span></div>
     ${isHost() ? `<div class="btns"><button data-a="coin">Монетка</button><button class="pri" data-a="pstart" ${ok ? '' : 'disabled'}>Начать выбор игроков</button><button class="pri" data-a="start">Сразу драфт героев</button></div>` : '<span class="mu sm">Выбор игроков запустит хост.</span>'}`;
  }
  if (room.status === 'pdraft') {
    const t = pcur(); if (!t) return '';
    return `<div class="wh"><span class="mu sm">Выбор ${ppicks().length + 1} из ${pseq().length}${canPick() ? ' · ваш выбор' : ''}</span><span class="big" style="color:${tc(t)}">${esc(tname(t))} выбирает игрока</span></div>
     ${room.timer ? `<div class="ring"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="27" fill="none" stroke="var(--ln)" stroke-width="5"/><circle id="tring" cx="32" cy="32" r="27" fill="none" stroke="${tc(t)}" stroke-width="5" stroke-linecap="round" stroke-dasharray="169.6"/></svg><span id="tsec"></span></div>` : ''}`;
  }
  if (room.status === 'wait') {
    const ok = capOf('A') && capOf('B'), first = eseq()[0];
    return `<div class="wh"><span class="big">${pdOn() ? 'Составы собраны' : 'Ожидание старта'}</span><span class="mu">${pdOn() ? 'Следующий этап: драфт героев.' : ''} ${ok ? 'Оба капитана на местах.' : 'Капитаны занимают места слева и справа.'} Первыми ходят ${esc(tname(first ? first[1] : 'A'))}. Пока место капитана пустое, за эту команду ходит хост.</span></div>
     ${isHost() ? `<div class="btns">${pdOn() ? '' : '<button data-a="coin">Монетка: кто первый</button>'}<button class="pri" data-a="start">Начать драфт героев</button></div>` : `<span class="mu sm">Драфт запустит хост: ${esc(room.hostNick)}.</span>`}`;
  }
  const c = curStep(); if (!c) return '';
  const t = c[1], n = acts().length + 1;
  return `<div class="wh"><span class="mu sm">Ход ${n} из ${eseq().length}${canAct() ? ' · ваш ход' : ''}</span><span class="big" style="color:${tc(t)}">${esc(tname(t))} ${c[0] === 'b' ? 'банит' : 'выбирает'}</span></div>
   ${room.timer ? `<div class="ring"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="27" fill="none" stroke="var(--ln)" stroke-width="5"/><circle id="tring" cx="32" cy="32" r="27" fill="none" stroke="${tc(t)}" stroke-width="5" stroke-linecap="round" stroke-dasharray="169.6"/></svg><span id="tsec"></span></div>` : ''}`;
}
function gridHTML() {
  const tk = taken(), able = canAct(), qq = q.trim().toLowerCase();
  const list = H.filter(h => (roleF === 'all' || h.role === roleF) && (!qq || h.name.toLowerCase().includes(qq)));
  if (!list.length) return '<span class="mu">Никого не нашли.</span>';
  return list.map(h => {
    const a = tk.get(h.id);
    const cls = a ? (a.s === 'b' ? 'ban' : 'p' + a.t) : (sel === h.id ? 'sel' : '');
    const s = able && !a ? heroStat(me.acc, h) : null;
    return `<button class="tile ${cls}" data-h="${esc(h.id)}" ${a ? 'disabled' : ''} title="${esc(h.name)} · ${(ROLES[h.role] || ROLES.new)[0]}${a ? (a.s === 'b' ? ' · забанен' : ' · выбран') : ''}">${em(h)}<span class="nm">${esc(h.name)}</span>${s ? `<span class="hs">${s.m} игр · ${pct(s.w, s.m)}%</span>` : ''}</button>`;
  }).join('');
}
function actHTML() {
  const c = curStep();
  const undo = isHost() && acts().length ? '<button class="ghost" data-a="undo">Отменить ход</button>' : '';
  const del = isHost() ? `<button class="ghost small" data-a="del">${delArm > Date.now() ? 'Точно удалить?' : 'Удалить комнату'}</button>` : '';
  if (pdPhase()) {
    const pu = (isHost() && ppicks().length) ? '<button class="ghost" data-a="undo">Отменить выбор</button>' : '';
    const pe = isHost() ? `<button class="ghost small" data-a="pend">${room.status === 'gather' ? 'Без выбора игроков' : 'Закончить выбор'}</button>` : '';
    const t = pcur(), cp = t && capOf(t);
    const msg = room.status === 'gather' ? 'Ждём готовности игроков.' : canPick() ? 'Нажмите «Взять» у игрока в таблице.' : `Ждём выбор: ${esc(tname(t))}${cp ? ' (' + esc(cp.nick) + ')' : ''}`;
    return `<span class="pv mu">${msg}</span>${pu}${pe}${del}`;
  }
  if (room.status === 'wait' && pdOn() && !acts().length && isHost() && ppicks().length) return `<span class="pv mu">Драфт героев ещё не начался.</span><button class="ghost" data-a="undo">Вернуть последний выбор игрока</button>${del}`;
  if (room.status !== 'draft' || !c) return `<span class="pv mu">${room.status === 'wait' ? 'Драфт ещё не начался.' : ''}</span>${del}`;
  if (!canAct()) { const cp = capOf(c[1]); return `<span class="pv mu">Ждём ход: ${esc(tname(c[1]))}${cp ? ' (' + esc(cp.nick) + ')' : ' (за команду ходит хост)'}</span>${undo}${del}`; }
  const h = sel && HM[sel];
  return `<span class="pv">${h ? em(h) + `<span><b>${esc(h.name)}</b><br><span class="mu sm">${(ROLES[h.role] || ROLES.new)[0]}</span></span>` : '<span class="mu">Выберите героя в сетке</span>'}</span>
   ${c[0] === 'b' ? '<button class="ghost" data-a="skip">Пропустить бан</button>' : ''}${undo}
   <button class="lock" style="--tc:${tc(c[1])}" data-a="lock" ${h ? '' : 'disabled'}>${c[0] === 'b' ? 'Забанить' : 'Выбрать'}</button>${del}`;
}
function slotHTML(t, i, a) {
  const h = HM[a.h], k = t + i, s = lob().slots && lob().slots[k];
  const manage = isHost() || isCap(t);
  let pl = '';
  if (s) {
    if (s.acc) loadStats(s.acc);
    const hs = s.acc ? heroStat(s.acc, h) : null, d = sd(s.acc);
    pl = `${avatar(s, 's')}<b>${esc(s.nick)}</b>${rankHTML(s.acc)}${s.acc && d && d.statlocker ? `<a class="sm" href="${esc(safeUrl(d.statlocker))}" target="_blank" rel="noopener">StatLocker</a>` : ''}
      <span class="x">${(s.uid && s.uid === me.uid) || manage ? `<button class="small ghost" data-a="slot" data-k="${k}" data-m="clear">Убрать</button>` : ''}</span>
      ${s.acc ? `<span class="stat" style="flex-basis:100%">${hs ? `На ${esc(h.name)}: ${hs.m} игр, ${pct(hs.w, hs.m)}% побед, KDA ${((hs.k + hs.a) / Math.max(1, hs.d)).toFixed(1)}` : d ? `На ${esc(h.name)} ещё нет игр в статистике` : 'Загружаем статистику…'}</span>` : ''}`;
  } else {
    const mayMe = !pdOn() || teamOf(me.uid) === t;
    pl = `<span class="mu">Свободно</span><span class="x">${mayMe ? `<button class="small" data-a="slot" data-k="${k}" data-m="me">Это я</button>` : ''}${manage ? `<input data-slotname="${k}" maxlength="24" placeholder="Вписать ник" aria-label="Вписать игрока за ${esc(h.name)}">` : ''}</span>`;
  }
  return `<div class="rw">${em(h)}<div><div class="hn">${esc(h.name)}</div><div class="pl">${pl}</div></div></div>`;
}
function lobbyHTML() {
  const A = acts(), L = lob();
  const ros = t => {
    const P = A.filter(a => a.t === t && a.s === 'p' && a.h), Bn = A.filter(a => a.t === t && a.s === 'b');
    const on = !!(L.ready && L.ready[t]), can = isHost() || isCap(t);
    return `<div class="ros ${t}"><h3>${esc(tname(t))}</h3><span class="side">${SIDE[t]} · ${t === 'A' ? 'Amber' : 'Sapphire'}</span>
     ${P.map((a, i) => slotHTML(t, i, a)).join('')}
     ${pdOn() ? (() => { const used = new Set(Object.values(L.slots || {}).map(x => x && x.uid)); const rest = teamUids(t).filter(u => !used.has(u)).map(pcard).filter(Boolean); return rest.length ? `<span class="sm">Ещё не выбрали героя: ${rest.map(p => esc(p.nick)).join(', ')}</span>` : ''; })() : ''}
     <span class="mu sm">Баны: ${Bn.length ? Bn.map(a => (a.h ? esc(HM[a.h].name) : 'пропуск')).join(', ') : 'нет'}</span>
     <button class="rdy${on ? ' on' : ''}" data-a="ready" data-t="${t}" ${can ? '' : 'disabled'}>${on ? 'Команда готова' : 'Отметить готовность'}</button></div>`;
  };
  const edit = isHost() || isCap('A') || isCap('B');
  const nx = String(room.next || '');
  return `<div class="lob"><div class="lobhead${MEMES.length ? ' wm' : ''}"><div class="lht"><h2>Лобби готово</h2><span class="mu">${esc(tname('A'))} против ${esc(tname('B'))} · комната #${esc(code)}</span><span class="mu sm">${MEMES.length ? 'Мем этой игры ✦' : ''}</span></div>${MEMES.length ? memeHTML(memeFor(code), 'lm') : ''}</div>
   ${/^[A-Z0-9]{4,6}$/.test(nx) ? `<div class="note"><span>Хост создал реванш: комната #${esc(nx)}</span><a class="btn pri small" href="/r/${esc(nx)}" data-link>Перейти</a></div>` : ''}
   <div class="rosters">${ros('A')}${ros('B')}</div>
   <div class="lset"><label>Код лобби из игры<input id="lcode" maxlength="24" placeholder="${edit ? 'Вставьте код приватного лобби' : 'Хост ещё не вставил код'}" value="${esc(L.code)}" ${edit ? '' : 'readonly'}></label>
    <label>Регион сервера<select id="lreg" ${edit ? '' : 'disabled'}>${Object.entries(REG).map(([k, v]) => `<option value="${k}"${L.region === k ? ' selected' : ''}>${v}</option>`).join('')}</select></label>
    <label>Заметка<input id="lnote" maxlength="80" placeholder="Например: старт в 21:00, войс в Discord" value="${esc(L.note)}" ${edit ? '' : 'readonly'}></label></div>
   <span class="mu sm">Само лобби в Deadlock создаёт хост в игре: у игры нет открытого API для этого. Код, вставленный сюда, сразу видят все в комнате.</span>
   <div class="btns"><button class="pri" data-a="copylobby">Скопировать для Discord</button>${isHost() ? '<button data-a="rematch">Реванш (первой ходит другая команда)</button><button class="ghost" data-a="undo">Отменить последний пик</button>' : ''}<a class="btn ghost" href="/" data-link>Новый драфт</a></div></div>`;
}

function pchips() {
  const P = ppicks(), cur = room.status === 'pdraft' ? P.length : -1;
  return pseq().map((t, i) => {
    const p = P[i] && pcard(P[i].uid);
    const lab = p ? String(p.nick).slice(0, 2).toUpperCase() : 'И';
    return `<span class="ch p ${t}${P[i] ? ' d' : ''}${i === cur ? ' c' : ''}" title="${p ? esc(p.nick) : 'Выбор игрока'} · ${esc(tname(t))}">${esc(lab)}</span>`;
  }).join('');
}
function topHeroes(acc) {
  const d = sd(acc); if (!d || !d.heroes) return '';
  return Object.entries(d.heroes).sort((a, b) => b[1].m - a[1].m).slice(0, 3).map(([id, s]) => { const h = H.find(x => x.heroId === Number(id)); return h ? `<span title="${esc(h.name)}: ${s.m} игр, ${pct(s.w, s.m)}%">${em(h, 'xs')}</span>` : ''; }).join('');
}
function poolHTML() {
  const pl = poolL(), mine = myP(), able = canPick(), host = isHost();
  const tier = p => { const d = sd(p.acc); return d && d.rank ? d.rank.tier * 10 + d.rank.sub : 0; };
  const grp = p => (teamOf(p.uid) ? 2 : p.ready ? 0 : 1);
  const list = pl.slice().sort((a, b) => grp(a) - grp(b) || tier(b) - tier(a) || (a.at || 0) - (b.at || 0));
  const rd = pl.filter(p => p.ready).length;
  const myTeam = teamOf(me.uid);
  const ctl = !mine
    ? '<button class="pri" data-a="pjoin">Записаться и отметить «Готов»</button>'
    : myTeam ? `<span class="mu">Вы в команде ${esc(tname(myTeam))}</span>`
    : `${mine.ready ? '<button class="rdy on" data-a="pready" data-v="0">Готов ✓</button>' : '<button class="pri" data-a="pready" data-v="1">Я готов</button>'}<button class="ghost small" data-a="pleave">Выйти из списка</button>`;
  const rows = list.map(p => {
    if (p.acc) loadStats(p.acc);
    const d = sd(p.acc), t = teamOf(p.uid);
    const status = t ? `<span class="tag ${t}">${esc(tname(t))}</span>` : p.ready ? '<span class="okc">Готов</span>' : '<span class="mu">Не готов</span>';
    const action = !t && able && p.ready ? `<button class="small pri" data-a="ppick" data-u="${esc(p.uid)}">Взять</button>` : !t && host && p.uid !== me.uid ? `<button class="small ghost" data-a="kick" data-u="${esc(p.uid)}">Убрать</button>` : '';
    return `<tr class="${t ? 'in' : p.ready ? '' : 'nr'}">
      <td><span class="pn">${avatar(p, 's') || '<span class="av s"></span>'}<span><b>${esc(p.nick)}</b>${p.uid === me.uid ? ' <span class="mu sm">(вы)</span>' : ''}<br><span class="sm ${p.online ? 'okc' : 'mu'}">${p.online ? 'в сети' : 'не в сети'}</span>${d && d.statlocker ? ` · <a class="sm" href="${esc(safeUrl(d.statlocker))}" target="_blank" rel="noopener">StatLocker</a>` : ''}</span></span></td>
      <td>${p.acc ? rankHTML(p.acc) || (d ? '<span class="mu sm">нет ранга</span>' : '<span class="mu sm">…</span>') : '<span class="mu sm">гость</span>'}</td>
      <td class="num" data-l="Матчи">${d && d.matches ? d.matches : '—'}</td>
      <td class="num" data-l="Победы">${d && d.matches ? pct(d.wins, d.matches) + '%' : '—'}</td>
      <td><span class="tops">${topHeroes(p.acc)}</span></td>
      <td>${status}</td>
      <td>${action}</td></tr>`;
  }).join('');
  return `<div class="card pool"><div class="poolhead"><h2>Игроки в лобби: ${pl.length} · готовы: ${rd}</h2><div class="btns">${ctl}</div></div>
    ${pl.length ? `<div class="scroll"><table class="ptable stack"><thead><tr><th>Игрок</th><th>Ранг</th><th class="num">Матчи</th><th class="num">Победы</th><th>Любимые герои</th><th>Статус</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="mu">Пока никто не записался. Отправьте друзьям ссылку на комнату.</p>'}
    <span class="mu sm">Ранг и статистика берутся из Deadlock API для игроков, вошедших через Steam. Капитаны берут только готовых игроков.</span></div>`;
}
function render() {
  if (view !== 'room') return;
  const B = $('board'); if (!B) return;
  if (!room) { B.hidden = true; return; }
  const ae = document.activeElement;
  if (ae && ae.tagName === 'INPUT' && ae.closest('#lobbyC')) { pending = true; return; }
  pending = false;
  B.hidden = false;
  $('rstat').textContent = ST[room.status] || '';
  const vs = Array.isArray(room.viewers) ? room.viewers : [];
  $('viewers').innerHTML = vs.slice(0, 8).map(v => (safeUrl(v.avatar) ? `<img class="av" src="${esc(v.avatar)}" alt="" title="${esc(v.nick)}">` : '')).join('') + `<span class="n">в комнате: ${vs.length}</span>`;
  $('tA').innerHTML = teamHTML('A'); $('tB').innerHTML = teamHTML('B');
  const done = room.status === 'done';
  $('draftC').hidden = done; $('lobbyC').hidden = !done;
  if (done) { $('lobbyC').innerHTML = lobbyHTML(); return; }
  const pdp = pdPhase();
  $('heroC').hidden = pdp; $('pdC').hidden = !pdp;
  if (pdp) {
    const ps = ppicks().length;
    if (ps !== lastPSeen) { if (lastPSeen >= 0 && room.lastAutoP === ps - 1 && ps > lastPSeen) toast('Время вышло: игрок выбран случайно'); lastPSeen = ps; }
    $('turn').innerHTML = turnHTML();
    $('track').innerHTML = pchips();
    $('pdC').innerHTML = poolHTML();
    $('act').innerHTML = actHTML();
    paintTimer();
    return;
  }
  const step = acts().length;
  if (step !== lastStepSeen) { if (sel && taken().has(sel)) sel = null; if (lastStepSeen >= 0 && room.lastAuto === step - 1) toast('Время вышло: ход сделан автоматически'); lastStepSeen = step; }
  if (!canAct()) sel = null;
  $('turn').innerHTML = turnHTML();
  $('track').innerHTML = chips(eseq(), acts(), acts().length);
  $('grid').innerHTML = gridHTML();
  $('act').innerHTML = actHTML();
  $('gridnote').textContent = `Роли условные, только для фильтра. Героев: ${H.length}. Двойной клик по герою сразу подтверждает ход.${me.steam && canAct() ? ' Под героями ваша статистика из Deadlock API.' : ''}`;
  paintTimer();
}
function paintTimer() {
  if (!room || (room.status !== 'draft' && room.status !== 'pdraft') || !room.timer) return;
  const tot = room.timer * 1000, left = Math.max(0, (Number(room.turnAt) || 0) + tot - (Date.now() + offset));
  const r = $('tring'), s = $('tsec');
  if (r) r.style.strokeDashoffset = String(169.6 * (1 - left / tot));
  if (s) s.textContent = Math.ceil(left / 1000);
}
setInterval(() => { if (view === 'room') paintTimer(); }, 250);
function lock(h) { if (!canAct()) return; const c = curStep(); if (!c || (c[0] === 'p' && !h)) return; act({ type: 'lock', hero: h || null, step: acts().length }); sel = null; }
function summary() {
  const A = acts(), L = lob(), out = [`Deadlock: ${tname('A')} против ${tname('B')} (комната #${code})`, location.origin + '/r/' + code, ''];
  for (const t of ['A', 'B']) {
    out.push(`${tname(t)} (${SIDE[t]}):`);
    A.filter(a => a.t === t && a.s === 'p' && a.h).forEach((a, i) => { const s = L.slots && L.slots[t + i]; const d = s && sd(s.acc); out.push(`  ${HM[a.h].name}: ${s ? s.nick : '—'}${d && d.rank ? ' (' + d.rank.name + ')' : ''}`); });
    if (pdOn()) { const used = new Set(Object.values(L.slots || {}).map(x => x && x.uid)); const rest = teamUids(t).filter(u => !used.has(u)).map(pcard).filter(Boolean); if (rest.length) out.push(`  Без героя: ${rest.map(p => p.nick).join(', ')}`); }
    const b = A.filter(a => a.t === t && a.s === 'b'); if (b.length) out.push(`  Баны: ${b.map(a => (a.h ? HM[a.h].name : 'пропуск')).join(', ')}`);
    out.push('');
  }
  out.push(`Код лобби: ${L.code || '—'}`, `Регион: ${REG[L.region] || REG.eu}`); if (L.note) out.push(L.note);
  return out.join('\n');
}
async function copy(text, ok) { try { await navigator.clipboard.writeText(text); toast(ok); } catch (e) { $('mtext').value = text; $('modal').hidden = false; $('mtext').select(); } }
async function saveNick(v) {
  const n = v.trim().slice(0, 24); if (!n || n === me.nick) return;
  const j = await api('/api/me', { nick: n });
  if (j.error) { toast(j.error); return; }
  me = j.user; toast('Ник сохранён');
}
async function needNick() {
  if (me.nick) return true;
  toast(me.steam ? 'Не удалось получить ник' : 'Введите ник вверху или войдите через Steam');
  const i = $('mynick'); if (i) i.focus();
  return false;
}

/* ---------- события ---------- */
document.addEventListener('click', async e => {
  const link = e.target.closest('a[data-link]');
  if (link && !e.ctrlKey && !e.metaKey && link.origin === location.origin) { e.preventDefault(); go(link.pathname); return; }
  const tile = e.target.closest('.tile');
  if (tile && !tile.disabled) {
    if (!canAct()) { toast('Сейчас не ваш ход'); return; }
    sel = tile.dataset.h;
    document.querySelectorAll('.tile.sel').forEach(x => x.classList.remove('sel'));
    tile.classList.add('sel'); $('act').innerHTML = actHTML(); return;
  }
  const b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
  const a = b.dataset.a, t = b.dataset.t;
  if (a === 'sq') { hSeq.push(b.dataset.v); hPre = 'custom'; $('fmt').value = 'custom'; seqPaint(); }
  else if (a === 'sqdel') { hSeq.pop(); hPre = 'custom'; $('fmt').value = 'custom'; seqPaint(); }
  else if (a === 'sqclr') { hSeq = []; hPre = 'custom'; $('fmt').value = 'custom'; seqPaint(); }
  else if (a === 'create') {
    const ni = $('mynick'); if (ni && ni.value.trim() && ni.value.trim() !== me.nick) await saveNick(ni.value);
    if (!(await needNick())) return;
    if (!hSeq.some(x => x[0] === 'p')) { toast('В порядке ходов нужен хотя бы один пик'); return; }
    b.disabled = true;
    const j = await api('/api/rooms', { names: { A: $('nA').value, B: $('nB').value }, seq: hSeq, timer: Number($('tmr').value), playerDraft: $('pdon').checked, order: $('pord').value });
    b.disabled = false;
    if (j.error) toast(j.error); else go('/r/' + j.code);
  }
  else if (a === 'logout') { await api('/api/logout', {}); const j = await api('/api/me'); if (j.user) me = j.user; renderHeader(); render(); toast('Вы вышли из Steam-аккаунта'); }
  else if (a === 'role') { roleF = b.dataset.r; document.querySelectorAll('#rch .chip').forEach(x => x.classList.toggle('on', x.dataset.r === roleF)); $('grid').innerHTML = gridHTML(); }
  else if (a === 'copylink') copy(location.origin + '/r/' + code, 'Ссылка на комнату скопирована');
  else if (a === 'claim') { if (await needNick()) act({ type: 'claim', team: t }); }
  else if (a === 'free') act({ type: 'free', team: t });
  else if (a === 'coin') { const j = await act({ type: 'coin' }); if (!j.error) setTimeout(() => { const f = eseq()[0]; toast('Монетка: первыми ходят ' + tname(f ? f[1] : 'A')); }, 300); }
  else if (a === 'start') act({ type: 'start' });
  else if (a === 'pstart') act({ type: 'pstart' });
  else if (a === 'pend') act({ type: 'pend' });
  else if (a === 'pjoin') { if (await needNick()) act({ type: 'pready', ready: true }); }
  else if (a === 'pready') { if (await needNick()) act({ type: 'pready', ready: b.dataset.v === '1' }); }
  else if (a === 'pleave') act({ type: 'leave' });
  else if (a === 'kick') act({ type: 'kick', uid: b.dataset.u });
  else if (a === 'ppick') act({ type: 'ppick', uid: b.dataset.u, step: ppicks().length });
  else if (a === 'lock') lock(sel);
  else if (a === 'skip') lock(null);
  else if (a === 'undo') act({ type: 'undo' });
  else if (a === 'del') {
    if (delArm > Date.now()) { const j = await act({ type: 'delete' }); if (!j.error) go('/'); }
    else { delArm = Date.now() + 3000; $('act').innerHTML = actHTML(); setTimeout(() => { if (view === 'room' && room && room.status !== 'done') $('act').innerHTML = actHTML(); }, 3100); }
  }
  else if (a === 'slot') { if (b.dataset.m === 'me' && !(await needNick())) return; act({ type: 'slot', key: b.dataset.k, mode: b.dataset.m }); }
  else if (a === 'ready') act({ type: 'ready', team: t });
  else if (a === 'copylobby') copy(summary(), 'Состав скопирован');
  else if (a === 'rematch') { b.disabled = true; const j = await api('/api/rooms/' + code + '/rematch', {}); b.disabled = false; if (j.error) toast(j.error); else go('/r/' + j.code); }
  else if (a === 'nextmeme') { if (view !== 'home' || MEMES.length < 2) return; memeIdx = (memeIdx + 1) % MEMES.length; const img = b.querySelector('img'); if (img) img.src = MEMES[memeIdx]; }
  else if (a === 'mclose') $('modal').hidden = true;
});
document.addEventListener('dblclick', e => { const tile = e.target.closest('.tile'); if (tile && !tile.disabled && canAct()) { sel = tile.dataset.h; lock(sel); } });
document.addEventListener('input', e => { if (e.target.id === 'q') { q = e.target.value; $('grid').innerHTML = gridHTML(); } });
document.addEventListener('change', e => {
  const el = e.target, id = el.id;
  if (id === 'mynick') saveNick(el.value);
  else if (id === 'fmt') { hPre = el.value; if (PRE[hPre]) { hSeq = PRE[hPre][1].split(' '); seqPaint(); } }
  else if (el.dataset.slotname) act({ type: 'slot', key: el.dataset.slotname, mode: 'name', nick: el.value });
  else if (id === 'lcode') act({ type: 'lobby', code: el.value });
  else if (id === 'lreg') act({ type: 'lobby', region: el.value });
  else if (id === 'lnote') act({ type: 'lobby', note: el.value });
});
document.addEventListener('focusout', () => { setTimeout(() => { if (pending) render(); }, 0); });
document.addEventListener('submit', e => {
  if (e.target.id === 'joinf') { e.preventDefault(); const c = $('jcode').value.trim().toUpperCase().replace(/^#/, ''); if (/^[A-Z0-9]{4,6}$/.test(c)) go('/r/' + c); else toast('Код из 4–6 букв и цифр'); }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && sel && canAct() && !/INPUT|SELECT|TEXTAREA|BUTTON|A/.test((document.activeElement && document.activeElement.tagName) || '')) { e.preventDefault(); lock(sel); }
  if (e.key === 'Escape') $('modal').hidden = true;
});
window.addEventListener('popstate', route);

(async () => {
  const [m, h] = await Promise.all([api('/api/me'), api('/api/heroes')]);
  if (m.user) me = m.user;
  H = (Array.isArray(h.heroes) ? h.heroes : []).map(x => ({ ...x, i: inits(x.name) })).sort((a, b) => a.name.replace(/^The /, '').localeCompare(b.name.replace(/^The /, '')));
  HM = Object.fromEntries(H.map(x => [x.id, x]));
  HID = Object.fromEntries(H.filter(x => x.heroId).map(x => [x.heroId, x]));
  const sp = new URLSearchParams(location.search);
  if (sp.get('login')) { toast(sp.get('login') === 'ok' ? 'Вы вошли через Steam' : 'Не удалось войти через Steam, попробуйте ещё раз'); history.replaceState(null, '', location.pathname); }
  route();
})();
})();

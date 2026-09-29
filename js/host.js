// Host screen: runs the game, does all the scoring, and is the single source of truth.
(function () {
  const QUIZ = window.QUIZ;
  const CFG = window.QUIZ_CONFIG || {};
  const QS = QUIZ.questions;
  const SAVE_KEY = 'quizlive-host';
  const SYNC_EVERY_MS = 1500;   // batch "you're in" updates while students join
  const GRACE_MS = 1500;        // accept answers that arrive slightly after the timer
  const MAX_PLAYERS = 190;      // stays under Supabase free plan's 200 connections

  const $ = (s) => document.querySelector(s);
  const SCREENS = ['setup', 'lobby', 'question', 'reveal', 'board', 'end'];

  let S = null;              // game state (saved to localStorage so a refresh can resume)
  let inCh = null, outCh = null;
  let tick = null;
  let syncTimer = null, lastSync = 0;
  const connState = { in: '', out: '' };

  const qTime = (q) => q.time || CFG.QUESTION_TIME || 20;

  // ---------- answer shuffling ----------
  // Each new game gets a fresh order. The correct answer is spread evenly over
  // red / blue / yellow / green, and True/False questions keep True first.
  function randInt(n) { return crypto.getRandomValues(new Uint32Array(1))[0] % n; }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = randInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function makeOrders() {
    const multi = QS.map((q, i) => i).filter((i) => QS[i].options.length > 2);
    const targets = shuffle(multi.map((_, k) => k % 4));
    return QS.map((q, i) => {
      const n = q.options.length;
      const ids = [...Array(n).keys()];
      if (n <= 2) return ids;
      const target = Math.min(targets[multi.indexOf(i)], n - 1);
      const others = shuffle(ids.filter((x) => x !== q.correct));
      others.splice(target, 0, q.correct);
      return others;
    });
  }
  function getQ(i) {
    const q = QS[i];
    const order = (S && S.order && S.order[i]) || q.options.map((_, k) => k);
    return Object.assign({}, q, { options: order.map((k) => q.options[k]), correct: order.indexOf(q.correct) });
  }

  function show(name) {
    SCREENS.forEach((s) => { $('#' + s).hidden = s !== name; });
  }

  function save() { QL.store.set(SAVE_KEY, S); }

  function players() { return Object.entries(S.players).map(([id, p]) => Object.assign({ id }, p)); }

  function ranked() {
    return players().sort((a, b) => b.score - a.score || a.joined - b.joined);
  }

  // ---------- realtime ----------
  function setConn(which, status) {
    connState[which] = status;
    const el = $('#conn');
    const ok = connState.in === 'SUBSCRIBED' && connState.out === 'SUBSCRIBED';
    el.textContent = ok ? 'Live' : 'Connecting…';
    el.className = 'conn ' + (ok ? 'on' : 'off');
  }

  function connect() {
    const sb = QL.client();
    inCh = sb.channel(QL.inName(S.pin));
    inCh
      .on('broadcast', { event: 'join' }, (m) => onJoin(m.payload || {}))
      .on('broadcast', { event: 'answer' }, (m) => onAnswer(m.payload || {}))
      .subscribe((st) => setConn('in', st));

    outCh = sb.channel(QL.outName(S.pin));
    outCh.subscribe((st) => {
      setConn('out', st);
      if (st === 'SUBSCRIBED') broadcastNow();
    });
  }

  function snapshot() {
    const s = { phase: S.phase, ids: Object.keys(S.players), kicked: S.kicked, n: QS.length };
    if (S.phase === 'question') {
      const q = getQ(S.qi);
      const left = Math.max(0, Math.ceil((S.qStart + qTime(q) * 1000 - Date.now()) / 1000));
      s.q = { i: S.qi, text: q.q, options: q.options, dbl: !!q.double, left };
    }
    if (S.res && (S.phase === 'reveal' || S.phase === 'board' || S.phase === 'end')) s.res = S.res;
    return s;
  }

  function broadcastNow() {
    clearTimeout(syncTimer); syncTimer = null;
    lastSync = Date.now();
    if (outCh) outCh.send({ type: 'broadcast', event: 'state', payload: snapshot() });
  }

  // Joins are batched so 50 students scanning at once doesn't flood the channel.
  function requestSync() {
    if (syncTimer) return;
    const wait = Math.max(0, SYNC_EVERY_MS - (Date.now() - lastSync));
    syncTimer = setTimeout(broadcastNow, wait);
  }

  // ---------- incoming ----------
  function onJoin(p) {
    const id = String(p.id || ''), key = String(p.key || '');
    if (!/^[a-z0-9]{6,20}$/.test(id) || key.length < 8) return;
    if (S.kicked.includes(id)) { requestSync(); return; }

    const existing = S.players[id];
    if (existing) {
      if (existing.key !== key) return; // someone pretending to be another player
    } else {
      if (Object.keys(S.players).length >= MAX_PLAYERS) return;
      let name = QL.cleanName(p.name) || 'Player';
      const taken = new Set(players().map((x) => x.name.toLowerCase()));
      if (taken.has(name.toLowerCase())) {
        let k = 2;
        while (taken.has((name + ' ' + k).toLowerCase())) k++;
        name = (name.slice(0, 13) + ' ' + k);
      }
      S.players[id] = { name, key, score: 0, correct: 0, last: 0, joined: Date.now() };
      save();
      if (S.phase === 'lobby') renderLobby();
      if (S.phase === 'question') renderAnswered();
    }
    requestSync();
  }

  function onAnswer(p) {
    if (S.phase !== 'question' || p.i !== S.qi) return;
    const pl = S.players[p.id];
    if (!pl || pl.key !== p.key || S.answers[p.id]) return;
    const q = getQ(S.qi);
    const a = Number(p.a);
    if (!Number.isInteger(a) || a < 0 || a >= q.options.length) return;
    const ms = Date.now() - S.qStart;
    if (ms > qTime(q) * 1000 + GRACE_MS) return;
    S.answers[p.id] = { a, ms };
    save();
    renderAnswered();
    if (Object.keys(S.answers).length >= Object.keys(S.players).length) endQuestion();
  }

  // ---------- game flow ----------
  function newGame() {
    const pin = String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));
    S = { pin, phase: 'lobby', qi: -1, players: {}, kicked: [], answers: {}, qStart: 0, res: null, created: Date.now(), order: makeOrders() };
    save();
    connect();
    renderLobby();
  }

  function resume(saved) {
    S = saved;
    connect();
    if (S.phase === 'lobby') renderLobby();
    else if (S.phase === 'question') { renderQuestion(); startTick(); }
    else if (S.phase === 'reveal') renderReveal();
    else if (S.phase === 'board') renderBoard();
    else renderEnd();
  }

  function startQuestion(i) {
    S.qi = i; S.phase = 'question'; S.answers = {}; S.res = null; S.qStart = Date.now();
    save();
    renderQuestion();
    broadcastNow();
    startTick();
  }

  function startTick() {
    clearInterval(tick);
    const q = getQ(S.qi);
    const update = () => {
      const left = Math.max(0, Math.ceil((S.qStart + qTime(q) * 1000 - Date.now()) / 1000));
      const t = $('#qTimer');
      t.textContent = left;
      t.classList.toggle('low', left <= 5);
      if (left <= 0) endQuestion();
    };
    update();
    tick = setInterval(update, 250);
  }

  function endQuestion() {
    if (S.phase !== 'question') return;
    clearInterval(tick);
    const q = getQ(S.qi);
    const limit = qTime(q) * 1000;
    const m = {};
    const dist = q.options.map(() => 0);
    players().forEach((p) => {
      const ans = S.answers[p.id];
      let status = -1, pts = 0;
      if (ans) {
        dist[ans.a]++;
        if (ans.a === q.correct) {
          status = 1;
          const frac = Math.min(1, ans.ms / limit);
          pts = Math.round(1000 * (1 - frac / 2));
          if (q.double) pts *= 2;
        } else status = 0;
      }
      const pl = S.players[p.id];
      pl.score += pts; pl.last = pts;
      if (status === 1) pl.correct++;
      m[p.id] = [status, pts, pl.score, 0];
    });
    ranked().forEach((p, idx) => { m[p.id][3] = idx + 1; });
    S.res = { i: S.qi, correct: q.correct, ctext: q.options[q.correct], m, dist };
    S.phase = 'reveal';
    save();
    renderReveal();
    broadcastNow();
  }

  function next() {
    if (S.qi + 1 < QS.length) startQuestion(S.qi + 1);
    else finish();
  }

  function finish() {
    S.phase = 'end';
    save();
    renderEnd();
    broadcastNow();
  }

  // ---------- rendering ----------
  function tilesHTML(q, revealCorrect) {
    return q.options.map((opt, i) => {
      const sh = QL.SHAPES[i];
      const state = revealCorrect == null ? '' : (i === revealCorrect ? ' right' : ' dim');
      return `<div class="tile ${sh.cls}${state}">${sh.svg}<span>${QL.esc(opt)}</span>${i === revealCorrect ? '<b class="tick">✓</b>' : ''}</div>`;
    }).join('');
  }

  function renderLobby() {
    show('lobby');
    const url = `${location.origin}/play.html?pin=${S.pin}`;
    $('#joinUrl').textContent = location.host;
    $('#pinText').textContent = S.pin.replace(/(\d{3})(\d{3})/, '$1 $2');
    const qr = $('#qr');
    if (qr.dataset.pin !== S.pin) {
      qr.innerHTML = '';
      new QRCode(qr, { text: url, width: 320, height: 320, colorDark: '#000000', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
      qr.dataset.pin = S.pin;
      qr.title = url;
    }
    const list = players();
    $('#playerCount').textContent = list.length;
    $('#startBtn').disabled = list.length === 0;
    $('#playerList').innerHTML = list.length
      ? list.map((p) => `<button class="chip" type="button" data-id="${p.id}">${QL.esc(p.name)}</button>`).join('')
      : '<p class="waiting">Waiting for players…</p>';
  }

  function kick(id) {
    const p = S.players[id];
    if (!p || !confirm(`Remove “${p.name}”?`)) return;
    delete S.players[id];
    S.kicked.push(id);
    save();
    renderLobby();
    requestSync();
  }

  function renderQuestion() {
    show('question');
    const q = getQ(S.qi);
    $('#qNum').textContent = `Question ${S.qi + 1} of ${QS.length}`;
    $('#qDouble').hidden = !q.double;
    $('#qText').textContent = q.q;
    $('#qTiles').innerHTML = tilesHTML(q, null);
    $('#qTiles').className = 'tiles n' + q.options.length;
    renderAnswered();
  }

  function renderAnswered() {
    if (S.phase !== 'question') return;
    $('#qAnswered').textContent = `${Object.keys(S.answers).length}/${Object.keys(S.players).length}`;
  }

  function renderReveal() {
    show('reveal');
    const q = getQ(S.qi);
    $('#rNum').textContent = `Question ${S.qi + 1} of ${QS.length}`;
    $('#rText').textContent = q.q;
    const dist = S.res.dist;
    const max = Math.max(1, ...dist);
    $('#rBars').innerHTML = dist.map((c, i) => {
      const sh = QL.SHAPES[i];
      const h = Math.round((c / max) * 100);
      return `<div class="bar-col"><div class="bar-count">${c}${i === q.correct ? ' ✓' : ''}</div><div class="bar ${sh.cls}${i === q.correct ? '' : ' dim'}" style="height:${Math.max(4, h)}%"></div><div class="bar-shape ${sh.cls}">${sh.svg}</div></div>`;
    }).join('');
    $('#rTiles').innerHTML = tilesHTML(q, q.correct);
    $('#rTiles').className = 'tiles reveal-tiles n' + q.options.length;
    const ex = $('#rExplain');
    ex.hidden = !q.explain;
    ex.textContent = q.explain || '';
  }

  function renderBoard() {
    show('board');
    const top = ranked().slice(0, 5);
    $('#boardList').innerHTML = top.map((p) =>
      `<li><span class="b-name">${QL.esc(p.name)}</span><span class="b-gain">${p.last ? '+' + p.last : ''}</span><span class="b-score">${p.score}</span></li>`
    ).join('') || '<li class="muted">No players</li>';
    $('#nextBtn').textContent = S.qi + 1 < QS.length ? 'Next question →' : 'Final results →';
  }

  function renderEnd() {
    show('end');
    const r = ranked();
    const place = (p, n) => p ? `<div class="step s${n}"><div class="p-name">${QL.esc(p.name)}</div><div class="p-score">${p.score}</div><div class="p-block">${n}</div></div>` : `<div class="step s${n} empty"></div>`;
    $('#podium').innerHTML = place(r[1], 2) + place(r[0], 1) + place(r[2], 3);
    $('#finalList').innerHTML = r.slice(3).map((p, i) =>
      `<li><span class="b-rank">${i + 4}</span><span class="b-name">${QL.esc(p.name)}</span><span class="b-score">${p.score}</span></li>`
    ).join('');
  }

  function downloadCSV() {
    const rows = [['Rank', 'Name', 'Score', 'Correct answers', 'Questions']];
    ranked().forEach((p, i) => rows.push([i + 1, p.name, p.score, p.correct, QS.length]));
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `quiz-results-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
  }

  // ---------- wiring ----------
  $('#quizTitle').textContent = QUIZ.title || 'Quiz';
  $('#quizMeta').textContent = `${QS.length} questions`;
  document.title = (QUIZ.title || 'Quiz') + ' · Host';

  if (!QL.isConfigured()) {
    $('#setupWarn').innerHTML = QL.configWarning();
    $('#newGameBtn').disabled = true;
  }

  const saved = QL.store.get(SAVE_KEY);
  if (saved && saved.phase !== 'end' && Date.now() - saved.created < 6 * 3600 * 1000 && QL.isConfigured()) {
    $('#resumeBox').hidden = false;
    $('#resumeBtn').textContent = `Resume game ${saved.pin} (${Object.keys(saved.players).length} players)`;
    $('#resumeBtn').onclick = () => resume(saved);
  }

  $('#newGameBtn').onclick = newGame;
  $('#startBtn').onclick = () => startQuestion(0);
  $('#skipBtn').onclick = endQuestion;
  $('#toBoardBtn').onclick = () => { S.phase = 'board'; save(); renderBoard(); };
  $('#nextBtn').onclick = next;
  $('#csvBtn').onclick = downloadCSV;
  $('#againBtn').onclick = () => {
    if (!confirm('Start a brand-new game? Current results will be cleared (download the CSV first if you need it).')) return;
    QL.store.del(SAVE_KEY);
    location.reload();
  };
  $('#playerList').onclick = (e) => {
    const b = e.target.closest('.chip');
    if (b) kick(b.dataset.id);
  };
  $('#fsBtn').onclick = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
  };

  // Keep the projector laptop from sleeping during the game.
  async function keepAwake() {
    try { if ('wakeLock' in navigator) await navigator.wakeLock.request('screen'); } catch (e) { /* ignore */ }
  }
  keepAwake();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) keepAwake(); });

  show('setup');
  QL.registerSW();
})();

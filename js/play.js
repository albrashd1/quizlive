// Player (phone) screen.
(function () {
  const SAVE_KEY = 'quizlive-player';
  const $ = (s) => document.querySelector(s);
  const SCREENS = ['join', 'msg', 'ask', 'result'];

  let me = null;          // { pin, id, key, name, ans: { [questionIndex]: answerIndex } }
  let inCh = null, outCh = null;
  let accepted = false;
  let joinTimer = null, joinStarted = 0;
  let view = '';          // key of what is on screen, to avoid re-rendering the same thing
  let countdown = null, deadline = 0;
  let lastState = null;

  function show(name) { SCREENS.forEach((s) => { $('#' + s).hidden = s !== name; }); }

  function message(icon, title, text, leave) {
    show('msg');
    $('#msgIcon').textContent = icon;
    $('#msgTitle').textContent = title;
    $('#msgText').textContent = text || '';
    $('#leaveBtn').hidden = !leave;
  }

  function saveMe() { QL.store.set(SAVE_KEY, me); }

  function header(score) {
    $('#pName').textContent = me ? me.name : '';
    $('#pScore').textContent = score != null ? score + ' pts' : '';
  }

  // ---------- connection ----------
  function connect() {
    const sb = QL.client();
    inCh = sb.channel(QL.inName(me.pin));      // never subscribed: we only send over HTTP
    outCh = sb.channel(QL.outName(me.pin));
    outCh
      .on('broadcast', { event: 'state' }, (m) => onState(m.payload || {}))
      .subscribe((st) => {
        $('#pConn').className = 'dot ' + (st === 'SUBSCRIBED' ? 'on' : 'off');
        if (st === 'SUBSCRIBED') sendJoin();
      });
    header(null);
    message('⏳', 'Joining…', `Game PIN ${me.pin}`, true);
    joinStarted = Date.now();
    clearInterval(joinTimer);
    joinTimer = setInterval(() => {
      if (accepted) return;
      sendJoin();
      if (Date.now() - joinStarted > 20000) {
        message('🤔', 'Still joining…', 'Check the PIN and make sure the host screen shows the lobby.', true);
      }
    }, 4000);
  }

  async function sendJoin() {
    try {
      await QL.httpSend(inCh, 'join', { id: me.id, key: me.key, name: me.name });
    } catch (e) { /* the retry timer or reconnect will try again */ }
  }

  async function sendAnswer(i, a) {
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        await QL.httpSend(inCh, 'answer', { id: me.id, key: me.key, i, a });
        return true;
      } catch (e) {
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
      }
    }
    return false;
  }

  // ---------- state from host ----------
  function onState(s) {
    lastState = s;
    if (s.kicked && s.kicked.includes(me.id)) {
      stopCountdown();
      QL.store.del(SAVE_KEY);
      accepted = false; clearInterval(joinTimer);
      message('🚫', 'Removed by the host', 'You can join again with a different nickname.');
      $('#leaveBtn').hidden = false;
      return;
    }
    if (!s.ids || !s.ids.includes(me.id)) return; // not in yet; keep retrying
    accepted = true;

    if (s.phase === 'lobby') {
      if (view === 'lobby') return;
      view = 'lobby';
      stopCountdown();
      header(0);
      message('✅', "You're in!", 'See your name on the screen? Wait for the game to start.', true);
    } else if (s.phase === 'question' && s.q) {
      const key = 'q' + s.q.i;
      if (view === key) {
        // same question again (e.g. after the phone woke up): just correct the timer
        if (countdown) deadline = Date.now() + s.q.left * 1000;
        return;
      }
      view = key;
      if (me.ans[s.q.i] !== undefined) return showLocked();
      renderQuestion(s.q, s.n);
    } else if ((s.phase === 'reveal' || s.phase === 'board') && s.res) {
      const key = 'r' + s.res.i;
      if (view === key) return;
      view = key;
      renderResult(s.res, false);
    } else if (s.phase === 'end') {
      if (view === 'end') return;
      view = 'end';
      renderResult(s.res, true);
    }
  }

  function renderQuestion(q, total) {
    stopCountdown();
    show('ask');
    $('#aNum').textContent = `${q.i + 1} / ${total || '?'}`;
    $('#aDouble').hidden = !q.dbl;
    $('#aText').textContent = q.text;
    const grid = $('#aButtons');
    grid.className = 'answer-grid n' + q.options.length;
    grid.innerHTML = q.options.map((opt, i) => {
      const sh = QL.SHAPES[i];
      return `<button type="button" class="abtn ${sh.cls}" data-a="${i}">${sh.svg}<span>${QL.esc(opt)}</span></button>`;
    }).join('');
    grid.onclick = (e) => {
      const b = e.target.closest('.abtn');
      if (!b || me.ans[q.i] !== undefined) return;
      const a = Number(b.dataset.a);
      me.ans[q.i] = a; saveMe();
      if (navigator.vibrate) navigator.vibrate(30);
      showLocked();
      sendAnswer(q.i, a).then((ok) => {
        if (!ok && view === 'q' + q.i) message('⚠️', 'Connection problem', 'Your answer may not have reached the host.', false);
      });
    };
    deadline = Date.now() + q.left * 1000;
    const t = $('#aTimer');
    t.textContent = q.left;
    countdown = setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      t.textContent = left;
      if (left <= 0) {
        stopCountdown();
        if (me.ans[q.i] === undefined && view === 'q' + q.i) message('⌛', "Time's up!", 'Look at the screen for the answer.');
      }
    }, 1000);
  }

  function showLocked() {
    stopCountdown();
    message('🔒', 'Answer locked in!', 'Waiting for the others…');
  }

  function stopCountdown() { clearInterval(countdown); countdown = null; }

  function renderResult(res, final) {
    stopCountdown();
    show('result');
    const r = res && res.m && res.m[me.id];
    const box = $('#resBox');
    if (!r) {
      box.className = 'res-box neutral';
      $('#resIcon').textContent = final ? '🏁' : '👀';
      $('#resTitle').textContent = final ? 'Game over' : 'Next question coming…';
      $('#resPoints').textContent = '';
      $('#resRank').textContent = '';
      return;
    }
    const [status, pts, score, rank] = r;
    header(score);
    if (final) {
      box.className = 'res-box final';
      $('#resIcon').textContent = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🎉';
      $('#resTitle').textContent = `You finished ${QL.ordinal(rank)}!`;
      $('#resPoints').textContent = `${score} points`;
      $('#resRank').textContent = 'Thanks for playing!';
      QL.store.del(SAVE_KEY);
      clearInterval(joinTimer);
      return;
    }
    if (status === 1) {
      box.className = 'res-box good';
      $('#resIcon').textContent = '✔';
      $('#resTitle').textContent = 'Correct!';
      $('#resPoints').textContent = `+${pts}`;
    } else {
      box.className = 'res-box bad';
      $('#resIcon').textContent = '✖';
      $('#resTitle').textContent = status === 0 ? 'Incorrect' : 'No answer';
      $('#resPoints').textContent = `Answer: ${res.ctext}`;
    }
    $('#resRank').textContent = `You're in ${QL.ordinal(rank)} place · ${score} pts`;
  }

  // ---------- start ----------
  const params = new URLSearchParams(location.search);
  const urlPin = (params.get('pin') || '').replace(/\D/g, '');
  const saved = QL.store.get(SAVE_KEY);

  if (!QL.isConfigured()) {
    $('#joinWarn').innerHTML = QL.configWarning();
  }

  $('#leaveBtn').onclick = () => {
    QL.store.del(SAVE_KEY);
    location.href = '/play.html' + (me ? '?pin=' + me.pin : '');
  };

  if (saved && saved.id && (!urlPin || urlPin === saved.pin) && QL.isConfigured()) {
    me = saved; // rejoin automatically after a refresh or a dropped connection
    me.ans = me.ans || {};
    connect();
  } else {
    show('join');
    if (urlPin) { $('#pinInput').value = urlPin; $('#nameInput').focus(); }
  }

  $('#joinForm').onsubmit = (e) => {
    e.preventDefault();
    if (!QL.isConfigured()) return;
    const pin = $('#pinInput').value.replace(/\D/g, '');
    const name = QL.cleanName($('#nameInput').value);
    if (pin.length !== 6) { $('#pinInput').focus(); return; }
    if (!name) { $('#nameInput').focus(); return; }
    me = { pin, id: QL.rid(10), key: QL.rid(16), name, ans: {} };
    saveMe();
    history.replaceState(null, '', '/play.html?pin=' + pin);
    connect();
  };

  // Phones lock their screens: when the student comes back, re-sync with the host.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && me && inCh) sendJoin();
  });

  QL.registerSW();
})();

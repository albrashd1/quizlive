// Shared helpers for host and player pages.
(function () {
  const CFG = window.QUIZ_CONFIG || {};

  const QL = {};

  QL.isConfigured = function () {
    return !!(
      CFG.SUPABASE_URL && CFG.SUPABASE_KEY &&
      !CFG.SUPABASE_URL.includes('YOUR-PROJECT') &&
      !CFG.SUPABASE_KEY.includes('XXXX')
    );
  };

  QL.client = function () {
    if (!QL._client) QL._client = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_KEY);
    return QL._client;
  };

  // Two one-way channels per game keep message counts low:
  //   IN  = phones -> host  (only the host listens)
  //   OUT = host -> phones
  QL.inName = (pin) => `quizlive-${pin}-in`;
  QL.outName = (pin) => `quizlive-${pin}-out`;

  // Send without holding a subscription (HTTP). Used by phones to talk to the host.
  QL.httpSend = async function (channel, event, payload) {
    if (typeof channel.httpSend === 'function') {
      const r = await channel.httpSend(event, payload);
      if (r && r.success === false) throw new Error(r.error || 'send failed');
      return;
    }
    const r = await channel.send({ type: 'broadcast', event, payload });
    if (r !== 'ok') throw new Error('send failed: ' + r);
  };

  // localStorage that never throws (private mode, blocked storage, etc.)
  QL.store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
  };

  QL.rid = function (n) {
    const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
    const a = new Uint8Array(n);
    crypto.getRandomValues(a);
    return Array.from(a, (x) => chars[x % chars.length]).join('');
  };

  QL.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  QL.cleanName = (s) => String(s || '').replace(/[\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);

  QL.ordinal = function (n) {
    const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  QL.SHAPES = [
    { name: 'triangle', cls: 'c0', svg: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4 30 28H2z"/></svg>' },
    { name: 'diamond', cls: 'c1', svg: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 2 30 16 16 30 2 16z"/></svg>' },
    { name: 'circle', cls: 'c2', svg: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="13"/></svg>' },
    { name: 'square', cls: 'c3', svg: '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="4" y="4" width="24" height="24" rx="2"/></svg>' },
  ];

  QL.registerSW = function () {
    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
    }
  };

  QL.configWarning = function () {
    return '<div class="card warn"><h2>Setup needed</h2><p>Open <code>js/config.js</code> and paste your Supabase Project URL and publishable key, then deploy again. See README step 1.</p></div>';
  };

  window.QL = QL;
})();

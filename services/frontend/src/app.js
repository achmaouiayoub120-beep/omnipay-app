/* OmniPay — portail bancaire client (Vanilla JS, aucune dépendance).
 * - Appels REST vers auth-service et transaction-service avec Bearer JWT + X-Idempotency-Key.
 * - Tout contenu dynamique est inséré via textContent (pas d'innerHTML) : pas d'injection HTML/XSS.
 */
(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
  const dateFmt = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'medium' });

  // URL des API : relatif (/api, derrière Nginx / Ingress) ou, en développement local, accès direct aux services.
  const LOCAL_BACKENDS = { auth: 'http://localhost:8081', tx: 'http://localhost:8082' };
  const TOKEN_KEY = 'omnipay.jwt';
  const THEME_KEY = 'omnipay.theme';
  const DEFAULT_TARGET = 'ACC-BOB-002';

  const state = {
    api: { auth: '', tx: '' },
    token: null, user: null, roles: [], exp: 0,
    accounts: [], txs: [], local: [],
    filter: 'all', pending: null, highlight: null, timer: null,
  };

  /* ---------- utilitaires ---------- */
  const safeStore = (kind) => ({
    get(key) { try { return window[kind].getItem(key); } catch { return null; } },
    set(key, value) { try { window[kind].setItem(key, value); } catch { /* stockage indisponible */ } },
    del(key) { try { window[kind].removeItem(key); } catch { /* stockage indisponible */ } },
  });
  const session = safeStore('sessionStorage');
  const prefs = safeStore('localStorage');

  function uuid() {
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  }

  function el(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else node.setAttribute(key, value);
    }
    node.append(...children);
    return node;
  }

  function b64urlToString(segment) {
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (segment.length % 4)) % 4);
    return new TextDecoder().decode(Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)));
  }

  function decodeJwt(token) {
    const [header, payload, signature] = token.split('.');
    return { header: JSON.parse(b64urlToString(header)), payload: JSON.parse(b64urlToString(payload)), signature };
  }

  function toast(kind, title, message, ms = 5000) {
    const node = el('div', { class: `toast ${kind}`, role: 'status' }, el('strong', { text: title }));
    if (message) node.append(el('span', { text: message }));
    $('#toasts').append(node);
    setTimeout(() => node.remove(), ms);
  }

  function setLoading(button, loading) {
    button.classList.toggle('is-loading', loading);
    button.disabled = loading;
  }

  function showError(node, message) {
    node.textContent = message || '';
    node.hidden = !message;
  }

  /* ---------- API ---------- */
  async function request(service, path, { method = 'GET', body, headers = {}, auth = true, timeout = 15000 } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const h = { Accept: 'application/json', ...headers };
      if (body !== undefined) h['Content-Type'] = 'application/json';
      if (auth && state.token) h.Authorization = `Bearer ${state.token}`;
      const res = await fetch(state.api[service] + path, {
        method, headers: h, signal: controller.signal,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      let data = null;
      try { data = await res.json(); } catch { /* corps vide */ }
      if (res.status === 401 && auth && state.token) logout('Session expirée ou jeton refusé : reconnectez-vous.');
      return { ok: res.ok, status: res.status, data };
    } catch {
      return { ok: false, status: 0, data: null };
    } finally {
      clearTimeout(timer);
    }
  }

  function errorMessage(r) {
    switch (r.status) {
      case 0: return 'Réseau indisponible ou délai dépassé. Vous pouvez réessayer : la même clé d\'idempotence évite tout double débit.';
      case 400: return 'Données invalides (compte, montant ou motif).';
      case 401: return 'Identifiants invalides ou session expirée.';
      case 403: return 'Action refusée pour votre rôle ou pour ce compte.';
      case 404: return 'Compte introuvable.';
      case 422: return 'Solde insuffisant.';
      default: return r.status >= 500 ? `Erreur serveur (${r.status}). Réessayez sans risque : la clé d'idempotence est conservée.` : `Erreur (${r.status}).`;
    }
  }

  async function detectApi() {
    const label = $('#api-status');
    const probe = async (base) => {
      try {
        const res = await fetch(`${base}/api/auth/health`, { cache: 'no-store' });
        return res.ok && (await res.json()).status === 'UP';
      } catch { return false; }
    };
    if (location.protocol !== 'file:' && (await probe(''))) {
      label.textContent = 'API : via /api (proxy Nginx / Ingress)';
    } else if (['localhost', '127.0.0.1', ''].includes(location.hostname) && (await probe(LOCAL_BACKENDS.auth))) {
      state.api = { ...LOCAL_BACKENDS };
      label.textContent = 'API : accès direct localhost:8081 / 8082';
    } else {
      label.textContent = 'API : injoignable';
    }
  }

  /* ---------- rôles & session ---------- */
  const hasRole = (role) => state.roles.includes(role);
  const isAdmin = () => hasRole('ROLE_ADMIN');
  const canWrite = () => hasRole('ROLE_USER') || hasRole('ROLE_ADMIN');

  function primaryRole() {
    if (isAdmin()) return 'ROLE_ADMIN';
    if (hasRole('ROLE_AUDITOR') && !hasRole('ROLE_USER')) return 'ROLE_AUDITOR';
    return 'ROLE_USER';
  }

  function startSession(token) {
    const { payload } = decodeJwt(token);
    state.token = token;
    state.user = payload.sub;
    state.roles = Array.isArray(payload.roles) ? payload.roles : [];
    state.exp = (payload.exp || 0) * 1000;
    session.set(TOKEN_KEY, token);
    enterApp();
  }

  function restoreSession() {
    const token = session.get(TOKEN_KEY);
    if (!token) return;
    try {
      if (decodeJwt(token).payload.exp * 1000 > Date.now()) { startSession(token); return; }
    } catch { /* jeton illisible */ }
    session.del(TOKEN_KEY);
  }

  function logout(message) {
    state.token = null; state.user = null; state.roles = []; state.exp = 0;
    state.accounts = []; state.txs = []; state.local = []; state.pending = null;
    session.del(TOKEN_KEY);
    clearInterval(state.timer);
    $('#app-view').hidden = true;
    $('#user-chip').hidden = true;
    $('#btn-logout').hidden = true;
    $('#login-view').hidden = false;
    $('#jury-panel').hidden = true;
    $('#btn-jury').setAttribute('aria-expanded', 'false');
    if (message) toast('info', 'Déconnecté', message);
  }

  function tickSession() {
    const left = Math.floor((state.exp - Date.now()) / 1000);
    if (left <= 0) { logout('Votre jeton JWT a expiré (durée de vie : 1 heure).'); return; }
    const mm = String(Math.floor(left / 60)).padStart(2, '0');
    const ss = String(left % 60).padStart(2, '0');
    $('#session-timer').textContent = `Jeton expire dans ${mm}:${ss}`;
  }

  async function enterApp() {
    $('#login-view').hidden = true;
    $('#app-view').hidden = false;
    $('#user-chip').hidden = false;
    $('#btn-logout').hidden = false;
    $('#user-name').textContent = state.user;
    $('#card-holder').textContent = state.user;
    const role = primaryRole();
    const badge = $('#role-badge');
    badge.textContent = role;
    badge.className = `role-badge ${role === 'ROLE_ADMIN' ? 'is-admin' : role === 'ROLE_AUDITOR' ? 'is-auditor' : ''}`;
    const writable = canWrite();
    $('#transfer-readonly').hidden = writable;
    for (const field of $('#transfer-form').elements) field.disabled = !writable;
    $('#jury-inject').disabled = !writable;
    $('#jury-idem').disabled = !writable;
    $('#jury-chaos').disabled = !isAdmin();
    $('#jury-chaos').title = isAdmin() ? '' : 'Réservé au rôle ROLE_ADMIN';
    clearInterval(state.timer);
    tickSession();
    state.timer = setInterval(tickSession, 1000);
    await refreshData();
  }

  /* ---------- données & rendu ---------- */
  async function refreshData() {
    const [accounts, txs] = await Promise.all([
      request('tx', '/api/transactions/accounts/me'),
      request('tx', '/api/transactions'),
    ]);
    if (accounts.ok) state.accounts = accounts.data; else if (state.token) toast('ko', 'Comptes', errorMessage(accounts));
    if (txs.ok) state.txs = txs.data; else if (state.token) toast('ko', 'Historique', errorMessage(txs));
    render();
  }

  const myAccountIds = () => new Set(state.accounts.map((a) => a.accountId));

  function direction(tx) {
    const mine = myAccountIds();
    if (mine.has(tx.sourceAccount)) return 'debit';
    if (mine.has(tx.targetAccount)) return 'credit';
    return 'other';
  }

  function render() {
    renderStats();
    renderTable();
  }

  function renderStats() {
    const balance = state.accounts.reduce((sum, a) => sum + Number(a.balance), 0);
    $('#stat-balance').textContent = state.accounts.length ? eur.format(balance) : '—';
    $('#stat-account').textContent = state.accounts.length
      ? `Compte ${state.accounts.map((a) => a.accountId).join(', ')}`
      : 'Aucun compte associé (rôle lecture seule)';
    const now = new Date();
    let income = 0; let expense = 0;
    for (const tx of state.txs) {
      const d = new Date(tx.createdAt);
      if (tx.status !== 'SUCCESS' || d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) continue;
      const dir = direction(tx);
      if (dir === 'credit') income += Number(tx.amount);
      if (dir === 'debit') expense += Number(tx.amount);
    }
    $('#stat-income').textContent = state.accounts.length ? `+ ${eur.format(income)}` : '—';
    $('#stat-expense').textContent = state.accounts.length ? `− ${eur.format(expense)}` : '—';
  }

  const STATUS = {
    SUCCESS: ['Validé', 'ok'],
    REJECTED: ['Rejeté', 'ko'],
    PENDING: ['En cours', 'wait'],
  };

  function renderTable() {
    const rows = [
      ...state.local,
      ...state.txs.map((tx) => ({ ...tx, createdAt: new Date(tx.createdAt) })),
    ].sort((a, b) => b.createdAt - a.createdAt);
    const body = $('#tx-body');
    body.replaceChildren();
    let shown = 0;
    for (const tx of rows) {
      const dir = direction(tx);
      if (state.filter !== 'all' && dir !== state.filter) continue;
      shown += 1;
      const counterpart = dir === 'debit' ? tx.targetAccount : dir === 'credit' ? tx.sourceAccount : `${tx.sourceAccount} → ${tx.targetAccount}`;
      const [label, kind] = STATUS[tx.status] || [tx.status, 'wait'];
      const sign = tx.status !== 'SUCCESS' ? '' : dir === 'debit' ? '− ' : dir === 'credit' ? '+ ' : '';
      const reason = tx.reason || tx.note || '—';
      const tr = el('tr', tx.id === state.highlight ? { class: 'is-new' } : {},
        el('td', { text: dateFmt.format(tx.createdAt) }),
        el('td', { text: counterpart }),
        el('td', { text: reason }),
        el('td', {}, el('span', { class: `badge ${kind}`, text: label })),
        el('td', { class: `num amount ${tx.status === 'SUCCESS' ? dir : ''}`, text: sign + eur.format(Number(tx.amount)) }));
      body.append(tr);
    }
    $('#tx-empty').hidden = shown > 0;
  }

  /* ---------- virement ---------- */
  function parseAmount(raw) {
    const cleaned = raw.trim().replace(/\s/g, '').replace(',', '.');
    if (!/^\d{1,9}(\.\d{1,2})?$/.test(cleaned)) return null;
    const value = Number(cleaned);
    return value > 0 ? value : null;
  }

  async function onTransfer(event) {
    event.preventDefault();
    const target = $('#tf-target').value.trim().toUpperCase();
    const amount = parseAmount($('#tf-amount').value);
    const reason = $('#tf-reason').value.trim();
    const error = $('#tf-error');
    if (!target) { showError(error, 'Indiquez le compte destinataire.'); return; }
    if (amount === null) { showError(error, 'Montant invalide : nombre positif, 2 décimales maximum.'); return; }
    showError(error, '');

    // Une clé par intention de virement : conservée en cas d'erreur réseau/serveur pour pouvoir réessayer sans double débit.
    const fingerprint = `${target}|${amount}|${reason}`;
    if (!state.pending || state.pending.fingerprint !== fingerprint) state.pending = { key: uuid(), fingerprint };

    const button = $('#tf-submit');
    setLoading(button, true);
    const localId = `local-${uuid()}`;
    const entry = { id: localId, createdAt: new Date(), sourceAccount: state.accounts[0]?.accountId || '—', targetAccount: target, amount, status: 'PENDING', reason };
    state.local.unshift(entry);
    renderTable();

    const r = await request('tx', '/api/transactions', {
      method: 'POST',
      body: { targetAccount: target, amount, reason: reason || undefined },
      headers: { 'X-Idempotency-Key': state.pending.key },
    });
    setLoading(button, false);

    if (r.ok) {
      state.local = state.local.filter((e) => e.id !== localId);
      const replay = r.data.status === 'IDEMPOTENT_REPLAY';
      if (replay) toast('info', 'Virement déjà traité', 'Rejeu idempotent : aucun double débit.');
      else toast('ok', 'Virement validé', `${eur.format(amount)} envoyés à ${target}.`);
      state.pending = null;
      state.highlight = r.data.transactionId;
      $('#tf-amount').value = '';
      $('#tf-reason').value = '';
      await refreshData();
      return;
    }
    entry.status = 'REJECTED';
    entry.note = errorMessage(r);
    const definitive = r.status >= 400 && r.status < 500;
    if (definitive) state.pending = null;
    showError(error, errorMessage(r));
    toast('ko', 'Virement rejeté', errorMessage(r));
    renderTable();
    if (!definitive) refreshData();
  }

  /* ---------- outils jury ---------- */
  function juryLog(kind, message) {
    const time = el('time', { text: new Date().toLocaleTimeString('fr-FR') });
    $('#jury-log').prepend(el('li', { class: kind }, time, message));
  }

  function progress(done, total, label) {
    $('.jury-progress').hidden = false;
    $('#jury-bar').style.width = `${Math.round((done / total) * 100)}%`;
    $('#jury-progress-text').textContent = `${label} : ${done}/${total}`;
  }

  async function runBatch(total, concurrency, worker, label) {
    const results = [];
    let next = 0; let done = 0;
    const lane = async () => {
      while (next < total) {
        const index = next++;
        results[index] = await worker(index);
        progress(++done, total, label);
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, total) }, lane));
    return results;
  }

  const countBy = (results, pick) => results.reduce((acc, r) => { const k = pick(r); acc[k] = (acc[k] || 0) + 1; return acc; }, {});
  const summary = (counts) => Object.entries(counts).map(([k, v]) => `${k}×${v}`).join(' · ');

  async function injectTransactions() {
    const button = $('#jury-inject');
    setLoading(button, true);
    const target = $('#tf-target').value.trim().toUpperCase() || DEFAULT_TARGET;
    const started = performance.now();
    const results = await runBatch(50, 5, (i) => request('tx', '/api/transactions', {
      method: 'POST',
      body: { targetAccount: target, amount: 0.5, reason: `Démo jury #${i + 1}` },
      headers: { 'X-Idempotency-Key': uuid() },
    }), 'Transactions');
    const seconds = (performance.now() - started) / 1000;
    const ok = results.filter((r) => r.ok).length;
    juryLog(ok === 50 ? 'ok' : 'ko', `⚡ 50 virements de 0,50 € vers ${target} : ${ok} validés — HTTP ${summary(countBy(results, (r) => r.status))} — ${seconds.toFixed(1)} s (${(50 / seconds).toFixed(0)} req/s)`);
    toast(ok === 50 ? 'ok' : 'ko', 'Injection terminée', `${ok}/50 transactions validées en ${seconds.toFixed(1)} s. Surveillez Grafana.`);
    setLoading(button, false);
    await refreshData();
  }

  async function simulateErrors() {
    const button = $('#jury-chaos');
    setLoading(button, true);
    const results = await runBatch(20, 4, () => request('tx', '/api/transactions', {
      method: 'POST',
      body: { targetAccount: DEFAULT_TARGET, amount: 1 },
      headers: { 'X-Chaos-Fail': 'true' },
    }), 'Erreurs injectées');
    const errors = results.filter((r) => r.status === 500).length;
    if (errors > 0) {
      juryLog('ko', `🚨 ${errors} erreurs HTTP 500 injectées — HTTP ${summary(countBy(results, (r) => r.status))}. Le taux d'erreur monte : déclenche l'analyse et le rollback canary.`);
      toast('ko', 'Pannes simulées', `${errors} réponses HTTP 500 générées (aucun virement exécuté).`);
    } else {
      juryLog('info', `🚨 Injection refusée — HTTP ${summary(countBy(results, (r) => r.status))}. Activer OMNIPAY_CHAOS_ENABLED=true (dev / recette) avec un compte ROLE_ADMIN.`);
      toast('info', 'Injection de panne désactivée', 'Variable OMNIPAY_CHAOS_ENABLED=false sur cet environnement, ou rôle insuffisant.');
    }
    setLoading(button, false);
  }

  async function testIdempotency() {
    const button = $('#jury-idem');
    setLoading(button, true);
    const key = uuid();
    const send = () => request('tx', '/api/transactions', {
      method: 'POST',
      body: { targetAccount: $('#tf-target').value.trim().toUpperCase() || DEFAULT_TARGET, amount: 1, reason: 'Test idempotence' },
      headers: { 'X-Idempotency-Key': key },
    });
    const results = await Promise.all([send(), send()]);
    const counts = countBy(results, (r) => (r.data && r.data.status) || `HTTP ${r.status}`);
    const single = (counts.SUCCESS || 0) === 1 && (counts.IDEMPOTENT_REPLAY || 0) === 1;
    juryLog(single ? 'ok' : 'ko', `🔁 Double envoi de la clé ${key.slice(0, 8)}… : ${summary(counts)} ${single ? '→ un seul débit de 1,00 €' : ''}`);
    toast(single ? 'ok' : 'info', 'Idempotence', single ? 'Deux requêtes, un seul débit : IDEMPOTENT_REPLAY.' : `Résultat : ${summary(counts)}`);
    setLoading(button, false);
    await refreshData();
  }

  function claimRow(list, label, value) {
    list.append(el('dt', { text: label }), el('dd', {}, ...(Array.isArray(value) ? value : [value])));
  }

  function showJwt() {
    const list = $('#jwt-claims');
    list.replaceChildren();
    try {
      const { header, payload, signature } = decodeJwt(state.token);
      const when = (seconds) => `${dateFmt.format(new Date(seconds * 1000))} (${seconds})`;
      claimRow(list, 'Subject (sub)', payload.sub);
      claimRow(list, 'Rôles (roles)', (payload.roles || []).map((r) => el('span', { class: 'tag', text: r })));
      claimRow(list, 'Émetteur (iss)', payload.iss);
      claimRow(list, 'Émis le (iat)', when(payload.iat));
      claimRow(list, 'Expire le (exp)', when(payload.exp));
      claimRow(list, 'Identifiant (jti)', payload.jti || '—');
      claimRow(list, 'Algorithme', header.alg);
      claimRow(list, 'Signature', el('span', { class: 'sig', text: `${signature.slice(0, 32)}… (${signature.length} car., HMAC-SHA256)` }));
      $('#jwt-raw').textContent = JSON.stringify({ header, payload }, null, 2);
    } catch {
      claimRow(list, 'Erreur', 'Jeton illisible');
    }
    $('#jwt-verify-result').textContent = '';
    const dialog = $('#jwt-modal');
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
  }

  async function verifyJwtOnServer() {
    const button = $('#jwt-verify');
    const result = $('#jwt-verify-result');
    setLoading(button, true);
    const r = await request('auth', '/api/auth/validate', { auth: true });
    setLoading(button, false);
    result.textContent = r.ok
      ? `✅ Signature, émetteur et expiration vérifiés par auth-service — sujet « ${r.data.subject} ».`
      : `❌ Jeton refusé par auth-service (HTTP ${r.status || 'réseau'}).`;
  }

  function toggleJury(open) {
    const panel = $('#jury-panel');
    const show = open === undefined ? panel.hidden : open;
    panel.hidden = !show;
    $('#btn-jury').setAttribute('aria-expanded', String(show));
  }

  /* ---------- initialisation ---------- */
  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    prefs.set(THEME_KEY, theme);
  }

  function setupBadge() {
    const secure = location.protocol === 'https:';
    $('#zt-text').textContent = secure
      ? 'Zero-Trust Active — TLS 1.3 Strict'
      : 'Zero-Trust Active — JWT + RBAC';
    $('#zt-badge').title = secure
      ? 'Connexion chiffrée de bout en bout'
      : 'HTTP local : le TLS 1.3 est terminé par l\'Ingress NGINX sur K3s (https://app.omnipay.local)';
    $('#zt-badge').classList.toggle('is-warn', !secure);
  }

  function bindEvents() {
    $('#login-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const username = $('#login-username').value.trim();
      const password = $('#login-password').value;
      const error = $('#login-error');
      if (!username || !password) { showError(error, 'Identifiant et mot de passe requis.'); return; }
      showError(error, '');
      const button = $('#login-submit');
      setLoading(button, true);
      const r = await request('auth', '/api/auth/login', { method: 'POST', body: { username, password }, auth: false });
      setLoading(button, false);
      if (!r.ok) {
        showError(error, r.status === 401 ? 'Identifiants invalides.' : errorMessage(r));
        return;
      }
      toast('ok', 'Connexion réussie', `Bienvenue ${r.data.username} (${r.data.roles.join(', ')}).`);
      startSession(r.data.token);
    });
    document.querySelectorAll('[data-demo]').forEach((chip) => chip.addEventListener('click', () => {
      $('#login-username').value = chip.dataset.demo;
      $('#login-password').value = 'password';
    }));
    $('#transfer-form').addEventListener('submit', onTransfer);
    document.querySelectorAll('.seg-btn').forEach((btn) => btn.addEventListener('click', () => {
      state.filter = btn.dataset.filter;
      document.querySelectorAll('.seg-btn').forEach((b) => {
        const active = b === btn;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-selected', String(active));
      });
      renderTable();
    }));
    $('#btn-logout').addEventListener('click', () => logout('À bientôt.'));
    $('#btn-theme').addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
    $('#btn-jury').addEventListener('click', () => toggleJury());
    $('#jury-close').addEventListener('click', () => toggleJury(false));
    $('#jury-inject').addEventListener('click', injectTransactions);
    $('#jury-chaos').addEventListener('click', simulateErrors);
    $('#jury-idem').addEventListener('click', testIdempotency);
    $('#jury-jwt').addEventListener('click', () => {
      if (!state.token) { toast('info', 'Jeton JWT', 'Connectez-vous d\'abord.'); return; }
      showJwt();
    });
    $('#jwt-close').addEventListener('click', () => $('#jwt-modal').close());
    $('#jwt-verify').addEventListener('click', verifyJwtOnServer);
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') toggleJury(false); });
  }

  async function init() {
    applyTheme(prefs.get(THEME_KEY) === 'light' ? 'light' : 'dark');
    setupBadge();
    bindEvents();
    await detectApi();
    restoreSession();
  }

  init();
})();

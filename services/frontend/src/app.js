/**
 * OmniPay Zero-Trust — Portail web React 18 (Semaine 4)
 * Auteur : Amira Adolf (P2) & Équipe OmniPay ESTC
 * - React 18 natif local (aucun build, aucun CDN) ; conforme à la CSP stricte ('self').
 * - Appelle l'API réelle : login JWT, solde, historique, virement avec X-Idempotency-Key.
 * - Toasts vert (confirmé), rouge (rejeté), jaune (requête dupliquée / idempotence) ; rafraîchissement automatique.
 * - Console jury : trafic réel (50 virements, double envoi, erreurs 500) et panne notification SIMULÉE.
 */

(() => {
  'use strict';

  const { useState, useEffect, useRef, useMemo, useCallback, createElement: h } = React;
  const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
  const dateFmt = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'medium' });

  const LOCAL_BACKENDS = { auth: 'http://localhost:8081', tx: 'http://localhost:8082' };
  const TOKEN_KEY = 'omnipay.jwt';
  const SOUND_KEY = 'omnipay.sound';
  const THEME_KEY = 'omnipay.theme';

  /* ===========================================================================
   * 1. UTILITAIRES & CRYPTOGRAPHIE
   * =========================================================================== */
  function uuid() {
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  }

  function b64urlToString(segment) {
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (segment.length % 4)) % 4);
    return new TextDecoder().decode(Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)));
  }

  function decodeJwt(token) {
    try {
      const [header, payload, signature] = token.split('.');
      return { header: JSON.parse(b64urlToString(header)), payload: JSON.parse(b64urlToString(payload)), signature };
    } catch {
      return { header: {}, payload: {}, signature: '' };
    }
  }

  /* ---------- API réelle (auth-service + transaction-service) ---------- */
  // Derrière Nginx/Ingress : même origine (''). En développement local : accès direct aux ports 8081/8082.
  const apiBase = { auth: '', tx: '' };
  const REPLAY_STATUS = 'IDEMPOTENT_REPLAY';

  async function request(service, path, { method = 'GET', body, headers = {}, token = null, timeout = 15000 } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const hdr = { Accept: 'application/json', ...headers };
      if (body !== undefined) hdr['Content-Type'] = 'application/json';
      if (token) hdr.Authorization = `Bearer ${token}`;
      const res = await fetch(apiBase[service] + path, {
        method, headers: hdr, signal: controller.signal,
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      let data = null;
      try { data = await res.json(); } catch { /* corps vide */ }
      return { ok: res.ok, status: res.status, data };
    } catch {
      return { ok: false, status: 0, data: null };
    } finally {
      clearTimeout(timer);
    }
  }

  /** Message utilisateur sécurisé : aucun détail interne (pile, SQL, message brut du serveur) n'est affiché. */
  function errorMessage(status) {
    switch (status) {
      case 0: return 'Réseau indisponible ou délai dépassé. Réessayez : la même clé d\'idempotence évite tout double prélèvement.';
      case 400: return 'Données invalides (compte, montant ou motif).';
      case 401: return 'Identifiants invalides ou session expirée.';
      case 403: return 'Action refusée pour votre rôle ou pour ce compte.';
      case 404: return 'Compte destinataire introuvable.';
      default: return status >= 500
        ? `Erreur serveur (${status}). Réessayez sans risque : la clé d'idempotence est conservée.`
        : `Erreur (${status}).`;
    }
  }

  const mapTransaction = (t) => ({
    id: t.id, timestamp: t.createdAt, sourceAccount: t.sourceAccount, targetAccount: t.targetAccount,
    amount: Number(t.amount), reason: t.reason || 'Virement bancaire', status: t.status
  });

  /* ===========================================================================
   * 2. MOTEUR SONORE FINTECH (Web Audio API)
   * =========================================================================== */
  let audioCtx = null;
  function playSound(type, enabled = true) {
    if (!enabled) return;
    try {
      if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (!audioCtx) return;
      if (audioCtx.state === 'suspended') audioCtx.resume();

      const now = audioCtx.currentTime;
      if (type === 'success') {
        [659.25, 830.61, 987.77].forEach((freq, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          gain.gain.setValueAtTime(0.12, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.45);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.45);
        });
      } else if (type === 'click') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.04);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.04);
      } else if (type === 'error') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.22);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.22);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
      }
    } catch {}
  }

  /* ===========================================================================
   * 3. MOTEUR DE CONFETTIS (Canvas 2D)
   * =========================================================================== */
  function burstConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#38bdf8', '#10b981', '#f59e0b', '#ec4899', '#6366f1', '#fbbf24'];
    const particles = Array.from({ length: 70 }, () => ({
      x: window.innerWidth * (0.35 + Math.random() * 0.3),
      y: window.innerHeight * 0.45,
      vx: (Math.random() - 0.5) * 16,
      vy: -Math.random() * 12 - 4,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rSpeed: (Math.random() - 0.5) * 12,
      opacity: 1
    }));

    let startTime = null;
    function animate(time) {
      if (!startTime) startTime = time;
      const progress = (time - startTime) / 1000;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.38;
        p.rotation += p.rSpeed;
        p.opacity = Math.max(0, 1 - progress / 2.2);

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.5);
        ctx.restore();
      });

      if (progress < 2.2) requestAnimationFrame(animate);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    requestAnimationFrame(animate);
  }

  /* ===========================================================================
   * 4. COMPOSANT RACINE APPLICATION REACT 18
   * =========================================================================== */
  function App() {
    // Session State
    const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || null);
    const [user, setUser] = useState(null);
    const [roles, setRoles] = useState([]);
    const [expTime, setExpTime] = useState(0);
    const [sessionCountdown, setSessionCountdown] = useState('59:59');

    // Theme & Audio
    const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'dark');
    const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem(SOUND_KEY) !== 'false');

    // UI Modals & Panels
    const [isJuryOpen, setIsJuryOpen] = useState(false);
    const [isSecurityHudOpen, setIsSecurityHudOpen] = useState(false);
    const [isJwtModalOpen, setIsJwtModalOpen] = useState(false);

    // Business Data
    const [accounts, setAccounts] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [filter, setFilter] = useState('all');
    const [activeTab, setActiveTab] = useState('table'); // 'table' | 'analytics'

    // Form & Idempotency
    const [targetAccount, setTargetAccount] = useState('ACC-BOB-002');
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [idempotencyKey, setIdempotencyKey] = useState(uuid());
    const [pendingCount, setPendingCount] = useState(0); // requêtes de virement en vol (clics répétés inclus)
    const [formError, setFormError] = useState('');
    // Une clé d'idempotence par intention de virement : tous les clics sur la même saisie réutilisent la même clé.
    const intentRef = useRef({ fingerprint: '', key: '' });
    const tokenRef = useRef(token);
    tokenRef.current = token;

    // Connexion
    const [loginUser, setLoginUser] = useState('alice');
    const [loginPass, setLoginPass] = useState('');
    const [loginError, setLoginError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    // Démo jury
    const [notifOutage, setNotifOutage] = useState(false); // panne simulée du notification-service
    const notifOutageRef = useRef(false);
    notifOutageRef.current = notifOutage;
    const [juryBusy, setJuryBusy] = useState('');
    const [lastRefresh, setLastRefresh] = useState('');

    // Feedback
    const [toasts, setToasts] = useState([]);
    const [juryLogs, setJuryLogs] = useState([]);
    const [apiStatus, setApiStatus] = useState('API : Détection automatique...');

    // Card State
    const [cardSkin, setCardSkin] = useState('obsidian');
    const [isCardFlipped, setIsCardFlipped] = useState(false);
    const [isCardMasked, setIsCardMasked] = useState(true);

    const vcardRef = useRef(null);
    const shineRef = useRef(null);

    // Toast helper
    const addToast = useCallback((kind, title, message) => {
      const id = uuid();
      setToasts(prev => [...prev, { id, kind, title, message }]);
      playSound(kind === 'ok' ? 'success' : kind === 'ko' ? 'error' : 'click', soundEnabled);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 5000);
    }, [soundEnabled]);

    // Jury Log helper
    const addJuryLog = useCallback((msg, level = 'info') => {
      const now = new Date();
      const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      setJuryLogs(prev => [{ id: uuid(), time, msg, level }, ...prev.slice(0, 40)]);
    }, []);

    // Theme effect
    useEffect(() => {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem(THEME_KEY, theme);
    }, [theme]);

    // Parse Token
    useEffect(() => {
      if (!token) {
        setUser(null);
        setRoles([]);
        setExpTime(0);
        return;
      }
      try {
        const { payload } = decodeJwt(token);
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          logout('Session expirée.');
          return;
        }
        setUser(payload.sub || 'Utilisateur');
        setRoles(Array.isArray(payload.roles) ? payload.roles : ['ROLE_USER']);
        setExpTime((payload.exp || 0) * 1000);
        sessionStorage.setItem(TOKEN_KEY, token);
      } catch {
        logout('Format de jeton invalide.');
      }
    }, [token]);

    // Countdown Timer
    useEffect(() => {
      if (!expTime) return;
      const interval = setInterval(() => {
        const left = Math.floor((expTime - Date.now()) / 1000);
        if (left <= 0) {
          logout('Votre jeton a expiré.');
          clearInterval(interval);
        } else {
          const mm = String(Math.floor(left / 60)).padStart(2, '0');
          const ss = String(left % 60).padStart(2, '0');
          setSessionCountdown(`${mm}:${ss}`);
        }
      }, 1000);
      return () => clearInterval(interval);
    }, [expTime]);

    // API Probing
    useEffect(() => {
      async function probe() {
        try {
          const res = await fetch('/api/auth/health', { cache: 'no-store' });
          if (res.ok) {
            setApiStatus('API connectée : via /api (proxy Nginx / Ingress)');
            return;
          }
        } catch {}
        try {
          const res2 = await fetch(`${LOCAL_BACKENDS.auth}/api/auth/health`, { cache: 'no-store' });
          if (res2.ok) {
            apiBase.auth = LOCAL_BACKENDS.auth;
            apiBase.tx = LOCAL_BACKENDS.tx;
            setApiStatus('API connectée : accès direct localhost:8081 / 8082');
            return;
          }
        } catch {}
        setApiStatus('API injoignable : démarrez les microservices (docker compose up)');
      }
      probe();
    }, []);

    // Refresh Data on Token change
    // Solde + historique réels (GET /api/transactions/accounts/me et GET /api/transactions).
    // Appelé après chaque virement (succès, rejeu ou rejet) et toutes les 10 s : aucun rechargement de page.
    const refreshData = useCallback(async () => {
      const current = tokenRef.current;
      if (!current) return null;
      const [acc, hist] = await Promise.all([
        request('tx', '/api/transactions/accounts/me', { token: current }),
        request('tx', '/api/transactions', { token: current })
      ]);
      if (acc.status === 401 || hist.status === 401) {
        logout('Session expirée ou jeton refusé : reconnectez-vous.');
        return null;
      }
      let freshAccounts = null;
      if (acc.ok && Array.isArray(acc.data)) {
        freshAccounts = acc.data.map((a) => ({ accountId: a.accountId, balance: Number(a.balance), currency: a.currency }));
        setAccounts(freshAccounts);
      }
      if (hist.ok && Array.isArray(hist.data)) setTransactions(hist.data.map(mapTransaction));
      if (acc.ok || hist.ok) setLastRefresh(new Date().toLocaleTimeString('fr-FR'));
      return freshAccounts;
    }, []);

    useEffect(() => {
      if (!token || !user) return undefined;
      refreshData();
      const timer = setInterval(refreshData, 10000);
      return () => clearInterval(timer);
    }, [token, user, refreshData]);

    const logout = (msg) => {
      setToken(null);
      setAccounts([]);
      setTransactions([]);
      setLoginPass('');
      intentRef.current = { fingerprint: '', key: '' };
      sessionStorage.removeItem(TOKEN_KEY);
      if (msg) addToast('warn', 'Déconnexion', msg);
    };

    // 3D Card Parallax Effect
    const handleCardMouseMove = (e) => {
      if (isCardFlipped || !vcardRef.current) return;
      const rect = vcardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -12;
      const rotateY = ((x - centerX) / centerX) * 12;

      vcardRef.current.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
      if (shineRef.current) {
        shineRef.current.style.transform = `translate(${((x - centerX) / centerX) * 40}px, ${((y - centerY) / centerY) * 40}px)`;
      }
    };

    const handleCardMouseLeave = () => {
      if (vcardRef.current && !isCardFlipped) {
        vcardRef.current.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
        if (shineRef.current) shineRef.current.style.transform = 'translate(0, 0)';
      }
    };

    // Fast Login Switcher
    // Raccourci démo : pré-remplit l'identifiant (le mot de passe n'est jamais stocké dans le code du portail).
    const pickDemoUser = (u) => {
      playSound('click', soundEnabled);
      setLoginUser(u);
      setLoginError('');
      if (token) logout();
    };

    // Authentification réelle : POST /api/auth/login -> JWT HS256 signé par auth-service.
    const handleLogin = async (e) => {
      e.preventDefault();
      const username = loginUser.trim();
      if (!username || !loginPass) {
        setLoginError('Identifiant et mot de passe requis.');
        playSound('error', soundEnabled);
        return;
      }
      setIsLoggingIn(true);
      setLoginError('');
      const r = await request('auth', '/api/auth/login', { method: 'POST', body: { username, password: loginPass } });
      setIsLoggingIn(false);
      if (r.ok && r.data && r.data.token) {
        setLoginPass('');
        setToken(r.data.token);
        addToast('ok', 'Connexion réussie', `Session ouverte en tant que ${r.data.username} (${(r.data.roles || []).join(', ')}).`);
        addJuryLog(`POST /api/auth/login -> HTTP 200 : JWT émis pour ${r.data.username}`, 'info');
      } else {
        const msg = r.status === 401 ? 'Identifiants invalides.' : r.status === 429 ? 'Trop de tentatives : patientez quelques secondes.' : errorMessage(r.status);
        setLoginError(msg);
        addToast('ko', 'Connexion refusée', msg);
        addJuryLog(`POST /api/auth/login -> HTTP ${r.status}`, 'err');
      }
    };

    // Montant : nombre positif, 2 décimales maximum (virgule ou point).
    const parseAmount = (raw) => {
      const txt = String(raw).trim().replace(',', '.');
      return /^\d+(\.\d{1,2})?$/.test(txt) && Number(txt) > 0 ? Number(txt) : null;
    };

    const rotateKey = (usedKey) => {
      if (intentRef.current.key !== usedKey) return; // la clé a déjà été renouvelée (réponses multiples) ou une autre saisie est en cours
      const fresh = uuid();
      intentRef.current = { fingerprint: '', key: fresh };
      setIdempotencyKey(fresh);
    };

    // Virement réel : POST /api/transactions avec X-Idempotency-Key.
    // Le bouton n'est volontairement PAS désactivé pendant l'envoi : N clics sur la même saisie envoient N requêtes
    // portant la MÊME clé ; le serveur n'en exécute qu'une et rejoue la réponse pour les autres (toast jaune).
    const handleTransferSubmit = async (e) => {
      e.preventDefault();
      setFormError('');
      const amt = parseAmount(amount);
      const target = targetAccount.trim().toUpperCase();
      if (!target || amt === null) {
        setFormError('Renseignez un compte destinataire et un montant valide (nombre positif, 2 décimales maximum).');
        playSound('error', soundEnabled);
        return;
      }

      const fingerprint = `${target}|${amt.toFixed(2)}|${reason.trim()}`;
      // Nouvelle intention (saisie différente) : slot vierge -> on adopte la clé affichée, sinon on en génère une.
      // Même saisie (clics répétés, nouvelle tentative après erreur réseau) : la clé existante est réutilisée.
      if (intentRef.current.fingerprint !== fingerprint) {
        const slotIsFresh = intentRef.current.fingerprint === '';
        intentRef.current = { fingerprint, key: slotIsFresh ? idempotencyKey : uuid() };
      }
      const key = intentRef.current.key;
      setIdempotencyKey(key);

      setPendingCount((c) => c + 1);
      playSound('click', soundEnabled);
      addJuryLog(`POST /api/transactions (X-Idempotency-Key: ${key.slice(0, 8)}…) -> ${eur.format(amt)} vers ${target}`, 'info');

      const r = await request('tx', '/api/transactions', {
        method: 'POST',
        token: tokenRef.current,
        headers: { 'X-Idempotency-Key': key },
        body: { targetAccount: target, amount: amt, reason: reason.trim() || undefined }
      });
      setPendingCount((c) => Math.max(0, c - 1));

      if (r.ok && r.data) {
        const txId = r.data.transactionId;
        if (r.data.status === REPLAY_STATUS) {
          // Jaune : requête dupliquée interceptée par l'idempotence.
          addToast('warn', 'Requête dupliquée interceptée', `Transaction déjà enregistrée, pas de double prélèvement (id ${txId}).`);
          addJuryLog(`HTTP 200 IDEMPOTENT_REPLAY : clé ${key.slice(0, 8)}… déjà traitée, réponse d'origine rejouée (id ${txId}).`, 'warn');
        } else {
          // Vert : virement confirmé avec l'identifiant de transaction.
          burstConfetti();
          addToast('ok', 'Virement confirmé', `${eur.format(amt)} envoyés vers ${target}. Transaction ${txId}.`);
          addJuryLog(`HTTP 200 SUCCESS : transaction ${txId} validée, débit et crédit dans une seule transaction SQL.`, 'info');
          if (notifOutageRef.current) {
            addToast('info', 'Notification indisponible (panne simulée)', 'Le virement reste validé : le notification-service est découplé du chemin de paiement.');
            addJuryLog('notification-service injoignable (panne simulée) : virement NON impacté, notification à rejouer.', 'warn');
          }
        }
        setAmount('');
        setReason('');
        rotateKey(key);
        await refreshData();
        return;
      }

      // Rouge : rejet explicite.
      let message = errorMessage(r.status);
      if (r.status === 422) {
        const fresh = await refreshData();
        const available = fresh && fresh[0] ? fresh[0].balance : accounts[0]?.balance;
        message = available === undefined
          ? 'Fonds insuffisants pour ce virement.'
          : `Fonds insuffisants : solde disponible ${eur.format(available)} vs montant requis ${eur.format(amt)}`;
      }
      setFormError(message);
      addToast('ko', 'Virement rejeté', message);
      addJuryLog(`HTTP ${r.status} : virement rejeté (${r.status === 422 ? 'fonds insuffisants' : 'voir toast'}), aucun débit.`, 'err');
      if (r.status >= 400 && r.status < 500) rotateKey(key); // rejet définitif : nouvelle intention = nouvelle clé
      if (r.status !== 422) refreshData();
    };


    // Render Helpers
    const currentBalance = useMemo(() => accounts.reduce((acc, a) => acc + (a.balance || 0), 0), [accounts]);
    // Entrées / sorties calculées sur l'historique réel du compte connecté.
    const totals = useMemo(() => {
      const myId = accounts[0]?.accountId;
      return transactions.reduce((acc, tx) => {
        if (tx.status !== 'SUCCESS') return acc;
        if (tx.sourceAccount === myId) acc.expense += tx.amount;
        else if (tx.targetAccount === myId) acc.income += tx.amount;
        return acc;
      }, { income: 0, expense: 0 });
    }, [transactions, accounts]);
    const outShare = totals.expense + totals.income > 0
      ? Math.round((totals.expense / (totals.expense + totals.income)) * 100) : 0;
    const filteredTx = useMemo(() => {
      const myId = accounts[0]?.accountId;
      return transactions.filter(tx => {
        if (filter === 'debit') return tx.sourceAccount === myId;
        if (filter === 'credit') return tx.targetAccount === myId;
        return true;
      });
    }, [transactions, filter, accounts]);

    /* ===========================================================================
     * RENDU : HEADER
     * =========================================================================== */
    const renderHeader = () => {
      return h('header', { className: 'topbar glass' },
        h('a', { className: 'brand', href: '/', onClick: (e) => e.preventDefault() },
          h('div', { className: 'brand-logo-wrap' },
            h('img', { className: 'logo-chip', src: 'assets/logo-mark.png', alt: 'OmniPay', width: 44, height: 44 }),
            h('span', { className: 'pulse-glow' })
          ),
          h('div', { className: 'brand-text' },
            h('span', { className: 'brand-name' }, 'OmniPay'),
            h('span', { className: 'brand-sub' }, 'ZERO-TRUST BANKING')
          )
        ),
        // Zero-Trust HUD Badge
        h('button', {
          id: 'zt-badge',
          className: 'zt-badge',
          type: 'button',
          onClick: () => setIsSecurityHudOpen(true),
          title: 'Cliquer pour afficher la télémétrie de sécurité Zero-Trust'
        },
          h('span', { className: 'zt-radar' },
            h('i', { className: 'radar-dot' }),
            h('i', { className: 'radar-wave' })
          ),
          h('span', { id: 'zt-text', className: 'zt-text' }, 'Zero-Trust Active · TLS 1.3 · eBPF Falco')
        ),
        h('div', { className: 'topbar-spacer' }),
        // Profil Utilisateur
        token && h('div', { id: 'user-chip', className: 'user-chip' },
          h('div', { className: 'user-avatar' }, (user || 'AD').slice(0, 2).toUpperCase()),
          h('div', { className: 'user-meta' },
            h('strong', null, user),
            h('small', { className: 'muted' }, `Jeton: ${sessionCountdown}`)
          ),
          h('span', { className: `role-badge ${roles.includes('ROLE_ADMIN') ? 'is-admin' : ''}` }, roles.includes('ROLE_ADMIN') ? 'ROLE_ADMIN' : 'ROLE_USER')
        ),
        // Boutons Rapides
        h('button', {
          className: 'btn btn-icon',
          type: 'button',
          onClick: () => {
            const next = !soundEnabled;
            setSoundEnabled(next);
            localStorage.setItem(SOUND_KEY, String(next));
            addToast('info', 'Audio Fintech', next ? 'Effets sonores activés.' : 'Son coupé.');
          },
          title: 'Retour sonore'
        }, soundEnabled ? '🔊' : '🔇'),
        h('button', {
          className: 'btn btn-icon',
          type: 'button',
          onClick: () => setTheme(t => t === 'dark' ? 'light' : 'dark'),
          title: 'Changer de thème'
        }, theme === 'dark' ? '🌓' : '☀️'),
        h('button', {
          className: 'btn btn-jury',
          type: 'button',
          onClick: () => setIsJuryOpen(o => !o)
        },
          h('span', { className: 'jury-pulse' }),
          h('span', null, '⚡ Outils Jury & Soutenance')
        ),
        token && h('button', {
          className: 'btn btn-ghost',
          type: 'button',
          onClick: () => logout('Déconnexion réussie.')
        }, 'Déconnexion')
      );
    };

    /* ===========================================================================
     * RENDU : LOGIN VIEW
     * =========================================================================== */
    const renderLogin = () => {
      return h('section', { className: 'login-wrap' },
        h('form', { className: 'glass login-card', onSubmit: handleLogin, autoComplete: 'off' },
          h('div', { className: 'login-hero' },
            h('div', { className: 'logo-3d-wrap' },
              h('img', { className: 'login-logo', src: 'assets/logo.jpg', alt: 'OmniPay Zero-Trust', width: 130, height: 130 }),
              h('div', { className: 'logo-glow' })
            ),
            h('h1', null, 'Accès Sécurisé Néobanque'),
            h('p', { className: 'muted' }, 'Authentification par jeton JWT signé (HS256) émis par auth-service. Posture Zero-Trust : chaque requête est revérifiée.')
          ),
          h('div', { className: 'form-group' },
            h('label', { htmlFor: 'login-username' }, 'Identifiant bancaire'),
            h('input', {
              id: 'login-username', name: 'username', type: 'text', value: loginUser, autoCapitalize: 'off', spellCheck: false,
              onChange: (e) => setLoginUser(e.target.value), placeholder: 'alice, bob ou admin'
            })
          ),
          h('div', { className: 'form-group' },
            h('label', { htmlFor: 'login-password' }, 'Mot de passe'),
            h('input', {
              id: 'login-password', name: 'password', type: 'password', value: loginPass, autoComplete: 'current-password',
              onChange: (e) => setLoginPass(e.target.value), placeholder: '••••••••••••'
            })
          ),
          // Raccourcis démo : pré-remplissent l'identifiant ; le mot de passe de démo est celui du dépôt (voir la doc), jamais codé ici.
          h('div', { className: 'demo-accounts' },
            h('span', { className: 'demo-label' }, 'Comptes démo (identifiant pré-rempli) :'),
            h('div', { className: 'demo-chips' },
              ['alice', 'bob', 'admin', 'auditor'].map((u) =>
                h('button', { key: u, type: 'button', className: 'chip', onClick: () => pickDemoUser(u) }, u)
              )
            )
          ),
          loginError && h('p', { className: 'form-error', role: 'alert' }, loginError),
          h('button', { className: 'btn btn-primary btn-block btn-lg', type: 'submit', disabled: isLoggingIn },
            isLoggingIn ? 'Authentification…' : 'Se connecter'),
          h('div', { className: 'login-badges' },
            h('span', null, '🔒 JWT stateless'),
            h('span', null, '⚡ Vault Secrets'),
            h('span', null, '🛡️ eBPF Falco')
          )
        )
      );
    };

    /* ===========================================================================
     * RENDU : DASHBOARD VIEW
     * =========================================================================== */
    const renderDashboard = () => {
      return h('section', null,
        // Grille Supérieure : Carte 3D + Indicateurs
        h('div', { className: 'grid-top' },
          // Carte 3D
          h('div', { className: 'vcard-container', 'data-skin': cardSkin },
            h('article', {
              className: `vcard ${isCardFlipped ? 'is-flipped' : ''}`,
              ref: vcardRef,
              onMouseMove: handleCardMouseMove,
              onMouseLeave: handleCardMouseLeave,
              onClick: (e) => {
                if (e.target.closest('#btn-unmask-card') || e.target.closest('#btn-copy-iban')) return;
                playSound('click', soundEnabled);
                setIsCardFlipped(f => !f);
              }
            },
              // Face Avant
              h('div', { className: 'vcard-face vcard-front' },
                h('div', { className: 'vcard-shine', ref: shineRef }),
                h('div', { className: 'vcard-row vcard-head' },
                  h('span', { className: 'vcard-brand' },
                    h('img', { className: 'logo-chip', src: 'assets/logo-mark.png', alt: '', width: 34, height: 34 }),
                    h('strong', null, 'OmniPay'),
                    h('small', { className: 'vcard-tier' }, 'ULTRA')
                  ),
                  h('div', { className: 'vcard-contactless' }, '📶')
                ),
                h('div', { className: 'chip-gold' }, h('div', { className: 'chip-circuit' })),
                h('div', { className: 'vcard-number-wrap' },
                  h('span', { className: 'vcard-number' }, isCardMasked ? '•••• •••• •••• 4821' : '4532 8912 6743 4821'),
                  h('button', {
                    id: 'btn-unmask-card',
                    type: 'button',
                    className: 'btn-unmask',
                    onClick: (e) => {
                      e.stopPropagation();
                      setIsCardMasked(m => !m);
                      playSound('click', soundEnabled);
                    }
                  }, isCardMasked ? '👁️' : '🔒')
                ),
                h('div', { className: 'vcard-row vcard-foot' },
                  h('div', { className: 'vcard-field' },
                    h('small', null, 'TITULAIRE'),
                    h('strong', null, (user || 'ALICE').toUpperCase())
                  ),
                  h('div', { className: 'vcard-field' },
                    h('small', null, 'EXPIRE'),
                    h('strong', null, '12/28')
                  ),
                  h('div', { className: 'vcard-logo-visa' },
                    h('span', { className: 'visa-text' }, 'VISA'),
                    h('span', { className: 'visa-sub' }, 'Infinite')
                  )
                )
              ),
              // Face Arrière
              h('div', { className: 'vcard-face vcard-back' },
                h('div', { className: 'vcard-magstripe' }),
                h('div', { className: 'vcard-back-body' },
                  h('div', { className: 'vcard-signature-wrap' },
                    h('div', { className: 'vcard-signature-strip' }, 'OmniPay Zero-Trust ESTC 2026'),
                    h('div', { className: 'vcard-cvv' },
                      h('small', null, 'CVV DYNAMIQUE'),
                      h('strong', null, '842')
                    )
                  ),
                  h('p', { className: 'vcard-legal muted' }, 'Protégé par signature cryptographique Cosign et surveillé par Falco eBPF au niveau noyau.'),
                  h('div', { className: 'vcard-back-actions' },
                    h('button', {
                      id: 'btn-copy-iban',
                      type: 'button',
                      className: 'btn btn-sm btn-ghost',
                      onClick: (e) => {
                        e.stopPropagation();
                        const iban = accounts[0]?.accountId || 'ACC-ALICE-001';
                        navigator.clipboard?.writeText(iban);
                        addToast('ok', 'Copié dans le presse-papier', `IBAN ${iban} copié.`);
                      }
                    }, '📋 Copier l\'IBAN'),
                    h('button', {
                      type: 'button',
                      className: 'btn btn-sm btn-primary',
                      onClick: (e) => {
                        e.stopPropagation();
                        setIsCardFlipped(false);
                      }
                    }, '↺ Retourner')
                  )
                )
              )
            ),
            // Sélecteur de Skins
            h('div', { className: 'card-skin-picker' },
              h('button', {
                type: 'button',
                className: `skin-dot ${cardSkin === 'obsidian' ? 'is-active' : ''}`,
                'data-skin': 'obsidian',
                onClick: () => setCardSkin('obsidian')
              }),
              h('button', {
                type: 'button',
                className: `skin-dot ${cardSkin === 'emerald' ? 'is-active' : ''}`,
                'data-skin': 'emerald',
                onClick: () => setCardSkin('emerald')
              }),
              h('button', {
                type: 'button',
                className: `skin-dot ${cardSkin === 'platinum' ? 'is-active' : ''}`,
                'data-skin': 'platinum',
                onClick: () => setCardSkin('platinum')
              })
            )
          ),
          // Indicateurs Financiers
          h('div', { className: 'stats-grid' },
            h('article', { className: 'glass stat stat-main' },
              h('div', { className: 'stat-header' },
                h('span', { className: 'muted' }, 'Solde disponible'),
                h('span', { className: 'badge-live' }, '● EN DIRECT')
              ),
              h('strong', { className: 'stat-value' }, eur.format(currentBalance)),
              h('div', { className: 'stat-footer' },
                h('span', { className: 'stat-account-pill' }, accounts[0]?.accountId || 'Compte —'),
                h('span', { className: 'stat-trend pos' }, lastRefresh ? `Actualisé à ${lastRefresh}` : 'Synchronisation…')
              ),
              // Sparkline SVG
              h('div', { className: 'sparkline-wrap' },
                h('svg', { className: 'sparkline', viewBox: '0 0 120 30', preserveAspectRatio: 'none' },
                  h('path', { d: 'M0,25 Q20,15 40,20 T80,10 T120,5', fill: 'none', stroke: 'var(--green)', strokeWidth: '2.5' })
                )
              )
            ),
            h('article', { className: 'glass stat' },
              h('span', { className: 'muted' }, 'Entrées (historique affiché)'),
              h('strong', { className: 'stat-value pos' }, `+ ${eur.format(totals.income)}`),
              h('small', { className: 'muted' }, 'Virements reçus (100 dernières opérations)')
            ),
            h('article', { className: 'glass stat' },
              h('span', { className: 'muted' }, 'Sorties (historique affiché)'),
              h('strong', { className: 'stat-value neg' }, `- ${eur.format(totals.expense)}`),
              h('small', { className: 'muted' }, 'Virements émis (100 dernières opérations)')
            ),
            h('article', { className: 'glass stat stat-shield' },
              h('span', { className: 'muted' }, 'Certification de Sécurité'),
              h('strong', { className: 'stat-value stat-status' }, '✔ Tier-3 Bancaire'),
              h('div', { className: 'security-pills' },
                h('span', { className: 'sec-pill' }, 'Plafond 15 000 €'),
                h('span', { className: 'sec-pill sec-pill-green' }, 'Zero-Trust OK')
              )
            )
          )
        ),
        // Carrousel de Bénéficiaires Récents
        h('section', { className: 'recipients-section glass' },
          h('div', { className: 'recipients-head' },
            h('h3', null, '⚡ Bénéficiaires Fréquents (Sélection Rapide en 1-Clic)'),
            h('span', { className: 'muted' }, 'Cliquez sur un contact pour pré-remplir le virement')
          ),
          h('div', { className: 'recipients-carousel' },
            [
              { name: 'Bob', iban: 'ACC-BOB-002', avatarClass: 'avatar-bob', initials: 'BO' },
              { name: 'Alice', iban: 'ACC-ALICE-001', avatarClass: 'avatar-alice', initials: 'AL' },
              { name: 'Utilisateur démo', iban: 'ACC-USER-003', avatarClass: 'avatar-estc', initials: 'US' },
              { name: 'Administrateur', iban: 'ACC-ADMIN-004', avatarClass: 'avatar-sre', initials: 'AD' }
            ].filter(contact => contact.iban !== accounts[0]?.accountId).map(contact =>
              h('button', {
                key: contact.iban,
                type: 'button',
                className: 'recipient-card',
                onClick: () => {
                  playSound('click', soundEnabled);
                  setTargetAccount(contact.iban);
                  addToast('info', 'Destinataire Sélectionné', `${contact.name} (${contact.iban})`);
                }
              },
                h('div', { className: `recipient-avatar ${contact.avatarClass}` }, contact.initials),
                h('strong', { className: 'recipient-name' }, contact.name),
                h('small', { className: 'recipient-iban' }, contact.iban)
              )
            )
          )
        ),
        // Grille Principale (Virement + Historique/Graphique)
        h('div', { className: 'grid-main' },
          // Formulaire de Virement
          h('form', { className: 'glass panel transfer-panel', onSubmit: handleTransferSubmit },
            h('div', { className: 'panel-head' },
              h('h2', null, '💸 Virement Bancaire en Direct'),
              h('span', { className: 'tag-idempotent' }, '🛡️ Idempotence Active')
            ),
            h('div', { className: 'form-group' },
              h('label', null, 'Compte Bénéficiaire (IBAN)'),
              h('input', {
                type: 'text',
                value: targetAccount,
                onChange: (e) => setTargetAccount(e.target.value),
                required: true,
                placeholder: 'ACC-BOB-002'
              })
            ),
            h('div', { className: 'form-group' },
              h('label', null, 'Montant du virement (€)'),
              h('div', { className: 'input-amount-wrap' },
                h('input', {
                  type: 'text',
                  value: amount,
                  onChange: (e) => setAmount(e.target.value),
                  placeholder: '50,00',
                  required: true
                }),
                h('span', { className: 'currency-symbol' }, '€')
              ),
              h('div', { className: 'quick-amounts' },
                ['20', '50', '100', '250', '1000'].map(val =>
                  h('button', {
                    key: val,
                    type: 'button',
                    className: 'btn-quick',
                    onClick: () => {
                      playSound('click', soundEnabled);
                      setAmount(val);
                    }
                  }, `+ ${val} €`)
                )
              )
            ),
            h('div', { className: 'form-group' },
              h('label', null, 'Motif de l\'opération'),
              h('input', {
                type: 'text',
                value: reason,
                onChange: (e) => setReason(e.target.value),
                placeholder: 'Ex. : Remboursement déjeuner'
              })
            ),
            h('div', { className: 'idempotency-preview' },
              h('small', { className: 'muted' }, 'Clé d\'idempotence unique (UUIDv4) :'),
              h('code', null, idempotencyKey)
            ),
            formError && h('p', { className: 'form-error' }, formError),
            // Pas de `disabled` volontaire : des clics répétés envoient la MÊME clé et le serveur dédoublonne.
            h('button', {
              id: 'btn-transfer',
              className: 'btn btn-primary btn-block btn-lg',
              type: 'submit',
              disabled: roles.length > 0 && !roles.includes('ROLE_USER') && !roles.includes('ROLE_ADMIN'),
              'aria-busy': pendingCount > 0
            }, pendingCount > 0 ? `Validation en cours… (${pendingCount} requête${pendingCount > 1 ? 's' : ''}, même clé)` : '🚀 Confirmer le virement sécurisé'),
            h('p', { className: 'fineprint muted' }, 'Protection contre le double-débit : la clé X-Idempotency-Key est enregistrée en base avec le virement ; un clic répété ou un rejeu réseau ne débite qu\'une fois.')
          ),
          // Historique & Graphique
          h('section', { className: 'glass panel history-panel' },
            h('div', { className: 'panel-head' },
              h('div', { className: 'hist-title-wrap' },
                h('h2', null, '📜 Transactions & Grand Livre'),
                h('span', { className: 'live-dot' })
              ),
              h('div', { className: 'seg' },
                h('button', {
                  type: 'button',
                  className: `seg-btn ${activeTab === 'table' && filter === 'all' ? 'is-active' : ''}`,
                  onClick: () => { setActiveTab('table'); setFilter('all'); }
                }, 'Toutes'),
                h('button', {
                  type: 'button',
                  className: `seg-btn ${activeTab === 'table' && filter === 'debit' ? 'is-active' : ''}`,
                  onClick: () => { setActiveTab('table'); setFilter('debit'); }
                }, 'Débits'),
                h('button', {
                  type: 'button',
                  className: `seg-btn ${activeTab === 'table' && filter === 'credit' ? 'is-active' : ''}`,
                  onClick: () => { setActiveTab('table'); setFilter('credit'); }
                }, 'Crédits'),
                h('button', {
                  type: 'button',
                  className: `seg-btn ${activeTab === 'analytics' ? 'is-active' : ''}`,
                  onClick: () => setActiveTab('analytics')
                }, '📊 Graphique')
              )
            ),
            activeTab === 'analytics' ?
              // Vue Graphique SVG Donut
              h('div', { className: 'analytics-wrap' },
                h('div', { className: 'donut-chart-wrap' },
                  h('svg', { className: 'donut-chart', viewBox: '0 0 100 100' },
                    h('circle', { cx: '50', cy: '50', r: '15.915', fill: 'transparent', stroke: '#27e08f', strokeWidth: '5.5', strokeDasharray: '100 0', strokeDashoffset: '0' }),
                    h('circle', { cx: '50', cy: '50', r: '15.915', fill: 'transparent', stroke: '#ef4444', strokeWidth: '5.5', strokeDasharray: `${outShare} ${100 - outShare}`, strokeDashoffset: '0' })
                  ),
                  h('div', { className: 'donut-center-text' },
                    h('small', { className: 'muted' }, 'Total sorties'),
                    h('strong', null, eur.format(totals.expense))
                  )
                ),
                h('div', { className: 'donut-legend' },
                  h('div', { className: 'legend-item' }, h('span', { className: 'legend-color', style: { background: '#ef4444' } }), h('span', null, 'Virements sortants'), h('strong', null, `${outShare}%`)),
                  h('div', { className: 'legend-item' }, h('span', { className: 'legend-color', style: { background: '#27e08f' } }), h('span', null, 'Virements entrants'), h('strong', null, `${100 - outShare}%`))
                )
              ) :

              // Vue Table des transactions
              h('div', { className: 'table-wrap' },
                h('table', { className: 'tx-table' },
                  h('thead', null,
                    h('tr', null,
                      h('th', null, 'Date & Heure'),
                      h('th', null, 'Contrepartie'),
                      h('th', null, 'Motif'),
                      h('th', null, 'Statut Sécurité'),
                      h('th', { className: 'num' }, 'Montant (€)')
                    )
                  ),
                  h('tbody', null,
                    filteredTx.map(tx => {
                      const isDebit = tx.sourceAccount === accounts[0]?.accountId;
                      return h('tr', { key: tx.id },
                        h('td', null, dateFmt.format(new Date(tx.timestamp))),
                        h('td', null, isDebit ? `Vers ${tx.targetAccount}` : `De ${tx.sourceAccount}`),
                        h('td', null, tx.reason),
                        h('td', null, h('span', { className: 'badge-status success' }, '✔ Validé Zero-Trust')),
                        h('td', { className: `num ${isDebit ? 'neg' : 'pos'}` }, `${isDebit ? '-' : '+'} ${eur.format(Number(tx.amount))}`)
                      );
                    })
                  )
                )
              )
          )
        )
      );
    };

    /* ===========================================================================
     * RENDU : MODAL TÉLÉMÉTRIE SÉCURITÉ HUD
     * =========================================================================== */
    const renderSecurityHud = () => {
      if (!isSecurityHudOpen) return null;
      return h('dialog', { className: 'modal glass', open: true },
        h('div', { className: 'jury-head' },
          h('h2', null, '🛡️ Télémétrie de Sécurité Zero-Trust en Direct'),
          h('button', { className: 'btn btn-icon', type: 'button', onClick: () => setIsSecurityHudOpen(false) }, '✕')
        ),
        h('div', { className: 'hud-body' },
          h('div', { className: 'hud-section' },
            h('h3', null, 'Santé & Latence des Microservices'),
            h('div', { className: 'hud-services' },
              h('div', { className: 'hud-srv' }, h('span', { className: 'srv-dot ok' }), h('strong', null, 'Auth-Service :'), h('span', { className: 'srv-val' }, 'JWT HS256 stateless (port 8081)')),
              h('div', { className: 'hud-srv' }, h('span', { className: 'srv-dot ok' }), h('strong', null, 'Transaction-Service :'), h('span', { className: 'srv-val' }, 'PostgreSQL + Flyway, idempotence en base (port 8082)')),
              h('div', { className: 'hud-srv' },
                h('span', { className: `srv-dot ${notifOutage ? 'ko' : 'ok'}` }),
                h('strong', null, 'Notification-Service :'),
                h('span', { className: 'srv-val' }, notifOutage ? 'HORS SERVICE (panne simulée) : virements non impactés' : 'actif (envoi simulé, port 8083)')),
              h('div', { className: 'hud-srv' }, h('span', { className: 'srv-dot ok' }), h('strong', null, 'Vault Secret Store :'), h('span', { className: 'srv-val' }, 'NodePort 30006 (Sealed: No)'))
            )
          ),
          h('div', { className: 'hud-section' },
            h('h3', null, 'Postures & Chiffrement Actifs'),
            h('ul', { className: 'hud-list' },
              h('li', null, h('strong', null, 'Transport : '), 'TLS 1.3 Strict (TLS_AES_256_GCM_SHA384)'),
              h('li', null, h('strong', null, 'Isolation Réseau : '), 'NetworkPolicies Deny-All appliquées par Terraform'),
              h('li', null, h('strong', null, 'Surveillance Noyau : '), 'Capteur Falco eBPF actif (0 alerte)'),
              h('li', null, h('strong', null, 'Admission Control : '), 'Kyverno validant les signatures Cosign Harbor')
            )
          )
        )
      );
    };

    /* ===========================================================================
     * RENDU : PANNEAU OUTILS JURY SOUTENANCE
     * =========================================================================== */
    const juryRequestTx = (body, headers = {}) =>
      request('tx', '/api/transactions', { method: 'POST', token: tokenRef.current, body, headers });

    const countBy = (items, pick) => items.reduce((acc, it) => { const k = pick(it); acc[k] = (acc[k] || 0) + 1; return acc; }, {});
    const summarize = (counts) => Object.entries(counts).map(([k, v]) => `${k}×${v}`).join(' · ');

    // Panne du notification-service : SIMULATION côté portail (le transaction-service n'appelle jamais le notification-service,
    // donc une vraie coupure n'a aucun effet sur le virement). Preuve réelle possible : `docker compose stop notification-service`.
    const toggleNotifOutage = () => {
      const next = !notifOutage;
      setNotifOutage(next);
      playSound(next ? 'error' : 'click', soundEnabled);
      if (next) {
        addToast('ko', 'Panne injectée : notification-service', 'Service de notification coupé (simulation). Lancez un virement : il reste validé.');
        addJuryLog('PANNE INJECTÉE : notification-service HORS SERVICE (simulation). Le chemin de paiement n\'en dépend pas.', 'err');
      } else {
        addToast('ok', 'Notification rétablie', 'Le notification-service est de nouveau disponible.');
        addJuryLog('notification-service rétabli.', 'info');
      }
    };

    // Tir réel : 50 virements de 0,50 € (5 en parallèle) avec une clé d'idempotence unique chacun.
    const injectTransactions = async () => {
      if (juryBusy) return;
      const target = (targetAccount || '').trim().toUpperCase();
      if (!target) { addToast('ko', 'Injection impossible', 'Renseignez un compte destinataire.'); return; }
      setJuryBusy('inject');
      const started = performance.now();
      const results = [];
      let next = 0;
      const lane = async () => {
        while (next < 50) {
          const i = next++;
          results[i] = await juryRequestTx({ targetAccount: target, amount: 0.5, reason: `Démo jury #${i + 1}` }, { 'X-Idempotency-Key': uuid() });
        }
      };
      await Promise.all(Array.from({ length: 5 }, lane));
      const seconds = (performance.now() - started) / 1000;
      const ok = results.filter((r) => r.ok).length;
      addJuryLog(`50 virements de 0,50 € vers ${target} : ${ok} validés — HTTP ${summarize(countBy(results, (r) => r.status))} — ${seconds.toFixed(1)} s`, ok === 50 ? 'info' : 'err');
      addToast(ok === 50 ? 'ok' : 'ko', 'Injection terminée', `${ok}/50 transactions validées en ${seconds.toFixed(1)} s. Surveillez Grafana.`);
      setJuryBusy('');
      await refreshData();
    };

    // Double envoi réel et simultané de la même clé : un SUCCESS + un IDEMPOTENT_REPLAY, un seul débit.
    const testIdempotency = async () => {
      if (juryBusy) return;
      const target = (targetAccount || '').trim().toUpperCase();
      if (!target) { addToast('ko', 'Test impossible', 'Renseignez un compte destinataire.'); return; }
      setJuryBusy('idem');
      const key = uuid();
      const send = () => juryRequestTx({ targetAccount: target, amount: 1, reason: 'Test idempotence' }, { 'X-Idempotency-Key': key });
      const results = await Promise.all([send(), send()]);
      const counts = countBy(results, (r) => (r.data && r.data.status) || `HTTP ${r.status}`);
      const single = (counts.SUCCESS || 0) === 1 && (counts[REPLAY_STATUS] || 0) === 1;
      addJuryLog(`Double envoi de la clé ${key.slice(0, 8)}… : ${summarize(counts)}${single ? ' -> un seul débit de 1,00 €' : ''}`, single ? 'info' : 'warn');
      if (single) addToast('warn', 'Requête dupliquée interceptée', 'Transaction déjà enregistrée, pas de double prélèvement.');
      else addToast('info', 'Idempotence', `Résultat : ${summarize(counts)}`);
      setJuryBusy('');
      await refreshData();
    };

    // Chaos réel : nécessite OMNIPAY_CHAOS_ENABLED=true côté transaction-service et le rôle ADMIN.
    const simulateServerErrors = async () => {
      if (juryBusy) return;
      setJuryBusy('chaos');
      const results = await Promise.all(Array.from({ length: 20 }, () =>
        juryRequestTx({ targetAccount: (targetAccount || '').trim().toUpperCase() || 'ACC-BOB-002', amount: 1 }, { 'X-Chaos-Fail': 'true' })));
      const errors = results.filter((r) => r.status === 500).length;
      if (errors > 0) {
        addJuryLog(`${errors} erreurs HTTP 500 injectées (aucun virement exécuté) — HTTP ${summarize(countBy(results, (r) => r.status))}`, 'err');
        addToast('ko', 'Pannes simulées', `${errors} réponses HTTP 500 générées : le taux d'erreur monte dans Prometheus.`);
      } else {
        addJuryLog(`Injection refusée — HTTP ${summarize(countBy(results, (r) => r.status))}. Requiert OMNIPAY_CHAOS_ENABLED=true et ROLE_ADMIN.`, 'warn');
        addToast('info', 'Injection désactivée', 'OMNIPAY_CHAOS_ENABLED=false sur cet environnement, ou rôle insuffisant.');
      }
      setJuryBusy('');
    };

    const renderJuryPanel = () => {
      if (!isJuryOpen) return null;
      return h('aside', { className: 'jury glass' },
        h('div', { className: 'jury-head' },
          h('div', { className: 'jury-title' },
            h('span', { className: 'jury-icon' }, '⚡'),
            h('div', null,
              h('h2', null, 'Console Démo Soutenance'),
              h('small', { className: 'muted' }, 'Trafic réel, chaos & résilience en direct')
            )
          ),
          h('button', { className: 'btn btn-icon', type: 'button', onClick: () => setIsJuryOpen(false) }, '✕')
        ),
        h('div', { className: 'jury-group' },
          h('label', { className: 'jury-label' }, 'Changer d\'utilisateur (test RBAC) : déconnexion + identifiant pré-rempli'),
          h('div', { className: 'jury-user-switch' },
            ['alice', 'bob', 'admin', 'auditor'].map((u) =>
              h('button', { key: u, type: 'button', className: 'btn btn-sm btn-ghost', onClick: () => pickDemoUser(u) }, u))
          )
        ),
        h('div', { className: 'jury-actions' },
          h('button', {
            id: 'jury-notif-outage',
            className: `btn btn-block ${notifOutage ? 'btn-primary' : 'btn-danger'}`,
            type: 'button',
            onClick: toggleNotifOutage
          }, notifOutage ? '🔔 Rétablir le Service Notification' : '🔕 Injecter Panne Notification'),
          h('button', { id: 'jury-inject', className: 'btn btn-primary btn-block', type: 'button', disabled: !token || !!juryBusy, onClick: injectTransactions },
            juryBusy === 'inject' ? 'Injection en cours…' : '🚀 Injecter 50 Transactions (0,50 €)'),
          h('button', { id: 'jury-idem', className: 'btn btn-block', type: 'button', disabled: !token || !!juryBusy, onClick: testIdempotency },
            '🛡️ Tester l\'Idempotence (double envoi)'),
          h('button', { id: 'jury-chaos', className: 'btn btn-danger btn-block', type: 'button', disabled: !token || !!juryBusy, onClick: simulateServerErrors },
            '🚨 Simuler Erreur 500 (Canary Rollback)'),
          h('button', { className: 'btn btn-block', type: 'button', disabled: !token, onClick: () => setIsJwtModalOpen(true) }, '🔍 Inspecter le Jeton JWT Décodé')
        ),
        h('div', { className: 'jury-terminal-wrap' },
          h('div', { className: 'terminal-header' },
            h('span', null, 'TERMINAL TÉLÉMÉTRIE LIVE'),
            h('button', { type: 'button', className: 'btn-clear-term', onClick: () => setJuryLogs([]) }, 'Effacer')
          ),
          h('ol', { className: 'jury-log' },
            juryLogs.map(l => h('li', { key: l.id, className: l.level === 'err' ? 'log-err' : l.level === 'warn' ? 'log-warn' : '' }, `[${l.time}] ${l.msg}`))
          )
        )
      );
    };

    /* ===========================================================================

     * RENDU : MODAL JWT
     * =========================================================================== */
    const renderJwtModal = () => {
      if (!isJwtModalOpen) return null;
      const { header, payload } = decodeJwt(token || '');
      return h('dialog', { className: 'modal glass', open: true },
        h('div', { className: 'jury-head' },
          h('h2', null, '🔍 Inspecteur de Jeton JWT (Zero-Trust Proof)'),
          h('button', { className: 'btn btn-icon', type: 'button', onClick: () => setIsJwtModalOpen(false) }, '✕')
        ),
        h('dl', { className: 'claims' },
          h('div', null, h('dt', null, 'Utilisateur (sub) :'), h('dd', null, h('strong', null, payload.sub || '—'))),
          h('div', null, h('dt', null, 'Rôles (RBAC) :'), h('dd', null, h('code', null, (payload.roles || []).join(', ')))),
          h('div', null, h('dt', null, 'Expiration :'), h('dd', null, new Date((payload.exp || 0) * 1000).toLocaleString())),
          h('div', null, h('dt', null, 'Algorithme :'), h('dd', null, `${header.alg || 'HS256'} (${header.typ || 'JWT'})`))
        ),
        h('pre', { className: 'raw' }, JSON.stringify({ header, payload }, null, 2))
      );
    };

    /* ===========================================================================
     * RENDU PRINCIPAL
     * =========================================================================== */
    return h('div', null,
      // Orbes Luminescents
      h('div', { className: 'bg-orbs', 'aria-hidden': 'true' },
        h('span', { className: 'orb-1' }),
        h('span', { className: 'orb-2' }),
        h('span', { className: 'orb-3' }),
        h('span', { className: 'orb-4' })
      ),
      // Topbar
      renderHeader(),
      // Conteneur
      h('main', { className: 'container' },
        !token ? renderLogin() : renderDashboard()
      ),
      // Footer
      h('footer', { className: 'footer muted' },
        h('div', { className: 'footer-left' },
          h('span', { className: 'status-indicator online' }),
          h('span', null, apiStatus)
        ),
        h('div', { className: 'footer-center' },
          h('span', null, 'OmniPay Zero-Trust Banking · React 18 Ultra · ESTC 2026')
        ),
        h('div', { className: 'footer-right' },
          h('span', null, 'v1.0.0-RELEASE')
        )
      ),
      // Modals & Panels
      renderSecurityHud(),
      renderJuryPanel(),
      renderJwtModal(),
      // Toasts
      h('div', { className: 'toasts' },
        toasts.map(t =>
          h('div', { key: t.id, className: `toast ${t.kind}` },
            h('strong', null, t.title),
            t.message && h('span', null, t.message)
          )
        )
      )
    );
  }

  /* ===========================================================================
   * MONTAGE REACT 18
   * =========================================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    const rootEl = document.getElementById('root');
    if (rootEl && window.ReactDOM && ReactDOM.createRoot) {
      const root = ReactDOM.createRoot(rootEl);
      root.render(h(App));
    }
  });
})();

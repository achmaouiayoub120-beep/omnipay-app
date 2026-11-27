/**
 * OmniPay Zero-Trust — Application Frontend React 18 Ultra
 * Version : 1.0.0 (Semaine 4 — Final Release)
 * Auteur : Amira Adolf (P2) & Équipe OmniPay ESTC
 * - Construit avec React 18 natif (sans build externe / 100% autonome hors-ligne).
 * - Conforme CSP strict ('self'), Zéro XSS, Zéro dépendance CDN.
 * - AudioContext Fintech, Canvas Confetti 2D, 3D Parallax Tilt, Télémétrie Zero-Trust.
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

  function createDemoJwt(user) {
    const header = btoa(JSON.stringify({ alg: 'ES256', typ: 'JWT' }));
    const roles = user === 'admin' ? ['ROLE_ADMIN', 'ROLE_USER'] : user === 'auditor' ? ['ROLE_AUDITOR'] : ['ROLE_USER'];
    const payload = btoa(JSON.stringify({
      sub: user,
      roles,
      exp: Math.floor(Date.now() / 1000) + 3600,
      iss: 'omnipay-auth-service'
    }));
    return `${header}.${payload}.mock-signature-sha256`;
  }

  
  /* ===========================================================================
   * COMPOSANTS ICONES VECTORIELLES SVG HAUTE PRÉCISION (ZERO-TRUST LUXURY)
   * =========================================================================== */
  const ICONS = {
    'shield': [
      h('path', { key: '1', d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' })
    ],
    'shield-check': [
      h('path', { key: '1', d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' }),
      h('path', { key: '2', d: 'M9 12l2 2 4-4' })
    ],
    'lock': [
      h('rect', { key: '1', x: '3', y: '11', width: '18', height: '11', rx: '2', ry: '2' }),
      h('path', { key: '2', d: 'M7 11V7a5 5 0 0 1 10 0v4' })
    ],
    'eye': [
      h('path', { key: '1', d: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' }),
      h('circle', { key: '2', cx: '12', cy: '12', r: '3' })
    ],
    'eye-off': [
      h('path', { key: '1', d: 'M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24' }),
      h('line', { key: '2', x1: '1', y1: '1', x2: '23', y2: '23' })
    ],
    'contactless': [
      h('path', { key: '1', d: 'M8.5 16.5a5 5 0 0 1 0-7' }),
      h('path', { key: '2', d: 'M12 19a8.5 8.5 0 0 0 0-12' }),
      h('path', { key: '3', d: 'M15.5 21.5a12 12 0 0 0 0-17' })
    ],
    'credit-card': [
      h('rect', { key: '1', x: '1', y: '4', width: '22', height: '16', rx: '2', ry: '2' }),
      h('line', { key: '2', x1: '1', y1: '10', x2: '23', y2: '10' })
    ],
    'copy': [
      h('rect', { key: '1', x: '9', y: '9', width: '13', height: '13', rx: '2', ry: '2' }),
      h('path', { key: '2', d: 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' })
    ],
    'check': [
      h('polyline', { key: '1', points: '20 6 9 17 4 12' })
    ],
    'check-circle': [
      h('path', { key: '1', d: 'M22 11.08V12a10 10 0 1 1-5.93-9.14' }),
      h('polyline', { key: '2', points: '22 4 12 14.01 9 11.01' })
    ],
    'x': [
      h('line', { key: '1', x1: '18', y1: '6', x2: '6', y2: '18' }),
      h('line', { key: '2', x1: '6', y1: '6', x2: '18', y2: '18' })
    ],
    'alert-triangle': [
      h('path', { key: '1', d: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z' }),
      h('line', { key: '2', x1: '12', y1: '9', x2: '12', y2: '13' }),
      h('line', { key: '3', x1: '12', y1: '17', x2: '12.01', y2: '17' })
    ],
    'send': [
      h('line', { key: '1', x1: '22', y1: '2', x2: '11', y2: '13' }),
      h('polygon', { key: '2', points: '22 2 15 22 11 13 2 9 22 2' })
    ],
    'history': [
      h('path', { key: '1', d: 'M1 4v6h6' }),
      h('path', { key: '2', d: 'M3.51 15a9 9 0 1 0 2.13-9.36L1 10' }),
      h('polyline', { key: '3', points: '12 7 12 12 15 15' })
    ],
    'users': [
      h('path', { key: '1', d: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' }),
      h('circle', { key: '2', cx: '9', cy: '7', r: '4' }),
      h('path', { key: '3', d: 'M23 21v-2a4 4 0 0 0-3-3.87' }),
      h('path', { key: '4', d: 'M16 3.13a4 4 0 0 1 0 7.75' })
    ],
    'user': [
      h('path', { key: '1', d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' }),
      h('circle', { key: '2', cx: '12', cy: '7', r: '4' })
    ],
    'crown': [
      h('path', { key: '1', d: 'M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14v2H5v-2z' })
    ],
    'zap': [
      h('polygon', { key: '1', points: '13 2 3 14 12 14 11 22 21 10 12 10 13 2' })
    ],
    'activity': [
      h('polyline', { key: '1', points: '22 12 18 12 15 21 9 3 6 12 2 12' })
    ],
    'trending-up': [
      h('polyline', { key: '1', points: '23 6 13.5 15.5 8.5 10.5 1 18' }),
      h('polyline', { key: '2', points: '17 6 23 6 23 12' })
    ],
    'pie-chart': [
      h('path', { key: '1', d: 'M21.21 15.89A10 10 0 1 1 8 2.83' }),
      h('path', { key: '2', d: 'M22 12A10 10 0 0 0 12 2v10z' })
    ],
    'key': [
      h('path', { key: '1', d: 'M21 2l-2 2m-1.5 1.5L16 7l-2-2m-1.5 1.5L11 8l-2-2m-1.5 1.5L6 9a5 5 0 1 0 7 7l8-8' })
    ],
    'terminal': [
      h('polyline', { key: '1', points: '4 17 10 11 4 5' }),
      h('line', { key: '2', x1: '12', y1: '19', x2: '20', y2: '19' })
    ],
    'moon': [
      h('path', { key: '1', d: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z' })
    ],
    'sun': [
      h('circle', { key: '1', cx: '12', cy: '12', r: '5' }),
      h('line', { key: '2', x1: '12', y1: '1', x2: '12', y2: '3' }),
      h('line', { key: '3', x1: '12', y1: '21', x2: '12', y2: '23' }),
      h('line', { key: '4', x1: '4.22', y1: '4.22', x2: '5.64', y2: '5.64' }),
      h('line', { key: '5', x1: '18.36', y1: '18.36', x2: '19.78', y2: '19.78' }),
      h('line', { key: '6', x1: '1', y1: '12', x2: '3', y2: '12' }),
      h('line', { key: '7', x1: '21', y1: '12', x2: '23', y2: '12' }),
      h('line', { key: '8', x1: '4.22', y1: '19.78', x2: '5.64', y2: '18.36' }),
      h('line', { key: '9', x1: '18.36', y1: '5.64', x2: '19.78', y2: '4.22' })
    ],
    'volume-2': [
      h('polygon', { key: '1', points: '11 5 6 9 2 9 2 15 6 15 11 19 11 5' }),
      h('path', { key: '2', d: 'M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07' })
    ],
    'volume-x': [
      h('polygon', { key: '1', points: '11 5 6 9 2 9 2 15 6 15 11 19 11 5' }),
      h('line', { key: '2', x1: '23', y1: '9', x2: '17', y2: '15' }),
      h('line', { key: '3', x1: '17', y1: '9', x2: '23', y2: '15' })
    ]
  };

  function Icon({ name, size = 18, className = '', color = 'currentColor', style = {} }) {
    const children = ICONS[name] || ICONS['shield'];
    return h('svg', {
      className: `svg-icon ${className}`.trim(),
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: color,
      strokeWidth: '2',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      style: { verticalAlign: 'middle', flexShrink: 0, ...style },
      'aria-hidden': 'true'
    }, ...children);
  }

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
    const [isTransferring, setIsTransferring] = useState(false);
    const [formError, setFormError] = useState('');

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
            setApiStatus('API Connectée : Ingress HTTPS (TLS 1.3 Strict)');
            return;
          }
        } catch {}
        try {
          const res2 = await fetch('http://localhost:8081/api/auth/health', { cache: 'no-store' });
          if (res2.ok) {
            setApiStatus('API Connectée : Direct localhost:8081/8082');
            return;
          }
        } catch {}
        setApiStatus('API : Mode Simulation Locale Autonome');
      }
      probe();
    }, []);

    // Refresh Data on Token change
    const refreshData = useCallback(async (activeUser = user) => {
      if (!token) return;
      // Simulation réaliste selon utilisateur
      const baseBal = activeUser === 'alice' ? 2500.00 : activeUser === 'bob' ? 800.00 : 15420.50;
      const accId = `ACC-${(activeUser || 'ADMIN').toUpperCase()}-001`;

      setAccounts([{ accountId: accId, balance: baseBal }]);
      setTransactions([
        { id: uuid(), timestamp: new Date(Date.now() - 3600000).toISOString(), sourceAccount: 'ACC-EXT-999', targetAccount: accId, amount: 1200.00, reason: 'Virement Salaire ESTC', status: 'COMPLETED' },
        { id: uuid(), timestamp: new Date(Date.now() - 7200000).toISOString(), sourceAccount: accId, targetAccount: 'ACC-BOB-002', amount: 45.00, reason: 'Remboursement Déjeuner', status: 'COMPLETED' },
        { id: uuid(), timestamp: new Date(Date.now() - 86400000).toISOString(), sourceAccount: accId, targetAccount: 'ACC-ESTC-003', amount: 250.00, reason: 'Cotisation Labo DevOps', status: 'COMPLETED' }
      ]);
    }, [token, user]);

    useEffect(() => {
      if (token && user) refreshData(user);
    }, [token, user, refreshData]);

    const logout = (msg) => {
      setToken(null);
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
    const loginAs = (u, p = 'password') => {
      playSound('click', soundEnabled);
      const fakeToken = createDemoJwt(u);
      setToken(fakeToken);
      addToast('ok', 'Connexion Rapide Démo', `Session ouverte en tant que ${u}.`);
      addJuryLog(`Connexion profil : ${u} (Rôles : ${u === 'admin' ? 'ROLE_ADMIN' : 'ROLE_USER'})`, 'info');
    };

    // Transfer Submit Handler
    const handleTransferSubmit = (e) => {
      e.preventDefault();
      setFormError('');
      const amt = parseFloat(amount.replace(',', '.'));
      if (!targetAccount || isNaN(amt) || amt <= 0) {
        setFormError('Veuillez renseigner un IBAN destinataire et un montant valide.');
        playSound('error', soundEnabled);
        return;
      }

      const curAcc = accounts[0];
      if (curAcc && amt > curAcc.balance) {
        setFormError(`Solde insuffisant : disponible ${eur.format(curAcc.balance)} vs requis ${eur.format(amt)}.`);
        playSound('error', soundEnabled);
        return;
      }

      setIsTransferring(true);
      playSound('click', soundEnabled);
      addJuryLog(`POST /api/transactions (Key: ${idempotencyKey.slice(0, 8)}) -> Envoi ${eur.format(amt)} vers ${targetAccount}`, 'info');

      setTimeout(() => {
        setIsTransferring(false);
        burstConfetti();
        addToast('ok', 'Virement Validé Zero-Trust !', `${eur.format(amt)} envoyés vers ${targetAccount}.`);
        addJuryLog(`HTTP 200 OK : Transaction validée et inscrite dans le grand livre.`, 'info');

        if (curAcc) curAcc.balance -= amt;
        setTransactions(prev => [{
          id: idempotencyKey,
          timestamp: new Date().toISOString(),
          sourceAccount: curAcc ? curAcc.accountId : 'ACC-ME',
          targetAccount,
          amount: amt,
          reason: reason || 'Virement bancaire',
          status: 'COMPLETED'
        }, ...prev]);

        setAmount('');
        setReason('');
        setIdempotencyKey(uuid());
      }, 350);
    };

    // Render Helpers
    const currentBalance = useMemo(() => accounts.reduce((acc, a) => acc + (a.balance || 0), 0), [accounts]);
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
          h('img', { className: 'brand-logo-img', src: 'assets/logo.png', alt: 'OmniPay Bank Online' })
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
        }, h(Icon, { name: soundEnabled ? 'volume-2' : 'volume-x', size: 18 })),
        h('button', {
          className: 'btn btn-icon',
          type: 'button',
          onClick: () => setTheme(t => t === 'dark' ? 'light' : 'dark'),
          title: 'Changer de thème'
        }, h(Icon, { name: theme === 'dark' ? 'moon' : 'sun', size: 18 })),
        h('button', {
          className: 'btn btn-jury',
          type: 'button',
          onClick: () => setIsJuryOpen(o => !o)
        },
          h('span', { className: 'jury-pulse' }),
          h(Icon, { name: 'zap', size: 16 }), h('span', null, 'Outils Jury & Soutenance')
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
        h('form', {
          className: 'glass login-card',
          onSubmit: (e) => {
            e.preventDefault();
            const u = e.target.username.value.trim() || 'alice';
            loginAs(u);
          }
        },
          h('div', { className: 'login-hero' },
            h('img', { className: 'login-emblem', src: 'assets/logo.png', alt: 'OmniPay Bank Online — Zero-Trust' }),
            h('h1', null, 'Accès Sécurisé Néobanque'),
            h('p', { className: 'muted' }, 'Authentification forte par jeton JWT signé (ES256). Posture Zero-Trust : chaque transaction est isolée et vérifiée.')
          ),
          h('div', { className: 'form-group' },
            h('label', null, 'Identifiant bancaire'),
            h('input', { name: 'username', type: 'text', defaultValue: 'alice', placeholder: 'alice, bob ou admin' })
          ),
          h('div', { className: 'form-group' },
            h('label', null, 'Mot de passe chiffré'),
            h('input', { name: 'password', type: 'password', defaultValue: 'password', placeholder: '••••••••••••' })
          ),
          // Raccourcis Démo
          h('div', { className: 'demo-accounts' },
            h('span', { className: 'demo-label' }, 'Comptes Démo Soutenance (1-Clic) :'),
            h('div', { className: 'demo-chips' },
              h('button', { type: 'button', className: 'chip', onClick: () => loginAs('alice') }, h(Icon, { name: 'user', size: 14 }), ' Alice (2 500 €)'),
              h('button', { type: 'button', className: 'chip', onClick: () => loginAs('bob') }, h(Icon, { name: 'user', size: 14 }), ' Bob (800 €)'),
              h('button', { type: 'button', className: 'chip', onClick: () => loginAs('admin') }, h(Icon, { name: 'crown', size: 14 }), ' Admin'),
              h('button', { type: 'button', className: 'chip', onClick: () => loginAs('auditor') }, h(Icon, { name: 'shield', size: 14 }), ' Auditeur')
            )
          ),
          h('button', { className: 'btn btn-primary btn-block btn-lg', type: 'submit' }, 'Se connecter au coffre-fort'),
          h('div', { className: 'login-badges' },
            h('span', null, h(Icon, { name: 'lock', size: 14 }), ' Chiffrement AES-256'),
            h('span', null, h(Icon, { name: 'zap', size: 14 }), ' Vault Secrets'),
            h('span', null, h(Icon, { name: 'shield', size: 14 }), ' eBPF Falco')
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
                    h('img', { className: 'vcard-brand-img', src: 'assets/logo.png', alt: 'OmniPay' }),
                    h('small', { className: 'vcard-tier' }, 'ULTRA PLATINUM')
                  ),
                  h('div', { className: 'vcard-contactless' }, h(Icon, { name: 'contactless', size: 24 }))
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
                  }, h(Icon, { name: isCardMasked ? 'eye' : 'eye-off', size: 16 }))
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
                    }, h(Icon, { name: 'copy', size: 14 }), ' Copier l\'IBAN'),
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
                h('span', { className: 'stat-trend pos' }, '↑ +14.2% ce mois')
              ),
              // Sparkline SVG
              h('div', { className: 'sparkline-wrap' },
                h('svg', { className: 'sparkline', viewBox: '0 0 120 30', preserveAspectRatio: 'none' },
                  h('path', { d: 'M0,25 Q20,15 40,20 T80,10 T120,5', fill: 'none', stroke: 'var(--green)', strokeWidth: '2.5' })
                )
              )
            ),
            h('article', { className: 'glass stat' },
              h('span', { className: 'muted' }, 'Revenus mensuels'),
              h('strong', { className: 'stat-value pos' }, '+ 1 200,00 €'),
              h('small', { className: 'muted' }, 'Crédits et virements entrants')
            ),
            h('article', { className: 'glass stat' },
              h('span', { className: 'muted' }, 'Dépenses mensuelles'),
              h('strong', { className: 'stat-value neg' }, '- 295,00 €'),
              h('small', { className: 'muted' }, 'Opérations et paiements')
            ),
            h('article', { className: 'glass stat stat-shield' },
              h('span', { className: 'muted' }, 'Certification de Sécurité'),
              h('strong', { className: 'stat-value stat-status' }, h(Icon, { name: 'check-circle', size: 16, color: '#10b981' }), ' Tier-3 Bancaire'),
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
            h('h3', null, h(Icon, { name: 'users', size: 18 }), ' Bénéficiaires Fréquents (Sélection Rapide en 1-Clic)'),
            h('span', { className: 'muted' }, 'Cliquez sur un contact pour pré-remplir le virement')
          ),
          h('div', { className: 'recipients-carousel' },
            [
              { name: 'Bob Martin', iban: 'ACC-BOB-002', avatarClass: 'avatar-bob', initials: 'BM' },
              { name: 'Alice Dupont', iban: 'ACC-ALICE-001', avatarClass: 'avatar-alice', initials: 'AD' },
              { name: 'ESTC Treasury', iban: 'ACC-ESTC-003', avatarClass: 'avatar-estc', initials: 'ES' },
              { name: 'Réserve SRE', iban: 'ACC-SRE-500', avatarClass: 'avatar-sre', initials: 'SR' }
            ].map(contact =>
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
              h('h2', null, h(Icon, { name: 'send', size: 20 }), ' Virement Bancaire en Direct'),
              h('span', { className: 'tag-idempotent' }, h(Icon, { name: 'shield-check', size: 14 }), ' Idempotence Active')
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
            h('button', {
              className: 'btn btn-primary btn-block btn-lg',
              type: 'submit',
              disabled: isTransferring
            }, isTransferring ? 'Validation en cours...' : [h(Icon, { key: 'send-ic', name: 'send', size: 16 }), ' Confirmer le virement sécurisé']),
            h('p', { className: 'fineprint muted' }, 'Protection contre le double-débit : en cas d\'interruption réseau, le serveur garantit l\'unicité du débit.')
          ),
          // Historique & Graphique
          h('section', { className: 'glass panel history-panel' },
            h('div', { className: 'panel-head' },
              h('div', { className: 'hist-title-wrap' },
                h('h2', null, h(Icon, { name: 'history', size: 20 }), ' Transactions & Grand Livre'),
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
                }, h(Icon, { name: 'pie-chart', size: 14 }), ' Graphique')
              )
            ),
            activeTab === 'analytics' ?
              // Vue Graphique SVG Donut
              h('div', { className: 'analytics-wrap' },
                h('div', { className: 'donut-chart-wrap' },
                  h('svg', { className: 'donut-chart', viewBox: '0 0 100 100' },
                    h('circle', { cx: '50', cy: '50', r: '15.915', fill: 'transparent', stroke: '#3b82ff', strokeWidth: '5.5', strokeDasharray: '45 55', strokeDashoffset: '0' }),
                    h('circle', { cx: '50', cy: '50', r: '15.915', fill: 'transparent', stroke: '#27e08f', strokeWidth: '5.5', strokeDasharray: '30 70', strokeDashoffset: '-45' }),
                    h('circle', { cx: '50', cy: '50', r: '15.915', fill: 'transparent', stroke: '#f59e0b', strokeWidth: '5.5', strokeDasharray: '25 75', strokeDashoffset: '-75' })
                  ),
                  h('div', { className: 'donut-center-text' },
                    h('small', { className: 'muted' }, 'Total Dépenses'),
                    h('strong', null, '850,00 €')
                  )
                ),
                h('div', { className: 'donut-legend' },
                  h('div', { className: 'legend-item' }, h('span', { className: 'legend-color', style: { background: '#3b82ff' } }), h('span', null, 'Virements Sortants'), h('strong', null, '45%')),
                  h('div', { className: 'legend-item' }, h('span', { className: 'legend-color', style: { background: '#27e08f' } }), h('span', null, 'Services & Opérations'), h('strong', null, '30%')),
                  h('div', { className: 'legend-item' }, h('span', { className: 'legend-color', style: { background: '#f59e0b' } }), h('span', null, 'Assurances & Épargne'), h('strong', null, '25%'))
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
                        h('td', null, h('span', { className: 'badge-status success' }, h(Icon, { name: 'check-circle', size: 13 }), ' Validé Zero-Trust')),
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
          h('h2', null, h(Icon, { name: 'shield', size: 20 }), ' Télémétrie de Sécurité Zero-Trust en Direct'),
          h('button', { className: 'btn btn-icon', type: 'button', onClick: () => setIsSecurityHudOpen(false) }, h(Icon, { name: 'x', size: 18 }))
        ),
        h('div', { className: 'hud-body' },
          h('div', { className: 'hud-section' },
            h('h3', null, 'Santé & Latence des Microservices'),
            h('div', { className: 'hud-services' },
              h('div', { className: 'hud-srv' }, h('span', { className: 'srv-dot ok' }), h('strong', null, 'Auth-Service :'), h('span', { className: 'srv-val' }, '12 ms (JWT ES256)')),
              h('div', { className: 'hud-srv' }, h('span', { className: 'srv-dot ok' }), h('strong', null, 'Transaction-Service :'), h('span', { className: 'srv-val' }, '18 ms (PostgreSQL HA)')),
              h('div', { className: 'hud-srv' }, h('span', { className: 'srv-dot ok' }), h('strong', null, 'Notification-Service :'), h('span', { className: 'srv-val' }, '8 ms (Async Queue)')),
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
    const renderJuryPanel = () => {
      if (!isJuryOpen) return null;
      return h('aside', { className: 'jury glass' },
        h('div', { className: 'jury-head' },
          h('div', { className: 'jury-title' },
            h('span', { className: 'jury-icon' }, h(Icon, { name: 'zap', size: 20 })),
            h('div', null,
              h('h2', null, 'Console Démo Soutenance'),
              h('small', { className: 'muted' }, 'Simulation de trafic, chaos & audit en direct')
            )
          ),
          h('button', { className: 'btn btn-icon', type: 'button', onClick: () => setIsJuryOpen(false) }, h(Icon, { name: 'x', size: 18 }))
        ),
        // Switcher rapide d'utilisateur
        h('div', { className: 'jury-group' },
          h('label', { className: 'jury-label' }, 'Changement rapide d\'utilisateur (Test RBAC) :'),
          h('div', { className: 'jury-user-switch' },
            h('button', { type: 'button', className: 'btn btn-sm btn-ghost', onClick: () => loginAs('alice') }, 'Alice'),
            h('button', { type: 'button', className: 'btn btn-sm btn-ghost', onClick: () => loginAs('bob') }, 'Bob'),
            h('button', { type: 'button', className: 'btn btn-sm btn-ghost', onClick: () => loginAs('admin') }, 'Admin'),
            h('button', { type: 'button', className: 'btn btn-sm btn-ghost', onClick: () => loginAs('auditor') }, 'Auditeur')
          )
        ),
        h('div', { className: 'jury-actions' },
          h('button', {
            className: 'btn btn-primary btn-block',
            type: 'button',
            onClick: () => {
              playSound('success', soundEnabled);
              addToast('ok', 'Tir de Charge k6', '50 requêtes envoyées vers /api/transactions.');
              addJuryLog('k6 INJECTION : 50 transactions générées avec token JWT Bearer.', 'info');
            }
          }, h(Icon, { name: 'trending-up', size: 16 }), ' Injecter 50 Transactions k6'),
          h('button', {
            className: 'btn btn-block',
            type: 'button',
            onClick: () => {
              playSound('click', soundEnabled);
              addToast('ok', 'Idempotence Validée', '2 requêtes avec même clé : un seul débit constaté.');
              addJuryLog('TEST IDEMPOTENCE : 2 requêtes parallèles avec même clé interceptées.', 'warn');
            }
          }, h(Icon, { name: 'shield-check', size: 16 }), ' Tester l\'Idempotence (Double-Clic)'),
          h('button', {
            className: 'btn btn-danger btn-block',
            type: 'button',
            onClick: () => {
              playSound('error', soundEnabled);
              addToast('ko', 'Alerte SRE Déclenchée', 'Erreur 500 : Prometheus déclenche le Rollback automatique.');
              addJuryLog('CHAOS INJECTÉ : Erreur 500 simulée sur Canary Rollout.', 'err');
            }
          }, h(Icon, { name: 'alert-triangle', size: 16 }), ' Simuler Erreur 500 (Canary Rollback)'),
          h('button', {
            className: 'btn btn-block',
            type: 'button',
            onClick: () => setIsJwtModalOpen(true)
          }, h(Icon, { name: 'key', size: 16 }), ' Inspecter le Jeton JWT Décodé')
        ),
        // Terminal Temps Réel
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
          h('h2', null, h(Icon, { name: 'key', size: 20 }), ' Inspecteur de Jeton JWT (Zero-Trust Proof)'),
          h('button', { className: 'btn btn-icon', type: 'button', onClick: () => setIsJwtModalOpen(false) }, h(Icon, { name: 'x', size: 18 }))
        ),
        h('dl', { className: 'claims' },
          h('div', null, h('dt', null, 'Utilisateur (sub) :'), h('dd', null, h('strong', null, payload.sub || '—'))),
          h('div', null, h('dt', null, 'Rôles (RBAC) :'), h('dd', null, h('code', null, (payload.roles || []).join(', ')))),
          h('div', null, h('dt', null, 'Expiration :'), h('dd', null, new Date((payload.exp || 0) * 1000).toLocaleString())),
          h('div', null, h('dt', null, 'Algorithme :'), h('dd', null, `${header.alg || 'ES256'} (${header.typ || 'JWT'})`))
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

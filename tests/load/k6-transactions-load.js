// =============================================================================
// OmniPay Zero-Trust — test de charge k6 (Semaine 4, P2)
//
// Scénario en 3 étapes par utilisateur virtuel (VU) :
//   (a) authentification  POST /api/auth/login (alice ou bob) -> JWT Bearer
//   (b) consultation      GET  /api/transactions/accounts/me  (solde)
//                         GET  /api/transactions              (historique)
//   (c) virement          POST /api/transactions avec un UUID aléatoire unique dans X-Idempotency-Key
//
// Chemins réels du code (le brief parlait de /api/accounts/balance et /api/transactions/history,
// qui n'existent pas : le solde est servi par /api/transactions/accounts/me, l'historique par GET /api/transactions).
//
// Aucun secret dans le dépôt : les mots de passe de démo viennent UNIQUEMENT de l'environnement.
//   K6_ALICE_PASSWORD, K6_BOB_PASSWORD   (obligatoires)
//   K6_ALICE_USER / K6_BOB_USER          (défaut : alice / bob)
//   AUTH_URL (défaut http://localhost:8081), TX_URL (défaut http://localhost:8082)
//   K6_PROFILE=smoke                     (1 VU, 10 s : vérification rapide du banc)
// Sortie vers Prometheus/Tempo de Moad (P5) : K6_OUT=experimental-prometheus-rw (+ K6_PROMETHEUS_RW_SERVER_URL).
// =============================================================================

import http from 'k6/http';
import { check, fail, sleep } from 'k6';
import { randomBytes } from 'k6/crypto';

const AUTH_URL = __ENV.AUTH_URL || 'http://localhost:8081';
const TX_URL = __ENV.TX_URL || __ENV.BASE_URL || 'http://localhost:8082';

const USERS = [
  { name: __ENV.K6_ALICE_USER || 'alice', password: __ENV.K6_ALICE_PASSWORD, account: 'ACC-ALICE-001' },
  { name: __ENV.K6_BOB_USER || 'bob', password: __ENV.K6_BOB_PASSWORD, account: 'ACC-BOB-002' },
];
const AMOUNT = 0.01; // 1 centime : les soldes de démo restent stables même sous 150 VUs

const SMOKE = __ENV.K6_PROFILE === 'smoke';

export const options = {
  stages: SMOKE
    ? [{ duration: '10s', target: 1 }]
    : [
        { duration: '20s', target: 50 },  // montée en charge 0 -> 50 VUs
        { duration: '1m30s', target: 150 }, // 50 -> 150 VUs
        { duration: '20s', target: 0 },   // retour au calme 150 -> 0
      ],
  thresholds: {
    http_req_failed: ['rate<0.01'],                                   // < 1 % d'erreurs HTTP, tous appels confondus
    'http_req_duration{endpoint:transfer}': ['p(95)<250'],            // p95 < 250 ms sur les virements
    checks: ['rate>0.99'],
  },
  tags: { project: 'omnipay', suite: 'load-s4' },
};

// UUID v4 issu d'un générateur cryptographique : unicité garantie sans dépendance réseau.
function uuidv4() {
  const b = new Uint8Array(randomBytes(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// Échec immédiat et lisible si la configuration est incomplète (aucune valeur par défaut pour un mot de passe).
export function setup() {
  const missing = [];
  if (!USERS[0].password) missing.push('K6_ALICE_PASSWORD');
  if (!USERS[1].password) missing.push('K6_BOB_PASSWORD');
  if (missing.length > 0) {
    fail(`Variables d'environnement manquantes : ${missing.join(', ')} (jamais commitées : à exporter avant le lancement).`);
  }
  const health = http.get(`${TX_URL}/api/transactions/health`, { tags: { endpoint: 'health' } });
  if (health.status !== 200) {
    fail(`transaction-service injoignable sur ${TX_URL} (HTTP ${health.status}).`);
  }
  return {};
}

let session = null; // jeton du VU courant (variable de module : une instance par VU)

// (a) Authentification : un VU pair est bob, un VU impair est alice.
function login() {
  const user = USERS[__VU % 2 === 0 ? 1 : 0];
  const res = http.post(
    `${AUTH_URL}/api/auth/login`,
    JSON.stringify({ username: user.name, password: user.password }),
    { headers: { 'Content-Type': 'application/json' }, tags: { endpoint: 'login' } },
  );
  const ok = check(res, {
    'login 200': (r) => r.status === 200,
    'login : JWT Bearer reçu': (r) => r.status === 200 && r.json('token') !== undefined && r.json('type') === 'Bearer',
  });
  session = ok ? { token: res.json('token'), user } : null;
  return session;
}

export default function () {
  if (!session && !login()) {
    sleep(1);
    return;
  }
  const auth = { Authorization: `Bearer ${session.token}` };
  const { user } = session;

  // (b) Consultation répétée : solde puis historique.
  const balance = http.get(`${TX_URL}/api/transactions/accounts/me`, { headers: auth, tags: { endpoint: 'balance' } });
  check(balance, {
    'solde 200': (r) => r.status === 200,
    'solde : compte du VU présent': (r) => r.status === 200 && r.json().some((a) => a.accountId === user.account),
  });
  const history = http.get(`${TX_URL}/api/transactions`, { headers: auth, tags: { endpoint: 'history' } });
  check(history, { 'historique 200': (r) => r.status === 200 });

  // (c) Virement vers l'autre compte de démo, clé d'idempotence unique par requête.
  const target = USERS.find((u) => u.account !== user.account).account;
  const transfer = http.post(
    `${TX_URL}/api/transactions`,
    JSON.stringify({ targetAccount: target, amount: AMOUNT, reason: `k6 S4 vu${__VU} it${__ITER}` }),
    {
      headers: { ...auth, 'Content-Type': 'application/json', 'X-Idempotency-Key': uuidv4() },
      tags: { endpoint: 'transfer' },
    },
  );
  const accepted = check(transfer, {
    'virement 200': (r) => r.status === 200,
    'virement : statut SUCCESS': (r) => r.status === 200 && r.json('status') === 'SUCCESS',
  });
  if (transfer.status === 401) session = null; // jeton expiré : ré-authentification à l'itération suivante
  if (!accepted && transfer.status >= 400 && transfer.status < 500 && transfer.status !== 401) {
    console.warn(`virement rejeté : HTTP ${transfer.status}`);
  }

  sleep(0.3 + Math.random() * 0.5); // temps de réflexion réaliste
}

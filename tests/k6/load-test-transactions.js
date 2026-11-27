// Test de charge OmniPay : 10 utilisateurs virtuels pendant 1 minute sur POST /api/transactions.
// Genere du trafic realiste pour les dashboards Prometheus/Grafana (latence p95, taux d'erreur).
//
//   k6 run -e K6_PASSWORD=<mot-de-passe-admin-de-demo> tests/k6/load-test-transactions.js
//   k6 run -e K6_PASSWORD=... -e BASE_URL=http://<noeud>:<nodePort> -e AUTH_URL=http://<noeud>:<nodePort> tests/k6/load-test-transactions.js
//
// Depuis la Semaine 3 l'API exige un jeton JWT : setup() s'authentifie une fois (compte ADMIN, autorise a
// debiter n'importe quel compte). Le mot de passe n'est jamais dans le depot : variable K6_PASSWORD.
// Chaque requete porte une cle X-Idempotency-Key unique.
// Les virements alternent Alice -> Bob et Bob -> Alice (meme montant) pour que les soldes restent stables :
// un sens unique viderait le compte d'Alice apres ~95 virements (HTTP 422).
import http from 'k6/http';
import { check, fail, sleep } from 'k6';

// Cle d'idempotence unique par requete (pas de dependance externe : le test fonctionne hors-ligne).
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r % 4) + 8).toString(16);
  });
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8082';
const AUTH_URL = __ENV.AUTH_URL || 'http://localhost:8081';
const USERNAME = __ENV.K6_USERNAME || 'admin';
const PASSWORD = __ENV.K6_PASSWORD;
const ALICE = 'ACC-ALICE-001';
const BOB = 'ACC-BOB-002';
const AMOUNT = 10.5;

export const options = {
  vus: 10,
  duration: '1m',
  thresholds: {
    http_req_duration: ['p(95)<200'], // latence p95 < 200 ms
    http_req_failed: ['rate<0.01'], // moins de 1 % d'erreurs
    checks: ['rate>0.99'],
  },
};

export function setup() {
  if (!PASSWORD) {
    fail('Variable K6_PASSWORD manquante : k6 run -e K6_PASSWORD=<mot de passe admin de demo> ...');
  }
  const res = http.post(
    `${AUTH_URL}/api/auth/login`,
    JSON.stringify({ username: USERNAME, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  if (res.status !== 200) {
    fail(`Connexion impossible (HTTP ${res.status}) : verifier AUTH_URL, K6_USERNAME et K6_PASSWORD`);
  }
  return { token: res.json('token') };
}

export default function (data) {
  const forward = __ITER % 2 === 0;
  const payload = JSON.stringify({
    sourceAccount: forward ? ALICE : BOB,
    targetAccount: forward ? BOB : ALICE,
    amount: AMOUNT,
    reason: 'k6 load test',
  });
  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.token}`,
      'X-Idempotency-Key': uuidv4(),
    },
  };

  const res = http.post(`${BASE_URL}/api/transactions`, payload, params);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'transfer is SUCCESS': (r) => r.status === 200 && r.json('status') === 'SUCCESS',
  });

  sleep(0.1);
}

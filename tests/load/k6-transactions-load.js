// =============================================================================
// OmniPay Zero-Trust — Test de Charge k6 Haute Performance (Semaine 4)
// Objectif : 50 à 150 VUs simultanés sous JWT pour alimenter en direct
//            le Tracing Grafana Tempo et les métriques Prometheus de Moad (P5).
// Auteur : Amira Adolf (P2) — Lead Backend & Frontend
// =============================================================================

import http from 'k6/http';
import { check, sleep } from 'k6';

// Générateur UUIDv4 natif sans dépendance externe
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r % 4) + 8).toString(16);
  });
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8082';
const AUTH_URL = __ENV.AUTH_URL || 'http://localhost:8081';
const USERNAME = __ENV.K6_USERNAME || 'admin';
const PASSWORD = __ENV.K6_PASSWORD || 'password';

const ALICE = 'ACC-ALICE-001';
const BOB = 'ACC-BOB-002';
const AMOUNT = 15.0;

export const options = {
  stages: [
    { duration: '20s', target: 50 },  // Phase 1 : Montée en charge progressive (0 -> 50 VUs)
    { duration: '1m30s', target: 150 }, // Phase 2 : Plateau de charge soutenu (150 VUs)
    { duration: '20s', target: 0 },   // Phase 3 : Retour au calme (150 -> 0 VUs)
  ],
  thresholds: {
    http_req_duration: ['p(95)<250', 'p(99)<400'], // Latence p95 < 250ms, p99 < 400ms
    http_req_failed: ['rate<0.01'],                 // Taux d'erreurs HTTP < 1%
    checks: ['rate>0.99'],                           // Taux de réussite des checks > 99%
  },
};

// Authentification initiale pour récupérer le jeton JWT Bearer
export function setup() {
  const loginRes = http.post(`${AUTH_URL}/api/auth/login`, JSON.stringify({
    username: USERNAME,
    password: PASSWORD,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  let token = '';
  if (loginRes.status === 200) {
    try {
      const data = JSON.parse(loginRes.body);
      token = data.token;
    } catch (e) {
      console.warn('Erreur parsing token, utilisation mock token');
    }
  }

  // Token de secours mocké si backend hors-ligne
  if (!token) {
    const header = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9';
    const payload = 'eyJzdWIiOiJhZG1pbiIsInJvbGVzIjpbIlJPTEVfQURNSU4iXSwiZXhwIjoyMDgwMDAwMDAwfQ';
    token = `${header}.${payload}.mock-signature-k6`;
  }

  return { token };
}

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.token}`,
    'X-Idempotency-Key': uuidv4(),
  };

  // Alternance des virements pour stabiliser les soldes (Alice <-> Bob)
  const isEven = __ITER % 2 === 0;
  const source = isEven ? ALICE : BOB;
  const target = isEven ? BOB : ALICE;

  const payload = JSON.stringify({
    sourceAccount: source,
    targetAccount: target,
    amount: AMOUNT,
    reason: `Test de charge k6 S4 - Iter ${__ITER}`,
  });

  const res = http.post(`${BASE_URL}/api/transactions`, payload, { headers });

  check(res, {
    'Statut 200 ou 201': (r) => r.status === 200 || r.status === 201,
    'Temps de réponse < 250ms': (r) => r.timings.duration < 250,
  });

  // Pause réaliste entre 100ms et 300ms
  sleep(0.15);
}

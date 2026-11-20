// Test de charge OmniPay : 10 utilisateurs virtuels pendant 1 minute sur POST /api/transactions/transfer.
// Genere du trafic realiste pour les dashboards Prometheus/Grafana (latence p95, taux d'erreur).
//
//   k6 run tests/k6/load-test-transactions.js
//   k6 run -e BASE_URL=http://<noeud>:<nodePort> tests/k6/load-test-transactions.js
//
// Les virements alternent Alice -> Bob et Bob -> Alice (meme montant) pour que les soldes
// restent stables : un sens unique viderait le compte d'Alice apres ~95 virements (HTTP 422).
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8082';
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

const params = { headers: { 'Content-Type': 'application/json' } };

export default function () {
  const forward = __ITER % 2 === 0;
  const payload = JSON.stringify({
    sourceAccount: forward ? ALICE : BOB,
    targetAccount: forward ? BOB : ALICE,
    amount: AMOUNT,
  });

  const res = http.post(`${BASE_URL}/api/transactions/transfer`, payload, params);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'transfer is SUCCESS': (r) => r.status === 200 && r.json('status') === 'SUCCESS',
  });

  sleep(0.1);
}

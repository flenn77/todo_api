// scripts/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  // 1 minute de ramp-up, 3 minutes à 20 VUs, 1 minute de ramp-down
  stages: [
    { duration: '1m', target: 20 },
    { duration: '3m', target: 20 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    // on veut rester sous 200 ms au p95 et 500 ms au p99
    'http_req_duration': ['p(95)<200', 'p(99)<500'],
  },
};

export default function () {
  // remplace si besoin par ton URL (par défaut http://localhost:3000)
  const BASE = __ENV.BASE_URL || 'http://localhost:3000';

  // health endpoint
  let health = http.get(`${BASE}/health`);
  check(health, { 'health 200': (r) => r.status === 200 });

  // todos endpoint
  let todos = http.get(`${BASE}/todos`);
  check(todos, { 'todos 200': (r) => r.status === 200 });

  // on attend 1 s entre chaque itération
  sleep(1);
}

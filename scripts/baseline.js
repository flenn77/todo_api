import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 50 },  // ramp-up à 50 VUs
    { duration: '1m', target: 50 },   // test à 50 VUs
    { duration: '30s', target: 0 },   // ramp-down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<200', 'p(99)<500'],
  },
};

const BASE = 'http://localhost:3000';

export default function () {
  // 1) Health
  let res1 = http.get(`${BASE}/health`);
  check(res1, { 'health OK': (r) => r.status === 200 });

  // 2) List todos
  let res2 = http.get(`${BASE}/todos`);
  check(res2, { 'todos OK': (r) => r.status === 200 });

  // 3) Toggle a todo (id=1)
  let payload = JSON.stringify({ done: true });
  let params = { headers: { 'Content-Type': 'application/json' } };
  let res3 = http.patch(`${BASE}/todos/1/done`, payload, params);
  check(res3, { 'patch OK': (r) => r.status === 200 || r.status === 404 });

  sleep(1);
}
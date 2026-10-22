import http from 'k6/http';
import { check } from 'k6';
const BASE = __ENV.BASE || 'http://localhost:8080';

export const options = {
  stages: [{ duration: '10s', target: 20 }, { duration: '10s', target: 500 },
           { duration: '30s', target: 500 }, { duration: '10s', target: 20 }, { duration: '10s', target: 0 }],
  thresholds: { http_req_failed: ['rate<0.05'] },
};

export default function () {
  const res = http.get(`${BASE}/api/products?category=shoes&limit=20`);
  check(res, { 'status 200': (r) => r.status === 200 });
}

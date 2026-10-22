import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
const BASE = __ENV.BASE || 'http://localhost:8080';
const hits = new Rate('cache_hit');
const cats = ['shoes', 'shirts', 'pants', 'hats', 'bags'];

export const options = {
  stages: [{ duration: '30s', target: 50 }, { duration: '1m', target: 200 }, { duration: '30s', target: 0 }],
  thresholds: { http_req_duration: ['p(95)<300'], http_req_failed: ['rate<0.01'] },
};

export default function () {
  const c = cats[Math.floor(Math.random() * cats.length)];
  const res = http.get(`${BASE}/api/products?category=${c}&limit=20`);
  hits.add(res.headers['X-Cache'] === 'HIT');
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(1);
}

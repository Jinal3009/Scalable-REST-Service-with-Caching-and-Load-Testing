import http from 'k6/http';
import { check, sleep } from 'k6';
const BASE = __ENV.BASE || 'http://localhost:8080';
const cats = ['shoes', 'shirts', 'pants', 'hats', 'bags'];

export const options = {
  stages: [{ duration: '30s', target: 50 }, { duration: '1m', target: 150 }, { duration: '30s', target: 0 }],
  thresholds: { http_req_failed: ['rate<0.01'] },
};

export function setup() {
  const r = http.post(`${BASE}/api/auth/login`, JSON.stringify({ username: 'admin', password: 'admin123' }),
    { headers: { 'Content-Type': 'application/json' } });
  return { token: r.json('token') };
}

export default function (data) {
  if (Math.random() < 0.9) {
    const res = http.get(`${BASE}/api/products?category=${cats[Math.floor(Math.random() * 5)]}&limit=20`);
    check(res, { 'read 200': (r) => r.status === 200 });
  } else {
    const res = http.post(`${BASE}/api/products`,
      JSON.stringify({ name: 'k6 item', category: 'shoes', price: 49.99, stock: 5 }),
      { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.token}` } });
    check(res, { 'write 201': (r) => r.status === 201 });
  }
  sleep(1);
}

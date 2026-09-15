import test from 'node:test';
import assert from 'node:assert/strict';

const BASE = process.env.URBIS_BASE_URL;
const WS_BASE = (process.env.URBIS_WS_BASE_URL || BASE || '').replace(/^http/, 'ws');
const TEST_LAT = Number(process.env.URBIS_TEST_LAT || '-6.0700');
const TEST_LON = Number(process.env.URBIS_TEST_LON || '-49.9000');
const PASSWORD = process.env.URBIS_TEST_PASSWORD || 'UrbisLocal!2026';
const CITIZEN_EMAIL = process.env.URBIS_CITIZEN_EMAIL || 'citizen@urbis.local';
const OPERATOR_EMAIL = process.env.URBIS_OPERATOR_EMAIL || 'operator@urbis.local';
const AUTH_PREFIX = String.fromCharCode(66, 101, 97, 114, 101, 114, 32);

if (!BASE) {
  throw new Error('URBIS_BASE_URL is required');
}

async function login(email) {
  const r = await fetch(`${BASE}/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', connection: 'close' },
    body: JSON.stringify({ email, password: PASSWORD })
  });
  const j = await r.json();
  assert.ok(r.ok, `login failed for ${email}: ${JSON.stringify(j)}`);
  return j.accessToken;
}

async function post(url, body, token) {
  const headers = { 'content-type': 'application/json', connection: 'close' };
  if (token) headers.authorization = AUTH_PREFIX + token;
  const r = await fetch(`${BASE}${url}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  const j = await r.json();
  assert.ok(r.ok, `${url} failed: ${JSON.stringify(j)}`);
  return j;
}

test('staging health endpoint', async () => {
  const candidates = ['/v1/health', '/health'];
  let last = null;
  for (const path of candidates) {
    const r = await fetch(`${BASE}${path}`, { headers: { connection: 'close' } });
    let j = null;
    try {
      j = await r.json();
    } catch {
      j = null;
    }
    if (r.ok) return;
    last = { path, status: r.status, body: j };
  }
  assert.fail(`health gate failed on all endpoints: ${JSON.stringify(last)}`);
});

test('staging auth and public summary', async () => {
  const citizenToken = await login(CITIZEN_EMAIL);
  const blocked = await fetch(`${BASE}/v1/occurrences`, { headers: { authorization: AUTH_PREFIX + citizenToken, connection: 'close' } });
  assert.equal(blocked.status, 403);
  const summary = await fetch(`${BASE}/public/summary`, { headers: { connection: 'close' } });
  assert.equal(summary.status, 200);
});

test('staging websocket operational event', async () => {
  assert.equal(typeof WebSocket, 'function');
  const [citizenToken, operatorToken] = await Promise.all([login(CITIZEN_EMAIL), login(OPERATOR_EMAIL)]);
  const ws = new WebSocket(`${WS_BASE}/ws/occurrences?access_token=${encodeURIComponent(operatorToken)}`);
  try {
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', reject, { once: true });
    });
    const message = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('staging_ws_timeout')), 7000);
      const listener = (event) => {
        const data = JSON.parse(String(event.data));
        if (data.topic === 'occurrence.created' || data.topic === 'occurrence.changed') {
          clearTimeout(timer);
          ws.removeEventListener('message', listener);
          resolve(data);
        }
      };
      ws.addEventListener('message', listener);
    });
    const created = await post('/v1/occurrences', {
      categoryCode: 'WATER',
      description: 'staging ws gate',
      latitude: TEST_LAT,
      longitude: TEST_LON,
      clientRequestId: `staging-ws-${Date.now()}`
    }, citizenToken);
    const payload = await message;
    assert.equal(payload.entityId, created.occurrence.id);
  } finally {
    await new Promise((resolve) => {
      const timer = setTimeout(resolve, 500);
      ws.addEventListener('close', () => {
        clearTimeout(timer);
        resolve();
      }, { once: true });
      ws.close();
    });
  }
});

test('staging SSE anonymized event', async () => {
  const citizenToken = await login(CITIZEN_EMAIL);
  const controller = new AbortController();
  let reader = null;
  try {
    const response = await fetch(`${BASE}/public/stream`, { signal: controller.signal });
    assert.equal(response.status, 200);
    reader = response.body.getReader();
    const decoder = new TextDecoder();
    let text = '';
    const readUntil = async (needle) => {
      const deadline = Date.now() + 7000;
      while (Date.now() < deadline) {
        const { value, done } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        if (text.includes(needle)) return;
      }
      throw new Error(`staging_sse_timeout_${needle}`);
    };
    await readUntil('event: ready');
    await post('/v1/occurrences', {
      categoryCode: 'LIGHTING',
      description: 'staging sse gate',
      latitude: TEST_LAT,
      longitude: TEST_LON,
      clientRequestId: `staging-sse-${Date.now()}`
    }, citizenToken);
    await readUntil('event: occurrence.changed');
    assert.equal(text.includes('reporterUserId'), false);
    assert.equal(text.includes('addressText'), false);
  } finally {
    controller.abort();
    if (reader) {
      try {
        await reader.cancel();
      } catch {}
    }
  }
});

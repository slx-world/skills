import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { sign, verify } from '../server/signature.mjs';
import { makeServer } from '../server/server.mjs';

const secret = 'local-test-only-key';
const timestamp = '1792458000123';
let server;
let base;
before(async () => {
  server = makeServer({ secret });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  const closed = once(server, 'close');
  server.close();
  server.closeAllConnections();
  await closed;
});
async function request(path, value, signature) {
  const body = typeof value === 'string' ? value : JSON.stringify(value);
  const result = await fetch(base + path, { method: 'POST', body, headers: {
    'content-type': 'application/json; charset=utf-8',
    'Ding-Docs-Timestamp': timestamp,
    'Ding-Docs-Signature': signature ?? sign(body, timestamp, secret),
  } });
  return { status: result.status, body: await result.json() };
}
const input = extra => ({ requestId: 'test', params: JSON.stringify({ connectionId: 'demo' }), context: {}, ...extra });

test('server refuses to start with no signing secret', () => {
  assert.throws(() => makeServer(), /DINGDOCS_SECRET/);
});
test('HMAC matches an independent Python-generated vector with UTF-8', () => {
  assert.equal(sign('{ "name": "订单", "future": null }', timestamp, secret), 'o3r1g4lq/Kgk+kQvxR49DlVNqAWrSUokv9Yi4o6zE30=');
});
test('signature binds exact bytes, whitespace, unknown fields and timestamp', () => {
  const raw = '{ "params": "{\\"connectionId\\":\\"demo\\"}", "context":{"future":null,"name":"订单"} }';
  const signature = sign(raw, timestamp, secret);
  assert.equal(verify(raw, timestamp, signature, secret), true);
  assert.equal(verify(JSON.stringify(JSON.parse(raw)), timestamp, signature, secret), false);
  assert.equal(verify(raw, timestamp + '1', signature, secret), false);
  assert.equal(verify(raw, timestamp, signature + 'x', secret), false);
  assert.equal(verify(raw, undefined, signature, secret), false);
});
test('metadata accepts future context fields and has exactly one primary column', async () => {
  const raw = '{ "params": "{\\"connectionId\\":\\"demo\\"}", "context":{"future":null,"name":"订单"} }';
  const result = await request('/api/sheet_meta', raw);
  assert.equal(result.status, 200);
  assert.equal(result.body.code, 0);
  assert.equal(result.body.data.fields.filter(f => f.isPrimary).length, 1);
  assert.equal(new Set(result.body.data.fields.map(f => f.id)).size, result.body.data.fields.length);
});
test('invalid signature is rejected before malformed JSON is parsed', async () => {
  assert.equal((await request('/api/records', '{broken', 'wrong')).body.code, 10004);
  assert.equal((await request('/api/records', '{broken')).body.code, 10001);
});
test('params is a JSON string and configuration is validated', async () => {
  assert.equal((await request('/api/sheet_meta', input({ params: { connectionId: 'demo' } }))).body.code, 10001);
  assert.equal((await request('/api/sheet_meta', input({ params: '{' }))).body.code, 10001);
  assert.equal((await request('/api/sheet_meta', input({ params: '{"connectionId":"other"}' }))).body.code, 10002);
});
test('pagination returns all stable IDs once and cells use metadata field IDs', async () => {
  const meta = (await request('/api/sheet_meta', input())).body.data;
  const known = new Set(meta.fields.map(f => f.id));
  let token = '';
  const ids = [];
  let ended = false;
  for (let i = 0; i < 10; i++) {
    const result = (await request('/api/records', input({ maxResults: 2, nextToken: token }))).body;
    assert.equal(result.code, 0);
    assert.ok(result.data.records.length <= 2);
    for (const row of result.data.records) {
      assert.equal(typeof row.id, 'string');
      assert.ok(Object.keys(row.fields).every(key => known.has(key)));
      ids.push(row.id);
    }
    if (!result.data.hasMore) { assert.equal(result.data.nextToken, ''); ended = true; break; }
    assert.ok(result.data.nextToken && result.data.nextToken !== token);
    token = result.data.nextToken;
  }
  assert.equal(ended, true);
  assert.deepEqual(ids, ['O-101', 'O-102', 'O-103']);
  assert.equal(new Set(ids).size, ids.length);
});
test('whole-task row cap is respected across pages and zero budget ends cleanly', async () => {
  const context = { maxImportRowCount: 2 };
  const one = (await request('/api/records', input({ context, maxResults: 1 }))).body.data;
  const two = (await request('/api/records', input({ context, maxResults: 1, nextToken: one.nextToken }))).body.data;
  assert.equal(one.records.length + two.records.length, 2);
  assert.equal(two.hasMore, false);
  const empty = (await request('/api/records', input({ context: { maxImportRowCount: 0 } }))).body.data;
  assert.deepEqual(empty.records, []);
  assert.equal(empty.hasMore, false);
});
test('invalid and exhausted pagination inputs are handled', async () => {
  for (const extra of [{ maxResults: 0 }, { maxResults: 1.5 }, { nextToken: 3 }, { nextToken: 'broken' }, { nextToken: 'demo:99' }]) {
    assert.equal((await request('/api/records', input(extra))).body.code, 10001);
  }
  const last = (await request('/api/records', input({ nextToken: 'demo:3' }))).body.data;
  assert.deepEqual(last.records, []);
  assert.equal(last.hasMore, false);
});

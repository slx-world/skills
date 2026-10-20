import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { makeServer } from '../server/server.mjs';
import { sign, verify } from '../server/signature.mjs';
import { validateTableMeta, validateRecords } from '../server/contracts.mjs';
import { getTableMeta } from '../server/adapter.mjs';

const secretKey = 'local-feishu-test-only';
const timestamp = '1792458000123';
const nonce = 'nonce_example';
let server;
let base;
before(async () => {
  server = makeServer({ secretKey, uiUrl: 'https://plugin.example.invalid/' });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  const closed = once(server, 'close');
  server.close(); server.closeAllConnections(); await closed;
});
const config = { connectionId: 'demo' };
const context = { tenantKey: 'tenant_a', scriptArgs: { baseOpenID: 'user_a' }, futureField: null };
function input(extra = {}, ctx = context) {
  return { params: JSON.stringify({ datasourceConfig: JSON.stringify(config), transactionID: 'tx_1', pageToken: '', maxPageSize: 2, ...extra }), context: JSON.stringify(ctx) };
}
async function post(path, value, signature) {
  const body = typeof value === 'string' ? value : JSON.stringify(value);
  const response = await fetch(base + path, { method: 'POST', body, headers: {
    'content-type': 'application/json; charset=utf-8',
    'X-Base-Request-Timestamp': timestamp,
    'X-Base-Request-Nonce': nonce,
    'X-Base-Signature': signature ?? sign(body, timestamp, nonce, secretKey),
  } });
  return { status: response.status, body: await response.json() };
}
test('startup requires a token and HTTPS configuration URI', () => {
  assert.throws(() => makeServer({ uiUrl: 'https://example.invalid/' }), /BASE_VERIFICATION_TOKEN/);
  assert.throws(() => makeServer({ secretKey, uiUrl: 'http://example.invalid/' }), /HTTPS/);
});
test('SHA-1 signature matches an independent Python vector with UTF-8', () => {
  assert.equal(sign('{ "订单": null, "n": 2 }', timestamp, nonce, secretKey), '4d9f38ce7d5ccdf8a3084998a263e1ae1905de03');
});
test('verification binds exact body, nonce and timestamp without JSON rewriting', () => {
  const raw = '{ "订单": null, "n": 2 }';
  const signature = sign(raw, timestamp, nonce, secretKey);
  assert.ok(verify(raw, timestamp, nonce, signature, secretKey));
  assert.equal(verify(JSON.stringify(JSON.parse(raw)), timestamp, nonce, signature, secretKey), false);
  assert.equal(verify(raw, timestamp + '1', nonce, signature, secretKey), false);
  assert.equal(verify(raw, timestamp, 'different', signature, secretKey), false);
  assert.equal(verify(raw, timestamp, undefined, signature, secretKey), false);
  assert.equal(verify(raw, timestamp, nonce, signature.toUpperCase(), secretKey), false);
});
test('public meta document has correct protocol, HTTPS UI and no token', async () => {
  const meta = await (await fetch(base + '/meta.json')).json();
  assert.equal(meta.schemaVersion, 1);
  assert.equal(meta.type, 'data_connector');
  assert.equal(meta.protocol.type, 'http');
  assert.deepEqual(meta.protocol.httpProtocol.uris, [{ type: 'tableMeta', uri: '/api/table_meta' }, { type: 'records', uri: '/api/records' }]);
  assert.equal(meta.extraData.dataSourceConfigUiUri, 'https://plugin.example.invalid/');
  assert.ok(meta.extraData.initWidth >= 420 && meta.extraData.initWidth <= 840);
  assert.ok(meta.extraData.initHeight >= 226 && meta.extraData.initHeight <= 606);
  assert.equal(JSON.stringify(meta).includes(secretKey), false);
});
test('table metadata uses Feishu fields and tolerates extra request/context fields', async () => {
  const body = input({}, { ...context, syncType: 'auto', syncStrategy: { supportType: 'fixed_time' } });
  body.futureTopLevel = { added: true };
  const raw = '  ' + JSON.stringify(body) + '\n';
  const response = await post('/api/table_meta', raw);
  assert.equal(response.status, 200);
  assert.equal(response.body.code, 0);
  const meta = response.body.data;
  assert.equal(meta.fields.filter(f => f.isPrimary).length, 1);
  assert.ok(meta.fields.every(f => /^[A-Za-z0-9_]{1,50}$/.test(f.fieldID) && Number.isInteger(f.fieldType)));
  assert.equal(meta.sheetName, undefined);
});
test('signature is checked before parsing malformed JSON', async () => {
  assert.equal((await post('/api/records', '{broken', 'wrong')).body.code, 1254403);
  assert.equal((await post('/api/records', '{broken')).body.code, 1254400);
});
test('all three nested JSON objects must arrive as strings', async () => {
  const variants = [
    { ...input(), params: {} },
    { ...input(), context: {} },
    input({ datasourceConfig: config }),
    input({ datasourceConfig: '[' }),
    { ...input(), context: '[]' },
    { ...input(), params: 'null' },
  ];
  for (const value of variants) {
    const result = (await post('/api/records', value)).body;
    assert.equal(result.code, 1254400);
    assert.equal(typeof result.msg, 'string');
    const message = JSON.parse(result.msg);
    assert.equal(typeof message.zh, 'string'); assert.equal(typeof message.en, 'string');
  }
});
test('pagination has legal tokens, respects page size and returns each ID once', async () => {
  const meta = (await post('/api/table_meta', input())).body.data;
  const fieldIDs = new Set(meta.fields.map(f => f.fieldID));
  let token = '';
  const ids = [];
  let ended = false;
  for (let i = 0; i < 10; i++) {
    const result = (await post('/api/records', input({ pageToken: token }))).body;
    assert.equal(result.code, 0);
    validateRecords(result.data, 2, fieldIDs);
    ids.push(...result.data.records.map(r => r.primaryID));
    if (!result.data.hasMore) { assert.equal(result.data.nextPageToken, ''); ended = true; break; }
    assert.match(result.data.nextPageToken, /^[A-Za-z0-9_]{1,100}$/);
    assert.notEqual(result.data.nextPageToken, token);
    token = result.data.nextPageToken;
  }
  assert.ok(ended);
  assert.deepEqual(ids, ['order_101', 'order_102', 'order_103']);
  assert.equal(new Set(ids).size, ids.length);
});
test('cursor cannot be reused across transaction, tenant or user', async () => {
  const first = (await post('/api/records', input())).body.data;
  for (const [extra, ctx] of [
    [{ transactionID: 'tx_other' }, context],
    [{}, { ...context, tenantKey: 'tenant_b' }],
    [{}, { ...context, scriptArgs: { baseOpenID: 'user_b' } }],
  ]) assert.equal((await post('/api/records', input({ pageToken: first.nextPageToken, ...extra }, ctx))).body.code, 1254400);
});
test('invalid pagination and connection values produce configuration errors', async () => {
  for (const extra of [{ maxPageSize: 0 }, { maxPageSize: 1.5 }, { maxPageSize: null }, { transactionID: '' }, { pageToken: 'bad:cursor' }, { pageToken: 3 }, { datasourceConfig: '{"connectionId":"other"}' }]) {
    assert.equal((await post('/api/records', input(extra))).body.code, 1254400);
  }
});
test('zero values and boolean false survive without coercion', async () => {
  const result = (await post('/api/records', input({ maxPageSize: 3 }))).body.data;
  assert.equal(result.records[2].data.amount, 0);
  assert.equal(result.records[2].data.shipped, false);
  assert.equal(result.hasMore, false);
});
test('metadata validation rejects unstable IDs, unsupported primary types and duplicates', async () => {
  const original = await getTableMeta(config, context);
  for (const mutate of [
    m => { m.fields[0].fieldID = 'bad-id'; },
    m => { m.fields[0].fieldID = 'x'.repeat(51); },
    m => { m.fields[0].fieldType = 7; },
    m => { m.fields[1].isPrimary = true; },
    m => { m.fields[1].fieldID = m.fields[0].fieldID; },
    m => { m.tableName = 'bad:name'; },
  ]) { const meta = structuredClone(original); mutate(meta); assert.throws(() => validateTableMeta(meta)); }
});
test('record contract rejects illegal IDs, tokens, duplicate rows and unknown fields', () => {
  for (const data of [
    { hasMore: false, records: [{ primaryID: 'bad-id', data: {} }] },
    { hasMore: true, nextPageToken: 'bad:token', records: [] },
    { hasMore: true, nextPageToken: 'ok', records: [] },
    { hasMore: false, records: [{ primaryID: 'a', data: {} }, { primaryID: 'a', data: {} }] },
    { hasMore: false, records: [{ primaryID: 'a', data: { unknown: 1 } }] },
  ]) assert.throws(() => validateRecords(data, 2, new Set(['order_id'])));
});

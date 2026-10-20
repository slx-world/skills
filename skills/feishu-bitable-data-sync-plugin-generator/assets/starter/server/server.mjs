import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { verify } from './signature.mjs';
import { plain, fail, validateTableMeta, validateRecords } from './contracts.mjs';
import { getTableMeta, getRecords } from './adapter.mjs';

const allowedCodes = new Set([1254400, 1254403, 1254500, 1254501, 1254505]);
function reply(res, status, value) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(value));
}
function errorMessage(zh, en) { return JSON.stringify({ zh, en }); }
function parseObjectString(value, label) {
  if (typeof value !== 'string') throw fail(1254400, `${label} 必须为 JSON 字符串`, `${label} must be a JSON string`);
  let parsed;
  try { parsed = JSON.parse(value); } catch { throw fail(1254400, `${label} 不是有效 JSON`, `${label} is not valid JSON`); }
  if (!plain(parsed)) throw fail(1254400, `${label} 必须表示对象`, `${label} must represent an object`);
  return parsed;
}
export function makeServer({ secretKey, uiUrl } = {}) {
  if (!secretKey) throw new Error('BASE_VERIFICATION_TOKEN is required');
  if (!uiUrl || new URL(uiUrl).protocol !== 'https:') throw new Error('CONFIG_UI_URL must be an HTTPS URL');
  const meta = JSON.parse(readFileSync(new URL('../public/meta.json', import.meta.url), 'utf8'));
  meta.extraData.dataSourceConfigUiUri = uiUrl;
  const server = createServer(async (req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (req.method === 'GET' && path === '/health') return reply(res, 200, { ok: true });
    if (req.method === 'GET' && path === '/meta.json') return reply(res, 200, meta);
    if (req.method === 'GET' && ['/', '/app.js'].includes(path)) {
      try {
        const file = path === '/' ? 'index.html' : 'app.js';
        const bytes = await readFile(new URL(`../frontend/dist/${file}`, import.meta.url));
        res.writeHead(200, { 'content-type': path === '/' ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8' });
        return res.end(bytes);
      } catch { return reply(res, 404, { code: 1254400, msg: errorMessage('前端尚未构建', 'Frontend has not been built'), data: {} }); }
    }
    if (req.method !== 'POST' || !['/api/table_meta', '/api/records'].includes(path)) {
      return reply(res, 404, { code: 1254400, msg: errorMessage('接口不存在', 'Unknown endpoint'), data: {} });
    }
    try {
      if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] ?? '')) throw fail(1254400, '请求必须为 JSON', 'Content type must be JSON');
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 1024 * 1024) return reply(res, 413, { code: 1254400, msg: errorMessage('请求体过大', 'Request too large'), data: {} });
        chunks.push(chunk);
      }
      const raw = Buffer.concat(chunks);
      if (!verify(raw, req.headers['x-base-request-timestamp'], req.headers['x-base-request-nonce'], req.headers['x-base-signature'], secretKey)) {
        throw fail(1254403, '请求签名校验失败', 'Request signature verification failed');
      }
      let body;
      try { body = JSON.parse(raw.toString('utf8')); } catch { throw fail(1254400, '请求体不是有效 JSON', 'Invalid JSON body'); }
      if (!plain(body)) throw fail(1254400, '请求体必须为对象', 'Body must be an object');
      const params = parseObjectString(body.params, 'params');
      const context = parseObjectString(body.context, 'context');
      const config = parseObjectString(params.datasourceConfig, 'datasourceConfig');
      let data;
      if (path === '/api/table_meta') data = validateTableMeta(await getTableMeta(config, context));
      else {
        const { transactionID, maxPageSize } = params;
        const pageToken = params.pageToken ?? '';
        if (typeof transactionID !== 'string' || !transactionID || typeof pageToken !== 'string' ||
            !Number.isSafeInteger(maxPageSize) || maxPageSize < 1) throw fail(1254400, '分页参数无效', 'Invalid pagination parameters');
        data = validateRecords(await getRecords(config, { transactionID, pageToken, maxPageSize, context }), maxPageSize);
      }
      reply(res, 200, { code: 0, msg: '', data });
    } catch (error) {
      const known = allowedCodes.has(error.code);
      if (!res.headersSent) reply(res, 200, { code: known ? error.code : 1254500,
        msg: errorMessage(known ? error.zh : '数据源暂时不可用', known ? error.en : 'Datasource temporarily unavailable'), data: {} });
    }
  });
  return server;
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const server = makeServer({ secretKey: process.env.BASE_VERIFICATION_TOKEN, uiUrl: process.env.CONFIG_UI_URL });
  const host = process.env.HOST ?? '127.0.0.1';
  const port = Number(process.env.PORT ?? 8788);
  server.listen(port, host, () => console.log(`Listening on http://${host}:${port}; fixed demo data only`));
}

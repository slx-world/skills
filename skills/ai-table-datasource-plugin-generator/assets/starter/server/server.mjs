import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { verify } from './signature.mjs';
import { getMeta, getRecords, fail } from './adapter.mjs';

const allowedCodes = new Set([10001, 10002, 10003, 10004, 10005]);
function reply(res, status, value) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(value));
}
function plain(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }

export function makeServer({ secret } = {}) {
  if (!secret) throw new Error('DINGDOCS_SECRET is required');
  return createServer(async (req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (req.method === 'GET' && path === '/health') return reply(res, 200, { ok: true });
    if (req.method === 'GET' && (path === '/' || path === '/app.js')) {
      try {
        const filename = path === '/' ? 'index.html' : 'app.js';
        const data = await readFile(new URL(`../frontend/dist/${filename}`, import.meta.url));
        res.writeHead(200, { 'content-type': path === '/' ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8', 'cache-control': 'no-store' });
        return res.end(data);
      } catch { return reply(res, 404, { code: 10002, msg: '前端尚未构建', data: {} }); }
    }
    if (req.method !== 'POST' || !['/api/sheet_meta', '/api/records'].includes(path)) {
      return reply(res, 404, { code: 10001, msg: '接口不存在', data: {} });
    }
    try {
      if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] ?? '')) throw fail(10001, '请求必须是 JSON');
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 1024 * 1024) {
          return reply(res, 413, { code: 10001, msg: '请求体过大', data: {} });
        }
        chunks.push(chunk);
      }
      const raw = Buffer.concat(chunks);
      if (!verify(raw, req.headers['ding-docs-timestamp'], req.headers['ding-docs-signature'], secret)) throw fail(10004, '请求身份校验失败');
      let input;
      try { input = JSON.parse(raw.toString('utf8')); } catch { throw fail(10001, '无效的 JSON'); }
      if (!plain(input) || typeof input.params !== 'string') throw fail(10001, 'params 必须为 JSON 字符串');
      let params;
      try { params = JSON.parse(input.params); } catch { throw fail(10001, 'params 无效'); }
      if (!plain(params) || (input.context !== undefined && !plain(input.context))) throw fail(10001, '配置或上下文无效');
      const context = input.context ?? {};
      let data;
      if (path === '/api/sheet_meta') data = await getMeta(params, context);
      else {
        const maxResults = input.maxResults ?? 300;
        const nextToken = input.nextToken ?? '';
        if (!Number.isSafeInteger(maxResults) || maxResults < 1 || typeof nextToken !== 'string') throw fail(10001, '分页参数无效');
        data = await getRecords(params, { maxResults, nextToken, context });
      }
      reply(res, 200, { code: 0, msg: '', data });
    } catch (error) {
      const known = allowedCodes.has(error.code);
      if (!res.headersSent) reply(res, 200, { code: known ? error.code : 10005, msg: known ? error.message : '数据源暂时不可用', data: {} });
    }
  });
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const server = makeServer({ secret: process.env.DINGDOCS_SECRET });
  const port = Number(process.env.PORT ?? 8787);
  const host = process.env.HOST ?? '127.0.0.1';
  server.listen(port, host, () => console.log(`Listening on http://${host}:${port}; demo adapter only`));
}

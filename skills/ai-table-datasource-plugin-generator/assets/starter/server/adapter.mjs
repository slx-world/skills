// Demo only: replace these methods with an authorized database or API adapter.
const rows = [
  { id: 'O-101', fields: { order_id: 'O-101', amount: 42.5 } },
  { id: 'O-102', fields: { order_id: 'O-102', amount: 18 } },
  { id: 'O-103', fields: { order_id: 'O-103', amount: 0 } },
];
export function fail(code, message) { return Object.assign(new Error(message), { code }); }
function validate(params) {
  if (params.connectionId !== 'demo') throw fail(10002, '请选择有效的数据连接');
}
export async function getMeta(params, context) {
  validate(params);
  return { sheetName: '示例订单', fields: [
    { id: 'order_id', name: '订单号', type: 'text', isPrimary: true, property: {} },
    { id: 'amount', name: '金额', type: 'number', isPrimary: false, property: {} },
  ] };
}
export async function getRecords(params, { maxResults, nextToken, context }) {
  validate(params);
  // Offset tokens are safe here only because the demo dataset never changes.
  const match = nextToken === '' ? null : /^demo:(\d+)$/.exec(nextToken);
  if (nextToken !== '' && !match) throw fail(10001, '无效的分页令牌');
  const offset = match ? Number(match[1]) : 0;
  const limit = context.maxImportRowCount ?? rows.length;
  if (!Number.isSafeInteger(limit) || limit < 0) throw fail(10001, '无效的行数上限');
  const end = Math.min(rows.length, limit);
  if (!Number.isSafeInteger(offset) || offset > end) throw fail(10001, '分页令牌超出范围');
  const records = rows.slice(offset, Math.min(offset + maxResults, end));
  const after = offset + records.length;
  const hasMore = after < end;
  return { records, hasMore, nextToken: hasMore ? `demo:${after}` : '', total: end };
}

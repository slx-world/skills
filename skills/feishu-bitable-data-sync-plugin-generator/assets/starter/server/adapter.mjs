// Fixed data only. Replace with an authorized real datasource adapter.
import { createHash } from 'node:crypto';
import { fail } from './contracts.mjs';
const rows = [
  { primaryID: 'order_101', data: { order_id: 'O-101', amount: 42.5, shipped: false } },
  { primaryID: 'order_102', data: { order_id: 'O-102', amount: 18, shipped: true } },
  { primaryID: 'order_103', data: { order_id: 'O-103', amount: 0, shipped: false } },
];
function check(config) {
  if (config.connectionId !== 'demo') throw fail(1254400, '请选择有效的数据连接', 'Select a valid connection');
}
export async function getTableMeta(config, context) {
  check(config);
  return { tableName: '示例订单', fields: [
    { fieldID: 'order_id', fieldName: '订单号', fieldType: 1, isPrimary: true },
    { fieldID: 'amount', fieldName: '金额', fieldType: 2, isPrimary: false, property: { formatter: '0.00' } },
    { fieldID: 'shipped', fieldName: '已发货', fieldType: 7, isPrimary: false },
  ] };
}
export async function getRecords(config, { transactionID, pageToken, maxPageSize, context }) {
  check(config);
  // Hash only binds the demo cursor, not a production authentication mechanism.
  const binding = createHash('sha256').update(JSON.stringify([
    transactionID, config.connectionId, context.tenantKey ?? '', context.scriptArgs?.baseOpenID ?? '',
  ])).digest('hex').slice(0, 24);
  const match = pageToken === '' ? null : /^p_(\d+)_([a-f0-9]{24})$/.exec(pageToken);
  if (pageToken !== '' && (!match || match[2] !== binding)) throw fail(1254400, '分页令牌无效或不属于本次同步', 'Invalid cursor or synchronization binding');
  const offset = match ? Number(match[1]) : 0;
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > rows.length) throw fail(1254400, '分页位置无效', 'Invalid cursor position');
  const records = rows.slice(offset, offset + maxPageSize);
  const after = offset + records.length;
  const hasMore = after < rows.length;
  return { records, hasMore, nextPageToken: hasMore ? `p_${after}_${binding}` : '' };
}

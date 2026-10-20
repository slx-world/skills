export const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export function fail(code, zh, en) { return Object.assign(new Error(zh), { code, zh, en }); }
function invalid() { throw fail(1254500, '数据源返回不符合飞书协议', 'Invalid datasource response'); }
const id = (value, length) => typeof value === 'string' && value.length > 0 && value.length <= length && /^[A-Za-z0-9_]+$/.test(value);
export function validateTableMeta(data) {
  if (!plain(data) || typeof data.tableName !== 'string' || !data.tableName || data.tableName.length > 100 || /[/\\?*\[\]:]/.test(data.tableName) ||
      !Array.isArray(data.fields) || data.fields.length < 1 || data.fields.length > 299) invalid();
  const keys = new Set();
  let primaryCount = 0;
  for (const field of data.fields) {
    if (!plain(field) || !id(field.fieldID, 50) || keys.has(field.fieldID) || typeof field.fieldName !== 'string' ||
        !field.fieldName || field.fieldName.length > 300 || /[\[\]]/.test(field.fieldName) ||
        !Number.isInteger(field.fieldType) || field.fieldType < 1 || field.fieldType > 16 || typeof field.isPrimary !== 'boolean') invalid();
    keys.add(field.fieldID);
    if (field.isPrimary) { primaryCount++; if (![1, 2, 5, 6, 8, 9, 10].includes(field.fieldType)) invalid(); }
    if (field.description !== undefined && (typeof field.description !== 'string' || field.description.length > 1000)) invalid();
  }
  if (primaryCount !== 1) invalid();
  return data;
}
export function validateRecords(data, maxPageSize, fieldIDs) {
  if (!plain(data) || typeof data.hasMore !== 'boolean' || !Array.isArray(data.records) || data.records.length > maxPageSize ||
      (data.nextPageToken !== undefined && data.nextPageToken !== '' && !id(data.nextPageToken, 100)) ||
      (data.hasMore && (!data.nextPageToken || data.records.length === 0))) invalid();
  const keys = new Set();
  for (const row of data.records) {
    if (!plain(row) || !id(row.primaryID, 100) || keys.has(row.primaryID) || !plain(row.data)) invalid();
    keys.add(row.primaryID);
    if (fieldIDs && Object.keys(row.data).some(key => !fieldIDs.has(key))) invalid();
  }
  return data;
}

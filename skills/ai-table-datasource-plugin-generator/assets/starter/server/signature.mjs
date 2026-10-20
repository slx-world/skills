import { createHmac, timingSafeEqual } from 'node:crypto';

export function sign(rawBody, timestamp, secret) {
  return createHmac('sha256', secret).update(rawBody).update(String(timestamp), 'utf8').digest('base64');
}

export function verify(rawBody, timestamp, signature, secret) {
  if (!secret || typeof timestamp !== 'string' || !/^\d+$/.test(timestamp) || typeof signature !== 'string') return false;
  const expected = Buffer.from(sign(rawBody, timestamp, secret), 'utf8');
  const actual = Buffer.from(signature, 'utf8');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

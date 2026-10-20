import { createHash, timingSafeEqual } from 'node:crypto';

export function sign(rawBody, timestamp, nonce, secretKey) {
  return createHash('sha1').update(String(timestamp), 'utf8').update(String(nonce), 'utf8')
    .update(secretKey, 'utf8').update(rawBody).digest('hex');
}

export function verify(rawBody, timestamp, nonce, signature, secretKey) {
  if (!secretKey || typeof timestamp !== 'string' || !timestamp || typeof nonce !== 'string' || !nonce ||
      typeof signature !== 'string' || !/^[a-f0-9]{40}$/.test(signature)) return false;
  const expected = Buffer.from(sign(rawBody, timestamp, nonce, secretKey), 'ascii');
  const supplied = Buffer.from(signature, 'ascii');
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

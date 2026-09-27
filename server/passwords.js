import { scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const derive = promisify(scrypt);
// OWASP's 16 MiB scrypt profile; retain compatibility with previous p=1 hashes.
const prefix = 'scrypt$16384$8$5$';
export async function hashPassword(password, salt) {
  return prefix + (await derive(password, salt, 64, { N: 16384, r: 8, p: 5 })).toString('hex');
}
export async function verifyPassword(password, salt, stored) {
  const modern = stored?.startsWith(prefix);
  const expected = modern ? stored.slice(prefix.length) : stored;
  const result = await derive(password, salt || 'unknown-account-salt', 64, { N: 16384, r: 8, p: modern || !stored ? 5 : 1 });
  return /^[a-f0-9]{128}$/.test(expected || '') && timingSafeEqual(result, Buffer.from(expected, 'hex'));
}
export const needsPasswordUpgrade = stored => !stored.startsWith(prefix);

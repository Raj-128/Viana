import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function createMfaVault(dataDir) {
  const keyFile = resolve(dataDir, 'mfa.key');
  // Hosts with an ephemeral filesystem lose the key file on every restart,
  // which would strand every sealed secret. MFA_KEY keeps it with the service.
  const configured = process.env.MFA_KEY ? Buffer.from(process.env.MFA_KEY, 'base64') : null;
  if (configured && configured.length !== 32) throw new Error('MFA_KEY must be 32 random bytes encoded as base64.');
  function key(create = false) {
    if (configured) return configured;
    try { return readFileSync(keyFile); }
    catch (error) {
      if (!create || error.code !== 'ENOENT') throw error;
      try { writeFileSync(keyFile, randomBytes(32), { flag: 'wx', mode: 0o600 }); }
      catch (error) { if (error.code !== 'EEXIST') throw error; }
      return readFileSync(keyFile);
    }
  }
  return {
    seal(secret, userId) {
      const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key(true), iv);
      cipher.setAAD(Buffer.from(userId));
      const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
      return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64');
    },
    open(value, userId) {
      const bytes = Buffer.from(value, 'base64');
      const cipher = createDecipheriv('aes-256-gcm', key(), bytes.subarray(0, 12));
      cipher.setAAD(Buffer.from(userId)); cipher.setAuthTag(bytes.subarray(12, 28));
      return Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]).toString('utf8');
    },
  };
}

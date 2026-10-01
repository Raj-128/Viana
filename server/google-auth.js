import { OAuth2Client } from 'google-auth-library';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { verifyPassword } from './passwords.js';

export const GOOGLE_CLIENT_ID = '69633922602-rvpj38kboj3p40l84vt1l034dmkrsncl.apps.googleusercontent.com';
const google = new OAuth2Client();
export async function verifyGoogleToken(credential, audience) {
  const ticket = await google.verifyIdToken({ idToken: credential, audience });
  return ticket.getPayload();
}
const hash = value => createHash('sha256').update(value).digest('hex');

export function createGoogleAuth({ db, fail, limit, verify = verifyGoogleToken, clientId = GOOGLE_CLIENT_ID }) {
  db.exec(`CREATE TABLE IF NOT EXISTS google_identities (subject TEXT PRIMARY KEY, user_id TEXT UNIQUE NOT NULL REFERENCES users(id));
    CREATE TABLE IF NOT EXISTS google_challenges (nonce TEXT PRIMARY KEY, expires INTEGER NOT NULL);`);
  return {
    config() {
      const nonce = randomBytes(32).toString('hex');
      db.prepare('DELETE FROM google_challenges WHERE expires<=?').run(Date.now());
      db.prepare('INSERT INTO google_challenges VALUES (?,?)').run(hash(nonce), Date.now() + 600000);
      return { clientId, nonce };
    },
    async signIn(data) {
      if (typeof data.credential !== 'string' || data.credential.length > 7000 || !/^[a-f0-9]{64}$/.test(data.nonce || '')) throw fail(400, 'Please restart Google sign-in.');
      const nonceHash = hash(data.nonce);
      if (!db.prepare('SELECT 1 FROM google_challenges WHERE nonce=? AND expires>?').get(nonceHash, Date.now())) throw fail(401, 'Google sign-in expired. Please try again.');
      let identity;
      try { identity = await verify(data.credential, clientId); }
      catch { throw fail(401, 'Google could not verify this sign-in. Please try again.'); }
      if (!identity || identity.aud !== clientId || !['accounts.google.com', 'https://accounts.google.com'].includes(identity.iss) ||
          !(identity.exp * 1000 > Date.now()) || identity.nonce !== data.nonce || identity.email_verified !== true ||
          typeof identity.sub !== 'string' || !identity.sub || identity.sub.length > 255 ||
          typeof identity.email !== 'string' || identity.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity.email)) throw fail(401, 'Google could not verify this sign-in.');
      let user = db.prepare('SELECT u.* FROM google_identities g JOIN users u ON u.id=g.user_id WHERE g.subject=?').get(identity.sub);
      const linked = Boolean(user);
      if (!user) user = db.prepare('SELECT * FROM users WHERE email=?').get(identity.email.toLowerCase());
      if (user?.role === 'admin' || identity.email.toLowerCase() === 'vickyranagovind@gmail.com') throw fail(403, 'Use the owner login page with your password and authenticator.');
      if (user && !linked) {
        if (!data.password) return { requiresPassword: true };
        if (typeof data.password !== 'string' || data.password.length > 128) throw fail(400, 'Enter your existing account password.');
        const key = `failed:${user.id}`;
        const failure = db.prepare('SELECT * FROM limits WHERE key=?').get(key);
        if (failure?.expires > Date.now() && failure.count >= 5) throw fail(429, 'Too many failed logins. Try again in 15 minutes.');
        if (!await verifyPassword(data.password, user.salt, user.password)) { limit(key, 5); throw fail(401, 'Incorrect account password.'); }
        const fresh = db.prepare('SELECT * FROM users WHERE id=?').get(user.id);
        if (!fresh || fresh.password !== user.password || fresh.role !== 'user') throw fail(401, 'Account changed. Please sign in again.');
      }
      const created = !user;
      db.exec('BEGIN IMMEDIATE');
      try {
        if (!db.prepare('DELETE FROM google_challenges WHERE nonce=? AND expires>?').run(nonceHash, Date.now()).changes) throw fail(401, 'Google sign-in expired or was already used. Please try again.');
        if (!user) {
          user = { id: randomUUID(), name: String(identity.name || identity.email.split('@')[0]).slice(0, 100), email: identity.email.toLowerCase(), phone: null, role: 'user' };
          db.prepare('INSERT INTO users VALUES (?,?,?,?,?,?,?)').run(user.id, user.name, user.email, user.phone, 'user', randomBytes(16).toString('hex'), '!google-only');
        }
        if (!linked) {
          db.prepare('INSERT INTO google_identities VALUES (?,?)').run(identity.sub, user.id);
          db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);
        }
        db.prepare('DELETE FROM limits WHERE key=?').run(`failed:${user.id}`);
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        if (error.code?.startsWith('ERR_SQLITE')) throw fail(409, 'This account is already linked. Please restart sign-in.');
        throw error;
      }
      return { user, created };
    },
  };
}

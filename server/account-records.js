export function createAccountRecords({ db, sessionUser, json, fail }) {
  db.exec(`CREATE TABLE IF NOT EXISTS account_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL REFERENCES users(id),
    event TEXT NOT NULL, occurred_at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS account_events_user ON account_events(user_id, occurred_at);`);
  const record = (userId, event) => db.prepare('INSERT INTO account_events(user_id,event,occurred_at) VALUES (?,?,?)').run(userId, event, Date.now());
  const handler = (req, res, path) => {
    if (path !== '/api/admin/accounts') return false;
    const user = sessionUser(req);
    if (!user) throw fail(401, 'Please sign in.');
    if (user.role !== 'admin') throw fail(403, 'Administrator access is required.');
    if (req.method !== 'GET') throw fail(405, 'This action is not supported.');
    const params = new URL(req.url, 'http://localhost').searchParams;
    const page = Math.max(0, Math.min(100000, Number.parseInt(params.get('page'), 10) || 0));
    const search = String(params.get('search') || '').trim().slice(0, 100);
    const filter = `%${search}%`;
    const accounts = db.prepare(`SELECT u.id,u.name,u.email,u.phone,u.role,
      MIN(CASE WHEN e.event='registered' THEN e.occurred_at END) AS registered_at,
      MAX(CASE WHEN e.event='login' THEN e.occurred_at END) AS last_login,
      COUNT(CASE WHEN e.event='login' THEN 1 END) AS login_count
      FROM users u LEFT JOIN account_events e ON e.user_id=u.id
      WHERE u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?
      GROUP BY u.id ORDER BY u.name,u.id LIMIT 50 OFFSET ?`).all(filter, filter, filter, page * 50);
    const total = db.prepare('SELECT count(*) AS count FROM users WHERE name LIKE ? OR email LIKE ? OR phone LIKE ?').get(filter, filter, filter).count;
    const before = Number(params.get('before')) || Number.MAX_SAFE_INTEGER;
    const events = db.prepare(`SELECT e.id,e.event,e.occurred_at,u.name,u.email FROM account_events e
      JOIN users u ON u.id=e.user_id WHERE e.id < ? AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)
      ORDER BY e.id DESC LIMIT 100`).all(before, filter, filter, filter);
    json(res, 200, { accounts, total, page, events, nextBefore: events.length === 100 ? events.at(-1).id : null });
    return true;
  };
  return { record, handler };
}

export function createAccountRecords({ db, sessionUser, json, fail }) {
  db.exec(`CREATE TABLE IF NOT EXISTS account_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL REFERENCES users(id),
    event TEXT NOT NULL, occurred_at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS account_events_user ON account_events(user_id, occurred_at);
    CREATE TABLE IF NOT EXISTS admin_notification_seen (user_id TEXT NOT NULL REFERENCES users(id), category TEXT NOT NULL, seen_at INTEGER NOT NULL, PRIMARY KEY(user_id,category));`);
  const record = (userId, event) => {
    if (event !== 'registered') return;
    db.prepare("INSERT INTO account_events(user_id,event,occurred_at) SELECT ?, 'registered', ? WHERE NOT EXISTS (SELECT 1 FROM account_events WHERE user_id=? AND event='registered')").run(userId, Date.now(), userId);
  };
  const handler = (req, res, path) => {
    if (!['/api/admin/accounts', '/api/admin/notifications'].includes(path)) return false;
    const user = sessionUser(req);
    if (!user) throw fail(401, 'Please sign in.');
    if (user.role !== 'admin') throw fail(403, 'Administrator access is required.');
    if (path === '/api/admin/notifications') {
      const params = new URL(req.url, 'http://localhost').searchParams;
      if (req.method === 'POST') {
        const category = params.get('category');
        const through = Number(params.get('through'));
        if (!['login', 'wallpaper', 'models'].includes(category) || !Number.isSafeInteger(through) || through < 0 || through > Date.now()) throw fail(400, 'Invalid notification marker.');
        db.prepare('INSERT INTO admin_notification_seen VALUES (?,?,?) ON CONFLICT(user_id,category) DO UPDATE SET seen_at=MAX(seen_at,excluded.seen_at)').run(user.id, category, through);
        json(res, 200, { ok: true }); return true;
      }
      if (req.method !== 'GET') throw fail(405, 'This action is not supported.');
      const through = Date.now();
      const since = category => db.prepare('SELECT seen_at FROM admin_notification_seen WHERE user_id=? AND category=?').get(user.id, category)?.seen_at || 0;
      const login = db.prepare("SELECT count(*) AS n FROM account_events WHERE event='registered' AND occurred_at>? AND occurred_at<=?").get(since('login'), through).n;
      const models = db.prepare('SELECT count(*) AS n FROM plan_orders WHERE created_at>? AND created_at<=?').get(since('models'), through).n;
      const wallpaper = db.prepare('SELECT count(*) AS n FROM print_requests WHERE created_at>? AND created_at<=?').get(since('wallpaper'), through).n
        + db.prepare("SELECT count(*) AS n FROM download_requests WHERE status='pending' AND updated_at>? AND updated_at<=? AND design_id NOT IN (SELECT design_id FROM model_tiers)").get(since('wallpaper'), through).n;
      json(res, 200, { through, counts: { login, wallpaper, models } }); return true;
    }
    if (req.method !== 'GET') throw fail(405, 'This action is not supported.');
    const params = new URL(req.url, 'http://localhost').searchParams;
    const page = Math.max(0, Math.min(100000, Number.parseInt(params.get('page'), 10) || 0));
    const search = String(params.get('search') || '').trim().slice(0, 100);
    const filter = `%${search}%`;
    const pageSize = 5;
    const accounts = db.prepare(`SELECT u.id,u.name,u.email,u.phone,u.role,
      (SELECT MIN(e.occurred_at) FROM account_events e WHERE e.user_id=u.id AND e.event='registered') AS registered_at
      FROM users u WHERE u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?
      ORDER BY registered_at DESC,u.id LIMIT ? OFFSET ?`).all(filter, filter, filter, pageSize, page * pageSize);
    const total = db.prepare('SELECT count(*) AS count FROM users WHERE name LIKE ? OR email LIKE ? OR phone LIKE ?').get(filter, filter, filter).count;
    json(res, 200, { accounts, total, page, pageSize, hasNext: (page + 1) * pageSize < total });
    return true;
  };
  return { record, handler };
}
